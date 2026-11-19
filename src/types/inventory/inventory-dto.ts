/**
 * Request/response shapes of the inventory endpoints (stock levels, movements, adjustments, initializations).
 * They match StockLevelResponse, ProductStockResponse, StockMovementResponse, StockAdjustmentResponse,
 * their page responses, RequestStockAdjustmentRequest, DecideStockAdjustmentRequest,
 * UpdateStockThresholdRequest, StockInitializationResponse, StockInitializationItemResponse,
 * StockInitializationPageResponse, InitializeStockRequest and InitializeStockLineRequest on the backend
 * (tsgp.yah_enterprise.inventory.presentation.dto).
 *
 * Fields marked `?: ... | null` can be null, and the backend may leave them out of the JSON entirely:
 * map them with `?? null`.
 */
import type { PageResponse } from "@/types/iam/common-dto";
import type { ISODateTime, UUID } from "@/types/iam/user";

/** Mirrors the backend AdjustmentDirection enum (sent as a string). */
export type AdjustmentDirectionDto = "INCREASE" | "DECREASE";

/** Mirrors the backend AdjustmentReason enum (sent as a string). */
export type AdjustmentReasonDto =
  | "DAMAGE"
  | "LOSS"
  | "SUPPLIER_RETURN"
  | "OPENING_STOCK"
  | "COUNT_CORRECTION"
  | "OTHER";

/** Mirrors the backend AdjustmentStatus enum (sent as a string). */
export type AdjustmentStatusDto = "PENDING" | "APPROVED" | "REJECTED";

/** Mirrors the backend MovementType enum (sent as a string). */
export type MovementTypeDto =
  | "PURCHASE"
  | "TRANSFER_IN"
  | "SALE_RETURN"
  | "TRANSFER_OUT"
  | "SALE"
  | "ADJUSTMENT"
  | "INITIALIZATION";

/** Mirrors the backend ReferenceType enum (sent as a string). */
export type ReferenceTypeDto = "PURCHASE" | "TRANSFER" | "SALE" | "ADJUSTMENT" | "STOCK_INITIALIZATION";

/** Mirrors the backend StockInitializationStatus enum (sent as a string). */
export type StockInitializationStatusDto = "COMPLETED" | "CANCELLED";

/* -------------------------------------------------------------------------- */
/*  Stock levels                                                              */
/* -------------------------------------------------------------------------- */

/** Stock of one product at one location, in base units. */
export interface ProductStockResponse {
  productId: UUID;
  locationId: UUID;
  quantity: number;
  /** Null (or left out) when no threshold is set. */
  lowStockThreshold?: number | null;
  lowStock: boolean;
  updatedAt: ISODateTime;
}

/** A product's stock at a location, with names for display. */
export interface StockLevelResponse {
  productId: UUID;
  productCode: string;
  productName: string;
  locationId: UUID;
  locationName: string;
  /** Base units. */
  quantity: number;
  /** Null (or left out) when no threshold is set. */
  lowStockThreshold?: number | null;
  lowStock: boolean;
  updatedAt: ISODateTime;
}

export type StockLevelPageResponse = PageResponse<StockLevelResponse>;

/** Sets or removes the low-stock threshold of a product at a location. */
export interface UpdateStockThresholdRequest {
  /** Base units, 0 or more. The product is low when its stock is at or below this number. Null removes the threshold. */
  lowStockThreshold: number | null;
}

/* -------------------------------------------------------------------------- */
/*  Stock movements (the ledger)                                              */
/* -------------------------------------------------------------------------- */

export interface StockMovementResponse {
  movementId: UUID;
  productId: UUID;
  productName: string;
  locationId: UUID;
  locationName: string;
  movementType: MovementTypeDto;
  /** Signed base units: positive adds stock, negative removes it. */
  quantityDelta: number;
  balanceAfter: number;
  referenceType: ReferenceTypeDto;
  referenceId: UUID;
  performedBy: UUID;
  occurredAt: ISODateTime;
  recordedAt: ISODateTime;
  /** Null (or left out) when there is no note. */
  note?: string | null;
}

export type StockMovementPageResponse = PageResponse<StockMovementResponse>;

/* -------------------------------------------------------------------------- */
/*  Stock adjustments                                                         */
/* -------------------------------------------------------------------------- */

export interface StockAdjustmentResponse {
  adjustmentId: UUID;
  /** Generated, e.g. "ADJ-000001". */
  adjustmentNumber: string;
  productId: UUID;
  productName: string;
  locationId: UUID;
  locationName: string;
  direction: AdjustmentDirectionDto;
  reasonCategory: AdjustmentReasonDto;
  /** Whole base units. */
  quantity: number;
  note?: string | null;
  adjustmentStatus: AdjustmentStatusDto;
  createdBy: UUID;
  /** Null (or left out) while PENDING. */
  decidedBy?: UUID | null;
  decisionNote?: string | null;
  /** Only set once APPROVED. */
  beforeQuantity?: number | null;
  /** Only set once APPROVED. */
  afterQuantity?: number | null;
  createdAt: ISODateTime;
  /** Null (or left out) while PENDING. */
  decidedAt?: ISODateTime | null;
  updatedAt: ISODateTime;
}

