/**
 * Transfer operations from the frontend's point of view.
 * Talks to /transfers through the shared apiClient.
 *
 * A transfer moves goods between two locations: SUBMITTED (sent, in transit) -> RECEIVED or CANCELLED.
 * Stock changes at exactly three moments: send (out of the source), receipt (into the destination, good
 * quantity only) and cancel (back into the source). There is no delete and no endpoint that writes stock.
 *
 * Errors worth handling in the UI (all ApiError):
 *   400   invalid request. Bean-validation failures (missing location, empty lines, quantity below 1,
 *         negative quantity, note over 500 characters) come with fieldErrors. Business-rule failures
 *         (same source and destination, invalid quantity, missing reason) come with a message only.
 *   403   the user is not assigned to the location the action needs: the source for send; the destination
 *         for receive; the source or the destination for cancel; their own location for reading.
 *   404   the transfer does not exist
 *   409   wrong status for the action, a location or product that is missing or inactive, the same
 *         product twice, a transferId already used by someone else, or not enough stock at the source
 *         when sending (nothing changes then)
 */
import { apiClient } from "@/lib/api/api-client";
import { mapPage } from "@/services/inventory/inventory-service";
import type {
  InTransitLine,
  Transfer,
  TransferEvent,
  TransferItem,
} from "@/types/inventory/transfer";
import type {
  CancelTransferRequest,
  CreateTransferRequest,
  InTransitLineResponse,
  InTransitListQuery,
  InTransitResponse,
  ReceiveTransferRequest,
  TransferEventResponse,
  TransferItemResponse,
  TransferListQuery,
  TransferPageResponse,
  TransferResponse,
} from "@/types/inventory/transfer-dto";
import type { ApiResponse } from "@/types/iam/common-dto";
import type { UUID } from "@/types/iam/user";

const TRANSFERS_PATH = "/transfers";
const IN_TRANSIT_PATH = `${TRANSFERS_PATH}/in-transit`;

function transferPath(transferId: UUID): string {
  return `${TRANSFERS_PATH}/${encodeURIComponent(transferId)}`;
}

/* -------------------------------------------------------------------------- */
/*  Mappers (DTO -> what the UI works with)                                   */
/* -------------------------------------------------------------------------- */

/** The backend may leave null fields out of the JSON, so every nullable field is mapped with `?? null`. */
export function toTransferItem(dto: TransferItemResponse): TransferItem {
  return {
    id: dto.transferItemId,
    productId: dto.productId,
    productCode: dto.productCode,
    productName: dto.productName,
    unitId: dto.unitId,
    unitName: dto.unitName,
    conversionFactor: dto.conversionFactor,
    quantity: dto.quantity,
    receivedQuantity: dto.receivedQuantity ?? null,
    damagedQuantity: dto.damagedQuantity ?? null,
    missingQuantity: dto.missingQuantity ?? null,
    discrepancyReason: dto.discrepancyReason ?? null,
    baseQuantity: dto.baseQuantity,
  };
}

export function toTransfer(dto: TransferResponse): Transfer {
  return {
    id: dto.transferId,
    number: dto.transferNumber,
    sourceLocationId: dto.sourceLocationId,
    sourceLocationName: dto.sourceLocationName,
    destinationLocationId: dto.destinationLocationId,
    destinationLocationName: dto.destinationLocationName,
    status: dto.transferStatus,
    hasDiscrepancy: dto.hasDiscrepancy ?? false,
    note: dto.note ?? null,
    items: dto.items.map(toTransferItem),
    createdBy: dto.createdBy,
    receivedBy: dto.receivedBy ?? null,
    cancelledBy: dto.cancelledBy ?? null,
    cancelReason: dto.cancelReason ?? null,
    createdAt: dto.createdAt,
    receivedAt: dto.receivedAt ?? null,
    cancelledAt: dto.cancelledAt ?? null,
    updatedAt: dto.updatedAt,
  };
}

export function toTransferEvent(dto: TransferEventResponse): TransferEvent {
  return {
    id: dto.eventId,
    type: dto.eventType,
    fromStatus: dto.fromStatus ?? null,
    toStatus: dto.toStatus,
    performedBy: dto.performedBy,
    occurredAt: dto.occurredAt,
    note: dto.note ?? null,
  };
}

