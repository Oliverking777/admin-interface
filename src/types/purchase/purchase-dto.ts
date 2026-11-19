/**
 * Request/response shapes of the /purchases endpoints.
 * Requests match tsgp.yah_enterprise.purchasing.presentation.dto exactly.
 * Responses match PurchaseResult and friends (purchasing.application.dto).
 */
import type { PageResponse } from "@/types/iam/common-dto";
import type { ISODateTime, UUID } from "@/types/iam/user";

/** ISO date without time, e.g. "2026-11-05". */
export type ISODate = string;

export type PurchaseStatusDto = "SUBMITTED" | "CONFIRMED" | "CANCELLED";
export type RejectionTypeDto = "DAMAGED" | "WRONG_PRODUCT" | "EXCESS" | "OTHER";

// ---------------------------------------------------------------- responses

/** PurchaseItemResult. The delivery fields are null until the purchase is CONFIRMED. */
export interface PurchaseItemResponse {
  purchaseItemId: UUID;
  productId: UUID;
  productName: string | null;
  unitId: UUID;
  conversionFactor: number;
  orderedQuantity: number;
  /** Whole FCFA. */
  unitPurchasePrice: number;
  /** Whole FCFA. */
  lineTotal: number;
  acceptedQuantity: number | null;
  rejectedQuantity: number | null;
  missingQuantity: number | null;
  rejectionType: RejectionTypeDto | null;
  discrepancyReason: string | null;
}

/** PurchaseResult. */
export interface PurchaseResponse {
  purchaseId: UUID;
  /** Generated, unique, e.g. "PUR-000001". */
  purchaseNumber: string;
  supplierId: UUID;
  supplierName: string | null;
  destinationLocationId: UUID;
  /** Null when the location can no longer be found. */
  destinationLocationName: string | null;
  purchaseStatus: PurchaseStatusDto;
  /** CONFIRMED with goods rejected or missing. */
  hasDiscrepancy: boolean;
  items: PurchaseItemResponse[];
  /** Whole FCFA. */
  totalAmount: number;
  expectedDeliveryDate: ISODate | null;
  note: string | null;
  deliveryNote: string | null;
  createdBy: UUID;
  confirmedBy: UUID | null;
  cancelledBy: UUID | null;
  cancelReason: string | null;
  createdAt: ISODateTime;
  confirmedAt: ISODateTime | null;
  cancelledAt: ISODateTime | null;
  updatedAt: ISODateTime;
}

export type PurchasePageResponse = PageResponse<PurchaseResponse>;

/** One row of GET /suppliers/{id}/products (SupplierProductResult). */
export interface SupplierProductResponse {
  productId: UUID;
  productName: string | null;
}

export type SupplierProductPageResponse = PageResponse<SupplierProductResponse>;

// ----------------------------------------------------------- purchase requests

/** PurchaseLineRequest. Also used to add a line to a SUBMITTED purchase. */
export interface PurchaseLineRequest {
  /** Required. */
  productId: UUID;
  /** Required. The conversion factor is snapshotted by the backend. */
  unitId: UUID;
  /** Required. At least 1. */
  quantity: number;
  /** Required. Whole FCFA per unit of the line, at least 1. */
  unitPrice: number;
}

/** Creates a SUBMITTED purchase: ordered, waiting for the goods. No stock changes. */
export interface CreatePurchaseRequest {
  /** Optional. An offline app sends its own UUID so a retry returns the same purchase. */
  purchaseId?: UUID;
  /** Required. */
  supplierId: UUID;
  /** Required. */
  destinationLocationId: UUID;
  /** Optional. Today or later. */
  expectedDeliveryDate?: ISODate;
  /** Optional. Max 500 characters. */
  note?: string;
  /** Required, 1-100 lines. A product + unit pair can appear once. */
  items: PurchaseLineRequest[];
}

/** SUBMITTED only. A missing field is left unchanged. */
export interface UpdatePurchaseRequest {
  supplierId?: UUID;
  destinationLocationId?: UUID;
  expectedDeliveryDate?: ISODate;
  /** Max 500 characters. */
  note?: string;
}

/** Change a line of a SUBMITTED purchase. */
export interface ChangePurchaseItemRequest {
  /** At least 1. */
  quantity: number;
  /** Whole FCFA, at least 1. */
  unitPrice: number;
}

/** Body of the cancel endpoint (PurchaseReasonRequest). */
export interface PurchaseReasonRequest {
  /** Required. 5-500 characters. */
  reason: string;
}

/**
 * Query parameters of GET /purchases (besides page and size). There is no text search.
 * Without a role that works across every location the backend only shows your own location.
 */
export interface PurchaseListQuery {
  supplierId?: UUID;
  locationId?: UUID;
  status?: PurchaseStatusDto;
  /** true: deliveries with rejected or missing goods; false: the others. */
  hasDiscrepancy?: boolean;
  /** ISO date-time, inclusive (order time). */
  from?: ISODateTime;
  /** ISO date-time, exclusive. */
  to?: ISODateTime;
}

// ------------------------------------------------------------ confirm delivery

/** What arrived for one purchase line, in the line's unit. Whatever is neither accepted nor rejected is missing. */
export interface DeliveryLineRequest {
  /** Required. Every line of the purchase needs one. */
  purchaseItemId: UUID;
  /** Required. Goes into stock. 0 to the ordered quantity. */
  quantityAccepted: number;
  /** Required. 0 or more. Refused at the door. */
  quantityRejected: number;
  /** Required when quantityRejected > 0. */
  rejectionType?: RejectionTypeDto;
  /** Required (5-500 characters) when the line differs from the order: rejected or missing goods. */
  reason?: string;
}

/**
 * POST /purchases/{id}/confirm: SUBMITTED to CONFIRMED. The accepted quantities go into stock in the same
 * transaction. Needs RECEIPT_CONFIRM and working at the destination location.
 */
export interface ConfirmPurchaseRequest {
  /** Optional. The supplier's delivery note number, max 50 characters. */
  deliveryNote?: string;
  /** Required. One line per purchase line. */
  items: DeliveryLineRequest[];
}

// ------------------------------------------------------------- direct purchase

/** One product bought and received on the spot. */
export interface DirectPurchaseLineRequest {
  /** Required. */
  productId: UUID;
  /** Required. An active unit of the product. */
  unitId: UUID;
  /** Required. What is kept, at least 1: it becomes the ordered and the accepted quantity. */
  quantityReceived: number;
  /** Required. Whole FCFA per unit, at least 1. */
  unitPrice: number;
  /** Optional, 0 or more. Refused at the door; needs rejectionType and rejectionReason when above 0. */
  quantityRejected?: number;
  rejectionType?: RejectionTypeDto;
  /** 5-500 characters when something was rejected. */
  rejectionReason?: string;
}

/**
 * POST /purchases/direct: creates and confirms the purchase in one transaction, so the kept goods go into
 * stock at once. The same purchaseId again returns what was recorded. Answers the CONFIRMED purchase.
 */
export interface DirectPurchaseRequest {
  purchaseId?: UUID;
  supplierId: UUID;
  destinationLocationId: UUID;
  /** Max 50 characters. */
  deliveryNote?: string;
  /** Max 500 characters. */
  note?: string;
  /** 1-100 lines, one per product + unit. */
  items: DirectPurchaseLineRequest[];
}