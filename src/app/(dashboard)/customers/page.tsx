"use client";

import { useCallback, useEffect, useState } from "react";
import CustomerDrawer from "@/components/customer/CustomerDrawer";
import CustomersTable, { type CustomerAbilities } from "@/components/customer/CustomersTable";
import CustomersToolbar, { type CustomerStatusFilter } from "@/components/customer/CustomersToolbar";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Pagination from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/ToastProvider";
import {
  useActivateCustomer,
  useCreateCustomer,
  useCustomers,
  useDeactivateCustomer,
  useUpdateCustomer,
} from "@/hooks/customer/use-customer";
import { useAuth } from "@/hooks/iam/use-auth";
import { getErrorMessage } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import type { Customer } from "@/types/customer/customer";
import type { CreateCustomerRequest, UpdateCustomerRequest } from "@/types/customer/customer-dto";

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

export default function CustomersPage() {
  const { toast } = useToast();
  const auth = useAuth();

  const canRead = auth.hasPermission(PERMISSIONS.CUSTOMER_READ);
  const canCreate = auth.hasPermission(PERMISSIONS.CUSTOMER_CREATE);
  // The backend checks CUSTOMER_UPDATE for edit, activate and deactivate alike.
  const canUpdate = auth.hasPermission(PERMISSIONS.CUSTOMER_UPDATE);
  const abilities: CustomerAbilities = {
    update: canUpdate,
    activate: canUpdate,
    deactivate: canUpdate,
  };

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<CustomerStatusFilter>("ALL");
  const [page, setPage] = useState(0);

  // Search runs on the server, so wait until the user pauses typing.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), SEARCH_DELAY_MS);
    return () => clearTimeout(timer);
  }, [search]);

  // A new search or filter starts again from the first page.
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, filter]);

  const query = useCustomers(
    {
      page,
      size: PAGE_SIZE,
      search: debouncedSearch,
      status: filter === "ALL" ? undefined : filter,
    },
    { enabled: canRead },
  );
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const activateCustomer = useActivateCustomer();
  const deactivateCustomer = useDeactivateCustomer();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [customerToDeactivate, setCustomerToDeactivate] = useState<Customer | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  // Stable identities: Drawer and ConfirmDialog re-run effects when these change.
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeDeactivate = useCallback(() => setCustomerToDeactivate(null), []);

  // If the last customer of the last page disappears from the list (e.g. deactivated under a status filter), go back a page.
  const totalPages = query.data?.totalPages;
  useEffect(() => {
    if (totalPages !== undefined && page > 0 && page >= totalPages) {
      setPage(Math.max(totalPages - 1, 0));
    }
  }, [page, totalPages]);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(customer: Customer) {
    setEditing(customer);
    setDrawerOpen(true);
  }

  async function handleCreate(request: CreateCustomerRequest) {
    const created = await createCustomer.mutateAsync(request);
    toast({ title: "Customer created", description: `${created.name} (${created.code}) is ready.` });
  }

  async function handleUpdate(customerId: string, request: UpdateCustomerRequest) {
    const updated = await updateCustomer.mutateAsync({ customerId, request });
    toast({ title: "Customer updated", description: `${updated.name} was saved.` });
  }

  async function handleToggleStatus(customer: Customer) {
    if (customer.status === "ACTIVE") {
      setCustomerToDeactivate(customer);
      return;
    }
    setActivatingId(customer.id);
    try {
      await activateCustomer.mutateAsync(customer.id);
      toast({ title: "Customer activated", description: `${customer.name} can be used again.` });
    } catch (error) {
      toast({
        title: "Could not activate customer",
        description: getErrorMessage(error),
        variant: "error",
      });
    } finally {
      setActivatingId(null);
    }
  }

  async function confirmDeactivate() {
    if (!customerToDeactivate) return;
    try {
      await deactivateCustomer.mutateAsync(customerToDeactivate.id);
      toast({
        title: "Customer deactivated",
        description: `${customerToDeactivate.name} is disabled.`,
      });
      setCustomerToDeactivate(null);
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
      <Card>
        <p className="text-sm font-medium text-foreground">You do not have access to customers</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask an administrator to give your role the CUSTOMER_READ permission.
        </p>
      </Card>
    );
  }

  const data = query.data;

  return (
    <div className="flex flex-col gap-4">
      <CustomersToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        onAdd={openCreate}
        canAdd={canCreate}
      />

      <Card padded={false}>
        <CustomersTable
          customers={data?.content ?? []}
          loading={auth.isLoading || query.isLoading}
          error={query.isError ? getErrorMessage(query.error, "Could not load customers.") : null}
          filtered={debouncedSearch !== "" || filter !== "ALL"}
          abilities={abilities}
          busyId={activatingId}
          onRetry={() => void query.refetch()}
          onEdit={openEdit}
          onToggleStatus={handleToggleStatus}
        />
        {data && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            noun="customers"
            onPageChange={setPage}
            disabled={query.isFetching}
          />
        )}
      </Card>

      <CustomerDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        customer={editing}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <ConfirmDialog
        open={customerToDeactivate !== null}
        onClose={closeDeactivate}
        onConfirm={confirmDeactivate}
        title="Deactivate this customer?"
        description={
          customerToDeactivate
            ? `${customerToDeactivate.name} will be disabled and can no longer be used for new operations. You can activate the customer again at any time.`
            : undefined
        }
        confirmLabel="Deactivate"
        destructive
        loading={deactivateCustomer.isPending}
      />
    </div>
  );
}