"use client";

/**
 * Order queries and mutations.
 *
 *   component -> hook -> orderService -> apiClient
 *
 * Queries switch themselves off without SALE_READ. Mutations use mutateAsync in components and reject with an
 * ApiError (see order-service for the status codes). After a change, the fresh order is stored and the lists
 * refresh; completing a sale also refreshes the dashboard and the reports, since stock and money moved.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { dashboardKeys } from "@/hooks/dashboard/dashboard-query-keys";
import { useAuth } from "@/hooks/iam/use-auth";
import { orderKeys } from "@/hooks/order/order-query-keys";
import { reportKeys } from "@/hooks/report/report-query-keys";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { orderService } from "@/services/order/order-service";
import type { PageResponse } from "@/types/iam/common-dto";
import type { Order, OrderEvent, SaleReceipt } from "@/types/order/order";
import { ORDER_DEFAULT_PAGE_SIZE } from "@/types/order/order";
import type {
  CompleteSaleRequest,
  CreateOrderRequest,
  OrderListQuery,
  OrderReasonRequest,
  UpdateOrderRequest,
} from "@/types/order/order-dto";

type QueryOptions = { enabled?: boolean };
type PageParams = { page?: number; size?: number };

/* -------------------------------------------------------------------------- */
/*  Queries                                                                   */
/* -------------------------------------------------------------------------- */

/** One page of orders, newest first. The previous page stays visible while the next one loads. */
export function useOrders(params: PageParams & OrderListQuery = {}, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const { page = 0, size = ORDER_DEFAULT_PAGE_SIZE, ...filters } = params;

  return useQuery<PageResponse<Order>, ApiError>({
    queryKey: orderKeys.list({ page, size, ...filters }),
    queryFn: ({ signal }) => orderService.listPage(page, size, filters, signal),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.SALE_READ),
    placeholderData: keepPreviousData,
  });
}

/** One page of a customer's orders, newest first. */
export function useCustomerOrders(customerId: string | undefined, params: PageParams = {}, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const { page = 0, size = ORDER_DEFAULT_PAGE_SIZE } = params;

  return useQuery<PageResponse<Order>, ApiError>({
    queryKey: orderKeys.customerList(customerId ?? "", { page, size }),
    queryFn: ({ signal }) => orderService.listByCustomer(customerId as string, page, size, signal),
    enabled: (options.enabled ?? true) && !!customerId && hasPermission(PERMISSIONS.SALE_READ),
    placeholderData: keepPreviousData,
  });
}

/** One order with its lines and totals. */
export function useOrder(orderId: string | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<Order, ApiError>({
    queryKey: orderKeys.order(orderId ?? ""),
    queryFn: ({ signal }) => orderService.getById(orderId as string, signal),
    enabled: (options.enabled ?? true) && !!orderId && hasPermission(PERMISSIONS.SALE_READ),
  });
}

/** Every step of an order, oldest first. */
export function useOrderHistory(orderId: string | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<OrderEvent[], ApiError>({
    queryKey: orderKeys.history(orderId ?? ""),
    queryFn: ({ signal }) => orderService.getHistory(orderId as string, signal),
    enabled: (options.enabled ?? true) && !!orderId && hasPermission(PERMISSIONS.SALE_READ),
  });
}

/**
 * The receipt of a completed order. Pass enabled: order.status === "COMPLETED" (the backend answers 409 for
 * any other order). A receipt never changes, so it is cached for good.
 */
export function useSaleReceipt(orderId: string | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<SaleReceipt, ApiError>({
    queryKey: orderKeys.receipt(orderId ?? ""),
    queryFn: ({ signal }) => orderService.getReceipt(orderId as string, signal),
    enabled: (options.enabled ?? true) && !!orderId && hasPermission(PERMISSIONS.SALE_READ),
    staleTime: Infinity,
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

/** Stores the fresh order, drops its stale history and refreshes the lists and the dashboard counts. */
function useOrderSaved() {
  const queryClient = useQueryClient();
  return async (order: Order) => {
    queryClient.setQueryData(orderKeys.order(order.id), order);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.history(order.id) }),
      queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
    ]);
  };
}

/** Creates a PENDING order. Pass your own orderId (crypto.randomUUID()) so a retry never creates a second one. */
export function useCreateOrder() {
  const saved = useOrderSaved();
  return useMutation<Order, ApiError, CreateOrderRequest>({
    mutationFn: (request) => orderService.create(request),
    onSuccess: saved,
  });
}

/** Edits a PENDING order (creator only). */
export function useUpdateOrder() {
  const saved = useOrderSaved();
  return useMutation<Order, ApiError, { orderId: string; request: UpdateOrderRequest }>({
    mutationFn: ({ orderId, request }) => orderService.update(orderId, request),
    onSuccess: saved,
  });
}

/** Cancels a PENDING order with a reason (5 to 500 characters). */
export function useCancelOrder() {
  const saved = useOrderSaved();
  return useMutation<Order, ApiError, { orderId: string; request: OrderReasonRequest }>({
    mutationFn: ({ orderId, request }) => orderService.cancel(orderId, request),
    onSuccess: saved,
  });
}

/**
 * Completes the sale and returns the full receipt (with names and payments) to print.
 * The order, its history and lists are refetched; the dashboard and reports refresh too.
 */
export function useCompleteSale() {
  const queryClient = useQueryClient();
  return useMutation<SaleReceipt, ApiError, { orderId: string; request?: CompleteSaleRequest }>({
    mutationFn: ({ orderId, request }) => orderService.complete(orderId, request),
    onSuccess: async (receipt) => {
      queryClient.setQueryData(orderKeys.receipt(receipt.orderId), receipt);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: orderKeys.order(receipt.orderId), exact: true }),
        queryClient.invalidateQueries({ queryKey: orderKeys.history(receipt.orderId) }),
        queryClient.invalidateQueries({ queryKey: orderKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: dashboardKeys.all }),
        queryClient.invalidateQueries({ queryKey: reportKeys.all }),
      ]);
    },
  });
}

/* -------------------------------------------------------------------------- */
/*  Abilities                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * What the user may do with orders (buttons only: the backend checks everything, including the location).
 * cancelAny: may cancel any pending order; with only create, a user cancels their own.
 */
export function useOrderAbilities() {
  const { hasPermission } = useAuth();
  const create = hasPermission(PERMISSIONS.SALE_CREATE);
  const validate = hasPermission(PERMISSIONS.SALE_CREATE);
  return {
    read: hasPermission(PERMISSIONS.SALE_READ),
    create,
    complete: hasPermission(PERMISSIONS.SALE_CREATE),
    cancelOwn: create || validate,
    cancelAny: validate,
    /** For canCancelOrder(order, userId, can). */
    can: { create, validate },
  };
}