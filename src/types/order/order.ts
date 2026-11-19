/**
 * Order models (backend Sales module). They mirror OrderResult / SaleReceiptResponse with frontend names
 * (id, status...); order-service maps them.
 *
 * Life cycle: an order is created PENDING (the server prices every line), can be edited by its creator while
 * PENDING, and ends either COMPLETED (it becomes a sale: stock deducted, payment settled, receipt issued, all in
 * one transaction) or CANCELLED. Creating an order never deducts stock or takes payment.
 *
 * The backend sends ids only (no product, unit, customer or user names): the UI resolves them from its lists.
 * Money is whole FCFA (never negative). Totals are always computed by the backend.
 */

/** Mirrors OrderStatus. */
export type OrderStatus = "PENDING" | "COMPLETED" | "CANCELLED";

/** Mirrors OrderEventType. */
export type OrderEventType = "CREATED" | "UPDATED" | "CANCELLED" | "COMPLETED";

/** Mirrors SalesPaymentMethod. */
export type SalesPaymentMethod = "CASH" | "MOBILE_MONEY";

/* -------------------------------------------------------------------------- */
/*  Limits (same as the backend)                                              */
/* -------------------------------------------------------------------------- */

/** Order.MAX_LINES; also the most discounts on one completion. */
export const ORDER_MAX_LINES = 100;
/** Note: optional, at most 500 characters (trimmed; empty becomes null). */
export const ORDER_NOTE_MAX_LENGTH = 500;
/** Cancel reason: 5 to 500 characters (trimmed). */
export const ORDER_REASON_MIN_LENGTH = 5;
export const ORDER_REASON_MAX_LENGTH = 500;
/** Quantity of a line: a whole number, at least 1. */
export const ORDER_MIN_QUANTITY = 1;
/** CompleteSaleRequest: at most 10 payments, each at least 1 FCFA, reference at most 50 characters. */
export const SALE_MAX_PAYMENTS = 10;
export const SALE_MIN_PAYMENT_AMOUNT = 1;
export const SALE_PAYMENT_REFERENCE_MAX_LENGTH = 50;
/** List page size used by default by the backend. */
export const ORDER_DEFAULT_PAGE_SIZE = 20;
/** The business time zone (fixed UTC+1, no daylight saving). */
export const SALES_TIME_ZONE = "Africa/Douala";

/* -------------------------------------------------------------------------- */
/*  Rules (same as Order and OrderController)                                 */
/* -------------------------------------------------------------------------- */

/** Only a PENDING order can be edited, and only by the user who created it. */
export const isOrderEditable = (status: OrderStatus) => status === "PENDING";
export const canEditOrder = (order: Pick<Order, "status" | "createdBy">, userId: string | undefined) =>
  isOrderEditable(order.status) && !!userId && order.createdBy === userId;

/** Only a PENDING order can be cancelled or completed. */
export const isOrderCancellable = (status: OrderStatus) => status === "PENDING";
export const isOrderCompletable = (status: OrderStatus) => status === "PENDING";
/** COMPLETED or CANCELLED: the order never changes again. */
export const isOrderFinal = (status: OrderStatus) => status !== "PENDING";

/**
 * Who may cancel this order: its creator (with SALE_CREATE) or anyone with SALE_VALIDATE.
 * The backend also checks the location.
 */
export function canCancelOrder(
  order: Pick<Order, "status" | "createdBy">,
  userId: string | undefined,
  can: { create: boolean; validate: boolean },
) {
  if (!isOrderCancellable(order.status)) return false;
  return can.validate || (can.create && !!userId && order.createdBy === userId);
}

/* -------------------------------------------------------------------------- */
/*  Models                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * One line of an order. A product and unit appear at most once per order.
 * unitPrice is null while the line cannot be priced (no price for that unit and quantity):
 * the order can still be saved, but completing it fails until a price exists.
 */
export type OrderItem = {
  id: string;
  productId: string;
  unitId: string;
  /** Base units per unit of this line, at least 1 (snapshot from the catalog). */
  conversionFactor: number;
  /** At least 1. */
  quantity: number;
  /** quantity x conversionFactor: what leaves the stock. */
  baseQuantity: number;
  /** Null when not priced. Re-priced at completion with that day's price, then frozen. */
  unitPrice: number | null;
  /** The price row used (audit). Null when not priced. */
  priceId: string | null;
  /** quantity x unitPrice (0 when not priced). Computed here: lineTotal + discountAmount. */
  grossAmount: number;
  /** 0 when there is none. Never more than grossAmount. */
  discountAmount: number;
  /** grossAmount - discountAmount. */
  lineTotal: number;
};

