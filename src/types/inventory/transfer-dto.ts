/**
 * Request/response shapes of the /transfers endpoints.
 * They match TransferResponse, TransferItemResponse, TransferEventResponse, TransferPageResponse,
 * InTransitResponse, CreateTransferRequest, TransferLineRequest, ReceiveTransferRequest, ReceiveLineRequest and
 * CancelTransferRequest on the backend (tsgp.yah_enterprise.transfer.presentation.dto).
 *
 * Fields marked `?: ... | null` can be null, and the backend may leave them out of the JSON entirely:
 * map them with `?? null`.
 */
import type { PageResponse } from "@/types/iam/common-dto";
import type { ISODateTime, UUID } from "@/types/iam/user";

/** Matches the Java TransferStatus enum. */
export type TransferStatusDto = "SUBMITTED" | "RECEIVED" | "CANCELLED";

/* -------------------------------------------------------------------------- */
/*  Responses                                                                 */
/* -------------------------------------------------------------------------- */

export interface TransferItemResponse {
  transferItemId: UUID;
  productId: UUID;
  productCode: string;
  productName: string;
  unitId: UUID;
  unitName: string;
  /** How many base units make 1 of this unit. */
  conversionFactor: number;
  /** Quantity sent, in the line's unit. */
  quantity: number;
  /** In the line's unit. Null (or left out) before reception. */
  receivedQuantity?: number | null;
  /** In the line's unit. Null (or left out) before reception. */
  damagedQuantity?: number | null;
  /** In the line's unit. Null (or left out) before reception. */
  missingQuantity?: number | null;
  /** Null (or left out) when nothing is wrong. */
  discrepancyReason?: string | null;
  /** Sent quantity in base units. */
  baseQuantity: number;
}

export interface TransferResponse {
  transferId: UUID;
  /** Generated, e.g. "TRF-000001". */
  transferNumber: string;
  sourceLocationId: UUID;
  sourceLocationName: string;
  destinationLocationId: UUID;
  destinationLocationName: string;
  transferStatus: TransferStatusDto;
  /** Receipt outcome: true when some goods arrived damaged or missing. */
  hasDiscrepancy: boolean;
  /** Null (or left out) when there is no note. */
  note?: string | null;
  items: TransferItemResponse[];
  /** The sender. */
  createdBy: UUID;
  receivedBy?: UUID | null;
  cancelledBy?: UUID | null;
  /** Null (or left out) unless CANCELLED. */
  cancelReason?: string | null;
  /** When the goods were sent. */
  createdAt: ISODateTime;
  /** Null (or left out) until received. */
  receivedAt?: ISODateTime | null;
  /** Null (or left out) unless cancelled. */
  cancelledAt?: ISODateTime | null;
  updatedAt: ISODateTime;
}

/** Same paging fields as PageResponse (content, page, size, totalElements, totalPages, hasNext, hasPrevious). */
export type TransferPageResponse = PageResponse<TransferResponse>;

export interface TransferEventResponse {
  eventId: UUID;
  /** "SUBMITTED", "RECEIVED" or "CANCELLED". */
  eventType: string;
  /** Null (or left out) for the first event. */
  fromStatus?: TransferStatusDto | null;
  toStatus: TransferStatusDto;
  performedBy: UUID;
  occurredAt: ISODateTime;
  /** Null (or left out) when there is no note. */
  note?: string | null;
}

export interface InTransitLineResponse {
  destinationLocationId: UUID;
  destinationLocationName: string;
  productId: UUID;
  productName: string;
  /** Base units. */
  baseQuantity: number;
}

/** Goods that left but have not been received yet. */
export interface InTransitResponse {
  lines: InTransitLineResponse[];
}

/* -------------------------------------------------------------------------- */
/*  Requests                                                                  */
/* -------------------------------------------------------------------------- */

/** One line of a transfer. */
export interface TransferLineRequest {
  /** Required. The product to move. */
  productId: UUID;
  /** Required. The unit the quantity is counted in (e.g. carton). An active unit of the product. */
  unitId: UUID;
  /** Required. Whole number in that unit, at least 1. */
  quantity: number;
}

/**
 * A new transfer, sent at once: the goods leave the source stock now. No totals or numbers are sent: the
 * server assigns the "TRF-000001" style number. The user must work at the source location.
 * Sending the same transferId again returns the existing transfer without moving stock again.
 */
export interface CreateTransferRequest {
  /** Optional. An offline app sends its own UUID so a retry returns the same transfer. */
  transferId?: UUID;
  /** Required. Where the goods leave from. */
  sourceLocationId: UUID;
  /** Required. Where the goods go to. Must differ from the source. */
  destinationLocationId: UUID;
  /** Optional. Max 500 characters. */
  note?: string;
  /** Required. 1 to 100 lines, one per product. */
  items: TransferLineRequest[];
}

/** What arrived for one product (in the line's unit). */
export interface ReceiveLineRequest {
  /** Required. */
  productId: UUID;
  /** Required. Good quantity, 0 or more: it goes into the destination stock. */
  receivedQuantity: number;
  /** Optional, 0 or more, defaults to 0. Damaged goods are not added to stock. */
  damagedQuantity?: number;
  /** Max 500 characters. Required (at least 5) when goods are damaged or missing. */
  discrepancyReason?: string;
}

/** What arrived, line by line. Every product on the transfer needs a line. */
export interface ReceiveTransferRequest {
  /** Required. At least one line. */
  items: ReceiveLineRequest[];
}

/** Why the transfer is cancelled. */
export interface CancelTransferRequest {
  /** Required. 5 to 500 characters. */
  reason: string;
}

/* -------------------------------------------------------------------------- */
/*  List filters (query parameters, besides page and size)                    */
/* -------------------------------------------------------------------------- */

/**
 * Query parameters of GET /transfers (newest first).
 * `locationId` matches the source OR the destination. A user limited to one location only ever sees
 * their own location. `hasDiscrepancy: true` is the discrepancy review list.
 * `from` is inclusive and `to` is exclusive (ISO date-times, e.g. `new Date().toISOString()`), on the send time.
 */
export interface TransferListQuery {
  locationId?: UUID;
  status?: TransferStatusDto;
  /** true: receipts with damaged or missing goods; false: the others; left out: all. */
  hasDiscrepancy?: boolean;
  productId?: UUID;
  from?: ISODateTime;
  to?: ISODateTime;
}

/** Query parameters of GET /transfers/in-transit. */
export interface InTransitListQuery {
  locationId?: UUID;
}