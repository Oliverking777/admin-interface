"use client";

/**
 * Adds a variant to a product with its units and prices, or renames one (pass `variant`).
 *
 * Adding to a simple product first names its existing variant (e.g. "50 kg 10% broken") so both can be told apart;
 * it keeps its SKU, units, stock and prices. Then the new variant is added with its units in one request (its SKU
 * is generated), and its prices are created. If a price fails, the dialog stays open with everything saved
 * locked and the failing price marked; saving again only creates the prices that are left.
 */

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import VariantDraftEditor from "@/components/product/products/VariantDraftEditor";
import { errorForUnit, newVariantDraft, readVariantDraft, type VariantDraft, type VariantDraftErrors } from "@/components/product/products/variant-draft";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import { useCreatePrice } from "@/hooks/product/use-price";
import { useAddVariant } from "@/hooks/product/use-products";
import { useAllUnits } from "@/hooks/product/use-unit";
import { useUpdateVariant } from "@/hooks/product/use-variants";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";
import { MIN_PRICE_QUANTITY } from "@/types/product/price";
import {
  VARIANT_NAME_MAX_LENGTH,
  firstVariant,
  variantNameKey,
  type Product,
  type ProductVariant,
} from "@/types/product/product";

type VariantModalProps = {
  open: boolean;
  /** Must be a stable function (useCallback). */
  onClose: () => void;
  product: Product;
  /** The variant being renamed, or null to add one. */
  variant: ProductVariant | null;
  /** Shows the price columns when adding (needs PRICE_RULE_CREATE). */
  canSetPrices: boolean;
};

/** The variant was added; these prices are saved. */
type Added = { variantId: string; pricedUnitIds: string[] };

