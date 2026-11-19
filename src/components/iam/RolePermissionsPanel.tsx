"use client";

import { useMemo, useState } from "react";

import PermissionChecklist from "@/components/iam/PermissionChecklist";
import QueryError from "@/components/iam/QueryError";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/hooks/iam/use-auth";
import { useAllPermissions } from "@/hooks/iam/use-permissions";
import { useReplaceRolePermissions, useRolePermissions } from "@/hooks/iam/use-role-permissions";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { groupPermissionsByModule } from "@/lib/iam/permission-groups";
import type { RoleResponse } from "@/types/iam/role-dto";
import type { UUID } from "@/types/iam/user";

function sameSet(a: ReadonlySet<UUID>, b: ReadonlySet<UUID>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) if (!b.has(id)) return false;
  return true;
}

/**
 * Edit which permissions a role grants. Changes stay in `draft` until "Save changes"
 * sends the complete list in one request. `draft === null` means "nothing edited yet".
 */
export default function RolePermissionsPanel({ role }: { role: RoleResponse }) {
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const canListAll = hasPermission(PERMISSIONS.PERMISSION_READ);
  const canEdit = hasPermission(PERMISSIONS.ROLE_PERMISSION_UPDATE) && canListAll;

  const granted = useRolePermissions(role.roleId);
  const catalogue = useAllPermissions();
  const save = useReplaceRolePermissions();
  const [draft, setDraft] = useState<Set<UUID> | null>(null);

  const serverIds = useMemo(
    () => new Set(granted.data?.permissions.map((p) => p.permissionId) ?? []),
    [granted.data],
  );
  const selected = draft ?? serverIds;
  const dirty = draft !== null && !sameSet(draft, serverIds);

  // Without PERMISSION_READ the full list cannot load, so show only what the role has (read-only).
  const listed = canListAll ? catalogue.data : granted.data?.permissions;
  const groups = useMemo(() => groupPermissionsByModule(listed ?? []), [listed]);

  function handleSave() {
    const ids = Array.from(selected);
    save.mutate(
      { roleId: role.roleId, permissionIds: ids },
      {
        onSuccess: () => {
          setDraft(null);
          toast({
            title: "Permissions saved",
            description: `${role.roleName} now has ${ids.length} permission${ids.length === 1 ? "" : "s"}.`,
          });
        },
        onError: (error) =>
          toast({ title: "Could not save permissions", description: error.message, variant: "error" }),
      },
    );
  }

  if (granted.isError) return <QueryError error={granted.error} onRetry={() => void granted.refetch()} />;
  if (canListAll && catalogue.isError)
    return <QueryError error={catalogue.error} onRetry={() => void catalogue.refetch()} />;
  if (granted.isPending || (canListAll && catalogue.isPending)) {
    return (
      <p role="status" className="border border-border bg-background p-6 text-center text-sm text-muted-foreground">
        Loading permissions...
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {role.system && canEdit && (
        <p className="border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          {role.roleName} is a built-in role. Removing its permissions can lock people out of the system.
        </p>
      )}
      {!canListAll && (
        <p className="border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
          You can see what this role grants, but editing needs permission to read the full permission list.
        </p>
      )}

      <Card padded={false}>
        <PermissionChecklist
          groups={groups}
          selected={selected}
          onChange={setDraft}
          disabled={!canEdit || save.isPending}
        />

        {canEdit && (
          <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background px-4 py-3">
            <p className="text-sm text-muted-foreground" aria-live="polite">
              {selected.size} selected{dirty ? ", unsaved changes" : ""}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={!dirty || save.isPending} onClick={() => setDraft(null)}>
                Discard changes
              </Button>
              <Button disabled={!dirty} loading={save.isPending} onClick={handleSave}>
                Save changes
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}