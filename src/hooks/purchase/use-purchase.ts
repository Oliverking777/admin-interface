"use client";

/**
 * Purchase queries and mutations.
 *
 *   component -> hook -> purchaseService -> apiClient
 *
 * Queries switch themselves off when the user lacks PURCHASE_READ (the backend still enforces everything).
 * Errors are ApiError: use error.fieldErrors for forms, error.message for toasts
 * (409 = already delivered or cancelled, 403 = not assigned to the location).
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { purchaseKeys } from "@/hooks/purchase/purchase-query-keys";
import { useAuth } from "@/hooks/iam/use-auth";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { purchaseService, toPurchase, toSupplierProduct } from "@/services/purchase/purchase-service";
import type { PageParams } from "@/services/iam/role-service";
import type { Purchase, SupplierProduct } from "@/types/purchase/purchase";
import type {
  ChangePurchaseItemRequest,
  ConfirmPurchaseRequest,
  CreatePurchaseRequest,
  DirectPurchaseRequest,
  PurchaseLineRequest,
  PurchaseListQuery,
  PurchasePageResponse,
  PurchaseReasonRequest,
  SupplierProductPageResponse,
  UpdatePurchaseRequest,
} from "@/types/purchase/purchase-dto";
import type { PageResponse } from "@/types/iam/common-dto";
import type { UUID } from "@/types/iam/user";

type QueryOptions = { enabled?: boolean };

/* -------------------------------------------------------------------------- */
/*  Queries                                                                   */
/* -------------------------------------------------------------------------- */

/** One page of purchases, newest first. The previous page stays visible while the next one loads. */
export function usePurchases(params: PageParams & PurchaseListQuery = {}, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const { page = 0, size = 20, ...filters } = params;

  return useQuery<PurchasePageResponse, ApiError, PageResponse<Purchase>>({
    queryKey: purchaseKeys.purchaseList({ page, size, ...filters }),
    queryFn: ({ signal }) => purchaseService.listPage(page, size, filters, signal),
    select: (result) => ({ ...result, content: result.content.map(toPurchase) }),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.PURCHASE_READ),
    placeholderData: keepPreviousData,
  });
}

/** One purchase with its lines. */
export function usePurchase(purchaseId: UUID | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<Purchase, ApiError>({
    queryKey: purchaseKeys.purchase(purchaseId ?? ""),
    queryFn: ({ signal }) => purchaseService.getById(purchaseId as UUID, signal),
    enabled: (options.enabled ?? true) && !!purchaseId && hasPermission(PERMISSIONS.PURCHASE_READ),
  });
}

/** Purchases from one supplier (for the supplier detail page). */
export function useSupplierPurchases(
  supplierId: UUID | undefined,
  params: PageParams = {},
  options: QueryOptions = {},
) {
  const { hasPermission } = useAuth();
  const { page = 0, size = 20 } = params;

  return useQuery<PurchasePageResponse, ApiError, PageResponse<Purchase>>({
    queryKey: purchaseKeys.supplierPurchases(supplierId ?? "", { page, size }),
    queryFn: ({ signal }) => purchaseService.listBySupplier(supplierId as UUID, page, size, signal),
    select: (result) => ({ ...result, content: result.content.map(toPurchase) }),
    enabled: (options.enabled ?? true) && !!supplierId && hasPermission(PERMISSIONS.PURCHASE_READ),
    placeholderData: keepPreviousData,
  });
}