export type StockAdjustmentPageResponse = PageResponse<StockAdjustmentResponse>;

/**
 * Asks for a stock correction. It changes no stock until it is approved.
 * The reason and direction must fit together (see ADJUSTMENT_REASON_DIRECTION), and OTHER needs a note.
 */
export interface RequestStockAdjustmentRequest {
  /** Required. */
  productId: UUID;
  /** Required. The location where the stock is. */
  locationId: UUID;
  /** Required. */
  direction: AdjustmentDirectionDto;
  /** Required. */
  reasonCategory: AdjustmentReasonDto;
  /** Required. Whole BASE units (pieces), at least 1. */
  quantity: number;
  /** Max 500 characters. Required when the reason is OTHER. */
  note?: string;
}

/** Body for approving or rejecting an adjustment. */
export interface DecideStockAdjustmentRequest {
  /** Max 500 characters. Optional when approving; required (5 to 500 characters) when rejecting. */
  note?: string;
}

/* -------------------------------------------------------------------------- */
/*  Stock initializations                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One product line of a stock initialization.
 * In the LIST, unitCode and unitName are null (they only come with a single initialization).
 */
export interface StockInitializationItemResponse {
  itemId: UUID;
  productId: UUID;
  /** Null (or left out) when the product can no longer be found. */
  productName?: string | null;
  unitId: UUID;
  /** e.g. "CTN". Null (or left out) in the list. */
  unitCode?: string | null;
  /** e.g. "Carton". Null (or left out) in the list. */
  unitName?: string | null;
  /** How many base units make 1 of this unit. */
  conversionFactor: number;
  /** Physical count in the line's unit. */
  countedQuantity: number;
  /** Quantity in base units, posted to the ledger. */
  baseQuantity: number;
}

/** A stock initialization and its product lines. */
export interface StockInitializationResponse {
  initializationId: UUID;
  /** Generated, e.g. "INIT-000001". */
  initializationNumber: string;
  locationId: UUID;
  /** Null (or left out) when the location can no longer be found. */
  locationName?: string | null;
  status: StockInitializationStatusDto;
  /** The user who did it. */
  initializedBy: UUID;
  createdAt: ISODateTime;
  /** Null (or left out) when the initialization was not completed. */
  completedAt?: ISODateTime | null;
  items: StockInitializationItemResponse[];
}

/** Same paging fields as PageResponse (content, page, size, totalElements, totalPages, hasNext, hasPrevious). */
export type StockInitializationPageResponse = PageResponse<StockInitializationResponse>;

/** One product line of an initialization request. */
export interface InitializeStockLineRequest {
  /** Required. The product to initialize. Each product can appear once per request. */
  productId: UUID;
  /** Required. An active unit of the product: the unit the quantity is counted in. */
  unitId: UUID;
  /** Required. Physical count in that unit: a whole number, at least 1. */
  countedQuantity: number;
}

/**
 * Initializes the stock of several products at ONE location in a single atomic operation:
 * the stock balances and movements are recorded for all products or for none. It is completed on submission,
 * with no approval step. A product can be initialized only once per location (a second try is refused);
 * later corrections go through adjustments.
 */
export interface InitializeStockRequest {
  /** Required. The location where the initial stock is recorded. */
  locationId: UUID;
  /** Required. 1 to 100 lines, no duplicate products. */
  items: InitializeStockLineRequest[];
}

/* -------------------------------------------------------------------------- */
/*  List filters (query parameters, besides page and size)                    */
/* -------------------------------------------------------------------------- */

/** Query parameters of GET /stock. A user limited to one location only ever sees that location. */
export interface StockLevelListQuery {
  locationId?: UUID;
  productId?: UUID;
}

/** Query parameters of GET /stock/low-stock. */
export interface LowStockListQuery {
  locationId?: UUID;
}

/**
 * Query parameters of GET /stock/movements (newest first).
 * `from` and `to` are ISO date-times (e.g. `new Date().toISOString()`): `from` is inclusive, `to` is exclusive.
 */
export interface StockMovementListQuery {
  productId?: UUID;
  locationId?: UUID;
  movementType?: MovementTypeDto;
  from?: ISODateTime;
  to?: ISODateTime;
}

/** Query parameters of GET /stock/adjustments (newest first). */
export interface StockAdjustmentListQuery {
  status?: AdjustmentStatusDto;
  locationId?: UUID;
  productId?: UUID;
}

/** Query parameters of GET /stock/initializations (newest first). A user limited to one location only sees theirs. */
export interface StockInitializationListQuery {
  status?: StockInitializationStatusDto;
  locationId?: UUID;
}