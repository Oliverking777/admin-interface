/**
 * Order operations from the frontend's point of view.
 * Talks to /orders (and /customers/{id}/orders) through the shared apiClient, and maps the JSON to order.ts.
 *
 * Errors (ApiError):
 *   400 invalid value or discount; 403 not assigned to the order's location (or cancelling someone else's order
 *   without SALE_VALIDATE); 404 order not found;
 *   409 wrong status, line not priceable, inactive customer/location/product, duplicate line, not enough stock,
 *   payment or credit refused, no receipt yet, orderId already used by someone else.
 */
import { apiClient } from "@/lib/api/api-client";
import type { ApiResponse, PageResponse } from "@/types/iam/common-dto";
import type { Order, OrderEvent, OrderItem, SaleReceipt } from "@/types/order/order";
import type {
  CompleteSaleRequest,
  CreateOrderRequest,
  OrderEventResponse,
  OrderItemResponse,
  OrderListQuery,
  OrderPageResponse,
  OrderReasonRequest,
  OrderResponse,
  ReceiptResponse,
  SaleReceiptResponse,
  UpdateOrderRequest,
} from "@/types/order/order-dto";

const ORDERS_PATH = "/orders";
const CUSTOMERS_PATH = "/customers";
/** Completing deducts stock, settles payment and issues the receipt in one transaction: give it more time. */
const COMPLETE_TIMEOUT_MS = 30_000;

/* -------------------------------------------------------------------------- */
/*  Mapping                                                                   */
/* -------------------------------------------------------------------------- */

export function toOrderItem(dto: OrderItemResponse): OrderItem {
  return {
    id: dto.orderItemId,
    productId: dto.productId,
    unitId: dto.unitId,
    conversionFactor: dto.conversionFactor,
    quantity: dto.quantity,
    baseQuantity: dto.baseQuantity,
    unitPrice: dto.unitPrice,
    priceId: dto.priceId,
    grossAmount: dto.lineTotal + dto.discountAmount,
    discountAmount: dto.discountAmount,
    lineTotal: dto.lineTotal,
  };
}

export function toOrder(dto: OrderResponse): Order {
  return {
    id: dto.orderId,
    orderNumber: dto.orderNumber,
    status: dto.orderStatus,
    locationId: dto.locationId,
    customerId: dto.customerId,
    items: dto.items.map(toOrderItem),
    subtotal: dto.subtotal,
    discountTotal: dto.discountTotal,
    totalAmount: dto.totalAmount,
    amountPaid: dto.amountPaid,
    amountDue: dto.amountDue,
    note: dto.note,
    cancelReason: dto.cancelReason,
    createdBy: dto.createdBy,
    completedBy: dto.completedBy,
    cancelledBy: dto.cancelledBy,
    createdAt: dto.createdAt,
    completedAt: dto.completedAt,
    updatedAt: dto.updatedAt,
  };
}

export function toOrderEvent(dto: OrderEventResponse): OrderEvent {
  return {
    id: dto.eventId,
    eventType: dto.eventType,
    fromStatus: dto.fromStatus,
    toStatus: dto.toStatus,
    performedBy: dto.performedBy,
    occurredAt: dto.occurredAt,
    note: dto.note,
  };
}

/** The receipt read later: no names, payments or note. */
export function toSaleReceipt(dto: ReceiptResponse): SaleReceipt {
  return {
    receiptNumber: dto.receiptNumber,
    issuedAt: dto.issuedAt,
    issuedBy: dto.issuedBy,
    orderId: dto.orderId,
    orderNumber: dto.orderNumber,
    customerId: dto.customerId,
    customerName: null,
    locationId: dto.locationId,
    locationName: null,
    lines: dto.lines.map((i) => ({
      id: i.orderItemId,
      productId: i.productId,
      unitId: i.unitId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discountAmount: i.discountAmount,
      lineTotal: i.lineTotal,
    })),
    payments: null,
    subtotal: dto.subtotal,
    discountTotal: dto.discountTotal,
    totalAmount: dto.totalAmount,
    amountPaid: dto.amountPaid,
    amountDue: dto.amountDue,
    fullyPaid: dto.amountDue === 0,
    note: null,
  };
}

