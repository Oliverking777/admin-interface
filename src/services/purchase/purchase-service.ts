/**
 * Purchase operations from the frontend's point of view.
 * Talks to /purchases (and /suppliers/{id}/purchases|products) through the shared apiClient.
 * Stock only changes when a delivery is confirmed, or with a direct purchase.
 */
import { apiClient } from "@/lib/api/api-client";
import type { ApiResponse } from "@/types/iam/common-dto";
import type { Purchase, PurchaseItem, SupplierProduct } from "@/types/purchase/purchase";
import type {
  ChangePurchaseItemRequest,
  ConfirmPurchaseRequest,
  CreatePurchaseRequest,
  DirectPurchaseRequest,
  PurchaseItemResponse,
  PurchaseLineRequest,
  PurchaseListQuery,
  PurchasePageResponse,
  PurchaseReasonRequest,
  PurchaseResponse,
  SupplierProductPageResponse,
  SupplierProductResponse,
  UpdatePurchaseRequest,
} from "@/types/purchase/purchase-dto";

const PURCHASES_PATH = "/purchases";
const SUPPLIERS_PATH = "/suppliers";

export function toPurchaseItem(dto: PurchaseItemResponse): PurchaseItem {
  return {
    id: dto.purchaseItemId,
    productId: dto.productId,
    productName: dto.productName,
    unitId: dto.unitId,
    conversionFactor: dto.conversionFactor,
    orderedQuantity: dto.orderedQuantity,
    unitPurchasePrice: dto.unitPurchasePrice,
    lineTotal: dto.lineTotal,
    acceptedQuantity: dto.acceptedQuantity,
    rejectedQuantity: dto.rejectedQuantity,
    missingQuantity: dto.missingQuantity,
    rejectionType: dto.rejectionType,
    discrepancyReason: dto.discrepancyReason,
  };
}

export function toPurchase(dto: PurchaseResponse): Purchase {
  return {
    id: dto.purchaseId,
    code: dto.purchaseNumber,
    supplierId: dto.supplierId,
    supplierName: dto.supplierName,
    destinationLocationId: dto.destinationLocationId,
    locationName: dto.destinationLocationName,
    status: dto.purchaseStatus,
    hasDiscrepancy: dto.hasDiscrepancy,
    items: dto.items.map(toPurchaseItem),
    totalAmount: dto.totalAmount,
    expectedDeliveryDate: dto.expectedDeliveryDate,
    note: dto.note,
    deliveryNote: dto.deliveryNote,
    createdBy: dto.createdBy,
    confirmedBy: dto.confirmedBy,
    cancelledBy: dto.cancelledBy,
    cancelReason: dto.cancelReason,
    createdAt: dto.createdAt,
    confirmedAt: dto.confirmedAt,
    cancelledAt: dto.cancelledAt,
    updatedAt: dto.updatedAt,
  };
}

export function toSupplierProduct(dto: SupplierProductResponse): SupplierProduct {
  return { productId: dto.productId, productName: dto.productName };
}

