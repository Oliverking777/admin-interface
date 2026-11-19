"use client";

/**
 * Initializes the stock of several products at ONE location in a single operation. Stock is kept per variant,
 * so each line is one variant ("Indian Rice · 50 kg 10% broken").
 * All lines succeed or none do, it completes at once (no approval), and it can never be edited or deleted:
 * that is why a confirmation step comes before anything is sent.
 *
 * Only a product with no stock record at the location can be initialized. A product that already has one
 * (an earlier initialization, or stock from a purchase, a received transfer or an approved adjustment) is
 * corrected with an adjustment instead, so it is left out of the list. An initialization always creates a
 * stock record, so this one check also covers "already initialized".
 *
 * The form keeps its own state: the parent gives it a new `key` each time it opens.
 */

import { useCallback, useEffect, useMemo, useState } from "react";

import InitializationLinesEditor, {
  newInitLineDraft,
  type InitLineDraft,
} from "@/components/inventory/InitializationLinesEditor";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import FormField from "@/components/ui/FormField";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/ToastProvider";
import { useAllStockLevels, useInitializeStock } from "@/hooks/inventory/use-inventory";
import { formatProductCount, parseCount } from "@/lib/inventory/initialization-format";
import { type StockVariant } from "@/lib/inventory/stock-variants";
import { MIN_INITIALIZATION_QUANTITY, type StockInitialization } from "@/types/inventory/inventory";
import type { InitializeStockLineRequest } from "@/types/inventory/inventory-dto";

type Option = { id: string; name: string };

type InitializationFormModalProps = {
  open: boolean;
  /** Pass a stable function (useCallback). */
  onClose: () => void;
  locations: Option[];
  /** Every variant; only active ones can be picked. */
  products: StockVariant[];
  /** The user's own location when they belong to one: they can only initialize stock there. */
  lockedLocationId: string | null;
  /** Optional location to start with (e.g. the one the calling page is filtered on). Ignored when locked. */
  initialLocationId?: string | null;
  onSaved: (initialization: StockInitialization) => void;
};

