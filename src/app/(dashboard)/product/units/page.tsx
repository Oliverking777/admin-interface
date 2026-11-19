"use client";

// app/.../product/units/page.tsx
import { useCallback, useState } from "react";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Pagination from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/ToastProvider";
import UnitDrawer from "@/components/product/units/UnitDrawer";
import UnitsTable, { type UnitAbilities } from "@/components/product/units/UnitsTable";
import UnitsToolbar, { type UnitStatusFilter } from "@/components/product/units/UnitsToolbar";
import { useAuth } from "@/hooks/iam/use-auth";
import {
  useActivateUnit,
  useCreateUnit,
  useDeactivateUnit,
  useUnits,
  useUpdateUnit,
} from "@/hooks/product/use-unit";
import { getErrorMessage } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import type { Unit } from "@/types/product/unit";
import type { CreateUnitRequest, UpdateUnitRequest } from "@/types/product/unit-dto";

const PAGE_SIZE = 20;

export default function UnitsPage() {
  const { toast } = useToast();
  const auth = useAuth();

  const canRead = auth.hasPermission(PERMISSIONS.UNIT_READ);
  const canCreate = auth.hasPermission(PERMISSIONS.UNIT_CREATE);
  const abilities: UnitAbilities = {
    update: auth.hasPermission(PERMISSIONS.UNIT_UPDATE),
    activate: auth.hasPermission(PERMISSIONS.UNIT_UPDATE),
    deactivate: auth.hasPermission(PERMISSIONS.UNIT_DEACTIVATE),
  };

  const [filter, setFilter] = useState<UnitStatusFilter>("ALL");
  const [page, setPage] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Unit | null>(null);
  const [unitToDeactivate, setUnitToDeactivate] = useState<Unit | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const query = useUnits(
    { page, size: PAGE_SIZE, status: filter === "ALL" ? undefined : filter },
    { enabled: canRead },
  );
  const createUnit = useCreateUnit();
  const updateUnit = useUpdateUnit();
  const activateUnit = useActivateUnit();
  const deactivateUnit = useDeactivateUnit();

  // Stable identities: Drawer and ConfirmDialog re-run effects when these change.
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeDeactivate = useCallback(() => setUnitToDeactivate(null), []);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(unit: Unit) {
    setEditing(unit);
    setDrawerOpen(true);
  }

  async function handleCreate(request: CreateUnitRequest) {
    const unit = await createUnit.mutateAsync(request);
    toast({ title: "Unit created", description: `${unit.name} (${unit.code}) is ready to assign.` });
  }

  async function handleUpdate(unitId: string, request: UpdateUnitRequest) {
    const unit = await updateUnit.mutateAsync({ unitId, request });
    toast({ title: "Unit renamed", description: `The unit is now called ${unit.name}.` });
  }

  async function handleToggleStatus(unit: Unit) {
    if (unit.status === "ACTIVE") {
      setUnitToDeactivate(unit);
      return;
    }
    setActivatingId(unit.id);
    try {
      await activateUnit.mutateAsync(unit.id);
      toast({ title: "Unit activated", description: `${unit.name} can be assigned to products again.` });
    } catch (error) {
      toast({ title: "Could not activate unit", description: getErrorMessage(error), variant: "error" });
    } finally {
      setActivatingId(null);
    }
  }

  async function confirmDeactivate() {
    if (!unitToDeactivate) return;
    try {
      await deactivateUnit.mutateAsync(unitToDeactivate.id);
      toast({
        title: "Unit deactivated",
        description: `${unitToDeactivate.name} can no longer be assigned. Products already using it keep working.`,
      });
      setUnitToDeactivate(null);
    } catch (error) {
      toast({ title: "Could not deactivate unit", description: getErrorMessage(error), variant: "error" });
    }
  }

  function handleFilterChange(next: UnitStatusFilter) {
    setFilter(next);
    setPage(0);
  }

  if (!auth.isLoading && !canRead) {
    return (
      <Card>
        <p className="text-sm font-medium text-foreground">You do not have access to units</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask an administrator to give your role the UNIT_READ permission.
        </p>
      </Card>
    );
  }

  const data = query.data;

  return (
    <div className="flex flex-col gap-4">
      <UnitsToolbar filter={filter} onFilterChange={handleFilterChange} onAdd={openCreate} canAdd={canCreate} />

      <Card padded={false}>
        <UnitsTable
          units={data?.content ?? []}
          loading={auth.isLoading || query.isLoading}
          error={query.isError ? getErrorMessage(query.error, "Could not load units.") : null}
          filtered={filter !== "ALL"}
          abilities={abilities}
          busyId={activatingId}
          onRetry={() => void query.refetch()}
          onEdit={openEdit}
          onToggleStatus={handleToggleStatus}
        />
        {data && (
          <Pagination
            page={page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            noun="units"
            onPageChange={setPage}
            disabled={query.isFetching}
          />
        )}
      </Card>

      <UnitDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        unit={editing}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <ConfirmDialog
        open={unitToDeactivate !== null}
        onClose={closeDeactivate}
        onConfirm={confirmDeactivate}
        title="Deactivate this unit?"
        description={
          unitToDeactivate
            ? `${unitToDeactivate.name} can no longer be assigned to products. Products already using it keep working, and you can activate it again at any time.`
            : undefined
        }
        confirmLabel="Deactivate"
        destructive
        loading={deactivateUnit.isPending}
      />
    </div>
  );
}