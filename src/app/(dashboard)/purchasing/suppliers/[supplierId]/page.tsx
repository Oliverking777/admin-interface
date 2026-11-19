"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import SupplierDrawer from "@/components/supplier/SupplierDrawer";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  useActivateSupplier,
  useDeactivateSupplier,
  useSupplier,
  useUpdateSupplier,
} from "@/hooks/purchase/use-supplier";
import { useAuth } from "@/hooks/iam/use-auth";
import { getErrorMessage } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import type { UpdateSupplierRequest } from "@/types/purchase/supplier-dto";

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function BackLink() {
  return (
    <Link
      href="/purchasing/suppliers"
      className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
      Back to suppliers
    </Link>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

function NotSet() {
  return <span className="text-muted-foreground">Not set</span>;
}

export default function SupplierDetailPage() {
  const { supplierId } = useParams<{ supplierId: string }>();
  const { toast } = useToast();
  const auth = useAuth();

  const canRead = auth.hasPermission(PERMISSIONS.SUPPLIER_READ);
  // The backend checks SUPPLIER_UPDATE for edit, activate and deactivate alike.
  const canUpdate = auth.hasPermission(PERMISSIONS.SUPPLIER_UPDATE);

  const query = useSupplier(supplierId, { enabled: canRead });
  const updateSupplier = useUpdateSupplier();
  const activateSupplier = useActivateSupplier();
  const deactivateSupplier = useDeactivateSupplier();

  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  // Stable identities: Drawer and ConfirmDialog re-run effects when these change.
  const closeEdit = useCallback(() => setEditOpen(false), []);
  const closeDeactivate = useCallback(() => setDeactivateOpen(false), []);

  const supplier = query.data;

  async function handleUpdate(id: string, request: UpdateSupplierRequest) {
    const updated = await updateSupplier.mutateAsync({ supplierId: id, request });
    toast({ title: "Supplier updated", description: `${updated.name} was saved.` });
  }

  async function handleActivate() {
    if (!supplier) return;
    try {
      await activateSupplier.mutateAsync(supplier.id);
      toast({ title: "Supplier activated", description: `${supplier.name} can be used again.` });
    } catch (error) {
      toast({
        title: "Could not activate supplier",
        description: getErrorMessage(error),
        variant: "error",
      });
    }
  }

  async function confirmDeactivate() {
    if (!supplier) return;
    try {
      await deactivateSupplier.mutateAsync(supplier.id);
      toast({ title: "Supplier deactivated", description: `${supplier.name} is disabled.` });
      setDeactivateOpen(false);
    } catch (error) {
      toast({
        title: "Could not deactivate supplier",
        description: getErrorMessage(error),
        variant: "error",
      });
    }
  }

  if (!auth.isLoading && !canRead) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <Card>
          <p className="text-sm font-medium text-foreground">You do not have access to suppliers</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask an administrator to give your role the SUPPLIER_READ permission.
          </p>
        </Card>
      </div>
    );
  }

  if (auth.isLoading || query.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <BackLink />
        <Card>
          <div className="flex flex-col gap-3">
            <div className="h-6 w-56 animate-pulse bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-80 animate-pulse bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-64 animate-pulse bg-muted motion-reduce:animate-none" />
          </div>
        </Card>
      </div>
    );
  }

  if (query.isError || !supplier) {
    const notFound = query.error?.isNotFound ?? false;
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <Card>
          <p role="alert" className="text-sm font-medium text-foreground">
            {notFound ? "This supplier does not exist" : getErrorMessage(query.error, "Could not load the supplier.")}
          </p>
          {!notFound && (
            <Button variant="secondary" size="sm" onClick={() => void query.refetch()} className="mt-3">
              Try again
            </Button>
          )}
        </Card>
      </div>
    );
  }

  const isActive = supplier.status === "ACTIVE";

  return (
    <div className="flex flex-col gap-4">
      <BackLink />

      <Card className="flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-foreground">{supplier.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant={isActive ? "success" : "neutral"}>{isActive ? "Active" : "Inactive"}</Badge>
            </div>
          </div>

          <div className="flex gap-2">
            {canUpdate && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )}
            {isActive && canUpdate && (
              <Button variant="secondary" onClick={() => setDeactivateOpen(true)}>
                Deactivate
              </Button>
            )}
            {!isActive && canUpdate && (
              <Button onClick={handleActivate} loading={activateSupplier.isPending}>
                Activate
              </Button>
            )}
          </div>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Code">{supplier.code}</Detail>
          <Detail label="Contact person">{supplier.contactPerson ?? <NotSet />}</Detail>
          <Detail label="Phone number">{supplier.phone ?? <NotSet />}</Detail>
          <Detail label="Email">{supplier.email ?? <NotSet />}</Detail>
          <div className="sm:col-span-2">
            <Detail label="Address">{supplier.address ?? <NotSet />}</Detail>
          </div>
          <Detail label="Created">{dateTimeFormat.format(new Date(supplier.createdAt))}</Detail>
          <Detail label="Last updated">{dateTimeFormat.format(new Date(supplier.updatedAt))}</Detail>
        </dl>
      </Card>

      <SupplierDrawer open={editOpen} onClose={closeEdit} supplier={supplier} onUpdate={handleUpdate} />

      <ConfirmDialog
        open={deactivateOpen}
        onClose={closeDeactivate}
        onConfirm={confirmDeactivate}
        title="Deactivate this supplier?"
        description={`${supplier.name} will be disabled and can no longer be used for new operations. You can activate the supplier again at any time.`}
        confirmLabel="Deactivate"
        destructive
        loading={deactivateSupplier.isPending}
      />
    </div>
  );
}