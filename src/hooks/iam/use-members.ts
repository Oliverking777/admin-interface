"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";
import { toRoleOption } from "@/lib/iam/role-utils";
import { memberService } from "@/services/iam/member-service";
import { listAllRoles } from "@/services/iam/role-service";
import type { Member, MemberStatus, RoleOption } from "@/types/iam/member";
import type { CreateUserRequest } from "@/types/iam/member-dto";

export type MemberSortKey = "name" | "userName";
export type SortState = { key: MemberSortKey; direction: "asc" | "desc" };

/**
 * State and actions for the Members page.
 * `enabled` lets the page wait until it knows the user may read members.
 * Mutations throw on failure so the caller can show a toast or form error.
 */
export function useMembers(enabled = true) {
  const [members, setMembers] = useState<Member[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortState>({ key: "name", direction: "asc" });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    Promise.all([
      memberService.listAll(controller.signal),
      // Without the ROLE_READ permission the roles cannot be listed. The page still works,
      // it just cannot show role names or change roles.
      listAllRoles(controller.signal)
        .then((list) => list.map(toRoleOption))
        .catch((e: unknown) => {
          if (isApiError(e) && e.kind === "ABORTED") throw e;
          return [] as RoleOption[];
        }),
    ])
      .then(([loadedMembers, loadedRoles]) => {
        if (controller.signal.aborted) return;
        setMembers(loadedMembers);
        setRoles(loadedRoles);
      })
      .catch((e: unknown) => {
        if (isApiError(e) && e.kind === "ABORTED") return;
        setError(getErrorMessage(e, "Could not load members."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [enabled, reloadKey]);

  const retry = useCallback(() => setReloadKey((k) => k + 1), []);

  const toggleSort = useCallback((key: MemberSortKey) => {
    setSort((cur) =>
      cur.key === key
        ? { key, direction: cur.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  }, []);

  const visibleMembers = useMemo(() => {
    const roleNames = new Map(roles.map((r) => [r.id, r.name.toLowerCase()]));
    const term = search.trim().toLowerCase();

    const filtered = term
      ? members.filter(
          (m) =>
            m.name.toLowerCase().includes(term) ||
            m.userName.toLowerCase().includes(term) ||
            (roleNames.get(m.roleId) ?? "").includes(term),
        )
      : members;

    const factor = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort(
      (a, b) => a[sort.key].localeCompare(b[sort.key], undefined, { sensitivity: "base" }) * factor,
    );
  }, [members, roles, search, sort]);

  const create = useCallback(async (request: CreateUserRequest) => {
    const created = await memberService.create(request);
    setMembers((cur) => [created, ...cur]);
    return created;
  }, []);

  /** Updates the UI immediately and rolls back if the request fails. */
  const changeRole = useCallback(async (member: Member, roleId: string) => {
    if (roleId === member.roleId) return;

    const apply = (id: string) =>
      setMembers((cur) => cur.map((m) => (m.id === member.id ? { ...m, roleId: id } : m)));

    apply(roleId);
    try {
      await memberService.changeRole(member.id, roleId);
    } catch (e) {
      apply(member.roleId);
      throw e;
    }
  }, []);

  const setStatus = useCallback(async (id: string, status: MemberStatus) => {
    const updated =
      status === "ACTIVE" ? await memberService.activate(id) : await memberService.deactivate(id);
    setMembers((cur) => cur.map((m) => (m.id === id ? updated : m)));
    return updated;
  }, []);

  return {
    members: visibleMembers,
    roles,
    loading,
    error,
    search,
    setSearch,
    sort,
    toggleSort,
    retry,
    create,
    changeRole,
    setStatus,
  };
}