export function toInTransitLine(dto: InTransitLineResponse): InTransitLine {
  return {
    destinationLocationId: dto.destinationLocationId,
    destinationLocationName: dto.destinationLocationName,
    productId: dto.productId,
    productName: dto.productName,
    baseQuantity: dto.baseQuantity,
  };
}

/** Re-exported so hooks only need to import from this file. */
export { mapPage };

/* -------------------------------------------------------------------------- */
/*  Service                                                                   */
/* -------------------------------------------------------------------------- */

export const transferService = {
  /* --------------------------------- reads --------------------------------- */

  /**
   * One page of transfers, newest first. Page numbers start at 0. A location matches the source or
   * the destination. A user limited to one location only sees their own. Needs TRANSFER_READ.
   */
  async listTransfersPage(
    page: number,
    size: number,
    filters?: TransferListQuery,
    signal?: AbortSignal,
  ): Promise<TransferPageResponse> {
    const response = await apiClient.get<ApiResponse<TransferPageResponse>>(TRANSFERS_PATH, {
      query: {
        page,
        size,
        locationId: filters?.locationId,
        status: filters?.status,
        hasDiscrepancy: filters?.hasDiscrepancy,
        productId: filters?.productId,
        from: filters?.from,
        to: filters?.to,
      },
      signal,
    });
    return response.data;
  },

  /** One transfer with its lines. A 404 ApiError means it does not exist. Needs TRANSFER_READ. */
  async getTransfer(transferId: UUID, signal?: AbortSignal): Promise<Transfer> {
    const response = await apiClient.get<ApiResponse<TransferResponse>>(transferPath(transferId), { signal });
    return toTransfer(response.data);
  },

  /** Every step of a transfer with the user and the time, oldest first. Needs TRANSFER_READ. */
  async getHistory(transferId: UUID, signal?: AbortSignal): Promise<TransferEvent[]> {
    const response = await apiClient.get<ApiResponse<TransferEventResponse[]>>(
      `${transferPath(transferId)}/history`,
      { signal },
    );
    return response.data.map(toTransferEvent);
  },

  /**
   * Goods that left their source and are still travelling, per destination and product (base units).
   * Derived from SUBMITTED transfers; it is not a stock balance. Needs TRANSFER_READ.
   */
  async listInTransit(filters?: InTransitListQuery, signal?: AbortSignal): Promise<InTransitLine[]> {
    const response = await apiClient.get<ApiResponse<InTransitResponse>>(IN_TRANSIT_PATH, {
      query: { locationId: filters?.locationId },
      signal,
    });
    return response.data.lines.map(toInTransitLine);
  },

  /* ---------------------------- send, receive, cancel ---------------------- */

  /**
   * Sends a transfer: it is created as SUBMITTED and the goods leave the source stock now. The user must work
   * at the source location. A 409 means the source has too little stock (nothing changes). Sending the same
   * transferId again returns the existing transfer without moving stock again, so a retry is safe.
   * Needs TRANSFER_CREATE.
   */
  async createTransfer(request: CreateTransferRequest): Promise<Transfer> {
    const response = await apiClient.post<ApiResponse<TransferResponse>>(TRANSFERS_PATH, request);
    return toTransfer(response.data);
  },

  /**
   * Receives a SUBMITTED transfer. The user must work at the destination. Good quantity goes into
   * stock; damaged and missing goods do not, need a reason and mark the transfer `hasDiscrepancy`.
   * Every product on the transfer needs a line. Needs TRANSFER_CONFIRM.
   */
  async receiveTransfer(transferId: UUID, request: ReceiveTransferRequest): Promise<Transfer> {
    const response = await apiClient.post<ApiResponse<TransferResponse>>(
      `${transferPath(transferId)}/receive`,
      request,
    );
    return toTransfer(response.data);
  },

  /**
   * Cancels a SUBMITTED transfer: the goods go back into the source stock. The user must work at the
   * source or the destination. The reason is required (5 to 500 characters). A received transfer cannot be
   * cancelled (409). Needs TRANSFER_CREATE or TRANSFER_CONFIRM.
   */
  async cancelTransfer(transferId: UUID, request: CancelTransferRequest): Promise<Transfer> {
    const response = await apiClient.post<ApiResponse<TransferResponse>>(
      `${transferPath(transferId)}/cancel`,
      request,
    );
    return toTransfer(response.data);
  },
};