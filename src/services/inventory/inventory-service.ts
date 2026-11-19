/**
 * Inventory operations from the frontend's point of view.
 * Talks to /stock through the shared apiClient.
 *
 * Errors worth handling in the UI (all ApiError):
 *   400                invalid request. Bean-validation failures (missing product/location/direction/reason,
 *                      quantity below 1, negative threshold, note over 500 characters, an empty or oversized
 *                      initialization) come with fieldErrors. Business-rule failures (reason that does not fit
 *                      the direction, OTHER without a note, rejection reason shorter than 5 characters,
 *                      unknown status or movement type, a unit that is not available or is inactive for the
 *                      product, the same product twice in one initialization) come with a message only,
 *                      so show error.message for those.
 *   403                a user limited to one location tried to use another location
 *   404                the adjustment or the initialization does not exist
 *   409                inactive/missing product or location, adjustment already decided, a decrease larger
 *                      than the stock (the adjustment then stays PENDING), or a product that was already
 *                      initialized at that location (the whole initialization is then refused)
 *
 * Note: the backend lets the requester of an adjustment approve it themselves.
 */
import { apiClient } from "@/lib/api/api-client";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import type {
  ProductStock,
  StockAdjustment,
  StockInitialization,
  StockInitializationItem,
  StockLevel,
  StockMovement,
} from "@/types/inventory/inventory";
import type {
  DecideStockAdjustmentRequest,
  InitializeStockRequest,
  LowStockListQuery,
  ProductStockResponse,
  RequestStockAdjustmentRequest,
  StockAdjustmentListQuery,
  StockAdjustmentPageResponse,
  StockAdjustmentResponse,
  StockInitializationItemResponse,
  StockInitializationListQuery,
  StockInitializationPageResponse,
  StockInitializationResponse,
  StockLevelListQuery,
  StockLevelPageResponse,
  StockLevelResponse,
  StockMovementListQuery,
  StockMovementPageResponse,
  StockMovementResponse,
  UpdateStockThresholdRequest,
} from "@/types/inventory/inventory-dto";
import type { ApiResponse, PageResponse } from "@/types/iam/common-dto";
import type { UUID } from "@/types/iam/user";

const STOCK_PATH = "/stock";
const LOW_STOCK_PATH = `${STOCK_PATH}/low-stock`;
const MOVEMENTS_PATH = `${STOCK_PATH}/movements`;
const ADJUSTMENTS_PATH = `${STOCK_PATH}/adjustments`;
const INITIALIZATIONS_PATH = `${STOCK_PATH}/initializations`;

/* -------------------------------------------------------------------------- */
/*  Mappers (DTO -> what the UI works with)                                   */
/* -------------------------------------------------------------------------- */

/** The backend may leave null fields out of the JSON, so every nullable field is mapped with `?? null`. */
export function toProductStock(dto: ProductStockResponse): ProductStock {
  return {
    productId: dto.productId,
    locationId: dto.locationId,
    quantity: dto.quantity,
    lowStockThreshold: dto.lowStockThreshold ?? null,
    lowStock: dto.lowStock,
    updatedAt: dto.updatedAt,
  };
}

export function toStockLevel(dto: StockLevelResponse): StockLevel {
  return {
    productId: dto.productId,
    productCode: dto.productCode,
    productName: dto.productName,
    locationId: dto.locationId,
    locationName: dto.locationName,
    quantity: dto.quantity,
    lowStockThreshold: dto.lowStockThreshold ?? null,
    lowStock: dto.lowStock,
    updatedAt: dto.updatedAt,
  };
}

export function toStockMovement(dto: StockMovementResponse): StockMovement {
  return {
    id: dto.movementId,
    productId: dto.productId,
    productName: dto.productName,
    locationId: dto.locationId,
    locationName: dto.locationName,
    type: dto.movementType,
    quantityDelta: dto.quantityDelta,
    balanceAfter: dto.balanceAfter,
    referenceType: dto.referenceType,
    referenceId: dto.referenceId,
    performedBy: dto.performedBy,
    occurredAt: dto.occurredAt,
    recordedAt: dto.recordedAt,
    note: dto.note ?? null,
  };
}