export default function InitializationFormModal({
  open,
  onClose,
  locations,
  products,
  lockedLocationId,
  initialLocationId = null,
  onSaved,
}: InitializationFormModalProps) {
  const { toast } = useToast();
  const initialize = useInitializeStock();

  const [locationId, setLocationId] = useState(lockedLocationId ?? initialLocationId ?? "");
  const [lines, setLines] = useState<InitLineDraft[]>([newInitLineDraft()]);
  const [errors, setErrors] = useState<{ location?: string; lines?: string }>({});
  const [serverError, setServerError] = useState<string | undefined>();
  // the lines being confirmed: not null while the confirmation dialog is open
  const [reviewItems, setReviewItems] = useState<InitializeStockLineRequest[] | null>(null);
  const closeReview = useCallback(() => setReviewItems(null), []);

  // products that already have stock at the chosen location: they can no longer be initialized there
  const stock = useAllStockLevels(
    { locationId: locationId || undefined },
    { enabled: open && !!locationId },
  );
  const stockedProductIds = useMemo(
    () => new Set((stock.data ?? []).map((level) => level.productId)),
    [stock.data],
  );
  // until the stock of the chosen location is known, nothing can be picked or sent
  const stockKnown = !!locationId && stock.data !== undefined;

  const activeProducts = useMemo(() => products.filter((p) => p.active), [products]);
  const hiddenCount = useMemo(
    () => activeProducts.filter((p) => stockedProductIds.has(p.id)).length,
    [activeProducts, stockedProductIds],
  );
  const nothingLeft = stockKnown && activeProducts.length > 0 && hiddenCount === activeProducts.length;

  // a product picked before the location changed must disappear once it is known to have stock there
  useEffect(() => {
    if (stockedProductIds.size === 0) return;
    setLines((current) =>
      current.some((l) => stockedProductIds.has(l.productId))
        ? current.map((l) => (stockedProductIds.has(l.productId) ? { ...l, productId: "", unitId: "" } : l))
        : current,
    );
  }, [stockedProductIds]);

  const locationName = locations.find((l) => l.id === locationId)?.name ?? "";
  const productName = (id: string) => products.find((p) => p.id === id)?.name ?? "This product";

  function review() {
    setServerError(undefined);
    const next: { location?: string; lines?: string } = {};
    if (!locationId) next.location = "Choose the location.";
    else if (!stockKnown) next.lines = "The stock at this location is still being checked. Try again in a moment.";

    const items: InitializeStockLineRequest[] = [];
    if (!next.location && !next.lines) {
      for (const line of lines) {
        const count = parseCount(line.count);
        if (!line.productId || !line.unitId || count === null || count < MIN_INITIALIZATION_QUANTITY) {
          next.lines = `Every line needs a product, a unit and a whole counted quantity of at least ${MIN_INITIALIZATION_QUANTITY}.`;
          break;
        }
        if (stockedProductIds.has(line.productId)) {
          next.lines = `${productName(line.productId)} already has stock at this location. Remove it, and correct its stock with an adjustment.`;
          break;
        }
        items.push({ productId: line.productId, unitId: line.unitId, countedQuantity: count });
      }
    }

    setErrors(next);
    if (Object.keys(next).length === 0) setReviewItems(items);
  }

  function submit() {
    if (!reviewItems) return;
    initialize.mutate(
      { locationId, items: reviewItems },
      {
        onSuccess: (initialization) => {
          toast({
            title: `Stock initialized (${initialization.number})`,
            description: `${formatProductCount(initialization.items.length)} recorded at ${locationName}.`,
          });
          setReviewItems(null);
          onSaved(initialization);
          onClose();
        },
        onError: (e) => {
          setServerError(e.message);
          setReviewItems(null);
        },
      },
    );
  }

  const busy = initialize.isPending || reviewItems !== null;

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        // busy also locks Escape and the backdrop, so they cannot close this modal under the confirmation
        busy={busy}
        size="xl"
        title="Initialize stock"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={review} disabled={busy || nothingLeft}>
              Review and submit
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm text-muted-foreground">
            Record the counted quantity of each product at one location. All lines are saved together. Only
            products that have no stock at this location yet can be initialized.
          </p>

          {serverError && (
            <p role="alert" className="border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {serverError}
            </p>
          )}

          <div className="max-w-sm">
            <FormField
              id="init-location"
              label="Location"
              error={errors.location}
              hint={
                stockKnown && hiddenCount > 0 && !nothingLeft
                  ? `${formatProductCount(hiddenCount)} already stocked here ${hiddenCount === 1 ? "is" : "are"} not listed.`
                  : undefined
              }
            >
              <Select
                id="init-location"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                disabled={lockedLocationId !== null || initialize.isPending}
                invalid={!!errors.location}
                aria-describedby={errors.location ? "init-location-error" : undefined}
              >
                <option value="">Choose a location</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          {stock.error && (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 border border-red-600/30 bg-red-600/10 px-3 py-2 text-sm text-red-700 dark:text-red-400"
            >
              <span>Could not check the stock at this location. {stock.error.message}</span>
              <Button variant="secondary" size="sm" onClick={() => void stock.refetch()}>
                Try again
              </Button>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">Products</span>
            {!locationId && (
              <p className="text-sm text-muted-foreground">
                Choose a location first: only the products that have no stock there yet are listed.
              </p>
            )}
            {nothingLeft ? (
              <p className="text-sm text-muted-foreground">
                Every product already has stock at {locationName}. To correct a quantity, use an adjustment.
              </p>
            ) : (
              <InitializationLinesEditor
                lines={lines}
                onChange={setLines}
                products={products}
                blockedProductIds={stockedProductIds}
                disabled={!stockKnown || initialize.isPending}
                error={errors.lines}
              />
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={reviewItems !== null}
        onClose={closeReview}
        onConfirm={submit}
        title="Initialize this stock?"
        description={`${formatProductCount(reviewItems?.length ?? 0)} will be recorded at ${locationName}. Once submitted, this initialization cannot be edited or deleted: a mistake is corrected with an adjustment.`}
        confirmLabel="Initialize stock"
        cancelLabel="Go back"
        loading={initialize.isPending}
      />
    </>
  );
}