export default function VariantModal({ open, onClose, product, variant, canSetPrices }: VariantModalProps) {
  const formId = useId();
  const currentId = useId();
  const renameId = useId();
  const { toast } = useToast();
  const addVariant = useAddVariant();
  const updateVariant = useUpdateVariant();
  const createPrice = useCreatePrice();

  const isEdit = variant !== null;
  const existing = firstVariant(product);
  /** Adding to a simple product: its unnamed variant must be named first. */
  const needsCurrentName = !isEdit && product.simple;

  const [currentName, setCurrentName] = useState("");
  const [currentError, setCurrentError] = useState<string>();
  const [rename, setRename] = useState("");
  const [draft, setDraft] = useState<VariantDraft>(() => newVariantDraft());
  const [draftErrors, setDraftErrors] = useState<VariantDraftErrors>({});
  const [formError, setFormError] = useState<string>();
  const [added, setAdded] = useState<Added | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const unitsQuery = useAllUnits({ status: "ACTIVE" }, { enabled: open && !isEdit });
  const pricedUnitIds = useMemo(() => new Set(added?.pricedUnitIds ?? []), [added]);

  useEffect(() => {
    if (!open) return;
    setCurrentName("");
    setCurrentError(undefined);
    setRename(variant?.name ?? "");
    // a new variant is usually counted like the existing ones (e.g. in bags)
    setDraft(newVariantDraft(existing.units.find((u) => u.isBase && u.status === "ACTIVE")?.unitId ?? ""));
    setDraftErrors({});
    setFormError(undefined);
    setAdded(null);
    setSubmitting(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens or the target changes
  }, [open, variant?.id, product.id]);

  async function handleRename() {
    if (!variant) return;
    const trimmed = rename.trim();
    if (!trimmed && product.variants.length > 1) {
      setFormError("Enter the variant name.");
      return;
    }
    if (trimmed === (variant.name ?? "")) {
      onClose();
      return;
    }
    await updateVariant.mutateAsync({ variantId: variant.id, request: { variantName: trimmed } });
    toast({ title: "Variant renamed", description: `It is now called ${trimmed}.` });
    onClose();
  }

  async function handleAdd() {
    const trimmedCurrent = currentName.trim();
    const read = readVariantDraft(draft, { nameRequired: true, withPrices: canSetPrices });
    const nextDraftErrors = { ...read.errors };
    let nextCurrentError: string | undefined;
    if (!added) {
      if (needsCurrentName && !trimmedCurrent) nextCurrentError = "Name the existing variant.";
      const newKey = variantNameKey(draft.name.trim());
      const clash = needsCurrentName
        ? newKey && variantNameKey(trimmedCurrent) === newKey
        : product.variants.some((v) => v.name && variantNameKey(v.name) === newKey);
      if (newKey && clash) nextDraftErrors.name = "Another variant already has this name.";
    }
    setCurrentError(nextCurrentError);
    setDraftErrors(nextDraftErrors);
    if (!read.value || nextCurrentError || nextDraftErrors.name) return;

    let variantId = added?.variantId;
    if (!variantId) {
      if (needsCurrentName) {
        try {
          await updateVariant.mutateAsync({ variantId: existing.id, request: { variantName: trimmedCurrent } });
        } catch (error) {
          setCurrentError(getErrorMessage(error, "Could not name the existing variant."));
          return;
        }
      }
      const saved = await addVariant.mutateAsync({
        productId: product.id,
        request: { variantName: read.value.request.variantName ?? "", baseUnitId: draft.baseUnitId, units: read.value.request.units },
      });
      variantId = saved.variants.find((v) => v.name && variantNameKey(v.name) === variantNameKey(draft.name.trim()))?.id;
      if (!variantId) throw new Error("The new variant was not found on the product.");
      setAdded({ variantId, pricedUnitIds: [] });
    }

    const priced = [...(added?.pricedUnitIds ?? [])];
    for (const { unitId, price } of read.value.prices) {
      if (priced.includes(unitId)) continue;
      try {
        await createPrice.mutateAsync({ variantId, request: { unitId, price, minimumQuantity: MIN_PRICE_QUANTITY } });
        priced.push(unitId);
      } catch (error) {
        setAdded({ variantId, pricedUnitIds: priced });
        const message =
          isApiError(error) && error.isValidation
            ? (error.fieldError("price") ?? error.message)
            : getErrorMessage(error, "Could not save this price.");
        const marked = errorForUnit(draft, unitId, message);
        setDraftErrors(marked ?? {});
        if (!marked) setFormError(message);
        return;
      }
    }

    toast({ title: "Variant added", description: `${draft.name.trim()} was added to ${product.name}.` });
    onClose();
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    setSubmitting(true);
    try {
      if (isEdit) await handleRename();
      else await handleAdd();
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        setDraftErrors({
          name: error.fieldError("variantName"),
          baseUnit: error.fieldError("baseUnitId") ?? error.fieldError("units"),
        });
        setFormError(error.message);
      } else if (isApiError(error) && error.isConflict && /variant named/i.test(error.message)) {
        if (isEdit) setFormError(error.message);
        else setDraftErrors({ name: error.message });
      } else {
        setFormError(getErrorMessage(error, "Could not save the variant."));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const title = isEdit ? "Rename variant" : "Add a variant";

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={submitting}
      size="xl"
      title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            {added ? "Close" : "Cancel"}
          </Button>
          <Button type="submit" form={formId} loading={submitting}>
            {isEdit ? "Save" : added ? "Save the prices" : "Add variant"}
          </Button>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {added && (
          <p role="status" className="border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-sm text-foreground">
            The variant was added with its units, but a price was not saved. Fix the price marked below and save
            again, or close and set it on the Pricing page.
          </p>
        )}

        {isEdit ? (
          <FormField
            id={renameId}
            label="Name"
            hint={
              product.status === "ACTIVE"
                ? `SKU ${variant.sku}. The packaging (bag, carton) is its unit, not its name.`
                : "Activate the product to rename this variant."
            }
          >
            <Input
              id={renameId}
              value={rename}
              onChange={(e) => setRename(e.target.value)}
              autoComplete="off"
              maxLength={VARIANT_NAME_MAX_LENGTH}
              disabled={product.status !== "ACTIVE"}
            />
          </FormField>
        ) : (
          <>
            {needsCurrentName && (
              <FormField
                id={currentId}
                label="Name of the existing variant"
                error={currentError}
                hint={`${product.name} is sold in one form so far (SKU ${existing.sku}). Name it so both can be told apart, for example 50 kg 10% broken. It keeps its units, stock and prices.`}
              >
                <Input
                  id={currentId}
                  value={currentName}
                  onChange={(e) => setCurrentName(e.target.value)}
                  autoComplete="off"
                  maxLength={VARIANT_NAME_MAX_LENGTH}
                  disabled={submitting || added !== null}
                  invalid={!!currentError}
                  aria-describedby={currentError ? `${currentId}-error` : undefined}
                />
              </FormField>
            )}

            <VariantDraftEditor
              draft={draft}
              onChange={setDraft}
              nameRequired
              units={unitsQuery.data ?? []}
              unitsLoading={unitsQuery.isLoading}
              showPrices={canSetPrices}
              locked={added !== null}
              pricedUnitIds={pricedUnitIds}
              errors={draftErrors}
              disabled={submitting}
            />
            <p className="text-sm text-muted-foreground">
              Its SKU is generated. For each bigger unit, say how many base units it holds.
              {canSetPrices && " Prices apply to any quantity; leave one empty to set it later on the Pricing page."}
            </p>
            {unitsQuery.isError && (
              <p role="alert" className="text-sm text-red-600">
                {getErrorMessage(unitsQuery.error, "Could not load units.")}
              </p>
            )}
          </>
        )}

        {formError && (
          <p role="alert" className="text-sm text-red-600">
            {formError}
          </p>
        )}
      </form>
    </Modal>
  );
}