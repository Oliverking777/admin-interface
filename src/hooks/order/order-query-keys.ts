/**
 * Query keys for orders, in one place.
 * Keys are hierarchical: invalidating orderKeys.lists() refreshes every order list, orderKeys.all everything.
 */

import type { OrderListQuery } from "@/types/order/order-dto";

type Paged = { page: number; size: number };

export const orderKeys = {
  all: ["orders"] as const,

  lists: () => [...orderKeys.all, "list"] as const,
  list: (params: Paged & OrderListQuery) => [...orderKeys.lists(), params] as const,
  customerList: (customerId: string, params: Paged) => [...orderKeys.lists(), "customer", customerId, params] as const,

  order: (orderId: string) => [...orderKeys.all, "detail", orderId] as const,
  history: (orderId: string) => [...orderKeys.order(orderId), "history"] as const,
  receipt: (orderId: string) => [...orderKeys.order(orderId), "receipt"] as const,
};