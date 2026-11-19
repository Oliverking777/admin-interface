"use client";

/**
 * Inventory > Adjustments. Corrections to stock (damage, loss, supplier return, opening stock, count
 * correction). Asking for one changes no stock: a user with STOCK_ADJUST_APPROVE (the requester included)
 * approves or rejects it, and only an approval moves the quantity. Adjustments are never deleted.
 * Filters and paging run on the backend.
 */

import { useCallback, useMemo, useState } from "react";

import AdjustmentDetailDrawer from "@/components/inventory/AdjustmentDetailDrawer";
import AdjustmentFilters from "@/components/inventory/AdjustmentFilters";
import AdjustmentFormModal from "@/components/inventory/AdjustmentFormModal";
import AdjustmentTable from "@/components/inventory/AdjustmentTable";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Pagination from "@/components/ui/Pagination";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import { useAllLocations, useMyLocation } from "@/hooks/business/use-locations";
import { useAuth } from "@/hooks/iam/use-auth";
import { useStockAdjustments } from "@/hooks/inventory/use-inventory";
import { useAllProducts } from "@/hooks/product/use-products";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { toStockVariants } from "@/lib/inventory/stock-variants";
import type { AdjustmentStatus } from "@/types/inventory/inventory";

type StatusTab = "ALL" | AdjustmentStatus;

const TABS: TabItem<StatusTab>[] = [
  { value: "ALL", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export default function AdjustmentsPage() {
  const { hasPermission } = useAuth();
  const myLocation = useMyLocation().data ?? null;
  const locations = useAllLocations().data ?? [];
  const productsQuery = useAllProducts();

  const [tab, setTab] = useState<StatusTab>("ALL");
  const [locationChoice, setLocationChoice] = useState("");
  const [productId, setProductId] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // A user who belongs to one location only ever sees adjustments of that location.
  const lockedLocationId = myLocation?.id ?? null;
  const locationId = lockedLocationId ?? locationChoice;

  // Stock is kept per variant: what is picked, filtered and shown is a variant.
  const variants = useMemo(() => toStockVariants(productsQuery.data ?? []), [productsQuery.data]);
  const variantsById = useMemo(() => new Map(variants.map((v) => [v.id, v])), [variants]);
  const variantOptions = useMemo(() => variants.map((v) => ({ id: v.id, name: v.label })), [variants]);

  const adjustments = useStockAdjustments({
    page,
    size: pageSize,
    status: tab === "ALL" ? undefined : tab,
    locationId: locationId || undefined,
    productId: productId || undefined,
  });

  const data = adjustments.data;
  const hasActiveFilters = productId !== "" || (!lockedLocationId && locationChoice !== "");

  const closeDrawer = useCallback(() => setSelectedId(null), []);
  const closeForm = useCallback(() => setFormOpen(false), []);

  function openForm() {
    setFormKey((key) => key + 1); // a new key gives the form fresh state
    setFormOpen(true);
  }

  function clearFilters() {
    setProductId("");
    if (!lockedLocationId) setLocationChoice("");
    setPage(0);
  }

  if (!hasPermission(PERMISSIONS.STOCK_ADJUST_READ)) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">You do not have permission to view stock adjustments.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          aria-label="Adjustment status"
          items={TABS}
          value={tab}
          onChange={(value) => {
            setTab(value);
            setPage(0);
          }}
        />
        {hasPermission(PERMISSIONS.STOCK_ADJUST_CREATE) && <Button onClick={openForm}>Request adjustment</Button>}
      </div>

      <AdjustmentFilters
        locationId={locationId}
        onLocationChange={(value) => {
          setLocationChoice(value);
          setPage(0);
        }}
        locationLocked={lockedLocationId !== null}
        locations={locations}
        productId={productId}
        onProductChange={(value) => {
          setProductId(value);
          setPage(0);
        }}
        products={variantOptions}
        pageSize={pageSize}
        onPageSizeChange={(value) => {
          setPageSize(value);
          setPage(0);
        }}
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
      />

      {adjustments.error ? (
        <Card className="flex items-center justify-between gap-3">
          <p role="alert" className="text-sm text-red-600">
            {adjustments.error.message}
          </p>
          <Button variant="secondary" size="sm" onClick={() => void adjustments.refetch()}>
            Try again
          </Button>
        </Card>
      ) : (
        <Card padded={false}>
          <AdjustmentTable
            rows={data?.content ?? []}
            variantsById={variantsById}
            loading={adjustments.isLoading}
            onOpen={(adjustment) => setSelectedId(adjustment.id)}
          />
          {data && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              totalElements={data.totalElements}
              noun="adjustments"
              onPageChange={setPage}
              disabled={adjustments.isFetching}
            />
          )}
        </Card>
      )}

      <AdjustmentDetailDrawer adjustmentId={selectedId} variantsById={variantsById} onClose={closeDrawer} />

      <AdjustmentFormModal
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