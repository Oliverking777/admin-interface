"use client";

/**
 * Creates a product, or edits one (pass `product`).
 *
 * Creating takes the product and every variant at once: each variant with its name, units and one price per
 * unit. A product sold in one form has a single variant without a name. The code (PRD-000123) and the SKUs are
 * generated. The product, its variants and their units are saved together; the prices follow (see
 * useProductSetup). If a price fails, the form stays open: everything saved is locked, the failing price is marked,
 * and saving again only does what is left.
 *
 * Editing covers the product's own fields only: variants and units are managed on the product's page, prices on
 * the Pricing page.
 */

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import CategorySelect from "@/components/product/products/CategorySelect";
import VariantDraftEditor from "@/components/product/products/VariantDraftEditor";
import {
  duplicateNameErrors,
  errorForUnit,
  newVariantDraft,
  readVariantDraft,
  type VariantDraft,
  type VariantDraftErrors,
} from "@/components/product/products/variant-draft";
import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import ImageUpload from "@/components/ui/ImageUpload";
import Input, { inputBaseClass } from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import {
  NO_PROGRESS,
  ProductSetupError,
  setupPriceKey,
  type ProductSetup,
  type SetupPrice,
  type SetupProgress,
} from "@/hooks/product/use-product-setup";
import { useAllUnits } from "@/hooks/product/use-unit";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";
import { cn } from "@/lib/cn";
import {
  MAX_NEW_VARIANTS,
  PRODUCT_DESCRIPTION_MAX_LENGTH,
  PRODUCT_NAME_MAX_LENGTH,
  isValidProductImageUrl,
  variantNameKey,
  type Product,
} from "@/types/product/product";
import type { NewVariantRequest, UpdateProductRequest } from "@/types/product/product-dto";

/** What an edit changes. The category has its own endpoint, so it travels separately from the request. */
export type ProductChanges = { request: UpdateProductRequest; categoryId?: string };

type ProductModalProps = {
  open: boolean;
  /** Must be a stable function (useCallback). */
  onClose: () => void;
  /** The product being edited, or null to create a new one. */
  product: Product | null;
  /**
   * Runs what is left of the setup and returns the progress. Should throw ProductSetupError when a step fails
   * (useProductSetup().run does), so the form can keep what was saved and mark the failing price.
   */
  onCreate?: (setup: ProductSetup, progress: SetupProgress) => Promise<SetupProgress>;
  /** Should reject on failure; the error is shown in the form. */
  onUpdate: (productId: string, changes: ProductChanges) => Promise<unknown>;
  /** Shows the price columns when creating (needs PRICE_RULE_CREATE). */
  canSetPrices?: boolean;
};

type Field = "name" | "description" | "imageUrl" | "categoryId";
type Errors = Partial<Record<Field | "variants" | "form", string>>;

const IMAGE_FOLDER = "yah-enterprise/products";
/** The backend names the first variant's name in a 409, e.g. The product already has a variant named "50 kg". */
const NAMED_IN_MESSAGE = /variant named "(.*)"/;