export type Order = {
  id: string;
  /** "ORD-000001", generated, never edited. */
  orderNumber: string;
  status: OrderStatus;
  locationId: string;
  /** Always set: an anonymous sale uses the walk-in customer. */
  customerId: string;
  items: OrderItem[];

  /** Sum of the lines' gross amounts. */
  subtotal: number;
  /** Sum of the lines' discounts. */
  discountTotal: number;
  /** subtotal - discountTotal. */
  totalAmount: number;
  /** Set when COMPLETED (amountPaid + amountDue = totalAmount); null before. */
  amountPaid: number | null;
  /** Set when COMPLETED: what the customer still owes on this sale (credit); null before. */
  amountDue: number | null;

  note: string | null;
  /** Set when CANCELLED. */
  cancelReason: string | null;

  createdBy: string;
  completedBy: string | null;
  cancelledBy: string | null;

  createdAt: string;
  completedAt: string | null;
  updatedAt: string;
};

/** One step in the life of an order (history), oldest first. Never edited. */
export type OrderEvent = {
  id: string;
  eventType: OrderEventType;
  /** Null for CREATED. */
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  performedBy: string;
  occurredAt: string;
  /** The cancel reason for CANCELLED, else null. */
  note: string | null;
};

/** A discount on one line, given when completing (a line not listed gets none). One per line. */
export type OrderDiscount = {
  productId: string;
  unitId: string;
  /** Whole FCFA, 0 or more, at most the line's gross amount. */
  amount: number;
};

/** One payment taken when completing. */
export type SalePayment = {
  method: SalesPaymentMethod;
  /** Whole FCFA, at least 1. Only the amount kept: no change is recorded. */
  amount: number;
  /** e.g. the mobile money transaction id. At most 50 characters. */
  reference: string | null;
};

/** A line as printed on the receipt. */
export type SaleReceiptLine = Pick<
  OrderItem,
  "id" | "productId" | "unitId" | "quantity" | "unitPrice" | "discountAmount" | "lineTotal"
>;

/**
 * The receipt of a completed order (one per order). Data only: the layout is the client's job.
 * Completing returns the full receipt; reading it later (GET /orders/{id}/receipt) has no names, payments or note.
 */
export type SaleReceipt = {
  /** "RCT-000001". */
  receiptNumber: string;
  issuedAt: string;
  issuedBy: string;
  orderId: string;
  orderNumber: string;
  customerId: string;
  /** Only in the receipt returned by completing. */
  customerName: string | null;
  locationId: string;
  /** Only in the receipt returned by completing. */
  locationName: string | null;
  lines: SaleReceiptLine[];
  /** Only in the receipt returned by completing; null when read later. */
  payments: SalePayment[] | null;
  subtotal: number;
  discountTotal: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  /** amountDue is 0. */
  fullyPaid: boolean;
  note: string | null;
};

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

/** True when every line has a price, which completing requires. */
export const isFullyPriced = (items: Pick<OrderItem, "unitPrice">[]) => items.every((i) => i.unitPrice !== null);

/** Sum of the payments. What is left of the total needs an approved credit. */
export const paymentsTotal = (payments: Pick<SalePayment, "amount">[]) =>
  payments.reduce((sum, p) => sum + p.amount, 0);

/** Total after the discounts the manager is about to give (same as Order.recalculate()). */
export function totalAfterDiscounts(items: Pick<OrderItem, "grossAmount">[], discounts: number[]) {
  const subtotal = items.reduce((sum, i) => sum + i.grossAmount, 0);
  const discountTotal = discounts.reduce((sum, d) => sum + d, 0);
  return { subtotal, discountTotal, totalAmount: subtotal - discountTotal };
}

/**
 * The instants of a business-day period, for the list filters (from inclusive, to exclusive).
 * "2026-10-01".."2026-10-31" -> 2026-09-30T23:00:00Z .. 2026-10-31T23:00:00Z (Douala is UTC+1, no DST).
 */
export function businessDayRange(fromDay: string, toDay: string): { from: string; to: string } {
  const start = new Date(`${fromDay}T00:00:00+01:00`);
  const end = new Date(`${toDay}T00:00:00+01:00`);
  end.setUTCDate(end.getUTCDate() + 1);
  return { from: start.toISOString(), to: end.toISOString() };
}