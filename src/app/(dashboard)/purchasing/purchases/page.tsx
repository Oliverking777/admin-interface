"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmDeliveryModal from "@/components/purchase/ConfirmDeliveryModal";
import DirectPurchaseModal from "@/components/purchase/DirectPurchaseModal";
import { NoAccessCard } from "@/components/purchase/PageParts";
import PurchaseFormModal from "@/components/purchase/PurchaseFormModal";
import PurchasesTable from "@/components/purchase/PurchasesTable";
import PurchasesToolbar, {
  statusFilterQuery,
  type PurchaseStatusFilter,
} from "@/components/purchase/PurchasesToolbar";
import { dayRangeToQuery } from "@/components/purchase/purchase-display";
import Card from "@/components/ui/Card";
import Pagination from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/hooks/iam/use-auth";
import {
  useConfirmPurchase,
  useCreatePurchase,
  usePurchases,
  useRecordDirectPurchase,
  useUpdatePurchase,
} from "@/hooks/purchase/use-purchase";
import { usePurchaseOptions } from "@/hooks/purchase/use-purchase-options";
import { getErrorMessage } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import type { Purchase } from "@/types/purchase/purchase";
import type {
  ConfirmPurchaseRequest,
  CreatePurchaseRequest,
  DirectPurchaseRequest,
  UpdatePurchaseRequest,
} from "@/types/purchase/purchase-dto";

const PAGE_SIZE = 20;

export default function PurchasesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();

  const canRead = auth.hasPermission(PERMISSIONS.PURCHASE_READ);
  const canCreate = auth.hasPermission(PERMISSIONS.PURCHASE_CREATE);
  const canConfirm = auth.hasPermission(PERMISSIONS.RECEIPT_CONFIRM);
  // A direct purchase creates and confirms in one call, so it needs both permissions.
  const canRecordDirect = canCreate && canConfirm;

  const [filter, setFilter] = useState<PurchaseStatusFilter>("ALL");
  const [supplierId, setSupplierId] = useState("");
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");
  const [page, setPage] = useState(0);

  // A new filter starts again from the first page.
  useEffect(() => {
    setPage(0);
  }, [filter, supplierId, fromDay, toDay]);

  const range = useMemo(() => dayRangeToQuery(fromDay, toDay), [fromDay, toDay]);
  const query = usePurchases(
    {
      page,
      size: PAGE_SIZE,
      ...statusFilterQuery(filter),
      supplierId: supplierId || undefined,
      ...range,
    },
    { enabled: canRead },
  );
  const options = usePurchaseOptions({ enabled: canRead });

  const createPurchase = useCreatePurchase();
  const updatePurchase = useUpdatePurchase();
  const confirmPurchase = useConfirmPurchase();
  const recordDirect = useRecordDirectPurchase();

  const [createOpen, setCreateOpen] = useState(false);
  const [delivering, setDelivering] = useState<Purchase | null>(null);
  const [directOpen, setDirectOpen] = useState(false);

  // Stable identities: Modal re-runs its effects when these change.
  const closeCreate = useCallback(() => setCreateOpen(false), []);
  const closeDelivery = useCallback(() => setDelivering(null), []);
  const closeDirect = useCallback(() => setDirectOpen(false), []);

  // If the current page no longer exists (e.g. after a filter change elsewhere), go back.
  const totalPages = query.data?.totalPages;
  useEffect(() => {
    if (totalPages !== undefined && page > 0 && page >= totalPages) setPage(Math.max(totalPages - 1, 0));
  }, [page, totalPages]);

  async function handleCreate(request: CreatePurchaseRequest) {
    const created = await createPurchase.mutateAsync(request);
    toast({ title: "Order placed", description: `${created.code} is waiting for delivery.` });
    router.push(`/purchasing/purchases/${created.id}`);
  }

  // Only used by the form in edit mode, which this page never opens; required by the form's props.
  async function handleUpdate(purchaseId: string, request: UpdatePurchaseRequest) {
    await updatePurchase.mutateAsync({ purchaseId, request });
  }

  async function handleConfirmDelivery(purchaseId: string, request: ConfirmPurchaseRequest) {
    const confirmed = await confirmPurchase.mutateAsync({ purchaseId, request });
    toast({
      title: confirmed.hasDiscrepancy ? "Delivered with problems" : "Delivery confirmed",
      description: `The accepted goods of ${confirmed.code} were added to stock.`,
    });
  }

  async function handleRecordDirect(request: DirectPurchaseRequest) {
    const recorded = await recordDirect.mutateAsync(request);
    toast({ title: "Purchase recorded", description: `${recorded.code} was added to stock.` });
    router.push(`/purchasing/purchases/${recorded.id}`);
    return recorded;
  }

  if (!auth.isLoading && !canRead) {
    return <NoAccessCard what="purchases" permission="PURCHASE_READ" />;
  }

  const data = query.data;

  return (
    <div className="flex flex-col gap-4">
      <PurchasesToolbar
        filter={filter}
        onFilterChange={setFilter}
        supplierId={supplierId}
        onSupplierChange={setSupplierId}
        suppliers={options.suppliers}
        fromDay={fromDay}
        toDay={toDay}
        onFromDayChange={setFromDay}
        onToDayChange={setToDay}
        onAdd={() => setCreateOpen(true)}
        canAdd={canCreate}
        onRecordDirect={canRecordDirect ? () => setDirectOpen(true) : undefined}
      />

      <Card padded={false}>
        <PurchasesTable
          purchases={data?.content ?? []}
          loading={auth.isLoading || query.isLoading}
          error={query.isError ? getErrorMessage(query.error, "Could not load purchases.") : null}
          filtered={filter !== "ALL" || supplierId !== "" || fromDay !== "" || toDay !== ""}
          onRetry={() => void query.refetch()}
          onConfirmDelivery={canConfirm ? setDelivering : undefined}
        />
        {data && (
          <Pagination
            page={data.page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            noun="purchases"
            onPageChange={setPage}
            disabled={query.isFetching}
          />
        )}
      </Card>

      <PurchaseFormModal
        open={createOpen}
        onClose={closeCreate}
        purchase={null}
        suppliers={options.suppliers}
        locations={options.locations}
        products={options.products}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <DirectPurchaseModal
        open={directOpen}
        onClose={closeDirect}
        suppliers={options.suppliers}
        locations={options.locations}
        products={options.products}
        onRecord={handleRecordDirect}
      />

      <ConfirmDeliveryModal
        open={delivering !== null}
        onClose={closeDelivery}
        purchase={delivering}
        unitLabel={options.unitLabel}
        onConfirm={handleConfirmDelivery}
      />
    </div>
  );
}