export function toStockAdjustment(dto: StockAdjustmentResponse): StockAdjustment {
  return {
    id: dto.adjustmentId,
    number: dto.adjustmentNumber,
    productId: dto.productId,
    productName: dto.productName,
    locationId: dto.locationId,
    locationName: dto.locationName,
    direction: dto.direction,
    reason: dto.reasonCategory,
    quantity: dto.quantity,
    note: dto.note ?? null,
    status: dto.adjustmentStatus,
    createdBy: dto.createdBy,
    decidedBy: dto.decidedBy ?? null,
    decisionNote: dto.decisionNote ?? null,
    beforeQuantity: dto.beforeQuantity ?? null,
    afterQuantity: dto.afterQuantity ?? null,
    createdAt: dto.createdAt,
    decidedAt: dto.decidedAt ?? null,
    updatedAt: dto.updatedAt,
  };
}

export function toStockInitializationItem(dto: StockInitializationItemResponse): StockInitializationItem {
  return {
    id: dto.itemId,
    productId: dto.productId,
    productName: dto.productName ?? null,
    unitId: dto.unitId,
    unitCode: dto.unitCode ?? null,
    unitName: dto.unitName ?? null,
    conversionFactor: dto.conversionFactor,
    countedQuantity: dto.countedQuantity,
    baseQuantity: dto.baseQuantity,
  };
}

export function toStockInitialization(dto: StockInitializationResponse): StockInitialization {
  return {
    id: dto.initializationId,
    number: dto.initializationNumber,
    locationId: dto.locationId,
    locationName: dto.locationName ?? null,
    status: dto.status,
    initializedBy: dto.initializedBy,
    createdAt: dto.createdAt,
    completedAt: dto.completedAt ?? null,
    items: dto.items.map(toStockInitializationItem),
  };
}

/** Maps every item of a page and keeps the paging fields. */
export function mapPage<T, U>(page: PageResponse<T>, mapper: (item: T) => U): PageResponse<U> {
  return { ...page, content: page.content.map(mapper) };
}

/* -------------------------------------------------------------------------- */
/*  Service                                                                   */
/* -------------------------------------------------------------------------- */

