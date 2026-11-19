"use client";

/**
 * Inventory queries and mutations: stock levels, the ledger, thresholds, adjustments and initializations.
 *
 *   component -> hook -> inventoryService -> apiClient
 *
 * Queries switch themselves off when the user lacks the permission they need, so no pointless 403 is sent.
 * (The backend still enforces everything, including the location scope; this only saves requests.)
 * Errors are ApiError: use error.fieldErrors for forms, error.message for toasts.
 * A 409 means, for example, that the adjustment was already decided, that a decrease is larger than the
 * stock (the adjustment then stays PENDING), or that a product was already initialized at that location.
 *
 * Stock only changes when an adjustment is approved or a stock initialization is submitted (other modules
 * post movements through the backend). So those two refresh levels, the ledger and their own lists;
 * every other mutation refreshes less.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { inventoryKeys } from "@/hooks/inventory/inventory-query-keys";
import { useAuth } from "@/hooks/iam/use-auth";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import {
  inventoryService,
  mapPage,
  toStockAdjustment,
  toStockInitialization,
  toStockLevel,
  toStockMovement,
} from "@/services/inventory/inventory-service";
import type { PageParams } from "@/services/iam/role-service";
import type {
  ProductStock,
  StockAdjustment,
  StockInitialization,
  StockLevel,
  StockMovement,
} from "@/types/inventory/inventory";
import type {
  DecideStockAdjustmentRequest,
  InitializeStockRequest,
  LowStockListQuery,
  RequestStockAdjustmentRequest,
  StockAdjustmentListQuery,
  StockAdjustmentPageResponse,
  StockInitializationListQuery,
  StockInitializationPageResponse,
  StockLevelListQuery,
  StockLevelPageResponse,
  StockMovementListQuery,
  StockMovementPageResponse,
  UpdateStockThresholdRequest,
} from "@/types/inventory/inventory-dto";
import type { PageResponse } from "@/types/iam/common-dto";
import type { UUID } from "@/types/iam/user";

type QueryOptions = { enabled?: boolean };

/** Filters in a stable shape for the query key (a missing filter is always null). */
function normalizeLevelFilters(filters: StockLevelListQuery = {}) {
  return { locationId: filters.locationId ?? null, productId: filters.productId ?? null };
}

function normalizeMovementFilters(filters: StockMovementListQuery = {}) {
  return {
    productId: filters.productId ?? null,
    locationId: filters.locationId ?? null,
    movementType: filters.movementType ?? null,
    from: filters.from ?? null,
    to: filters.to ?? null,
  };
}

function normalizeAdjustmentFilters(filters: StockAdjustmentListQuery = {}) {
  return {
    status: filters.status ?? null,
    locationId: filters.locationId ?? null,
    productId: filters.productId ?? null,
  };
}

function normalizeInitializationFilters(filters: StockInitializationListQuery = {}) {
  return { status: filters.status ?? null, locationId: filters.locationId ?? null };
}

/* -------------------------------------------------------------------------- */
/*  Queries: stock levels                                                     */
/* -------------------------------------------------------------------------- */

/**
 * One page of stock levels (one row per product and location, base units).
 * The previous page stays visible while the next one loads. Needs STOCK_READ.
 */
export function useStockLevels(
  params: PageParams & StockLevelListQuery = {},
  options: QueryOptions = {},
) {
  const { hasPermission } = useAuth();
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const { locationId, productId } = normalizeLevelFilters(params);

  return useQuery<StockLevelPageResponse, ApiError, PageResponse<StockLevel>>({
    queryKey: inventoryKeys.stockLevelList({ page, size, locationId, productId }),
    queryFn: ({ signal }) =>
      inventoryService.listStockLevelsPage(
        page,
        size,
        { locationId: locationId ?? undefined, productId: productId ?? undefined },
        signal,
      ),
    select: (result) => mapPage(result, toStockLevel),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.STOCK_READ),
    placeholderData: keepPreviousData,
  });
}

