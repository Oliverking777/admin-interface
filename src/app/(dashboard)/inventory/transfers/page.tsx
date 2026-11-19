"use client";

/**
 * Inventory > Transfers. Lists transfers between locations (filtered and paged by the backend),
 * shows the goods currently in transit, and opens a transfer to act on it.
 * Stock moves when a transfer is sent, received or cancelled, never from this list.
 */

import { useCallback, useMemo, useState } from "react";

import InTransitPanel from "@/components/inventory/InTransitPanel";
import TransferDetailDrawer from "@/components/inventory/TransferDetailDrawer";
import TransferFilters from "@/components/inventory/TransferFilters";
import TransferFormModal from "@/components/inventory/TransferFormModal";
import TransferTable from "@/components/inventory/TransferTable";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import { useAllLocations, useMyLocation } from "@/hooks/business/use-locations";
import { useAuth } from "@/hooks/iam/use-auth";
import { useTransfers } from "@/hooks/inventory/use-transfers";
import { useAllProducts } from "@/hooks/product/use-products";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { toStockVariants } from "@/lib/inventory/stock-variants";
import {
  startOfDayIso,
  startOfNextDayIso,
  statusFilterQuery,
  type TransferStatusFilter,
} from "@/lib/inventory/transfer-format";

type View = "TRANSFERS" | "IN_TRANSIT";

const VIEWS: TabItem<View>[] = [
  { value: "TRANSFERS", label: "Transfers" },
  { value: "IN_TRANSIT", label: "Goods in transit" },
];

export default function TransfersPage() {
  const { hasPermission } = useAuth();
  const myLocation = useMyLocation().data ?? null;
  const locationsQuery = useAllLocations();
  const productsQuery = useAllProducts();

  const [view, setView] = useState<View>("TRANSFERS");
  const [locationChoice, setLocationChoice] = useState("");
  const [status, setStatus] = useState<TransferStatusFilter>("");
  const [productId, setProductId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);

  // A user who belongs to one location only ever sees transfers of that location.
  const lockedLocationId = myLocation?.id ?? null;
  const locationId = lockedLocationId ?? locationChoice;

  const locations = locationsQuery.data ?? [];
  // Stock moves per variant: the form and the product filter list variants.
  const variants = useMemo(() => toStockVariants(productsQuery.data ?? []), [productsQuery.data]);
  const variantOptions = useMemo(() => variants.map((v) => ({ id: v.id, name: v.label })), [variants]);

  const transfers = useTransfers(
    {
      page,
      size: pageSize,
      locationId: locationId || undefined,
      ...statusFilterQuery(status),
      productId: productId || undefined,
      from: from ? startOfDayIso(from) : undefined,
      to: to ? startOfNextDayIso(to) : undefined,
    },
    { enabled: view === "TRANSFERS" },
  );

  const data = transfers.data;
  const hasActiveFilters =
    status !== "" || productId !== "" || from !== "" || to !== "" || (!lockedLocationId && locationChoice !== "");

  const closeDrawer = useCallback(() => setSelectedId(null), []);
  const closeForm = useCallback(() => setFormOpen(false), []);

  function openForm() {
    setFormKey((key) => key + 1); // a new key gives the form fresh state
    setFormOpen(true);
  }

  function clearFilters() {
    setStatus("");
    setProductId("");
    setFrom("");
    setTo("");
    if (!lockedLocationId) setLocationChoice("");
    setPage(0);
  }

  if (!hasPermission(PERMISSIONS.TRANSFER_READ)) {
    return (
      <Card>
        <p className="text-sm text-muted-foreground">You do not have permission to view transfers.</p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs aria-label="Transfers view" items={VIEWS} value={view} onChange={setView} />
        {hasPermission(PERMISSIONS.TRANSFER_CREATE) && <Button onClick={openForm}>New transfer</Button>}
      </div>

      {view === "TRANSFERS" ? (
        <>
          <TransferFilters
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
            productId={productId}
            onProductChange={(value) => {
              setProductId(value);
              setPage(0);
            }}
            products={variantOptions}
            from={from}
            onFromChange={(value) => {
              setFrom(value);
              setPage(0);
            }}
            to={to}
            onToChange={(value) => {
              setTo(value);
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

          {transfers.error ? (
            <Card className="flex items-center justify-between gap-3">
              <p role="alert" className="text-sm text-red-600">
                {transfers.error.message}
              </p>
              <Button variant="secondary" size="sm" onClick={() => void transfers.refetch()}>
                Try again
              </Button>
            </Card>
          ) : (
            <Card padded={false}>
              <TransferTable
                rows={data?.content ?? []}
                loading={transfers.isLoading}
                onOpen={(transfer) => setSelectedId(transfer.id)}
              />
              {data && (
                <Pagination
                  page={data.page}
                  totalPages={data.totalPages}
                  totalElements={data.totalElements}
                  noun="transfers"
                  onPageChange={setPage}
                  disabled={transfers.isFetching}
                />
              )}
            </Card>
          )}
        </>
      ) : (
        <>
          {lockedLocationId === null && (
            <div>
              <Select
                aria-label="Location"
                value={locationChoice}
                onChange={(e) => setLocationChoice(e.target.value)}
                className="w-auto py-2 text-sm"
              >
                <option value="">All locations</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <InTransitPanel locationId={locationId} />
        </>
      )}

      <TransferDetailDrawer transferId={selectedId} onClose={closeDrawer} />

      <TransferFormModal
        key={formKey}
        open={formOpen}
        onClose={closeForm}
        locations={locations}
        products={variants}
        lockedSourceId={lockedLocationId}
        onSaved={(saved) => setSelectedId(saved.id)}
      />
    </div>
  );
}