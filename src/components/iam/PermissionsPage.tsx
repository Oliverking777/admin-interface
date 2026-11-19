"use client";

import { useCallback, useState } from "react";

import PermissionFormDrawer from "@/components/iam/PermissionFormDrawer";
import QueryError from "@/components/iam/QueryError";
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
import { useDeletePermission, usePermissions } from "@/hooks/iam/use-permissions";
import { formatDateTime } from "@/lib/format";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import type { PermissionResponse } from "@/types/iam/permission-dto";

const PAGE_SIZE = 20;

export default function PermissionsPage() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();

  const [page, setPage] = useState(0);
  const permissions = usePermissions({ page, size: PAGE_SIZE });
  const deletePermission = useDeletePermission();

  const [form, setForm] = useState<{ open: boolean; permission: PermissionResponse | null }>({
    open: false,
    permission: null,
  });
  const [toDelete, setToDelete] = useState<PermissionResponse | null>(null);

  const closeForm = useCallback(() => setForm({ open: false, permission: null }), []);
  const closeDelete = useCallback(() => setToDelete(null), []);

  const canCreate = hasPermission(PERMISSIONS.PERMISSION_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.PERMISSION_UPDATE);
  const canDelete = hasPermission(PERMISSIONS.PERMISSION_DELETE);

  function confirmDelete() {
    if (!toDelete) return;
    const target = toDelete;
    const lastOnPage = (permissions.data?.content.length ?? 0) <= 1;

    deletePermission.mutate(target.permissionId, {
      onSuccess: () => {
        toast({ title: "Permission deleted", description: target.permissionCode });
        if (page > 0 && lastOnPage) setPage(page - 1);
        setToDelete(null);
      },
      onError: (error) => {
        toast({ title: "Could not delete permission", description: error.message, variant: "error" });
        setToDelete(null);
      },
    });
  }

  const data = permissions.data;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          Permissions are the actions people can take. Roles are built from them.
        </p>
        {canCreate && (
          <Button onClick={() => setForm({ open: true, permission: null })}>New permission</Button>
        )}
      </div>

      {permissions.isError ? (
        <QueryError error={permissions.error} onRetry={() => void permissions.refetch()} />
      ) : permissions.isPending ? (
        <p role="status" className="border border-border bg-background p-6 text-center text-sm text-muted-foreground">
          Loading permissions...
        </p>
      ) : data && data.content.length === 0 ? (
        <div className="border border-border bg-background p-8 text-center">
          <p className="text-sm text-muted-foreground">No permissions yet.</p>
        </div>
      ) : (
        data && (
          <Card padded={false}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Code</TableHeaderCell>
                  <TableHeaderCell>Created</TableHeaderCell>
                  <TableHeaderCell>
                    <span className="sr-only">Actions</span>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.content.map((permission) => (
                  <TableRow key={permission.permissionId}>
                    <TableCell className="font-mono text-xs">{permission.permissionCode}</TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">
                      {formatDateTime(permission.createdAt)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {canUpdate && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setForm({ open: true, permission })}
                        >
                          Edit
                        </Button>
                      )}
                      {canDelete && (
                        <Button size="sm" variant="ghost" onClick={() => setToDelete(permission)}>
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
              noun="permissions"
              onPageChange={setPage}
              disabled={permissions.isFetching}
            />
          </Card>
        )
      )}

      <PermissionFormDrawer open={form.open} permission={form.permission} onClose={closeForm} />

      <ConfirmDialog
        open={toDelete !== null}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        title="Delete this permission?"
        description={
          toDelete
            ? `${toDelete.permissionCode} will be removed. Anything in the system that checks this code will stop working for everyone. A permission that a role still has cannot be deleted.`
            : undefined
        }
        confirmLabel="Delete permission"
        destructive
        loading={deletePermission.isPending}
      />
    </div>
  );
}