/** Whether an adjustment adds stock or removes it. */
export type AdjustmentDirection = "INCREASE" | "DECREASE";

/**
 * Reason category of a stock adjustment. Every adjustment has one.
 * DAMAGE, LOSS and SUPPLIER_RETURN only remove stock; OPENING_STOCK only adds it; COUNT_CORRECTION and
 * OTHER may do either. (The first quantity of products at a location is normally entered with a stock
 * initialization, see StockInitialization below.)
 */
export type AdjustmentReason =
  | "DAMAGE"
  | "LOSS"
  | "SUPPLIER_RETURN"
  | "OPENING_STOCK"
  | "COUNT_CORRECTION"
  | "OTHER";

/**
 * A new adjustment is PENDING and changes no stock. A user with the approve permission then approves it
 * (the stock moves at that moment) or rejects it. The backend lets the requester approve their own
 * adjustment. Adjustments are never deleted.
 */
export type AdjustmentStatus = "PENDING" | "APPROVED" | "REJECTED";

/**
 * Why stock moved. PURCHASE, TRANSFER_IN, SALE_RETURN and INITIALIZATION add stock; TRANSFER_OUT and SALE
 * remove it; ADJUSTMENT may do either.
 */
export type MovementType =
  | "PURCHASE"
  | "TRANSFER_IN"
  | "SALE_RETURN"
  | "TRANSFER_OUT"
  | "SALE"
  | "ADJUSTMENT"
  | "INITIALIZATION";

/** The kind of document a stock movement points at. */
export type ReferenceType = "PURCHASE" | "TRANSFER" | "SALE" | "ADJUSTMENT" | "STOCK_INITIALIZATION";

/** Limits that match the backend (StockAdjustment). */
export const ADJUSTMENT_NOTE_MAX_LENGTH = 500;
/** A rejection must come with a reason of at least this many characters (the note is the reason). */
export const MIN_REJECTION_NOTE_LENGTH = 5;
/** Adjustment quantities are whole base units, at least 1. */
export const MIN_ADJUSTMENT_QUANTITY = 1;

/** The only direction each reason allows, or null when it may go either way. */
export const ADJUSTMENT_REASON_DIRECTION: Record<AdjustmentReason, AdjustmentDirection | null> = {
  DAMAGE: "DECREASE",
  LOSS: "DECREASE",
  SUPPLIER_RETURN: "DECREASE",
  OPENING_STOCK: "INCREASE",
  COUNT_CORRECTION: null,
  OTHER: null,
};

/** True when the reason may be used with this direction (the backend refuses other pairs with a 400). */
export function reasonAllowsDirection(reason: AdjustmentReason, direction: AdjustmentDirection): boolean {
  const only = ADJUSTMENT_REASON_DIRECTION[reason];
  return only === null || only === direction;
}

/** A note is mandatory when the reason is OTHER. */
export function reasonRequiresNote(reason: AdjustmentReason): boolean {
  return reason === "OTHER";
}

/**
 * Stock of one product at one location, in BASE units (the product's smallest unit).
 * Goods in transit between locations are not counted here.
 */
export type ProductStock = {
  productId: string;
  locationId: string;
  /** Base units. Never negative. */
  quantity: number;
  /** The product counts as low when its quantity is at or below this number. Null means no threshold is set. */
  lowStockThreshold: number | null;
  /** True when a threshold is set and the quantity has reached it. */
  lowStock: boolean;
  /** ISO date-time. */
  updatedAt: string;
};

/** A product's stock at a location, with names for display (what stock lists work with). */
export type StockLevel = ProductStock & {
  productCode: string;
  productName: string;
  locationName: string;
};

/**
 * One line of the stock ledger. The ledger is append-only: a mistake is corrected by a new movement
 * (an adjustment), never by editing an old one.
 */
