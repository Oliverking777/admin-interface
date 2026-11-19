"use client";

/**
 * Supplier queries and mutations.
 *
 *   component -> hook -> supplierService -> apiClient
 *
 * Queries switch themselves off when the user lacks SUPPLIER_READ, so no pointless 403 is sent.
 * (The backend still enforces everything; this only saves requests.)
 * Errors are ApiError: use error.fieldErrors for forms, error.message for toasts
 * (a 409 means the name is taken, or the supplier already has the requested status).
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supplierKeys } from "@/hooks/purchase/supplier-query-keys";
import { useAuth } from "@/hooks/iam/use-auth";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { supplierService, toSupplier } from "@/services/purchase/supplier-service";
import type { PageParams } from "@/services/iam/role-service";
import type { Supplier } from "@/types/purchase/supplier";
import type {
  CreateSupplierRequest,
  SupplierListQuery,
  SupplierPageResponse,
  UpdateSupplierRequest,
} from "@/types/purchase/supplier-dto";
import type { PageResponse } from "@/types/iam/common-dto";
import type { UUID } from "@/types/iam/user";

type QueryOptions = { enabled?: boolean };

/** Same filters, in a stable shape for the query key (a blank search counts as no search). */
function normalizeFilters(filters: SupplierListQuery = {}) {
  return { search: filters.search?.trim() ?? "", status: filters.status ?? null };
}

/* -------------------------------------------------------------------------- */
/*  Queries                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * One page of suppliers. The previous page stays visible while the next one loads.
 * `filters.search` looks suppliers up by text; while it is not blank the backend ignores `filters.status`.
 */
export function useSuppliers(
  params: PageParams & SupplierListQuery = {},
  options: QueryOptions = {},
) {
  const { hasPermission } = useAuth();
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const { search, status } = normalizeFilters(params);

  return useQuery<SupplierPageResponse, ApiError, PageResponse<Supplier>>({
    queryKey: supplierKeys.supplierList({ page, size, search, status }),
    queryFn: ({ signal }) =>
      supplierService.listPage(page, size, { search, status: status ?? undefined }, signal),
    select: (result) => ({ ...result, content: result.content.map(toSupplier) }),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.SUPPLIER_READ),
    placeholderData: keepPreviousData,
  });
}

/** Every supplier (all pages), optionally filtered, for dropdowns (e.g. choosing the supplier of a purchase). */
export function useAllSuppliers(filters: SupplierListQuery = {}, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const { search, status } = normalizeFilters(filters);

  return useQuery<Supplier[], ApiError>({
    queryKey: supplierKeys.supplierAll({ search, status }),
    queryFn: ({ signal }) =>
      supplierService.listAll({ search, status: status ?? undefined }, signal),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.SUPPLIER_READ),
  });
}

/** One supplier. */
export function useSupplier(supplierId: UUID | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<Supplier, ApiError>({
    queryKey: supplierKeys.supplier(supplierId ?? ""),
    queryFn: ({ signal }) => supplierService.getById(supplierId as UUID, signal),
    enabled: (options.enabled ?? true) && !!supplierId && hasPermission(PERMISSIONS.SUPPLIER_READ),
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

/** Needs SUPPLIER_CREATE. A name already in use gives a 409. */
export function useCreateSupplier() {
  const queryClient = useQueryClient();

  return useMutation<Supplier, ApiError, CreateSupplierRequest>({
    mutationFn: (request) => supplierService.create(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierKeys.suppliers() }),
  });
}

/**
 * Needs SUPPLIER_UPDATE. Fields left out stay unchanged; send "" for contactPerson, phoneNumber,
 * email or address to clear it. The code cannot be changed, and a name used by another supplier gives a 409.
 */
export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation<Supplier, ApiError, { supplierId: UUID; request: UpdateSupplierRequest }>({
    mutationFn: ({ supplierId, request }) => supplierService.update(supplierId, request),
    onSuccess: async (supplier, { supplierId }) => {
      queryClient.setQueryData(supplierKeys.supplier(supplierId), supplier);
      await queryClient.invalidateQueries({ queryKey: supplierKeys.suppliers() });
    },
  });
}

/** Needs SUPPLIER_UPDATE. Fails with a 409 if the supplier is already active. */
export function useActivateSupplier() {
  const queryClient = useQueryClient();

  return useMutation<Supplier, ApiError, UUID>({
    mutationFn: (supplierId) => supplierService.activate(supplierId),
    onSuccess: async (supplier, supplierId) => {
      queryClient.setQueryData(supplierKeys.supplier(supplierId), supplier);
      await queryClient.invalidateQueries({ queryKey: supplierKeys.suppliers() });
    },
  });
}

/** Needs SUPPLIER_UPDATE. Fails with a 409 if the supplier is already inactive. */
export function useDeactivateSupplier() {
  const queryClient = useQueryClient();

  return useMutation<Supplier, ApiError, UUID>({
    mutationFn: (supplierId) => supplierService.deactivate(supplierId),
    onSuccess: async (supplier, supplierId) => {
      queryClient.setQueryData(supplierKeys.supplier(supplierId), supplier);
      await queryClient.invalidateQueries({ queryKey: supplierKeys.suppliers() });
    },
  });
}