/** Every stock level (all pages), optionally filtered, e.g. what a location currently holds. Needs STOCK_READ. */
export function useAllStockLevels(filters: StockLevelListQuery = {}, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const { locationId, productId } = normalizeLevelFilters(filters);

  return useQuery<StockLevel[], ApiError>({
    queryKey: inventoryKeys.stockLevelAll({ locationId, productId }),
    queryFn: ({ signal }) =>
      inventoryService.listAllStockLevels(
        { locationId: locationId ?? undefined, productId: productId ?? undefined },
        signal,
      ),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.STOCK_READ),
  });
}

/** One page of products at or below their low-stock threshold. Needs STOCK_THRESHOLD_READ. */
export function useLowStock(
  params: PageParams & LowStockListQuery = {},
  options: QueryOptions = {},
) {
  const { hasPermission } = useAuth();
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const locationId = params.locationId ?? null;

  return useQuery<StockLevelPageResponse, ApiError, PageResponse<StockLevel>>({
    queryKey: inventoryKeys.lowStockList({ page, size, locationId }),
    queryFn: ({ signal }) =>
      inventoryService.listLowStockPage(page, size, { locationId: locationId ?? undefined }, signal),
    select: (result) => mapPage(result, toStockLevel),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.STOCK_THRESHOLD_READ),
    placeholderData: keepPreviousData,
  });
}

/**
 * The stock of one product at one location (quantity 0 when nothing was ever recorded).
 * Waits until both ids are known. Needs STOCK_READ.
 */
export function useProductStock(
  productId: UUID | undefined,
  locationId: UUID | undefined,
  options: QueryOptions = {},
) {
  const { hasPermission } = useAuth();

  return useQuery<ProductStock, ApiError>({
    queryKey: inventoryKeys.productStock(productId ?? "", locationId ?? ""),
    queryFn: ({ signal }) =>
      inventoryService.getProductStock(productId as UUID, locationId as UUID, signal),
    enabled:
      (options.enabled ?? true) &&
      !!productId &&
      !!locationId &&
      hasPermission(PERMISSIONS.STOCK_READ),
  });
}

/* -------------------------------------------------------------------------- */
/*  Queries: movements (the ledger)                                           */
/* -------------------------------------------------------------------------- */

/**
 * One page of ledger movements, newest first. `from` is inclusive and `to` is exclusive (ISO date-times).
 * The previous page stays visible while the next one loads. Needs STOCK_READ.
 */
export function useStockMovements(
  params: PageParams & StockMovementListQuery = {},
  options: QueryOptions = {},
) {
  const { hasPermission } = useAuth();
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const filters = normalizeMovementFilters(params);

  return useQuery<StockMovementPageResponse, ApiError, PageResponse<StockMovement>>({
    queryKey: inventoryKeys.movementList({ page, size, ...filters }),
    queryFn: ({ signal }) =>
      inventoryService.listMovementsPage(
        page,
        size,
        {
          productId: filters.productId ?? undefined,
          locationId: filters.locationId ?? undefined,
          movementType: filters.movementType ?? undefined,
          from: filters.from ?? undefined,
          to: filters.to ?? undefined,
        },
        signal,
      ),
    select: (result) => mapPage(result, toStockMovement),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.STOCK_READ),
    placeholderData: keepPreviousData,
  });
}

/* -------------------------------------------------------------------------- */
/*  Queries: adjustments                                                      */
/* -------------------------------------------------------------------------- */

