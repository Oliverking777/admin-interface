"use client";

/**
 * Price queries and mutations.
 *
 *   component -> hook -> priceService -> apiClient
 *
 * Queries switch themselves off when the user lacks PRICE_RULE_READ, so no pointless 403 is sent.
 * (The backend still enforces everything; this only saves requests.)
 * Errors are ApiError: use error.fieldErrors for forms, error.message for toasts
 * (a 409 means the variant or unit cannot be priced, the new price overlaps another one,
 * or the price is already inactive; a 404 means the price, or a price for that quantity, does not exist).
 *
 * Changing a price creates a NEW price with a new id (the old one is closed and kept in the history),
 * so every mutation refreshes all the price queries of the variant.
 *
 * Prices belong to a variant: pass the variant's id (a simple product's only variant has the product's id).
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { priceKeys } from "@/hooks/product/price-query-keys";
import { useAuth } from "@/hooks/iam/use-auth";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { priceService, toPrice } from "@/services/product/price-service";
import type { PageParams } from "@/services/iam/role-service";
import type { ApplicablePrice, Price } from "@/types/product/price";
import type {
  ApplicablePriceQuery,
  ChangeProductPriceRequest,
  CreateProductPriceRequest,
  PricePageResponse,
} from "@/types/product/price-dto";
import type { PageResponse } from "@/types/iam/common-dto";
import type { UUID } from "@/types/iam/user";

type QueryOptions = { enabled?: boolean };

/* -------------------------------------------------------------------------- */
/*  Queries                                                                   */
/* -------------------------------------------------------------------------- */

/** The prices of a variant that are active and in force right now. Pass `unitId` for one unit only. */
export function useCurrentPrices(
  variantId: UUID | undefined,
  unitId?: UUID,
  options: QueryOptions = {},
) {
  const { hasPermission } = useAuth();

  return useQuery<Price[], ApiError>({
    queryKey: priceKeys.current(variantId ?? "", unitId ?? null),
    queryFn: ({ signal }) => priceService.listCurrent(variantId as UUID, unitId, signal),
    enabled: (options.enabled ?? true) && !!variantId && hasPermission(PERMISSIONS.PRICE_RULE_READ),
  });
}

/**
 * One page of the price history (active and closed prices, newest first).
 * The previous page stays visible while the next one loads. Pass `unitId` for one unit only.
 */
export function usePriceHistory(
  variantId: UUID | undefined,
  params: PageParams & { unitId?: UUID } = {},
  options: QueryOptions = {},
) {
  const { hasPermission } = useAuth();
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const unitId = params.unitId ?? null;

  return useQuery<PricePageResponse, ApiError, PageResponse<Price>>({
    queryKey: priceKeys.history(variantId ?? "", { page, size, unitId }),
    queryFn: ({ signal }) =>
      priceService.listHistoryPage(variantId as UUID, page, size, unitId ?? undefined, signal),
    select: (result) => ({ ...result, content: result.content.map(toPrice) }),
    enabled: (options.enabled ?? true) && !!variantId && hasPermission(PERMISSIONS.PRICE_RULE_READ),
    placeholderData: keepPreviousData,
  });
}

/** One price. */
export function usePrice(
  variantId: UUID | undefined,
  priceId: UUID | undefined,
  options: QueryOptions = {},
) {
  const { hasPermission } = useAuth();

  return useQuery<Price, ApiError>({
    queryKey: priceKeys.price(variantId ?? "", priceId ?? ""),
    queryFn: ({ signal }) => priceService.getById(variantId as UUID, priceId as UUID, signal),
    enabled:
      (options.enabled ?? true) && !!variantId && !!priceId && hasPermission(PERMISSIONS.PRICE_RULE_READ),
  });
}

/**
 * The unit price and line total for a quantity of one unit.
 * Stays off until the unit is chosen and the quantity is a whole number of at least 1.
 * A 404 ApiError means that unit has no price for that quantity.
 */
export function useApplicablePrice(
  variantId: UUID | undefined,
  query: Partial<ApplicablePriceQuery> = {},
  options: QueryOptions = {},
) {
  const { hasPermission } = useAuth();
  const { unitId, quantity, at } = query;
  const validQuantity = typeof quantity === "number" && Number.isInteger(quantity) && quantity >= 1;

  return useQuery<ApplicablePrice, ApiError>({
    queryKey: priceKeys.applicable(variantId ?? "", {
      unitId: unitId ?? "",
      quantity: quantity ?? 0,
      at: at ?? null,
    }),
    queryFn: ({ signal }) =>
      priceService.getApplicable(
        variantId as UUID,
        { unitId: unitId as UUID, quantity: quantity as number, at },
        signal,
      ),
    enabled:
      (options.enabled ?? true) &&
      !!variantId &&
      !!unitId &&
      validQuantity &&
      hasPermission(PERMISSIONS.PRICE_RULE_READ),
    retry: false,
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Needs PRICE_RULE_CREATE. A 409 means the variant or unit cannot be priced, or the price
 * overlaps another active price of the same unit in both quantity and period.
 */
export function useCreatePrice() {
  const queryClient = useQueryClient();

  return useMutation<Price, ApiError, { variantId: UUID; request: CreateProductPriceRequest }>({
    mutationFn: ({ variantId, request }) => priceService.create(variantId, request),
    onSuccess: (_price, { variantId }) =>
      queryClient.invalidateQueries({ queryKey: priceKeys.prices(variantId) }),
  });
}

/**
 * Needs PRICE_RULE_UPDATE. Returns the NEW price (new id): the old one is closed and stays in the history.
 * Giving minimumQuantity replaces the whole quantity range. A 409 means the price is inactive
 * or the new range overlaps another price.
 */
export function useChangePrice() {
  const queryClient = useQueryClient();

  return useMutation<Price, ApiError, { variantId: UUID; priceId: UUID; request: ChangeProductPriceRequest }>({
    mutationFn: ({ variantId, priceId, request }) => priceService.change(variantId, priceId, request),
    onSuccess: async (price, { variantId }) => {
      queryClient.setQueryData(priceKeys.price(variantId, price.id), price);
      await queryClient.invalidateQueries({ queryKey: priceKeys.prices(variantId) });
    },
  });
}

/** Needs PRICE_RULE_DEACTIVATE. Fails with a 409 if the price is already inactive. The row stays in the history. */
export function useDeactivatePrice() {
  const queryClient = useQueryClient();

  return useMutation<Price, ApiError, { variantId: UUID; priceId: UUID }>({
    mutationFn: ({ variantId, priceId }) => priceService.deactivate(variantId, priceId),
    onSuccess: async (price, { variantId }) => {
      queryClient.setQueryData(priceKeys.price(variantId, price.id), price);
      await queryClient.invalidateQueries({ queryKey: priceKeys.prices(variantId) });
    },
  });
}