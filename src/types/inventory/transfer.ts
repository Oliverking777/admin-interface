/**
 * Lifecycle of a transfer:
 *   SUBMITTED (sent: the goods left the source and are in transit) -> RECEIVED or CANCELLED. Both are final.
 * Creating a transfer sends it: there is no draft and no separate dispatch step.
 * Cancelling returns the goods to the source. A received transfer can no longer be cancelled.
 * How the receipt went is separate from the status: `hasDiscrepancy` is true when some goods arrived damaged
 * or missing (the review list). Show it as "Received with issues".
 */
export type TransferStatus = "SUBMITTED" | "RECEIVED" | "CANCELLED";

/** Limits that match the backend (CreateTransferRequest and friends). */
export const TRANSFER_NOTE_MAX_LENGTH = 500;
/** A transfer has 1 to this many lines, one per product. */
export const TRANSFER_MAX_LINES = 100;
/** A quantity is counted in the line's unit, at least 1. */
export const MIN_TRANSFER_LINE_QUANTITY = 1;
/** A cancellation needs a reason of this many characters at least (up to TRANSFER_NOTE_MAX_LENGTH). */
export const MIN_CANCEL_REASON_LENGTH = 5;
/** Required (this many characters at least, up to TRANSFER_NOTE_MAX_LENGTH) when goods are damaged or missing. */
export const MIN_DISCREPANCY_REASON_LENGTH = 5;

/* -------------------------------------------------------------------------- */
/*  What can be done in each status (the backend enforces it with a 409)       */
/* -------------------------------------------------------------------------- */

/** SUBMITTED to RECEIVED, done at the destination location. Good quantity enters the destination stock. */
export function canReceiveTransfer(status: TransferStatus): boolean {
  return status === "SUBMITTED";
}

/** SUBMITTED to CANCELLED, done at the source or the destination. The goods go back into the source stock. */
export function canCancelTransfer(status: TransferStatus): boolean {
  return status === "SUBMITTED";
}

/** Goods that left the source and have not been received or sent back yet. */
export function isTransferInTransit(status: TransferStatus): boolean {
  return status === "SUBMITTED";
}

/** True once the transfer is closed and nothing more can happen to it. */
export function isTransferFinished(status: TransferStatus): boolean {
  return status === "RECEIVED" || status === "CANCELLED";
}

/* -------------------------------------------------------------------------- */
/*  Receiving: damaged and missing goods                                      */
/* -------------------------------------------------------------------------- */

/** Goods that were sent but neither arrived good nor arrived damaged. Never negative. */
export function missingQuantity(sent: number, received: number, damaged: number): number {
  return Math.max(0, sent - received - damaged);
}

/** A reason is mandatory when a line has damaged or missing goods. */
export function receiveLineNeedsReason(sent: number, received: number, damaged: number): boolean {
  return damaged > 0 || missingQuantity(sent, received, damaged) > 0;
}

/* -------------------------------------------------------------------------- */
/*  Models                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * One product on a transfer. The sent, received, damaged and missing quantities are all counted in the line's
 * unit (`unitName`, e.g. cartons); the backend converts to base units when it moves stock.
 * `baseQuantity` is the sent amount in the product's base units (quantity x conversionFactor).
 * Received, damaged and missing quantities stay null until the transfer is received.
 */
export type TransferItem = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  unitId: string;
  unitName: string;
  /** How many base units make 1 of this unit. */
  conversionFactor: number;
  /** Quantity sent, in the line's unit, at least 1. */
  quantity: number;
  /** Good quantity: goes into the destination stock. Null before reception. */
  receivedQuantity: number | null;
  /** Damaged quantity: not added to stock. Null before reception. */
  damagedQuantity: number | null;
  /** Sent but neither received nor damaged. Null before reception. */
  missingQuantity: number | null;
  /** Why goods are damaged or missing. Null when nothing is wrong. */
  discrepancyReason: string | null;
  /** Sent quantity in base units. */
  baseQuantity: number;
};

/** Goods moving from one location to another. */
export type Transfer = {
  id: string;
  /** Generated, e.g. "TRF-000001". Never edited. */
  number: string;
  sourceLocationId: string;
  sourceLocationName: string;
  destinationLocationId: string;
  destinationLocationName: string;
  status: TransferStatus;
  /** Receipt outcome: true when some goods arrived damaged or missing. Always false before reception. */
  hasDiscrepancy: boolean;
  /** Max 500 characters. Null when there is no note. */
  note: string | null;
  items: TransferItem[];
  /** Id of the user who sent it. */
  createdBy: string;
  receivedBy: string | null;
  cancelledBy: string | null;
  /** Null unless CANCELLED. */
  cancelReason: string | null;
  /** ISO date-time: when the goods were sent. */
  createdAt: string;
  /** ISO date-time. Null until received. */
  receivedAt: string | null;
  /** ISO date-time. Null unless cancelled. */
  cancelledAt: string | null;
  /** ISO date-time. */
  updatedAt: string;
};

/** One step in a transfer's history (oldest first): sent, received or cancelled. */
export type TransferEvent = {
  id: string;
  /** What happened: "SUBMITTED", "RECEIVED" or "CANCELLED". */
  type: string;
  /** Null for the first event. */
  fromStatus: TransferStatus | null;
  toStatus: TransferStatus;
  /** Id of the user who did it. */
  performedBy: string;
  /** ISO date-time. */
  occurredAt: string;
  /** Null when there is no note. */
  note: string | null;
};

/**
 * Goods that left a source location but have not been received yet, per destination and product (base units).
 * Derived from SUBMITTED transfers: it is not a stock balance.
 */
export type InTransitLine = {
  destinationLocationId: string;
  destinationLocationName: string;
  productId: string;
  productName: string;
  /** Base units. */
  baseQuantity: number;
};