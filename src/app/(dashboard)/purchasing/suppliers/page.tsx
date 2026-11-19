"use client";

import { useCallback, useEffect, useState } from "react";
import SupplierDrawer from "@/components/supplier/SupplierDrawer";
import SuppliersTable, { type SupplierAbilities } from "@/components/supplier/SuppliersTable";
import SuppliersToolbar, { type SupplierStatusFilter } from "@/components/supplier/SuppliersToolbar";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Pagination from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/ToastProvider";
import {
  useActivateSupplier,
  useCreateSupplier,
  useDeactivateSupplier,
  useSuppliers,
  useUpdateSupplier,
} from "@/hooks/purchase/use-supplier";
import { useAuth } from "@/hooks/iam/use-auth";
import { getErrorMessage } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import type { Supplier } from "@/types/purchase/supplier";
import type { CreateSupplierRequest, UpdateSupplierRequest } from "@/types/purchase/supplier-dto";

const PAGE_SIZE = 20;
const SEARCH_DELAY_MS = 300;

export default function SuppliersPage() {
  const { toast } = useToast();
  const auth = useAuth();

  const canRead = auth.hasPermission(PERMISSIONS.SUPPLIER_READ);
  const canCreate = auth.hasPermission(PERMISSIONS.SUPPLIER_CREATE);
  // The backend checks SUPPLIER_UPDATE for edit, activate and deactivate alike.
  const canUpdate = auth.hasPermission(PERMISSIONS.SUPPLIER_UPDATE);
  const abilities: SupplierAbilities = {
    update: canUpdate,
    activate: canUpdate,
    deactivate: canUpdate,
  };

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filter, setFilter] = useState<SupplierStatusFilter>("ALL");
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

  const query = useSuppliers(
    {
      page,
      size: PAGE_SIZE,
      search: debouncedSearch,
      status: filter === "ALL" ? undefined : filter,
    },
    { enabled: canRead },
  );
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();
  const activateSupplier = useActivateSupplier();
  const deactivateSupplier = useDeactivateSupplier();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [supplierToDeactivate, setSupplierToDeactivate] = useState<Supplier | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  // Stable identities: Drawer and ConfirmDialog re-run effects when these change.
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeDeactivate = useCallback(() => setSupplierToDeactivate(null), []);

  // If the last supplier of the last page disappears from the list (e.g. deactivated under a status filter), go back a page.
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

  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setDrawerOpen(true);
  }

  async function handleCreate(request: CreateSupplierRequest) {
    const created = await createSupplier.mutateAsync(request);
    toast({ title: "Supplier created", description: `${created.name} (${created.code}) is ready.` });
  }

  async function handleUpdate(supplierId: string, request: UpdateSupplierRequest) {
    const updated = await updateSupplier.mutateAsync({ supplierId, request });
    toast({ title: "Supplier updated", description: `${updated.name} was saved.` });
  }

  async function handleToggleStatus(supplier: Supplier) {
    if (supplier.status === "ACTIVE") {
      setSupplierToDeactivate(supplier);
      return;
    }
    setActivatingId(supplier.id);
    try {
      await activateSupplier.mutateAsync(supplier.id);
      toast({ title: "Supplier activated", description: `${supplier.name} can be used again.` });
    } catch (error) {
      toast({
        title: "Could not activate supplier",
        description: getErrorMessage(error),
        variant: "error",
      });
    } finally {
      setActivatingId(null);
    }
  }

  async function confirmDeactivate() {
    if (!supplierToDeactivate) return;
    try {
      await deactivateSupplier.mutateAsync(supplierToDeactivate.id);
      toast({
        title: "Supplier deactivated",
        description: `${supplierToDeactivate.name} is disabled.`,
      });
      setSupplierToDeactivate(null);
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
      <Card>
        <p className="text-sm font-medium text-foreground">You do not have access to suppliers</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask an administrator to give your role the SUPPLIER_READ permission.
        </p>
      </Card>
    );
  }

  const data = query.data;

  return (
    <div className="flex flex-col gap-4">
      <SuppliersToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        onAdd={openCreate}
        canAdd={canCreate}
      />

      <Card padded={false}>
        <SuppliersTable
          suppliers={data?.content ?? []}
          loading={auth.isLoading || query.isLoading}
          error={query.isError ? getErrorMessage(query.error, "Could not load suppliers.") : null}
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
            noun="suppliers"
            onPageChange={setPage}
            disabled={query.isFetching}
          />
        )}
      </Card>

      <SupplierDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        supplier={editing}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <ConfirmDialog
        open={supplierToDeactivate !== null}
        onClose={closeDeactivate}
        onConfirm={confirmDeactivate}
        title="Deactivate this supplier?"
        description={
          supplierToDeactivate
            ? `${supplierToDeactivate.name} will be disabled and can no longer be used for new operations. You can activate the supplier again at any time.`
            : undefined
        }
        confirmLabel="Deactivate"
        destructive
        loading={deactivateSupplier.isPending}
      />
    </div>
  );
}