/** The full receipt returned by completing. */
export function toCompletedSaleReceipt(dto: SaleReceiptResponse): SaleReceipt {
  return {
    receiptNumber: dto.receiptNumber,
    issuedAt: dto.issuedAt,
    issuedBy: dto.issuedBy,
    orderId: dto.orderId,
    orderNumber: dto.orderNumber,
    customerId: dto.customerId,
    customerName: dto.customerName,
    locationId: dto.locationId,
    locationName: dto.locationName,
    lines: dto.lines.map((l) => ({
      id: l.orderItemId,
      productId: l.productId,
      unitId: l.unitId,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountAmount: l.discountAmount,
      lineTotal: l.lineTotal,
    })),
    payments: dto.payments.map((p) => ({ method: p.paymentMethod, amount: p.amount, reference: p.reference })),
    subtotal: dto.subtotal,
    discountTotal: dto.discountTotal,
    totalAmount: dto.totalAmount,
    amountPaid: dto.amountPaid,
    amountDue: dto.amountDue,
    fullyPaid: dto.fullyPaid,
    note: dto.note,
  };
}

const toOrderPage = (dto: OrderPageResponse): PageResponse<Order> => ({ ...dto, content: dto.content.map(toOrder) });

/** Query values without the empty filters. */
function listQuery(page: number, size: number, filters: OrderListQuery = {}) {
  const query: Record<string, string | number> = { page, size };
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && value !== "") query[key] = value;
  }
  return query;
}

/* -------------------------------------------------------------------------- */
/*  Operations                                                                */
/* -------------------------------------------------------------------------- */

export const orderService = {
  /** One page of orders, newest first (page from 0, default size 20). Needs SALE_READ. */
  async listPage(page: number, size: number, filters?: OrderListQuery, signal?: AbortSignal) {
    const response = await apiClient.get<ApiResponse<OrderPageResponse>>(ORDERS_PATH, {
      query: listQuery(page, size, filters),
      signal,
    });
    return toOrderPage(response.data);
  },

  /** One page of a customer's orders, newest first. Needs SALE_READ. */
  async listByCustomer(customerId: string, page: number, size: number, signal?: AbortSignal) {
    const response = await apiClient.get<ApiResponse<OrderPageResponse>>(
      `${CUSTOMERS_PATH}/${customerId}/orders`,
      { query: { page, size }, signal },
    );
    return toOrderPage(response.data);
  },

  /** One order with its priced lines and totals. Needs SALE_READ. */
  async getById(orderId: string, signal?: AbortSignal): Promise<Order> {
    const response = await apiClient.get<ApiResponse<OrderResponse>>(`${ORDERS_PATH}/${orderId}`, { signal });
    return toOrder(response.data);
  },

  /** Every step of an order, oldest first. Needs SALE_READ. */
  async getHistory(orderId: string, signal?: AbortSignal): Promise<OrderEvent[]> {
    const response = await apiClient.get<ApiResponse<OrderEventResponse[]>>(`${ORDERS_PATH}/${orderId}/history`, {
      signal,
    });
    return response.data.map(toOrderEvent);
  },

  /** The receipt of a COMPLETED order (409 otherwise). Needs SALE_READ. */
  async getReceipt(orderId: string, signal?: AbortSignal): Promise<SaleReceipt> {
    const response = await apiClient.get<ApiResponse<ReceiptResponse>>(`${ORDERS_PATH}/${orderId}/receipt`, {
      signal,
    });
    return toSaleReceipt(response.data);
  },

  /**
   * Creates a PENDING order; the server prices every line. Send your own orderId so a retry returns the same
   * order. Needs SALE_CREATE.
   */
  async create(request: CreateOrderRequest): Promise<Order> {
    const response = await apiClient.post<ApiResponse<OrderResponse>>(ORDERS_PATH, request);
    return toOrder(response.data);
  },

  /** Edits a PENDING order (creator only). Fields left out stay unchanged; items replaces every line. Needs SALE_CREATE. */
  async update(orderId: string, request: UpdateOrderRequest): Promise<Order> {
    const response = await apiClient.put<ApiResponse<OrderResponse>>(`${ORDERS_PATH}/${orderId}`, request);
    return toOrder(response.data);
  },

  /** Cancels a PENDING order: your own with SALE_CREATE, any with SALE_VALIDATE. */
  async cancel(orderId: string, request: OrderReasonRequest): Promise<Order> {
    const response = await apiClient.post<ApiResponse<OrderResponse>>(`${ORDERS_PATH}/${orderId}/cancel`, request);
    return toOrder(response.data);
  },

  /**
   * Completes a PENDING order: prices it again, applies the discounts, deducts stock, settles payment and issues
   * the receipt, in one transaction (any failure leaves the order PENDING). Needs SALE_COMPLETE.
   */
  async complete(orderId: string, request: CompleteSaleRequest = {}): Promise<SaleReceipt> {
    const response = await apiClient.post<ApiResponse<SaleReceiptResponse>>(
      `${ORDERS_PATH}/${orderId}/complete`,
      request,
      { timeoutMs: COMPLETE_TIMEOUT_MS },
    );
    return toCompletedSaleReceipt(response.data);
  },
};