/** Products ordered from one supplier. */
export function useSupplierProducts(
  supplierId: UUID | undefined,
  params: PageParams = {},
  options: QueryOptions = {},
) {
  const { hasPermission } = useAuth();
  const { page = 0, size = 20 } = params;

  return useQuery<SupplierProductPageResponse, ApiError, PageResponse<SupplierProduct>>({
    queryKey: purchaseKeys.supplierProducts(supplierId ?? "", { page, size }),
    queryFn: ({ signal }) => purchaseService.listSupplierProducts(supplierId as UUID, page, size, signal),
    select: (result) => ({ ...result, content: result.content.map(toSupplierProduct) }),
    enabled: (options.enabled ?? true) && !!supplierId && hasPermission(PERMISSIONS.PURCHASE_READ),
    placeholderData: keepPreviousData,
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

/** Stores the fresh purchase and refreshes every purchase list. */
function usePurchaseSaved() {
  const queryClient = useQueryClient();
  return async (purchase: Purchase) => {
    queryClient.setQueryData(purchaseKeys.purchase(purchase.id), purchase);
    await queryClient.invalidateQueries({ queryKey: purchaseKeys.purchases() });
  };
}

/** Stores the fresh purchase and refreshes everything in Purchasing, after a change that moved stock. */
function useStockChanged() {
  const queryClient = useQueryClient();
  return async (purchase: Purchase) => {
    queryClient.setQueryData(purchaseKeys.purchase(purchase.id), purchase);
    await queryClient.invalidateQueries({ queryKey: purchaseKeys.all });
    // TODO: also invalidate the Inventory stock keys here, e.g.
    // await queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
  };
}

/** Needs PURCHASE_CREATE. Orders goods (SUBMITTED); pass your own purchaseId for safe retries. */
export function useCreatePurchase() {
  const saved = usePurchaseSaved();

  return useMutation<Purchase, ApiError, CreatePurchaseRequest>({
    mutationFn: (request) => purchaseService.create(request),
    onSuccess: saved,
  });
}

/**
 * Needs PURCHASE_CREATE and RECEIPT_CONFIRM. Goods bought and received on the spot: the purchase is created and
 * confirmed in one call, so the kept goods go into stock at once.
 */
export function useRecordDirectPurchase() {
  const stockChanged = useStockChanged();

  return useMutation<Purchase, ApiError, DirectPurchaseRequest>({
    mutationFn: (request) => purchaseService.recordDirect(request),
    onSuccess: stockChanged,
  });
}

/** Needs PURCHASE_CREATE. SUBMITTED only. Fields left out stay unchanged. */
export function useUpdatePurchase() {
  const saved = usePurchaseSaved();

  return useMutation<Purchase, ApiError, { purchaseId: UUID; request: UpdatePurchaseRequest }>({
    mutationFn: ({ purchaseId, request }) => purchaseService.update(purchaseId, request),
    onSuccess: saved,
  });
}

/** Needs PURCHASE_CREATE. Adds a line to a SUBMITTED purchase. */
export function useAddPurchaseItem() {
  const saved = usePurchaseSaved();

  return useMutation<Purchase, ApiError, { purchaseId: UUID; request: PurchaseLineRequest }>({
    mutationFn: ({ purchaseId, request }) => purchaseService.addItem(purchaseId, request),
    onSuccess: saved,
  });
}

/** Needs PURCHASE_CREATE. Changes the quantity and price of a line of a SUBMITTED purchase. */
export function useChangePurchaseItem() {
  const saved = usePurchaseSaved();

  return useMutation<
    Purchase,
    ApiError,
    { purchaseId: UUID; purchaseItemId: UUID; request: ChangePurchaseItemRequest }
  >({
    mutationFn: ({ purchaseId, purchaseItemId, request }) =>
      purchaseService.changeItem(purchaseId, purchaseItemId, request),
    onSuccess: saved,
  });
}

/** Needs PURCHASE_CREATE. The backend answers 204, so the purchase is refreshed afterwards. */
export function useRemovePurchaseItem() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { purchaseId: UUID; purchaseItemId: UUID }>({
    mutationFn: ({ purchaseId, purchaseItemId }) => purchaseService.removeItem(purchaseId, purchaseItemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: purchaseKeys.purchases() }),
  });
}

/** Needs RECEIPT_CONFIRM. Records the delivery: the accepted goods go into stock at once. */
export function useConfirmPurchase() {
  const stockChanged = useStockChanged();

  return useMutation<Purchase, ApiError, { purchaseId: UUID; request: ConfirmPurchaseRequest }>({
    mutationFn: ({ purchaseId, request }) => purchaseService.confirm(purchaseId, request),
    onSuccess: stockChanged,
  });
}

/** Needs PURCHASE_CANCEL. SUBMITTED purchases only. */
export function useCancelPurchase() {
  const saved = usePurchaseSaved();

  return useMutation<Purchase, ApiError, { purchaseId: UUID; request: PurchaseReasonRequest }>({
    mutationFn: ({ purchaseId, request }) => purchaseService.cancel(purchaseId, request),
    onSuccess: saved,
  });
}