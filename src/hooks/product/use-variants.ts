"use client";

/**
 * Variant queries and mutations: what is stocked and sold is a variant of a product, counted in its own units.
 *
 *   component -> hook -> variantService -> apiClient
 *
 * Queries switch themselves off when the user lacks PRODUCT_READ. Changes to a variant answer the whole product,
 * which is stored in the cache; every product and variant query is then refreshed (products carry their variants).
 * Errors are ApiError: use error.fieldErrors for forms, error.message for toasts
 * (a 409 means the name is taken, the status is already as requested, the product is inactive,
 * the variant is the last active one, or the unit is missing or inactive; a 404 means the variant or its unit
 * does not exist).
 *
 * Permissions: reading needs PRODUCT_READ; renaming and activating/deactivating need PRODUCT_UPDATE;
 * the unit operations need UNIT_CREATE (assign), UNIT_UPDATE (conversion) and UNIT_DEACTIVATE (remove, deactivate).
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { productKeys } from "@/hooks/product/product-query-keys";
import { useAuth } from "@/hooks/iam/use-auth";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { variantService } from "@/services/product/variant-service";
import type { Product, VariantSummary, VariantUnit } from "@/types/product/product";
import type { AssignUnitToVariantRequest, UpdateVariantRequest } from "@/types/product/product-dto";
import type { UUID } from "@/types/iam/user";

type QueryOptions = { enabled?: boolean };

/* -------------------------------------------------------------------------- */
/*  Queries                                                                   */
/* -------------------------------------------------------------------------- */

/** Several variants with their product's names and units, e.g. to name the lines of a document. */
export function useVariants(variantIds: UUID[], options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const ids = [...new Set(variantIds)];

  return useQuery<VariantSummary[], ApiError>({
    queryKey: productKeys.variantsByIds(ids),
    queryFn: ({ signal }) => variantService.getMany(ids, signal),
    enabled: (options.enabled ?? true) && ids.length > 0 && hasPermission(PERMISSIONS.PRODUCT_READ),
  });
}

/** The variant with this SKU (any case). A 404 ApiError means none; it is not retried. */
export function useVariantBySku(sku: string | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const trimmed = sku?.trim() ?? "";

  return useQuery<VariantSummary, ApiError>({
    queryKey: productKeys.variantBySku(trimmed),
    queryFn: ({ signal }) => variantService.findBySku(trimmed, signal),
    enabled: (options.enabled ?? true) && trimmed !== "" && hasPermission(PERMISSIONS.PRODUCT_READ),
    retry: false,
  });
}

/** The units of a variant (base unit included). */
export function useVariantUnits(variantId: UUID | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<VariantUnit[], ApiError>({
    queryKey: productKeys.variantUnits(variantId ?? ""),
    queryFn: ({ signal }) => variantService.listUnits(variantId as UUID, signal),
    enabled: (options.enabled ?? true) && !!variantId && hasPermission(PERMISSIONS.PRODUCT_READ),
  });
}

/* -------------------------------------------------------------------------- */
/*  Variant mutations                                                         */
/* -------------------------------------------------------------------------- */

/** Stores the product the backend answered and refreshes every product and variant query. */
function useProductChanged() {
  const queryClient = useQueryClient();
  return async (product: Product) => {
    queryClient.setQueryData(productKeys.product(product.id), product);
    await queryClient.invalidateQueries({ queryKey: productKeys.all });
  };
}

/**
 * Needs PRODUCT_UPDATE. Renames a variant; "" removes the name (only while it is the product's only variant).
 * Naming a simple product's variant is the first step before adding another variant.
 */
export function useUpdateVariant() {
  const changed = useProductChanged();

  return useMutation<Product, ApiError, { variantId: UUID; request: UpdateVariantRequest }>({
    mutationFn: ({ variantId, request }) => variantService.update(variantId, request),
    onSuccess: changed,
  });
}

/** Needs PRODUCT_UPDATE. Fails with a 409 if the variant is already active. */
export function useActivateVariant() {
  const changed = useProductChanged();

  return useMutation<Product, ApiError, UUID>({
    mutationFn: (variantId) => variantService.activate(variantId),
    onSuccess: changed,
  });
}

/** Needs PRODUCT_UPDATE. A 409 means it is already inactive, or the last active variant of an active product. */
export function useDeactivateVariant() {
  const changed = useProductChanged();

  return useMutation<Product, ApiError, UUID>({
    mutationFn: (variantId) => variantService.deactivate(variantId),
    onSuccess: changed,
  });
}

/* -------------------------------------------------------------------------- */
/*  Unit mutations                                                            */
/*  Products carry their variants' units, so these refresh products too.      */
/* -------------------------------------------------------------------------- */

function useUnitsChanged() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: productKeys.all });
}

/** Needs UNIT_CREATE. The factor is 2 or more; a 409 means the product is inactive, the unit is already on the variant, or the unit is missing or inactive. */
export function useAssignUnitToVariant() {
  const changed = useUnitsChanged();

  return useMutation<VariantUnit, ApiError, { variantId: UUID; request: AssignUnitToVariantRequest }>({
    mutationFn: ({ variantId, request }) => variantService.assignUnit(variantId, request),
    onSuccess: changed,
  });
}

/** Needs UNIT_UPDATE. Changes the factor (2 or more) of a non-base unit; a 400 means the base unit, a 409 an inactive product. */
export function useChangeVariantConversion() {
  const changed = useUnitsChanged();

  return useMutation<VariantUnit, ApiError, { variantId: UUID; unitId: UUID; conversionFactor: number }>({
    mutationFn: ({ variantId, unitId, conversionFactor }) =>
      variantService.changeConversion(variantId, unitId, conversionFactor),
    onSuccess: changed,
  });
}

/** Needs UNIT_DEACTIVATE. Removes a non-base unit; the base unit gives a 409. */
export function useRemoveUnitFromVariant() {
  const changed = useUnitsChanged();

  return useMutation<void, ApiError, { variantId: UUID; unitId: UUID }>({
    mutationFn: ({ variantId, unitId }) => variantService.removeUnit(variantId, unitId),
    onSuccess: changed,
  });
}

/** Needs UNIT_DEACTIVATE. A 409 means the product is inactive, or the base unit still has active units next to it. */
export function useDeactivateVariantUnit() {
  const changed = useUnitsChanged();

  return useMutation<VariantUnit, ApiError, { variantId: UUID; unitId: UUID }>({
    mutationFn: ({ variantId, unitId }) => variantService.deactivateUnit(variantId, unitId),
    onSuccess: changed,
  });
}