export const inventoryService = {
  /* ------------------------------ stock levels ----------------------------- */

  /**
   * One page of stock levels (one row per product and location, in base units). Page numbers start at 0.
   * A user limited to one location only sees that location. Needs STOCK_READ.
   */
  async listStockLevelsPage(
    page: number,
    size: number,
    filters?: StockLevelListQuery,
    signal?: AbortSignal,
  ): Promise<StockLevelPageResponse> {
    const response = await apiClient.get<ApiResponse<StockLevelPageResponse>>(STOCK_PATH, {
      query: { page, size, locationId: filters?.locationId, productId: filters?.productId },
      signal,
    });
    return response.data;
  },

  /** Every stock level (all pages), optionally filtered. Needs STOCK_READ. */
  async listAllStockLevels(filters?: StockLevelListQuery, signal?: AbortSignal): Promise<StockLevel[]> {
    const levels = await fetchAllPages((page, size) =>
      inventoryService.listStockLevelsPage(page, size, filters, signal),
    );
    return levels.map(toStockLevel);
  },

  /** One page of products at or below their low-stock threshold. Needs STOCK_THRESHOLD_READ. */
  async listLowStockPage(
    page: number,
    size: number,
    filters?: LowStockListQuery,
    signal?: AbortSignal,
  ): Promise<StockLevelPageResponse> {
    const response = await apiClient.get<ApiResponse<StockLevelPageResponse>>(LOW_STOCK_PATH, {
      query: { page, size, locationId: filters?.locationId },
      signal,
    });
    return response.data;
  },

  /**
   * The stock of one product at one location. The backend answers with quantity 0 when nothing was
   * ever recorded. A 403 means the location is not the user's own. Needs STOCK_READ.
   */
  async getProductStock(productId: UUID, locationId: UUID, signal?: AbortSignal): Promise<ProductStock> {
    const response = await apiClient.get<ApiResponse<ProductStockResponse>>(
      `${STOCK_PATH}/products/${encodeURIComponent(productId)}/locations/${encodeURIComponent(locationId)}`,
      { signal },
    );
    return toProductStock(response.data);
  },

  /**
   * Sets the low-stock threshold of a product at a location; null removes it.
   * It never changes the quantity. A 400 means a negative threshold, a 409 an inactive product or
   * location. Needs STOCK_THRESHOLD_UPDATE.
   */
  async updateThreshold(
    productId: UUID,
    locationId: UUID,
    request: UpdateStockThresholdRequest,
  ): Promise<ProductStock> {
    const response = await apiClient.put<ApiResponse<ProductStockResponse>>(
      `${STOCK_PATH}/products/${encodeURIComponent(productId)}/locations/${encodeURIComponent(locationId)}/threshold`,
      request,
    );
    return toProductStock(response.data);
  },

  /* --------------------------- movements (the ledger) ---------------------- */

  /**
   * One page of ledger movements, newest first. Quantities are signed base units.
   * `from` is inclusive and `to` is exclusive (ISO date-times). Needs STOCK_READ.
   */
  async listMovementsPage(
    page: number,
    size: number,
    filters?: StockMovementListQuery,
    signal?: AbortSignal,
  ): Promise<StockMovementPageResponse> {
    const response = await apiClient.get<ApiResponse<StockMovementPageResponse>>(MOVEMENTS_PATH, {
      query: {
        page,
        size,
        productId: filters?.productId,
        locationId: filters?.locationId,
        movementType: filters?.movementType,
        from: filters?.from,
        to: filters?.to,
      },
      signal,
    });
    return response.data;
  },

  /* -------------------------------- adjustments ---------------------------- */

  /**
   * Asks for a stock correction. The adjustment is PENDING and changes no stock until it is approved.
   * A 400 means an invalid request (see ADJUSTMENT_REASON_DIRECTION and reasonRequiresNote),
   * a 409 an inactive or missing product or location. Needs STOCK_ADJUST_CREATE.
   */
  async requestAdjustment(request: RequestStockAdjustmentRequest): Promise<StockAdjustment> {
    const response = await apiClient.post<ApiResponse<StockAdjustmentResponse>>(ADJUSTMENTS_PATH, request);
    return toStockAdjustment(response.data);
  },

  /** One page of adjustments, newest first. Needs STOCK_ADJUST_READ. */
  async listAdjustmentsPage(
    page: number,
    size: number,
    filters?: StockAdjustmentListQuery,
    signal?: AbortSignal,
  ): Promise<StockAdjustmentPageResponse> {
    const response = await apiClient.get<ApiResponse<StockAdjustmentPageResponse>>(ADJUSTMENTS_PATH, {
      query: {
        page,
        size,
        status: filters?.status,
        locationId: filters?.locationId,
        productId: filters?.productId,
      },
      signal,
    });
    return response.data;
  },

  /** One adjustment by id. A 404 ApiError means it does not exist. Needs STOCK_ADJUST_READ. */
  async getAdjustment(adjustmentId: UUID, signal?: AbortSignal): Promise<StockAdjustment> {
    const response = await apiClient.get<ApiResponse<StockAdjustmentResponse>>(
      `${ADJUSTMENTS_PATH}/${encodeURIComponent(adjustmentId)}`,
      { signal },
    );
    return toStockAdjustment(response.data);
  },

  /**
   * Approves a PENDING adjustment: the stock moves now and before/after quantities are recorded.
   * The note is optional. The requester may approve their own adjustment. 409 if it was already decided
   * or if a decrease is larger than the stock (it then stays PENDING). Needs STOCK_ADJUST_APPROVE.
   */
  async approveAdjustment(
    adjustmentId: UUID,
    request?: DecideStockAdjustmentRequest,
  ): Promise<StockAdjustment> {
    const response = await apiClient.post<ApiResponse<StockAdjustmentResponse>>(
      `${ADJUSTMENTS_PATH}/${encodeURIComponent(adjustmentId)}/approve`,
      request,
    );
    return toStockAdjustment(response.data);
  },

  /**
   * Rejects a PENDING adjustment; no stock changes. The note is the reason and is required
   * (5 to 500 characters, see MIN_REJECTION_NOTE_LENGTH), otherwise a 400. 409 if it was already
   * decided. Needs STOCK_ADJUST_APPROVE.
   */
  async rejectAdjustment(
    adjustmentId: UUID,
    request: DecideStockAdjustmentRequest,
  ): Promise<StockAdjustment> {
    const response = await apiClient.post<ApiResponse<StockAdjustmentResponse>>(
      `${ADJUSTMENTS_PATH}/${encodeURIComponent(adjustmentId)}/reject`,
      request,
    );
    return toStockAdjustment(response.data);
  },

  /* ----------------------------- stock initializations --------------------- */

  /**
   * Initializes the stock of several products at ONE location in a single atomic operation: all lines
   * succeed or none do, and it is COMPLETED at once (no approval). Each product can be initialized only
   * once per location. A 409 means a product or the location is missing or inactive, or a product was
   * already initialized there; a 400 an invalid line (unit not available or inactive for the product,
   * quantity below 1, the same product twice, no lines); a 403 another user's location.
   * There is no client-generated id, so do not retry a request whose outcome is unknown without checking
   * the list first. Needs STOCK_INIT_CREATE.
   */
  async initializeStock(request: InitializeStockRequest): Promise<StockInitialization> {
    const response = await apiClient.post<ApiResponse<StockInitializationResponse>>(
      INITIALIZATIONS_PATH,
      request,
    );
    return toStockInitialization(response.data);
  },

  /**
   * One page of stock initializations, newest first. A user limited to one location only sees that
   * location's. In the list, the unit code and name of each line are null. Needs STOCK_INIT_READ.
   */
  async listInitializationsPage(
    page: number,
    size: number,
    filters?: StockInitializationListQuery,
    signal?: AbortSignal,
  ): Promise<StockInitializationPageResponse> {
    const response = await apiClient.get<ApiResponse<StockInitializationPageResponse>>(INITIALIZATIONS_PATH, {
      query: { page, size, status: filters?.status, locationId: filters?.locationId },
      signal,
    });
    return response.data;
  },

  /**
   * Every stock initialization (all pages), optionally filtered. Used to know which products were already
   * initialized at a location. In this list the unit code and name of each line are null.
   * Needs STOCK_INIT_READ.
   */
  async listAllInitializations(
    filters?: StockInitializationListQuery,
    signal?: AbortSignal,
  ): Promise<StockInitialization[]> {
    const initializations = await fetchAllPages((page, size) =>
      inventoryService.listInitializationsPage(page, size, filters, signal),
    );
    return initializations.map(toStockInitialization);
  },

  /**
   * One initialization with all its lines, product and unit names included. A 404 ApiError means it
   * does not exist; a 403 that it belongs to another location. Needs STOCK_INIT_READ.
   */
  async getInitialization(initializationId: UUID, signal?: AbortSignal): Promise<StockInitialization> {
    const response = await apiClient.get<ApiResponse<StockInitializationResponse>>(
      `${INITIALIZATIONS_PATH}/${encodeURIComponent(initializationId)}`,
      { signal },
    );
    return toStockInitialization(response.data);
  },
};