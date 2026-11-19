/**
 * Order DTOs: the exact JSON of the backend Sales module (/orders and /customers/{id}/orders).
 * order-service maps responses to the models in order.ts.
 *
 * Response shapes follow the application records OrderResult, OrderItemResult, OrderEventResult, ReceiptResult
 * (field order taken from OrderSupport / OrderService) and the presentation record SaleReceiptResponse.
 */

import type { PageResponse } from "@/types/iam/common-dto";
import type { OrderEventType, OrderStatus, SalesPaymentMethod } from "@/types/order/order";

/* -------------------------------------------------------------------------- */
/*  Responses                                                                 */
/* -------------------------------------------------------------------------- */

export type OrderItemResponse = {
  orderItemId: string;
  productId: string;
  unitId: string;
  conversionFactor: number;
  quantity: number;
  baseQuantity: number;
  unitPrice: number | null;
  priceId: string | null;
  discountAmount: number;
  lineTotal: number;
};

/**
 * OrderResult. validatedBy, submittedAt, validatedAt and rejectionReason are still sent but are always null:
 * no step sets them any more.
 */
export type OrderResponse = {
  orderId: string;
  orderNumber: string;
  locationId: string;
  customerId: string;
  orderStatus: OrderStatus;
  items: OrderItemResponse[];
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
  amountPaid: number | null;
  amountDue: number | null;
  note: string | null;
  createdBy: string;
  validatedBy: string | null;
  completedBy: string | null;
  cancelledBy: string | null;
  rejectionReason: string | null;
  cancelReason: string | null;
  createdAt: string;
  submittedAt: string | null;
  validatedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

/** OrderPageResult (newest first). */
export type OrderPageResponse = PageResponse<OrderResponse>;

/** OrderEventResult. */
export type OrderEventResponse = {
  eventId: string;
  eventType: OrderEventType;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  performedBy: string;
  occurredAt: string;
  note: string | null;
};

/** ReceiptResult: GET /orders/{id}/receipt (completed orders only, 409 otherwise). */
export type ReceiptResponse = {
  receiptNumber: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  locationId: string;
  issuedAt: string;
  issuedBy: string;
  /** ReceiptResult.lines (OrderItemResult). */
  lines: OrderItemResponse[];
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
};

/** SaleReceiptResponse: what POST /orders/{id}/complete returns. */
export type SaleReceiptResponse = {
  receiptNumber: string;
  issuedAt: string;
  issuedBy: string;
  orderId: string;
  orderNumber: string;
  orderStatus: OrderStatus;
  completedAt: string;
  customerId: string;
  customerName: string | null;
  locationId: string;
  locationName: string | null;
  lines: {
    orderItemId: string;
    productId: string;
    unitId: string;
    quantity: number;
    unitPrice: number | null;
    discountAmount: number;
    lineTotal: number;
  }[];
  payments: { paymentMethod: SalesPaymentMethod; amount: number; reference: string | null }[];
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  fullyPaid: boolean;
  note: string | null;
};

/* -------------------------------------------------------------------------- */
/*  Requests                                                                  */
/* -------------------------------------------------------------------------- */

/** OrderLineRequest. No price: the server prices every line. */
export type OrderLineRequest = {
  productId: string;
  unitId: string;
  /** Whole number, at least 1. */
  quantity: number;
};

/** CreateOrderRequest. Needs SALE_CREATE, and you must work at the location (unless your role covers all). */
export type CreateOrderRequest = {
  /** Optional client UUID: sending the same id again returns the same order (safe retry). */
  orderId?: string;
  locationId: string;
  /** Use the walk-in customer's id for an anonymous sale. */
  customerId: string;
  note?: string | null;
  /** 1 to 100 lines, a product and unit at most once. */
  items: OrderLineRequest[];
};

/** UpdateOrderRequest. A field left out is unchanged; items replaces every line. Creator only, PENDING only. */
export type UpdateOrderRequest = {
  customerId?: string;
  note?: string;
  items?: OrderLineRequest[];
};

/** ReasonRequest: cancelling (5 to 500 characters). */
export type OrderReasonRequest = {
  reason: string;
};

export type PaymentLineRequest = {
  paymentMethod: SalesPaymentMethod;
  /** At least 1 FCFA. */
  amount: number;
  /** At most 50 characters. */
  reference?: string | null;
};

export type DiscountRequest = {
  productId: string;
  unitId: string;
  /** Whole FCFA, 0 or more, at most the line amount. */
  discountAmount: number;
};

/**
 * CompleteSaleRequest. Needs SALE_COMPLETE. Payments: only the amount kept (no change), at most 10.
 * When they cover less than the total, creditApprovalId must name an approved credit for this order.
 */
export type CompleteSaleRequest = {
  payments?: PaymentLineRequest[];
  creditApprovalId?: string | null;
  discounts?: DiscountRequest[];
};

/* -------------------------------------------------------------------------- */
/*  Queries                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * GET /orders filters. Without a role that works across every location, only your own location is returned
 * (another locationId is a 403). from is inclusive, to exclusive, both ISO instants (see businessDayRange).
 */
export type OrderListQuery = {
  locationId?: string;
  status?: OrderStatus;
  customerId?: string;
  createdBy?: string;
  from?: string;
  to?: string;
};