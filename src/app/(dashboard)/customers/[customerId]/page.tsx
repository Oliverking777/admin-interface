"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import CustomerDrawer from "@/components/customer/CustomerDrawer";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  useActivateCustomer,
  useCustomer,
  useDeactivateCustomer,
  useUpdateCustomer,
} from "@/hooks/customer/use-customer";
import { useAuth } from "@/hooks/iam/use-auth";
import { getErrorMessage } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import type { CustomerType } from "@/types/customer/customer";
import type { UpdateCustomerRequest } from "@/types/customer/customer-dto";

const TYPE_LABELS: Record<CustomerType, string> = {
  INDIVIDUAL: "Individual",
  BUSINESS: "Business",
};

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
      href="/customers"
      className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
      Back to customers
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

export default function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const { toast } = useToast();
  const auth = useAuth();

  const canRead = auth.hasPermission(PERMISSIONS.CUSTOMER_READ);
  // The backend checks CUSTOMER_UPDATE for edit, activate and deactivate alike.
  const canUpdate = auth.hasPermission(PERMISSIONS.CUSTOMER_UPDATE);

  const query = useCustomer(customerId, { enabled: canRead });
  const updateCustomer = useUpdateCustomer();
  const activateCustomer = useActivateCustomer();
  const deactivateCustomer = useDeactivateCustomer();

  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  // Stable identities: Drawer and ConfirmDialog re-run effects when these change.
  const closeEdit = useCallback(() => setEditOpen(false), []);
  const closeDeactivate = useCallback(() => setDeactivateOpen(false), []);

  const customer = query.data;

  async function handleUpdate(id: string, request: UpdateCustomerRequest) {
    const updated = await updateCustomer.mutateAsync({ customerId: id, request });
    toast({ title: "Customer updated", description: `${updated.name} was saved.` });
  }

  async function handleActivate() {
    if (!customer) return;
    try {
      await activateCustomer.mutateAsync(customer.id);
      toast({ title: "Customer activated", description: `${customer.name} can be used again.` });
    } catch (error) {
      toast({
        title: "Could not activate customer",
        description: getErrorMessage(error),
        variant: "error",
      });
    }
  }

  async function confirmDeactivate() {
    if (!customer) return;
    try {
      await deactivateCustomer.mutateAsync(customer.id);
      toast({ title: "Customer deactivated", description: `${customer.name} is disabled.` });
      setDeactivateOpen(false);
    } catch (error) {
      toast({
        title: "Could not deactivate customer",
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
          <p className="text-sm font-medium text-foreground">You do not have access to customers</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask an administrator to give your role the CUSTOMER_READ permission.
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

  if (query.isError || !customer) {
    const notFound = query.error?.isNotFound ?? false;
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <Card>
          <p role="alert" className="text-sm font-medium text-foreground">
            {notFound ? "This customer does not exist" : getErrorMessage(query.error, "Could not load the customer.")}
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

  const isActive = customer.status === "ACTIVE";
  // The walk-in customer is protected: it cannot be edited or deactivated.
  const canEdit = canUpdate && !customer.walkIn;
  const canDeactivate = canUpdate && isActive && !customer.walkIn;
  const canActivate = canUpdate && !isActive;

  return (
    <div className="flex flex-col gap-4">
      <BackLink />

      <Card className="flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-foreground">{customer.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge>{TYPE_LABELS[customer.type]}</Badge>
              <Badge variant={isActive ? "success" : "neutral"}>{isActive ? "Active" : "Inactive"}</Badge>
              {customer.walkIn && <Badge>Walk-in</Badge>}
            </div>
          </div>

          <div className="flex gap-2">
            {canEdit && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )}
            {canDeactivate && (
              <Button variant="secondary" onClick={() => setDeactivateOpen(true)}>
                Deactivate
              </Button>
            )}
            {canActivate && (
              <Button onClick={handleActivate} loading={activateCustomer.isPending}>
                Activate
              </Button>
            )}
          </div>
        </div>

        {customer.walkIn && (
          <p className="text-sm text-muted-foreground">
            This is the built-in walk-in customer, used for sales to customers who are not registered. It cannot be
            edited or deactivated.
          </p>
        )}

        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Code">{customer.code}</Detail>
          <Detail label="Type">{TYPE_LABELS[customer.type]}</Detail>
          <Detail label="Phone number">{customer.phone ?? <NotSet />}</Detail>
          <Detail label="Email">{customer.email ?? <NotSet />}</Detail>
          <div className="sm:col-span-2">
            <Detail label="Address">{customer.address ?? <NotSet />}</Detail>
          </div>
          <Detail label="Created">{dateTimeFormat.format(new Date(customer.createdAt))}</Detail>
          <Detail label="Last updated">{dateTimeFormat.format(new Date(customer.updatedAt))}</Detail>
        </dl>
      </Card>

      <CustomerDrawer open={editOpen} onClose={closeEdit} customer={customer} onUpdate={handleUpdate} />

      <ConfirmDialog
        open={deactivateOpen}
        onClose={closeDeactivate}
        onConfirm={confirmDeactivate}
        title="Deactivate this customer?"
        description={`${customer.name} will be disabled and can no longer be used for new operations. You can activate the customer again at any time.`}
        confirmLabel="Deactivate"
        destructive
        loading={deactivateCustomer.isPending}
      />
    </div>
  );
}