export type StockMovement = {
  id: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  type: MovementType;
  /** Signed base units: positive adds stock, negative removes it. Never 0. */
  quantityDelta: number;
  /** The location's stock for this product right after the movement, in base units. */
  balanceAfter: number;
  /** Kind of the document behind the movement. */
  referenceType: ReferenceType;
  /** Id of that document (a purchase, transfer, sale, adjustment or stock initialization). */
  referenceId: string;
  /** Id of the user who caused the movement. */
  performedBy: string;
  /** When the stock really moved. ISO date-time. */
  occurredAt: string;
  /** When the movement was written to the ledger. ISO date-time. */
  recordedAt: string;
  /** Max 500 characters. Null when there is no note. */
  note: string | null;
};

/** A request to correct stock. It changes nothing until it is approved. */
export type StockAdjustment = {
  id: string;
  /** Generated, e.g. "ADJ-000001". */
  number: string;
  productId: string;
  productName: string;
  locationId: string;
  locationName: string;
  direction: AdjustmentDirection;
  reason: AdjustmentReason;
  /** Whole base units, at least 1. The direction says whether they are added or removed. */
  quantity: number;
  /** Max 500 characters. Null when there is no note. */
  note: string | null;
  status: AdjustmentStatus;
  /** Id of the user who requested it. */
  createdBy: string;
  /** Id of the user who approved or rejected it. Null while PENDING. */
  decidedBy: string | null;
  /** Approval note (optional) or rejection reason (required). Null while PENDING or when no note was given. */
  decisionNote: string | null;
  /** The location's stock just before the approval. Null unless APPROVED. */
  beforeQuantity: number | null;
  /** The location's stock just after the approval. Null unless APPROVED. */
  afterQuantity: number | null;
  /** ISO date-time. */
  createdAt: string;
  /** ISO date-time. Null while PENDING. */
  decidedAt: string | null;
  /** ISO date-time. */
  updatedAt: string;
};

/* -------------------------------------------------------------------------- */
/*  Stock initialization (the first stock of products at a location)          */
/* -------------------------------------------------------------------------- */

/**
 * COMPLETED: the initialization was submitted and every stock movement was recorded.
 * CANCELLED: reserved by the backend for a future cancel feature; no stock was moved.
 */
export type StockInitializationStatus = "COMPLETED" | "CANCELLED";

/** A single initialization has 1 to this many product lines (InitializeStockRequest). */
export const MAX_INITIALIZATION_LINES = 100;
/** The counted quantity of a line is a whole number in the line's unit, at least 1. */
export const MIN_INITIALIZATION_QUANTITY = 1;

/** The counted quantity written in base units (counted x conversionFactor): what is posted to the ledger. */
export function initializationBaseQuantity(countedQuantity: number, conversionFactor: number): number {
  return countedQuantity * conversionFactor;
}

/**
 * One product line of a stock initialization. The quantity is counted in the line's unit (e.g. 50 cartons);
 * `baseQuantity` is the same amount in the product's base units (counted x conversionFactor), which is what
 * enters the stock. Each product can be initialized only once per location.
 * In the LIST, `unitCode` and `unitName` are null (they only come with a single initialization), and a name
 * is null when the product can no longer be found.
 */
export type StockInitializationItem = {
  id: string;
  productId: string;
  productName: string | null;
  unitId: string;
  /** e.g. "CTN". Null in the list. */
  unitCode: string | null;
  /** e.g. "Carton". Null in the list. */
  unitName: string | null;
  /** How many base units make 1 of this unit. */
  conversionFactor: number;
  /** Physical count in the line's unit, at least 1. */
  countedQuantity: number;
  /** Quantity in base units, posted to the ledger. */
  baseQuantity: number;
};

/**
 * A bulk initialization of the stock of several products at ONE location. It is COMPLETED as soon as it is
 * submitted: there is no approval step, and the stock balances and movements are written all together or not
 * at all. It cannot be edited or deleted afterwards; later corrections go through adjustments.
 */
export type StockInitialization = {
  id: string;
  /** Generated, e.g. "INIT-000001". Never edited. */
  number: string;
  locationId: string;
  /** Null when the location can no longer be found. */
  locationName: string | null;
  status: StockInitializationStatus;
  /** Id of the user who did it. */
  initializedBy: string;
  /** ISO date-time. */
  createdAt: string;
  /** ISO date-time. Null when the initialization was not completed (CANCELLED). */
  completedAt: string | null;
  items: StockInitializationItem[];
};