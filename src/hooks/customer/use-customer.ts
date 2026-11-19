"use client";

/**
 * Customer queries and mutations.
 *
 *   component -> hook -> customerService -> apiClient
 *
 * Queries switch themselves off when the user lacks CUSTOMER_READ, so no pointless 403 is sent.
 * (The backend still enforces everything; this only saves requests.)
 * Errors are ApiError: use error.fieldErrors for forms, error.message for toasts
 * (a 409 means the customer already has the requested status, or it is the walk-in customer,
 * which cannot be updated or deactivated).
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { customerKeys } from "@/hooks/customer/customer-query-keys";
import { useAuth } from "@/hooks/iam/use-auth";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { customerService, toCustomer } from "@/services/customer/customer-service";
import type { PageParams } from "@/services/iam/role-service";
import type { Customer } from "@/types/customer/customer";
import type {
  CreateCustomerRequest,
  CustomerListQuery,
  CustomerPageResponse,
  UpdateCustomerRequest,
} from "@/types/customer/customer-dto";
import type { PageResponse } from "@/types/iam/common-dto";
import type { UUID } from "@/types/iam/user";

type QueryOptions = { enabled?: boolean };

/** Same filters, in a stable shape for the query key (a blank search counts as no search). */
function normalizeFilters(filters: CustomerListQuery = {}) {
  return { search: filters.search?.trim() ?? "", status: filters.status ?? null };
}

/* -------------------------------------------------------------------------- */
/*  Queries                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * One page of customers. The previous page stays visible while the next one loads.
 * `filters.search` looks customers up by text; while it is not blank the backend ignores `filters.status`.
 */
export function useCustomers(
  params: PageParams & CustomerListQuery = {},
  options: QueryOptions = {},
) {
  const { hasPermission } = useAuth();
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const { search, status } = normalizeFilters(params);

  return useQuery<CustomerPageResponse, ApiError, PageResponse<Customer>>({
    queryKey: customerKeys.customerList({ page, size, search, status }),
    queryFn: ({ signal }) =>
      customerService.listPage(page, size, { search, status: status ?? undefined }, signal),
    select: (result) => ({ ...result, content: result.content.map(toCustomer) }),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.CUSTOMER_READ),
    placeholderData: keepPreviousData,
  });
}

/** Every customer (all pages), optionally filtered, for dropdowns (e.g. choosing the customer of a sale). */
export function useAllCustomers(filters: CustomerListQuery = {}, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const { search, status } = normalizeFilters(filters);

  return useQuery<Customer[], ApiError>({
    queryKey: customerKeys.customerAll({ search, status }),
    queryFn: ({ signal }) =>
      customerService.listAll({ search, status: status ?? undefined }, signal),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.CUSTOMER_READ),
  });
}

/** One customer. */
export function useCustomer(customerId: UUID | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<Customer, ApiError>({
    queryKey: customerKeys.customer(customerId ?? ""),
    queryFn: ({ signal }) => customerService.getById(customerId as UUID, signal),
    enabled: (options.enabled ?? true) && !!customerId && hasPermission(PERMISSIONS.CUSTOMER_READ),
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

/** Needs CUSTOMER_CREATE. A 400 means an invalid value (e.g. a business customer needs a phone number). */
export function useCreateCustomer() {
  const queryClient = useQueryClient();

  return useMutation<Customer, ApiError, CreateCustomerRequest>({
    mutationFn: (request) => customerService.create(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: customerKeys.customers() }),
  });
}

/**
 * Needs CUSTOMER_UPDATE. Fields left out stay unchanged; send "" for phoneNumber, email or address
 * to clear it. The code and the type cannot be changed, and the walk-in customer gives a 409.
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation<Customer, ApiError, { customerId: UUID; request: UpdateCustomerRequest }>({
    mutationFn: ({ customerId, request }) => customerService.update(customerId, request),
    onSuccess: async (customer, { customerId }) => {
      queryClient.setQueryData(customerKeys.customer(customerId), customer);
      await queryClient.invalidateQueries({ queryKey: customerKeys.customers() });
    },
  });
}

/** Needs CUSTOMER_UPDATE. Fails with a 409 if the customer is already active. */
export function useActivateCustomer() {
  const queryClient = useQueryClient();

  return useMutation<Customer, ApiError, UUID>({
    mutationFn: (customerId) => customerService.activate(customerId),
    onSuccess: async (customer, customerId) => {
      queryClient.setQueryData(customerKeys.customer(customerId), customer);
      await queryClient.invalidateQueries({ queryKey: customerKeys.customers() });
    },
  });
}

/** Needs CUSTOMER_UPDATE. Fails with a 409 if the customer is already inactive or is the walk-in customer. */
export function useDeactivateCustomer() {
  const queryClient = useQueryClient();

  return useMutation<Customer, ApiError, UUID>({
    mutationFn: (customerId) => customerService.deactivate(customerId),
    onSuccess: async (customer, customerId) => {
      queryClient.setQueryData(customerKeys.customer(customerId), customer);
      await queryClient.invalidateQueries({ queryKey: customerKeys.customers() });
    },
  });
}