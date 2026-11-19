"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/ToastProvider";
import {
  useAssignUserToLocation,
  useLocationUsers,
  useRemoveUserFromLocation,
} from "@/hooks/business/use-locations";
import { useAuth } from "@/hooks/iam/use-auth";
import { useAllRoles } from "@/hooks/iam/use-roles";
import { getErrorMessage, type ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { formatRoleName } from "@/lib/iam/role-utils";
import { memberService } from "@/services/iam/member-service";
import type { Location, LocationUser } from "@/types/business/location";
import type { Member } from "@/types/iam/member";

type LocationUsersPanelProps = {
  location: Location;
  /** Shows the Assign control (needs LOCATION_USER_ASSIGN). */
  canAssign: boolean;
  /** Shows the Remove buttons (needs LOCATION_USER_REMOVE). */
  canRemove: boolean;
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

/**
 * The users assigned to a location, with controls to assign and remove.
 * Rendered only for users who may read the location's users (LOCATION_USER_READ).
 */
export default function LocationUsersPanel({ location, canAssign, canRemove }: LocationUsersPanelProps) {
  const { toast } = useToast();
  const { hasPermission } = useAuth();

  const locationActive = location.status === "ACTIVE";
  // Picking a member needs USER_READ (the member list), on top of LOCATION_USER_ASSIGN.
  const canPickMember = canAssign && hasPermission(PERMISSIONS.USER_READ);
  const pickerEnabled = canPickMember && locationActive;

  const usersQuery = useLocationUsers(location.id);
  const membersQuery = useQuery<Member[], ApiError>({
    queryKey: ["iam", "members", "all"],
    queryFn: ({ signal }) => memberService.listAll(signal),
    enabled: pickerEnabled,
  });
  // Roles tell us which members may be assigned. Needs ROLE_READ: without it the backend decides alone.
  const rolesQuery = useAllRoles({ enabled: pickerEnabled });
  const assignUser = useAssignUserToLocation();
  const removeUser = useRemoveUserFromLocation();

  const [selectedUserId, setSelectedUserId] = useState("");
  const [userToRemove, setUserToRemove] = useState<LocationUser | null>(null);
  const closeConfirm = useCallback(() => setUserToRemove(null), []);

  const users = usersQuery.data;

  /**
   * Active members who are not already here and whose role can have a location:
   * a custom role that is assigned to a location. Built-in (system) roles, such as the owner,
   * and roles that work across all locations cannot be assigned (the backend refuses them too).
   */
  const candidates = useMemo(() => {
    const assigned = new Set((users ?? []).map((u) => u.id));
    const roleById = new Map((rolesQuery.data ?? []).map((r) => [r.roleId, r] as const));

    return (membersQuery.data ?? [])
      .filter((m) => {
        if (m.status !== "ACTIVE" || assigned.has(m.id)) return false;
        const role = roleById.get(m.roleId);
        return !role || (!role.system && role.locationScope === "ASSIGNED");
      })
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [membersQuery.data, rolesQuery.data, users]);

  async function handleAssign() {
    if (!selectedUserId) return;
    const member = candidates.find((m) => m.id === selectedUserId);
    try {
      await assignUser.mutateAsync({ locationId: location.id, userId: selectedUserId });
      toast({
        title: "User assigned",
        description: `${member?.name ?? "The user"} now works at ${location.name}.`,
      });
      setSelectedUserId("");
    } catch (error) {
      toast({
        title: "Could not assign user",
        description: getErrorMessage(error),
        variant: "error",
      });
    }
  }

  async function confirmRemove() {
    if (!userToRemove) return;
    try {
      await removeUser.mutateAsync({ locationId: location.id, userId: userToRemove.id });
      toast({
        title: "User removed",
        description: `${userToRemove.name} no longer works at ${location.name}.`,
      });
      setUserToRemove(null);
    } catch (error) {
      toast({
        title: "Could not remove user",
        description: getErrorMessage(error),
        variant: "error",
      });
    }
  }

  const pickerLoading = membersQuery.isLoading || rolesQuery.isLoading;

  return (
    <div className="flex flex-col gap-5">
      {canAssign && (
        <section aria-label="Assign a user" className="flex flex-col gap-2">
          {!locationActive ? (
            <p className="text-sm text-muted-foreground">Activate this location before assigning users to it.</p>
          ) : !canPickMember ? (
            <p className="text-sm text-muted-foreground">Choosing a member also needs the USER_READ permission.</p>
          ) : (
            <>
              <label htmlFor="assign-user" className="text-sm font-medium text-foreground">
                Assign a user
              </label>
              <div className="flex gap-2">
                <div className="min-w-0 flex-1 sm:max-w-md">
                  <Select
                    id="assign-user"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    disabled={pickerLoading || assignUser.isPending}
                  >
                    <option value="">{pickerLoading ? "Loading members..." : "Select a member"}</option>
                    {candidates.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.userName})
                      </option>
                    ))}
                  </Select>
                </div>
                <Button onClick={handleAssign} disabled={!selectedUserId} loading={assignUser.isPending}>
                  Assign
                </Button>
              </div>
              {membersQuery.isError ? (
                <p role="alert" className="text-sm text-red-600">
                  {getErrorMessage(membersQuery.error, "Could not load members.")}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Only members with a custom role that works at an assigned location can be added. Members with a
                  built-in role (such as the owner) cannot, and a member belongs to one location only.
                </p>
              )}
            </>
          )}
        </section>
      )}

      <section aria-label="Assigned users">
        {usersQuery.isLoading ? (
          <ul className="flex flex-col gap-2" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <li key={i} className="h-12 animate-pulse bg-muted motion-reduce:animate-none" />
            ))}
          </ul>
        ) : usersQuery.isError ? (
          <div>
            <p role="alert" className="text-sm text-foreground">
              {getErrorMessage(usersQuery.error, "Could not load the users.")}
            </p>
            <Button variant="secondary" size="sm" onClick={() => void usersQuery.refetch()} className="mt-2">
              Try again
            </Button>
          </div>
        ) : !users || users.length === 0 ? (
          <p className="text-sm text-muted-foreground">No users are assigned to this location yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border border border-border">
            {users.map((user) => (
              <li key={user.id} className="flex items-center gap-3 px-3 py-2.5">
                <Avatar name={user.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.userName} · {formatRoleName(user.roleName)} · since{" "}
                    {dateFormat.format(new Date(user.assignedAt))}
                  </p>
                </div>
                {!user.active && <Badge variant="danger">Suspended</Badge>}
                {canRemove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setUserToRemove(user)}
                    aria-label={`Remove ${user.name} from ${location.name}`}
                  >
                    Remove
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={userToRemove !== null}
        onClose={closeConfirm}
        onConfirm={confirmRemove}
        title="Remove this user from the location?"
        description={
          userToRemove
            ? `${userToRemove.name} will no longer be assigned to ${location.name}. You can assign them again later.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        loading={removeUser.isPending}
      />
    </div>
  );
}