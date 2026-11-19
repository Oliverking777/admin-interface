"use client";

import { useCallback, useMemo, useState } from "react";
import LocationDrawer from "@/components/locations/LocationDrawer";
import LocationsTable, {
  type LocationAbilities,
  type LocationSortKey,
  type LocationSortState,
} from "@/components/locations/LocationsTable";
import LocationsToolbar, { type LocationTypeFilter } from "@/components/locations/LocationsToolbar";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  useActivateLocation,
  useAllLocations,
  useCreateLocation,
  useDeactivateLocation,
  useUpdateLocation,
} from "@/hooks/business/use-locations";
import { useAuth } from "@/hooks/iam/use-auth";
import { getErrorMessage } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import type { Location } from "@/types/business/location";
import type { CreateLocationRequest, UpdateLocationRequest } from "@/types/business/location-dto";

export default function LocationsPage() {
  const { toast } = useToast();
  const auth = useAuth();

  const canRead = auth.hasPermission(PERMISSIONS.LOCATION_READ);
  const canCreate = auth.hasPermission(PERMISSIONS.LOCATION_CREATE);
  const abilities: LocationAbilities = {
    update: auth.hasPermission(PERMISSIONS.LOCATION_UPDATE),
    activate: auth.hasPermission(PERMISSIONS.LOCATION_ACTIVATE),
    deactivate: auth.hasPermission(PERMISSIONS.LOCATION_DEACTIVATE),
  };

  const query = useAllLocations({ enabled: canRead });
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const activateLocation = useActivateLocation();
  const deactivateLocation = useDeactivateLocation();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LocationTypeFilter>("ALL");
  const [sort, setSort] = useState<LocationSortState>({ key: "name", direction: "asc" });

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [locationToDeactivate, setLocationToDeactivate] = useState<Location | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  // Stable identities: Drawer and ConfirmDialog re-run effects when these change.
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const closeDeactivate = useCallback(() => setLocationToDeactivate(null), []);

  const toggleSort = useCallback((key: LocationSortKey) => {
    setSort((cur) =>
      cur.key === key
        ? { key, direction: cur.direction === "asc" ? "desc" : "asc" }
        : { key, direction: "asc" },
    );
  }, []);

  const visibleLocations = useMemo(() => {
    const term = search.trim().toLowerCase();

    const filtered = (query.data ?? []).filter((l) => {
      if (filter !== "ALL" && l.type !== filter) return false;
      if (!term) return true;
      return (
        l.name.toLowerCase().includes(term) ||
        l.code.toLowerCase().includes(term) ||
        (l.address ?? "").toLowerCase().includes(term)
      );
    });

    const factor = sort.direction === "asc" ? 1 : -1;
    return [...filtered].sort(
      (a, b) => a[sort.key].localeCompare(b[sort.key], undefined, { sensitivity: "base" }) * factor,
    );
  }, [query.data, search, filter, sort]);

  function openCreate() {
    setEditing(null);
    setDrawerOpen(true);
  }

  function openEdit(location: Location) {
    setEditing(location);
    setDrawerOpen(true);
  }

  async function handleCreate(request: CreateLocationRequest) {
    const created = await createLocation.mutateAsync(request);
    toast({ title: "Location created", description: `${created.name} (${created.code}) is ready.` });
  }

  async function handleUpdate(locationId: string, request: UpdateLocationRequest) {
    const updated = await updateLocation.mutateAsync({ locationId, request });
    toast({ title: "Location updated", description: `${updated.name} was saved.` });
  }

  async function handleToggleStatus(location: Location) {
    if (location.status === "ACTIVE") {
      setLocationToDeactivate(location);
      return;
    }
    setActivatingId(location.id);
    try {
      await activateLocation.mutateAsync(location.id);
      toast({ title: "Location activated", description: `${location.name} is operational again.` });
    } catch (error) {
      toast({
        title: "Could not activate location",
        description: getErrorMessage(error),
        variant: "error",
      });
    } finally {
      setActivatingId(null);
    }
  }

  async function confirmDeactivate() {
    if (!locationToDeactivate) return;
    try {
      await deactivateLocation.mutateAsync(locationToDeactivate.id);
      toast({
        title: "Location deactivated",
        description: `${locationToDeactivate.name} is disabled. Its users stay assigned.`,
      });
      setLocationToDeactivate(null);
    } catch (error) {
      toast({
        title: "Could not deactivate location",
        description: getErrorMessage(error),
        variant: "error",
      });
    }
  }

  if (!auth.isLoading && !canRead) {
    return (
      <Card>
        <p className="text-sm font-medium text-foreground">You do not have access to locations</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask an administrator to give your role the LOCATION_READ permission.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <LocationsToolbar
        search={search}
        onSearchChange={setSearch}
        filter={filter}
        onFilterChange={setFilter}
        onAdd={openCreate}
        canAdd={canCreate}
      />

      <Card padded={false}>
        <LocationsTable
          locations={visibleLocations}
          loading={auth.isLoading || query.isLoading}
          error={query.isError ? getErrorMessage(query.error, "Could not load locations.") : null}
          filtered={search.trim() !== "" || filter !== "ALL"}
          sort={sort}
          abilities={abilities}
          busyId={activatingId}
          onSort={toggleSort}
          onRetry={() => void query.refetch()}
          onEdit={openEdit}
          onToggleStatus={handleToggleStatus}
        />
      </Card>

      <LocationDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        location={editing}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <ConfirmDialog
        open={locationToDeactivate !== null}
        onClose={closeDeactivate}
        onConfirm={confirmDeactivate}
        title="Deactivate this location?"
        description={
          locationToDeactivate
            ? `${locationToDeactivate.name} will be disabled, and no new users can be assigned to it. Its current users stay assigned, and you can activate it again at any time.`
            : undefined
        }
        confirmLabel="Deactivate"
        destructive
        loading={deactivateLocation.isPending}
      />
    </div>
  );
}