export default function ProductModal({
  open,
  onClose,
  product,
  onCreate,
  onUpdate,
  canSetPrices = false,
}: ProductModalProps) {
  const formId = useId();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [drafts, setDrafts] = useState<VariantDraft[]>(() => [newVariantDraft()]);
  const [errors, setErrors] = useState<Errors>({});
  const [variantErrors, setVariantErrors] = useState<Record<string, VariantDraftErrors>>({});
  const [progress, setProgress] = useState<SetupProgress>(NO_PROGRESS);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  const isEdit = product !== null;
  /** True once the product exists but some prices are left: everything else is locked. */
  const created = progress.product !== null;
  const busy = submitting || uploading;
  const several = drafts.length > 1;
  const unitsQuery = useAllUnits({ status: "ACTIVE" }, { enabled: open && !isEdit });
  const catalogUnits = unitsQuery.data ?? [];

  /** Units whose price is saved, per variant draft. */
  const pricedByDraft = useMemo(() => {
    const saved = new Set(progress.pricedKeys);
    return new Map(
      drafts.map((d) => {
        const name = d.name.trim() || undefined;
        const unitIds = [d.baseUnitId, ...d.others.map((o) => o.unitId)].filter((id) => saved.has(setupPriceKey(name, id)));
        return [d.key, new Set(unitIds)];
      }),
    );
  }, [drafts, progress.pricedKeys]);

  useEffect(() => {
    setName(open ? (product?.name ?? "") : "");
    setDescription(open ? (product?.description ?? "") : "");
    setImageUrl(open ? (product?.imageUrl ?? "") : "");
    setCategoryId(open ? (product?.categoryId ?? "") : "");
    setDrafts([newVariantDraft()]);
    setErrors({});
    setVariantErrors({});
    setProgress(NO_PROGRESS);
    setSubmitting(false);
    setUploading(false);
  }, [open, product]);

  function changeDraft(next: VariantDraft) {
    setDrafts((all) => all.map((d) => (d.key === next.key ? next : d)));
  }

  /** A new variant starts with the previous one's base unit: variants are usually counted alike (in bags...). */
  function addDraft() {
    setDrafts((all) => [...all, newVariantDraft(all[all.length - 1]?.baseUnitId ?? "")]);
  }

  function removeDraft(key: string) {
    setDrafts((all) => all.filter((d) => d.key !== key));
    setVariantErrors((all) => {
      const next = { ...all };
      delete next[key];
      return next;
    });
  }

  /** Errors of the product step (creating) or of an edit. */
  function showProductError(error: unknown) {
    if (isApiError(error) && error.isValidation) {
      setErrors({
        name: error.fieldError("productName"),
        description: error.fieldError("description"),
        imageUrl: error.fieldError("productImageUrl"),
        categoryId: error.fieldError("categoryId"),
        variants: error.fieldError("variants"),
        form: error.message,
      });
      // Spring names nested fields variants[0].variantName...
      const byDraft: Record<string, VariantDraftErrors> = {};
      drafts.forEach((d, i) => {
        const nameError = error.fieldError(`variants[${i}].variantName`);
        const unitError = error.fieldError(`variants[${i}].baseUnitId`) ?? error.fieldError(`variants[${i}].units`);
        if (nameError || unitError) byDraft[d.key] = { name: nameError, baseUnit: unitError };
      });
      setVariantErrors(byDraft);
    } else if (isApiError(error) && error.isConflict) {
      // A duplicate name points at its variant; anything else (an inactive unit or category) at the form.
      const named = NAMED_IN_MESSAGE.exec(error.message)?.[1];
      const draft = named ? drafts.find((d) => variantNameKey(d.name.trim()) === variantNameKey(named)) : undefined;
      if (draft) setVariantErrors({ [draft.key]: { name: error.message } });
      else setErrors({ form: error.message });
    } else {
      setErrors({ form: getErrorMessage(error, "Could not save the product.") });
    }
  }

  /** Marks the price that could not be saved. */
  function showPriceError(price: SetupPrice, cause: unknown) {
    const message =
      isApiError(cause) && cause.isValidation
        ? (cause.fieldError("price") ?? cause.message)
        : getErrorMessage(cause, "Could not save this price.");
    const draft = drafts.find((d) => variantNameKey(d.name.trim()) === variantNameKey(price.variantName ?? ""));
    const marked = draft ? errorForUnit(draft, price.unitId, message) : null;
    if (draft && marked) setVariantErrors({ [draft.key]: marked });
    else setErrors({ form: message });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (uploading) return;

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    const next: Errors = {};
    if (!trimmedName) next.name = "Enter the product name.";
    if (!imageUrl) next.imageUrl = "Add a product image.";
    else if (!isValidProductImageUrl(imageUrl)) next.imageUrl = "The image link is not valid. Upload the image again.";
    if (!categoryId) next.categoryId = "Choose a category.";

    // Variants, units and prices (creating only).
    const variants: NewVariantRequest[] = [];
    const prices: SetupPrice[] = [];
    const nextVariantErrors: Record<string, VariantDraftErrors> = {};
    if (!isEdit) {
      const duplicates = duplicateNameErrors(drafts);
      for (const draft of drafts) {
        const read = readVariantDraft(draft, { nameRequired: several, withPrices: canSetPrices });
        const draftErrors = { ...read.errors, ...(duplicates[draft.key] ? { name: duplicates[draft.key] } : {}) };
        if (read.value && !duplicates[draft.key]) {
          variants.push(read.value.request);
          for (const p of read.value.prices) prices.push({ variantName: read.value.request.variantName, ...p });
        } else {
          nextVariantErrors[draft.key] = draftErrors;
        }
      }
    }

    setErrors(next);
    setVariantErrors(nextVariantErrors);
    if (Object.keys(next).length > 0 || Object.keys(nextVariantErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (product) {
        // Send only what changed. The code can never be changed; the category has its own endpoint.
        const request: UpdateProductRequest = {};
        if (trimmedName !== product.name) request.productName = trimmedName;
        if (trimmedDescription !== (product.description ?? "")) request.description = trimmedDescription; // "" clears it
        if (imageUrl !== product.imageUrl) request.productImageUrl = imageUrl;
        const categoryChanged = categoryId !== product.categoryId;

        if (Object.keys(request).length > 0 || categoryChanged) {
          await onUpdate(product.id, { request, categoryId: categoryChanged ? categoryId : undefined });
        }
      } else {
        await onCreate?.(
          {
            product: {
              productName: trimmedName,
              ...(trimmedDescription ? { description: trimmedDescription } : {}),
              productImageUrl: imageUrl,
              categoryId,
              variants,
            },
            prices,
          },
          progress,
        );
      }
      onClose();
    } catch (error) {
      if (error instanceof ProductSetupError) {
        setProgress(error.progress);
        if (error.step === "price" && error.price) showPriceError(error.price, error.error);
        else showProductError(error.error);
      } else {
        showProductError(error);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const nameId = `${formId}-name`;
  const descriptionId = `${formId}-description`;
  const imageId = `${formId}-image`;
  const categoryFieldId = `${formId}-category`;

  const nameField = (
    <FormField id={nameId} label="Name" error={errors.name}>
      <Input
        id={nameId}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="off"
        maxLength={PRODUCT_NAME_MAX_LENGTH}
        disabled={created}
        invalid={!!errors.name}
        aria-describedby={errors.name ? `${nameId}-error` : undefined}
      />
    </FormField>
  );

  const categoryField = (
    <FormField id={categoryFieldId} label="Category" error={errors.categoryId}>
      <CategorySelect
        id={categoryFieldId}
        value={categoryId}
        onChange={setCategoryId}
        disabled={created}
        invalid={!!errors.categoryId}
        aria-describedby={errors.categoryId ? `${categoryFieldId}-error` : undefined}
      />
    </FormField>
  );

  const imageField = (
    <FormField id={imageId} label="Image" error={errors.imageUrl}>
      <ImageUpload
        id={imageId}
        value={imageUrl}
        onChange={setImageUrl}
        onBusyChange={setUploading}
        folder={IMAGE_FOLDER}
        invalid={!!errors.imageUrl}
        disabled={submitting || created}
        aria-describedby={errors.imageUrl ? `${imageId}-error` : undefined}
      />
    </FormField>
  );

  const descriptionField = (
    <FormField
      id={descriptionId}
      label="Description (optional)"
      error={errors.description}
      hint={`${description.length}/${PRODUCT_DESCRIPTION_MAX_LENGTH} characters`}
    >
      <textarea
        id={descriptionId}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={2}
        maxLength={PRODUCT_DESCRIPTION_MAX_LENGTH}
        disabled={created}
        aria-invalid={!!errors.description || undefined}
        aria-describedby={errors.description ? `${descriptionId}-error` : undefined}
        className={cn(
          inputBaseClass,
          "resize-y",
          errors.description && "border-red-600 focus:border-red-600 focus:ring-red-600/30",
        )}
      />
    </FormField>
  );

  const formError = errors.form && (
    <p role="alert" className="col-span-full text-sm text-red-600">
      {errors.form}
    </p>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      busy={busy}
      // creating shows the product and its variants side by side, so it gets the wide dialog
      size={isEdit ? "xl" : "2xl"}
      title={isEdit ? "Edit product" : "New product"}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            {created ? "Close" : "Cancel"}
          </Button>
          <Button type="submit" form={formId} loading={submitting} disabled={uploading}>
            {isEdit ? "Save changes" : created ? "Save the prices" : "Create product"}
          </Button>
        </div>
      }
    >
      {isEdit ? (
        <form id={formId} onSubmit={handleSubmit} noValidate className="grid gap-4 md:grid-cols-2">
          {nameField}
          {categoryField}
          <div className="md:col-span-2">{imageField}</div>
          <div className="md:col-span-2">{descriptionField}</div>
          {formError}
        </form>
      ) : (
        <form id={formId} onSubmit={handleSubmit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {created && progress.product && (
            <p
              role="status"
              className="col-span-full border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-sm text-foreground"
            >
              {progress.product.name} was created with its variants and units, but a price was not saved. Fix the
              price marked below and save again, or close and set it on the Pricing page.
            </p>
          )}

          {/* left: the product itself */}
          <div className="flex flex-col gap-4">
            {nameField}
            {categoryField}
            {imageField}
            {descriptionField}
          </div>

          {/* right: its variants, each with its units and prices */}
          <section aria-label="Variants" className="flex flex-col gap-3">
            <div>
              <h3 className="text-sm font-medium text-foreground">
                {canSetPrices ? "Variants, units and prices" : "Variants and units"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Sold in one form? Leave the name empty. Otherwise add one variant per form, for example 50 kg and 25
                kg. For each bigger unit, say how many base units it holds.
                {canSetPrices && " Prices apply to any quantity; leave one empty to set it later on the Pricing page."}
              </p>
            </div>

            {drafts.map((draft) => (
              <VariantDraftEditor
                key={draft.key}
                draft={draft}
                onChange={changeDraft}
                onRemove={several ? () => removeDraft(draft.key) : undefined}
                nameRequired={several}
                units={catalogUnits}
                unitsLoading={unitsQuery.isLoading}
                showPrices={canSetPrices}
                locked={created}
                pricedUnitIds={pricedByDraft.get(draft.key) ?? new Set()}
                errors={variantErrors[draft.key] ?? {}}
                disabled={submitting}
              />
            ))}

            {!created && (
              <div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={addDraft}
                  disabled={submitting || drafts.length >= MAX_NEW_VARIANTS}
                >
                  Add a variant
                </Button>
              </div>
            )}

            {unitsQuery.isError ? (
              <p role="alert" className="text-sm text-red-600">
                {getErrorMessage(unitsQuery.error, "Could not load units.")}
              </p>
            ) : (
              errors.variants && (
                <p role="alert" className="text-sm text-red-600">
                  {errors.variants}
                </p>
              )
            )}
          </section>

          {formError}
        </form>
      )}
    </Modal>
  );
}