/** One page of adjustments, newest first, optionally filtered by status, location or product. Needs STOCK_ADJUST_READ. */
export function useStockAdjustments(
  params: PageParams & StockAdjustmentListQuery = {},
  options: QueryOptions = {},
) {
  const { hasPermission } = useAuth();
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const { status, locationId, productId } = normalizeAdjustmentFilters(params);

  return useQuery<StockAdjustmentPageResponse, ApiError, PageResponse<StockAdjustment>>({
    queryKey: inventoryKeys.adjustmentList({ page, size, status, locationId, productId }),
    queryFn: ({ signal }) =>
      inventoryService.listAdjustmentsPage(
        page,
        size,
        {
          status: status ?? undefined,
          locationId: locationId ?? undefined,
          productId: productId ?? undefined,
        },
        signal,
      ),
    select: (result) => mapPage(result, toStockAdjustment),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.STOCK_ADJUST_READ),
    placeholderData: keepPreviousData,
  });
}

/** One adjustment. Needs STOCK_ADJUST_READ. */
export function useStockAdjustment(adjustmentId: UUID | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<StockAdjustment, ApiError>({
    queryKey: inventoryKeys.adjustment(adjustmentId ?? ""),
    queryFn: ({ signal }) => inventoryService.getAdjustment(adjustmentId as UUID, signal),
    enabled:
      (options.enabled ?? true) && !!adjustmentId && hasPermission(PERMISSIONS.STOCK_ADJUST_READ),
  });
}

/* -------------------------------------------------------------------------- */
/*  Queries: stock initializations                                            */
/* -------------------------------------------------------------------------- */

/**
 * One page of stock initializations, newest first, optionally filtered by status or location.
 * In the list, the unit code and name of each line are null: open one initialization for those.
 * The previous page stays visible while the next one loads. Needs STOCK_INIT_READ.
 */
export function useStockInitializations(
  params: PageParams & StockInitializationListQuery = {},
  options: QueryOptions = {},
) {
  const { hasPermission } = useAuth();
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const { status, locationId } = normalizeInitializationFilters(params);

  return useQuery<StockInitializationPageResponse, ApiError, PageResponse<StockInitialization>>({
    queryKey: inventoryKeys.initializationList({ page, size, status, locationId }),
    queryFn: ({ signal }) =>
      inventoryService.listInitializationsPage(
        page,
        size,
        { status: status ?? undefined, locationId: locationId ?? undefined },
        signal,
      ),
    select: (result) => mapPage(result, toStockInitialization),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.STOCK_READ),
    placeholderData: keepPreviousData,
  });
}

/**
 * Every stock initialization (all pages), optionally filtered, e.g. to know which products were already
 * initialized at a location. In this list the unit code and name of each line are null. Needs STOCK_INIT_READ.
 */
export function useAllStockInitializations(
  filters: StockInitializationListQuery = {},
  options: QueryOptions = {},
) {
  const { hasPermission } = useAuth();
  const { status, locationId } = normalizeInitializationFilters(filters);

  return useQuery<StockInitialization[], ApiError>({
    queryKey: inventoryKeys.initializationAll({ status, locationId }),
    queryFn: ({ signal }) =>
      inventoryService.listAllInitializations(
        { status: status ?? undefined, locationId: locationId ?? undefined },
        signal,
      ),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.STOCK_READ),
  });
}

/** One initialization with all its lines, product and unit names included. Needs STOCK_INIT_READ. */
export function useStockInitialization(initializationId: UUID | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<StockInitialization, ApiError>({
    queryKey: inventoryKeys.initialization(initializationId ?? ""),
    queryFn: ({ signal }) => inventoryService.getInitialization(initializationId as UUID, signal),
    enabled:
      (options.enabled ?? true) && !!initializationId && hasPermission(PERMISSIONS.STOCK_READ),
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Needs STOCK_THRESHOLD_UPDATE. Sets the low-stock threshold of a product at a location; send
 * `{ lowStockThreshold: null }` to remove it. The quantity never changes.
 */
export function useUpdateStockThreshold() {
  const queryClient = useQueryClient();

  return useMutation<
    ProductStock,
    ApiError,
    { productId: UUID; locationId: UUID; request: UpdateStockThresholdRequest }
  >({
    mutationFn: ({ productId, locationId, request }) =>
      inventoryService.updateThreshold(productId, locationId, request),
    onSuccess: async (stock, { productId, locationId }) => {
      queryClient.setQueryData(inventoryKeys.productStock(productId, locationId), stock);
      // lists show the threshold and the lowStock flag, so they must refresh too
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.stockLevels() });
    },
  });
}

/**
 * Needs STOCK_ADJUST_CREATE. Creates a PENDING adjustment; no stock changes yet.
 * A 400 means an invalid request (e.g. a reason that does not fit the direction, or OTHER without a note).
 */
export function useRequestStockAdjustment() {
  const queryClient = useQueryClient();

  return useMutation<StockAdjustment, ApiError, RequestStockAdjustmentRequest>({
    mutationFn: (request) => inventoryService.requestAdjustment(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: inventoryKeys.adjustments() }),
  });
}

