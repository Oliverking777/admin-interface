"use client";

/**
 * Transfer queries and mutations.
 *
 *   component -> hook -> transferService -> apiClient
 *
 * Queries switch themselves off when the user lacks TRANSFER_READ, so no pointless 403 is sent.
 * (The backend still enforces everything, including the location scope; this only saves requests.)
 * Errors are ApiError: use error.fieldErrors for forms, error.message for toasts.
 * A 409 means, for example, that the transfer is in the wrong status for the action, that a location or
 * product is missing or inactive, or that the source has too little stock when sending.
 *
 * Permissions: reading needs TRANSFER_READ; send needs TRANSFER_CREATE; receive needs TRANSFER_CONFIRM;
 * cancel needs either of the two.
 *
 * Every mutation moves stock (send: out of the source; receive: into the destination; cancel: back into the
 * source), so each one also refreshes stock levels and the ledger.
 */

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { inventoryKeys } from "@/hooks/inventory/inventory-query-keys";
import { transferKeys } from "@/hooks/inventory/transfer-query-keys";
import { useAuth } from "@/hooks/iam/use-auth";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { mapPage, toTransfer, transferService } from "@/services/inventory/transfer-service";
import type { PageParams } from "@/services/iam/role-service";
import type { InTransitLine, Transfer, TransferEvent } from "@/types/inventory/transfer";
import type {
  CancelTransferRequest,
  CreateTransferRequest,
  InTransitListQuery,
  ReceiveTransferRequest,
  TransferListQuery,
  TransferPageResponse,
} from "@/types/inventory/transfer-dto";
import type { PageResponse } from "@/types/iam/common-dto";
import type { UUID } from "@/types/iam/user";

type QueryOptions = { enabled?: boolean };

/** Filters in a stable shape for the query key (a missing filter is always null). */
function normalizeFilters(filters: TransferListQuery = {}) {
  return {
    locationId: filters.locationId ?? null,
    status: filters.status ?? null,
    hasDiscrepancy: filters.hasDiscrepancy ?? null,
    productId: filters.productId ?? null,
    from: filters.from ?? null,
    to: filters.to ?? null,
  };
}

/* -------------------------------------------------------------------------- */
/*  Queries                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * One page of transfers, newest first. A location matches the source or the destination.
 * Use `hasDiscrepancy: true` for the discrepancy review list.
 * The previous page stays visible while the next one loads. Needs TRANSFER_READ.
 */
export function useTransfers(params: PageParams & TransferListQuery = {}, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const filters = normalizeFilters(params);

  return useQuery<TransferPageResponse, ApiError, PageResponse<Transfer>>({
    queryKey: transferKeys.transferList({ page, size, ...filters }),
    queryFn: ({ signal }) =>
      transferService.listTransfersPage(
        page,
        size,
        {
          locationId: filters.locationId ?? undefined,
          status: filters.status ?? undefined,
          hasDiscrepancy: filters.hasDiscrepancy ?? undefined,
          productId: filters.productId ?? undefined,
          from: filters.from ?? undefined,
          to: filters.to ?? undefined,
        },
        signal,
      ),
    select: (result) => mapPage(result, toTransfer),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.TRANSFER_READ),
    placeholderData: keepPreviousData,
  });
}

/** One transfer with its lines. Needs TRANSFER_READ. */
export function useTransfer(transferId: UUID | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<Transfer, ApiError>({
    queryKey: transferKeys.transfer(transferId ?? ""),
    queryFn: ({ signal }) => transferService.getTransfer(transferId as UUID, signal),
    enabled: (options.enabled ?? true) && !!transferId && hasPermission(PERMISSIONS.TRANSFER_READ),
  });
}

/** Every step of a transfer, oldest first. Needs TRANSFER_READ. */
export function useTransferHistory(transferId: UUID | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<TransferEvent[], ApiError>({
    queryKey: transferKeys.history(transferId ?? ""),
    queryFn: ({ signal }) => transferService.getHistory(transferId as UUID, signal),
    enabled: (options.enabled ?? true) && !!transferId && hasPermission(PERMISSIONS.TRANSFER_READ),
  });
}

/**
 * Goods that left their source and are still travelling, per destination and product (base units).
 * Derived from SUBMITTED transfers; it is not a stock balance. Needs TRANSFER_READ.
 */
export function useInTransit(filters: InTransitListQuery = {}, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const locationId = filters.locationId ?? null;

  return useQuery<InTransitLine[], ApiError>({
    queryKey: transferKeys.inTransit(locationId),
    queryFn: ({ signal }) =>
      transferService.listInTransit({ locationId: locationId ?? undefined }, signal),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.TRANSFER_READ),
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * After a send, receipt or cancel: put the fresh transfer in the cache, then refresh every transfer query
 * (lists, history, in-transit goods) and, since stock moved, stock levels and the ledger.
 */
async function refreshAfterChange(
  queryClient: QueryClient,
  transfer: Transfer,
) {
  queryClient.setQueryData(transferKeys.transfer(transfer.id), transfer);
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: transferKeys.transfers() }),
    queryClient.invalidateQueries({ queryKey: inventoryKeys.stockLevels() }),
    queryClient.invalidateQueries({ queryKey: inventoryKeys.movements() }),
  ]);
}

/**
 * Needs TRANSFER_CREATE, and the user must work at the source location. Sends the transfer: it starts SUBMITTED
 * and the goods leave the source stock now. A 409 means the source has too little stock; nothing changes then.
 * Sending the same transferId again returns the existing transfer without moving stock again, so a retry is safe.
 */
export function useCreateTransfer() {
  const queryClient = useQueryClient();

  return useMutation<Transfer, ApiError, CreateTransferRequest>({
    mutationFn: (request) => transferService.createTransfer(request),
    onSuccess: (transfer) => refreshAfterChange(queryClient, transfer),
  });
}

/**
 * Needs TRANSFER_CONFIRM, and the user must work at the destination. Receives a SUBMITTED transfer:
 * the good quantity enters the destination stock. Damaged and missing goods are not added, need a reason and
 * mark the transfer `hasDiscrepancy`; every product on the transfer needs a line.
 */
export function useReceiveTransfer() {
  const queryClient = useQueryClient();

  return useMutation<Transfer, ApiError, { transferId: UUID; request: ReceiveTransferRequest }>({
    mutationFn: ({ transferId, request }) => transferService.receiveTransfer(transferId, request),
    onSuccess: (transfer) => refreshAfterChange(queryClient, transfer),
  });
}

/**
 * Needs TRANSFER_CREATE or TRANSFER_CONFIRM, and the user must work at the source or the destination.
 * Cancels a SUBMITTED transfer: the goods go back into the source stock. The reason is required
 * (5 to 500 characters). A received transfer cannot be cancelled (409).
 */
export function useCancelTransfer() {
  const queryClient = useQueryClient();

  return useMutation<Transfer, ApiError, { transferId: UUID; request: CancelTransferRequest }>({
    mutationFn: ({ transferId, request }) => transferService.cancelTransfer(transferId, request),
    onSuccess: (transfer) => refreshAfterChange(queryClient, transfer),
  });
}