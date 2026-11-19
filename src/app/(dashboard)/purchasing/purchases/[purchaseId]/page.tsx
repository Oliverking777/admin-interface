"use client";

import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import ConfirmDeliveryModal from "@/components/purchase/ConfirmDeliveryModal";
import { BackLink, DetailSkeleton, NoAccessCard, SectionCard } from "@/components/purchase/PageParts";
import PurchaseFormModal from "@/components/purchase/PurchaseFormModal";
import PurchaseHeader, { type PurchaseAbilities } from "@/components/purchase/PurchaseHeader";
import PurchaseItemModal from "@/components/purchase/PurchaseItemModal";
import PurchaseItemsTable from "@/components/purchase/PurchaseItemsTable";
import ReasonDialog from "@/components/purchase/ReasonDialog";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/hooks/iam/use-auth";
import {
  useAddPurchaseItem,
  useCancelPurchase,
  useChangePurchaseItem,
  useConfirmPurchase,
  usePurchase,
  useRemovePurchaseItem,
  useUpdatePurchase,
} from "@/hooks/purchase/use-purchase";
import { usePurchaseOptions } from "@/hooks/purchase/use-purchase-options";
import { getErrorMessage } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { isPurchaseOpen, type PurchaseItem } from "@/types/purchase/purchase";
import type {
  ChangePurchaseItemRequest,
  ConfirmPurchaseRequest,
  PurchaseLineRequest,
  UpdatePurchaseRequest,
} from "@/types/purchase/purchase-dto";

const BACK = { href: "/purchasing/purchases", label: "Back to purchases" };

