"use client";

/**
 * Inventory > Initializations. The starting stock of products at a location, entered in bulk and saved
 * all together. It completes at once and cannot be edited or deleted. A product can only be initialized at a
 * location where it has no stock yet; later corrections go through stock adjustments.
 * Filters and paging run on the backend.
 */

import { useCallback, useMemo, useState } from "react";

import InitializationDetailDrawer from "@/components/inventory/InitializationDetailDrawer";
import InitializationFilters from "@/components/inventory/InitializationFilters";
import InitializationFormModal from "@/components/inventory/InitializationFormModal";
import InitializationTable from "@/components/inventory/InitializationTable";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Pagination from "@/components/ui/Pagination";
import { useAllLocations, useMyLocation } from "@/hooks/business/use-locations";
import { useAuth } from "@/hooks/iam/use-auth";
import { useStockInitializations } from "@/hooks/inventory/use-inventory";
import { useAllProducts } from "@/hooks/product/use-products";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { toStockVariants } from "@/lib/inventory/stock-variants";
import type { StockInitializationStatus } from "@/types/inventory/inventory";

export default function InitializationsPage() {
  const { hasPermission } = useAuth();
  const myLocation = useMyLocation().data ?? null;
  const locations = useAllLocations().data ?? [];
  const productsQuery = useAllProducts();
  // Stock is kept per variant: each line of an initialization is a variant.
  const variants = useMemo(() => toStockVariants(productsQuery.data ?? []), [productsQuery.data]);

  const [locationChoice, setLocationChoice] = useState("");
  const [status, setStatus] = useState<StockInitializationStatus | "">("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // A user who belongs to one location only ever sees that location's initializations.
  const lockedLocationId = myLocation?.id ?? null;
  const locationId = lockedLocationId ?? locationChoice;

  const initializations = useStockInitializations({
    page,
    size: pageSize,
    status: status || undefined,
    locationId: locationId || undefined,
  });

  const data = initializations.data;
  const hasActiveFilters = status !== "" || (!lockedLocationId && locationChoice !== "");

  const closeDrawer = useCallback(() => setSelectedId(null), []);
  const closeForm = useCallback(() => setFormOpen(false), []);

  function openForm() {
    setFormKey((key) => key + 1); // a new key gives the form fresh state
    setFormOpen(true);
  }

  function clearFilters() {
    setStatus("");
    if (!lockedLocationId) setLocationChoice("");
    setPage(0);
  }

  if (!hasPermission(PERMISSIONS.STOCK_READ)) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">You do not have permission to view stock initializations.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted-foreground">
          The starting stock of products at a location. A product can be initialized only where it has no stock yet.
        </p>
        {hasPermission(PERMISSIONS.STOCK_READ) && <Button onClick={openForm}>Initialize stock</Button>}
      </div>

      <InitializationFilters
        locationId={locationId}
        onLocationChange={(value) => {
          setLocationChoice(value);
          setPage(0);
        }}
        locationLocked={lockedLocationId !== null}
        locations={locations}
        status={status}
        onStatusChange={(value) => {
          setStatus(value);
          setPage(0);
        }}
        pageSize={pageSize}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(0);
        }}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      />

      {initializations.error ? (
        <Card className="flex items-center justify-between gap-3">
          <p role="alert" className="text-sm text-red-600">
            {initializations.error.message}
          </p>
          <Button variant="secondary" size="sm" onClick={() => void initializations.refetch()}>
            Try again
          </Button>
        </Card>
      ) : (
        <Card padded={false}>
          <InitializationTable
            rows={data?.content ?? []}
            loading={initializations.isLoading}
            onOpen={(initialization) => setSelectedId(initialization.id)}
          />
          {data && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              totalElements={data.totalElements}
              noun="initializations"
              onPageChange={setPage}
              disabled={initializations.isFetching}
            />
          )}
        </Card>
      )}

      <InitializationDetailDrawer initializationId={selectedId} onClose={closeDrawer} />

      <InitializationFormModal
        key={formKey}
        open={formOpen}
        onClose={closeForm}
        locations={locations}
        products={variants}
        lockedLocationId={lockedLocationId}
        onSaved={(saved) => setSelectedId(saved.id)}
      />
    </div>
  );
}