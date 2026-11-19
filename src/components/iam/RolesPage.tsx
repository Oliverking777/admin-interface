"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

import QueryError from "@/components/iam/QueryError";
import RoleFormDrawer from "@/components/iam/RoleFormDrawer";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Pagination from "@/components/ui/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/hooks/iam/use-auth";
import { useDeleteRole, useRoles } from "@/hooks/iam/use-roles";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { LOCATION_SCOPE_LABELS } from "@/lib/iam/role-labels";
import type { RoleResponse } from "@/types/iam/role-dto";

const PAGE_SIZE = 20;

export default function RolesPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const [page, setPage] = useState(0);
  const roles = useRoles({ page, size: PAGE_SIZE });
  const deleteRole = useDeleteRole();

  const [form, setForm] = useState<{ open: boolean; role: RoleResponse | null }>({
    open: false,
    role: null,
  });
  const [toDelete, setToDelete] = useState<RoleResponse | null>(null);

  const closeForm = useCallback(() => setForm({ open: false, role: null }), []);
  const closeDelete = useCallback(() => setToDelete(null), []);

  const canCreate = hasPermission(PERMISSIONS.ROLE_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.ROLE_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.ROLE_DELETE);

  function confirmDelete() {
    if (!toDelete) return;
    const target = toDelete;
    const lastOnPage = (roles.data?.content.length ?? 0) <= 1;

    deleteRole.mutate(target.roleId, {
      onSuccess: () => {
        toast({ title: "Role deleted", description: target.roleName });
        if (page > 0 && lastOnPage) setPage(page - 1);
        setToDelete(null);
      },
      onError: (error) => {
        toast({ title: "Could not delete role", description: error.message, variant: "error" });
        setToDelete(null);
      },
    });
  }

  const data = roles.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          A role is a set of permissions. Each user has exactly one role.
        </p>
        {canCreate && (
          <Button onClick={() => setForm({ open: true, role: null })}>New role</Button>
        )}
      </div>

      {roles.isError ? (
        <QueryError error={roles.error} onRetry={() => void roles.refetch()} />
      ) : roles.isPending ? (
        <p role="status" className="border border-border bg-background p-6 text-center text-sm text-muted-foreground">
          Loading roles...
        </p>
      ) : data && data.content.length === 0 ? (
        <div className="border border-border bg-background p-8 text-center">
          <p className="text-sm text-muted-foreground">No roles yet.</p>
          {canCreate && (
            <Button className="mt-4" onClick={() => setForm({ open: true, role: null })}>
              Create the first role
            </Button>
          )}
        </div>
      ) : (
        data && (
          <Card padded={false}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Role</TableHeaderCell>
                  <TableHeaderCell>Location scope</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell>
                    <span className="sr-only">Actions</span>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.content.map((role) => (
                  <TableRow key={role.roleId}>
                    <TableCell>
                      <Link
                        href={`/admin/roles/${role.roleId}`}
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {role.roleName}
                      </Link>
                    </TableCell>
                    <TableCell>{LOCATION_SCOPE_LABELS[role.locationScope] ?? role.locationScope}</TableCell>
                    <TableCell>{role.system ? <Badge>Built-in</Badge> : "Custom"}</TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {canUpdate && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setForm({ open: true, role })}
                        >
                          Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={role.system}
                          title={role.system ? "Built-in roles cannot be deleted" : undefined}
                          onClick={() => setToDelete(role)}
                        >
                          Delete
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              totalElements={data.totalElements}
              noun="roles"
              onPageChange={setPage}
              disabled={roles.isFetching}
            />
          </Card>
        )
      )}

      <RoleFormDrawer open={form.open} role={form.role} onClose={closeForm} />

      <ConfirmDialog
        open={toDelete !== null}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        title="Delete this role?"
        description={
          toDelete
            ? `${toDelete.roleName} will be removed for good. A role that still has users cannot be deleted.`
            : undefined
        }
        confirmLabel="Delete role"
        destructive
        loading={deleteRole.isPending}
      />
    </div>
  );
}