export default function PurchaseDetailPage() {
  const { purchaseId } = useParams<{ purchaseId: string }>();
  const { toast } = useToast();
  const auth = useAuth();

  const canRead = auth.hasPermission(PERMISSIONS.PURCHASE_READ);
  const abilities: PurchaseAbilities = {
    edit: auth.hasPermission(PERMISSIONS.PURCHASE_CREATE),
    confirm: auth.hasPermission(PERMISSIONS.RECEIPT_CONFIRM),
    cancel: auth.hasPermission(PERMISSIONS.PURCHASE_CANCEL),
  };

  const query = usePurchase(purchaseId, { enabled: canRead });
  const options = usePurchaseOptions({ enabled: canRead });

  const updatePurchase = useUpdatePurchase();
  const addItem = useAddPurchaseItem();
  const changeItem = useChangePurchaseItem();
  const removeItem = useRemovePurchaseItem();
  const confirmPurchase = useConfirmPurchase();
  const cancelPurchase = useCancelPurchase();

  const [editOpen, setEditOpen] = useState(false);
  const [itemModal, setItemModal] = useState<{ open: boolean; item: PurchaseItem | null }>({ open: false, item: null });
  const [itemToRemove, setItemToRemove] = useState<PurchaseItem | null>(null);
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // Stable identities: Modal and ConfirmDialog re-run their effects when these change.
  const closeEdit = useCallback(() => setEditOpen(false), []);
  const closeItemModal = useCallback(() => setItemModal((m) => ({ ...m, open: false })), []);
  const closeRemove = useCallback(() => setItemToRemove(null), []);
  const closeDelivery = useCallback(() => setDeliveryOpen(false), []);
  const closeCancel = useCallback(() => setCancelOpen(false), []);

  const purchase = query.data;

  /* ----------------------------------------------------------- handlers */

  async function handleUpdate(id: string, request: UpdatePurchaseRequest) {
    const updated = await updatePurchase.mutateAsync({ purchaseId: id, request });
    toast({ title: "Purchase updated", description: `${updated.code} was saved.` });
  }

  async function handleAddItem(request: PurchaseLineRequest) {
    if (!purchase) return;
    await addItem.mutateAsync({ purchaseId: purchase.id, request });
    toast({ title: "Line added" });
  }

  async function handleChangeItem(purchaseItemId: string, request: ChangePurchaseItemRequest) {
    if (!purchase) return;
    await changeItem.mutateAsync({ purchaseId: purchase.id, purchaseItemId, request });
    toast({ title: "Line updated" });
  }

  async function confirmRemove() {
    if (!purchase || !itemToRemove) return;
    try {
      await removeItem.mutateAsync({ purchaseId: purchase.id, purchaseItemId: itemToRemove.id });
      toast({ title: "Line removed" });
      setItemToRemove(null);
    } catch (error) {
      toast({ title: "Could not remove the line", description: getErrorMessage(error), variant: "error" });
    }
  }

  async function handleConfirmDelivery(id: string, request: ConfirmPurchaseRequest) {
    const confirmed = await confirmPurchase.mutateAsync({ purchaseId: id, request });
    toast({
      title: confirmed.hasDiscrepancy ? "Delivered with problems" : "Delivery confirmed",
      description: "The accepted goods were added to stock.",
    });
  }

  async function handleCancel(reason: string) {
    if (!purchase) return;
    const cancelled = await cancelPurchase.mutateAsync({ purchaseId: purchase.id, request: { reason } });
    toast({ title: "Purchase cancelled", description: `${cancelled.code} is cancelled.` });
  }

  /* --------------------------------------------------------------- states */

  if (!auth.isLoading && !canRead) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink {...BACK} />
        <NoAccessCard what="purchases" permission="PURCHASE_READ" />
      </div>
    );
  }

  if (auth.isLoading || query.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink {...BACK} />
        <DetailSkeleton />
      </div>
    );
  }

  if (query.isError || !purchase) {
    const notFound = query.error?.isNotFound ?? false;
    return (
      <div className="flex flex-col gap-4">
        <BackLink {...BACK} />
        <Card>
          <p role="alert" className="text-sm font-medium text-foreground">
            {notFound ? "This purchase does not exist" : getErrorMessage(query.error, "Could not load the purchase.")}
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

  const editable = abilities.edit && isPurchaseOpen(purchase.status);

  return (
    <div className="flex flex-col gap-4">
      <BackLink {...BACK} />

      <PurchaseHeader
        purchase={purchase}
        abilities={abilities}
        onEdit={() => setEditOpen(true)}
        onConfirmDelivery={() => setDeliveryOpen(true)}
        onCancel={() => setCancelOpen(true)}
      />

      <SectionCard
        title="Lines"
        action={
          editable && (
            <Button size="sm" variant="secondary" onClick={() => setItemModal({ open: true, item: null })}>
              Add line
            </Button>
          )
        }
      >
        <PurchaseItemsTable
          items={purchase.items}
          totalAmount={purchase.totalAmount}
          delivered={purchase.status === "CONFIRMED"}
          editable={editable}
          unitLabel={options.unitLabel}
          busyItemId={removeItem.isPending ? (itemToRemove?.id ?? null) : null}
          onEdit={(item) => setItemModal({ open: true, item })}
          onRemove={setItemToRemove}
        />
      </SectionCard>

      {/* ------------------------------------------------------- dialogs */}

      <PurchaseFormModal
        open={editOpen}
        onClose={closeEdit}
        purchase={purchase}
        suppliers={options.suppliers}
        locations={options.locations}
        onUpdate={handleUpdate}
      />

      <PurchaseItemModal
        open={itemModal.open}
        onClose={closeItemModal}
        item={itemModal.item}
        products={options.products}
        existingItems={purchase.items}
        unitLabel={options.unitLabel}
        onAdd={handleAddItem}
        onUpdate={handleChangeItem}
      />

      <ConfirmDialog
        open={itemToRemove !== null}
        onClose={closeRemove}
        onConfirm={confirmRemove}
        title="Remove this line?"
        description={itemToRemove ? `${itemToRemove.productName ?? "This product"} will be removed from the order.` : undefined}
        confirmLabel="Remove"
        destructive
        loading={removeItem.isPending}
      />

      <ConfirmDeliveryModal
        open={deliveryOpen}
        onClose={closeDelivery}
        purchase={purchase}
        unitLabel={options.unitLabel}
        onConfirm={handleConfirmDelivery}
      />

      <ReasonDialog
        open={cancelOpen}
        onClose={closeCancel}
        title={`Cancel ${purchase.code}?`}
        description="Use this when the goods will not come. Stock does not change. This cannot be undone."
        confirmLabel="Cancel purchase"
        destructive
        onSubmit={handleCancel}
      />
    </div>
  );
}