/**
 * Needs STOCK_ADJUST_APPROVE. Approving moves the stock, so levels, the ledger and adjustments all refresh.
 * The requester may approve their own adjustment. Fails with a 409 if the adjustment was already decided
 * or a decrease is larger than the stock (the adjustment then stays PENDING).
 */
export function useApproveStockAdjustment() {
  const queryClient = useQueryClient();

  return useMutation<
    StockAdjustment,
    ApiError,
    { adjustmentId: UUID; request?: DecideStockAdjustmentRequest }
  >({
    mutationFn: ({ adjustmentId, request }) =>
      inventoryService.approveAdjustment(adjustmentId, request),
    onSuccess: async (adjustment, { adjustmentId }) => {
      queryClient.setQueryData(inventoryKeys.adjustment(adjustmentId), adjustment);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inventoryKeys.adjustments() }),
        queryClient.invalidateQueries({ queryKey: inventoryKeys.stockLevels() }),
        queryClient.invalidateQueries({ queryKey: inventoryKeys.movements() }),
      ]);
    },
  });
}

/**
 * Needs STOCK_ADJUST_APPROVE. No stock changes. The note is the reason and is required
 * (MIN_REJECTION_NOTE_LENGTH to ADJUSTMENT_NOTE_MAX_LENGTH characters), otherwise a 400.
 * Fails with a 409 if the adjustment was already decided.
 */
export function useRejectStockAdjustment() {
  const queryClient = useQueryClient();

  return useMutation<
    StockAdjustment,
    ApiError,
    { adjustmentId: UUID; request: DecideStockAdjustmentRequest }
  >({
    mutationFn: ({ adjustmentId, request }) =>
      inventoryService.rejectAdjustment(adjustmentId, request),
    onSuccess: async (adjustment, { adjustmentId }) => {
      queryClient.setQueryData(inventoryKeys.adjustment(adjustmentId), adjustment);
      await queryClient.invalidateQueries({ queryKey: inventoryKeys.adjustments() });
    },
  });
}

/**
 * Needs STOCK_INIT_CREATE. Initializes the stock of several products at ONE location, all together or not
 * at all, and it is COMPLETED at once. The stock moves now, so levels, the ledger and the initialization
 * lists all refresh.
 * Fails with a 409 if a product or the location is missing or inactive, or a product was already
 * initialized at that location; with a 400 for an invalid line. Do not retry blindly after a network
 * error: check the list first, because there is no client id to make a retry safe.
 */
export function useInitializeStock() {
  const queryClient = useQueryClient();

  return useMutation<StockInitialization, ApiError, InitializeStockRequest>({
    mutationFn: (request) => inventoryService.initializeStock(request),
    onSuccess: async (initialization) => {
      queryClient.setQueryData(inventoryKeys.initialization(initialization.id), initialization);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inventoryKeys.initializations() }),
        queryClient.invalidateQueries({ queryKey: inventoryKeys.stockLevels() }),
        queryClient.invalidateQueries({ queryKey: inventoryKeys.movements() }),
      ]);
    },
  });
}