/** Builds the query string values, leaving out filters that are empty. */
function buildListQuery(page: number, size: number, filters?: PurchaseListQuery) {
  return {
    page,
    size,
    ...(filters?.supplierId ? { supplierId: filters.supplierId } : {}),
    ...(filters?.locationId ? { locationId: filters.locationId } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
    ...(filters?.hasDiscrepancy !== undefined ? { hasDiscrepancy: filters.hasDiscrepancy } : {}),
    ...(filters?.from ? { from: filters.from } : {}),
    ...(filters?.to ? { to: filters.to } : {}),
  };
}

export const purchaseService = {
  /**
   * One page of purchases, newest first. Page numbers start at 0 (default size 20).
   * Without a role that works across every location only your own location is returned.
   * Needs PURCHASE_READ.
   */
  async listPage(
    page: number,
    size: number,
    filters?: PurchaseListQuery,
    signal?: AbortSignal,
  ): Promise<PurchasePageResponse> {
    const response = await apiClient.get<ApiResponse<PurchasePageResponse>>(PURCHASES_PATH, {
      query: buildListQuery(page, size, filters),
      signal,
    });
    return response.data;
  },

  /** One purchase with its lines. 404 if missing. Needs PURCHASE_READ. */
  async getById(id: string, signal?: AbortSignal): Promise<Purchase> {
    const response = await apiClient.get<ApiResponse<PurchaseResponse>>(`${PURCHASES_PATH}/${id}`, { signal });
    return toPurchase(response.data);
  },

  /**
   * Orders goods: creates a SUBMITTED purchase (no stock change). Send your own `purchaseId` so a retry returns
   * the same purchase. 400 = invalid value, 403 = not assigned to the destination location, 409 = purchaseId used
   * by someone else, inactive supplier or location, or a product/unit that cannot be bought. Needs PURCHASE_CREATE.
   */
  async create(request: CreatePurchaseRequest): Promise<Purchase> {
    const response = await apiClient.post<ApiResponse<PurchaseResponse>>(PURCHASES_PATH, request);
    return toPurchase(response.data);
  },

  /**
   * Goods bought and received on the spot: creates and confirms the purchase in one transaction, so the kept
   * goods go into stock at once. Send your own purchaseId so a retry returns what was already recorded.
   * Needs PURCHASE_CREATE and RECEIPT_CONFIRM.
   */
  async recordDirect(request: DirectPurchaseRequest): Promise<Purchase> {
    const response = await apiClient.post<ApiResponse<PurchaseResponse>>(`${PURCHASES_PATH}/direct`, request);
    return toPurchase(response.data);
  },

  /** Changes a SUBMITTED purchase. Fields left out stay unchanged. Needs PURCHASE_CREATE. */
  async update(id: string, request: UpdatePurchaseRequest): Promise<Purchase> {
    const response = await apiClient.put<ApiResponse<PurchaseResponse>>(`${PURCHASES_PATH}/${id}`, request);
    return toPurchase(response.data);
  },

  /** Adds a line to a SUBMITTED purchase (the same product + unit twice is refused). Needs PURCHASE_CREATE. */
  async addItem(id: string, request: PurchaseLineRequest): Promise<Purchase> {
    const response = await apiClient.post<ApiResponse<PurchaseResponse>>(`${PURCHASES_PATH}/${id}/items`, request);
    return toPurchase(response.data);
  },

  /** Changes the quantity and price of a line of a SUBMITTED purchase. Needs PURCHASE_CREATE. */
  async changeItem(id: string, purchaseItemId: string, request: ChangePurchaseItemRequest): Promise<Purchase> {
    const response = await apiClient.put<ApiResponse<PurchaseResponse>>(
      `${PURCHASES_PATH}/${id}/items/${purchaseItemId}`,
      request,
    );
    return toPurchase(response.data);
  },

  /**
   * Removes a line from a SUBMITTED purchase (204, no body: read the purchase again). The last line cannot be
   * removed: cancel the purchase instead. Needs PURCHASE_CREATE.
   */
  async removeItem(id: string, purchaseItemId: string): Promise<void> {
    await apiClient.delete<void>(`${PURCHASES_PATH}/${id}/items/${purchaseItemId}`);
  },

  /**
   * Records the delivery: SUBMITTED to CONFIRMED, and the accepted quantities go into stock in the same
   * transaction. One line per purchase line. A second confirmation is a 409. Needs RECEIPT_CONFIRM.
   */
  async confirm(id: string, request: ConfirmPurchaseRequest): Promise<Purchase> {
    const response = await apiClient.post<ApiResponse<PurchaseResponse>>(`${PURCHASES_PATH}/${id}/confirm`, request);
    return toPurchase(response.data);
  },

  /** Cancels a SUBMITTED purchase. No stock change. Needs PURCHASE_CANCEL. */
  async cancel(id: string, request: PurchaseReasonRequest): Promise<Purchase> {
    const response = await apiClient.post<ApiResponse<PurchaseResponse>>(`${PURCHASES_PATH}/${id}/cancel`, request);
    return toPurchase(response.data);
  },

  /** Purchases from one supplier, newest first. Needs PURCHASE_READ. */
  async listBySupplier(
    supplierId: string,
    page: number,
    size: number,
    signal?: AbortSignal,
  ): Promise<PurchasePageResponse> {
    const response = await apiClient.get<ApiResponse<PurchasePageResponse>>(
      `${SUPPLIERS_PATH}/${supplierId}/purchases`,
      { query: { page, size }, signal },
    );
    return response.data;
  },

  /** Products ordered from one supplier. Needs PURCHASE_READ. */
  async listSupplierProducts(
    supplierId: string,
    page: number,
    size: number,
    signal?: AbortSignal,
  ): Promise<SupplierProductPageResponse> {
    const response = await apiClient.get<ApiResponse<SupplierProductPageResponse>>(
      `${SUPPLIERS_PATH}/${supplierId}/products`,
      { query: { page, size }, signal },
    );
    return response.data;
  },
};