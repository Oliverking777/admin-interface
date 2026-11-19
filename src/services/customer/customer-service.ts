/**
 * Customer operations from the frontend's point of view.
 * Talks to /customers through the shared apiClient.
 */
import { apiClient } from "@/lib/api/api-client";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import type { Customer } from "@/types/customer/customer";
import type {
  CreateCustomerRequest,
  CustomerListQuery,
  CustomerPageResponse,
  CustomerResponse,
  UpdateCustomerRequest,
} from "@/types/customer/customer-dto";
import type { ApiResponse } from "@/types/iam/common-dto";

const CUSTOMERS_PATH = "/customers";

export function toCustomer(dto: CustomerResponse): Customer {
  return {
    id: dto.customerId,
    code: dto.customerCode,
    name: dto.customerName,
    phone: dto.phoneNumber,
    email: dto.email,
    address: dto.address,
    type: dto.customerType,
    status: dto.customerStatus,
    walkIn: dto.walkIn,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Builds the query string values, leaving out filters that are empty. */
function buildListQuery(page: number, size: number, filters?: CustomerListQuery) {
  const search = filters?.search?.trim();
  return {
    page,
    size,
    ...(search ? { search } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
  };
}

export const customerService = {
  /**
   * One page of customers. Page numbers start at 0 (the backend default size is 20).
   * `filters.search` looks customers up by text; while searching, `filters.status` is ignored by the backend.
   * Needs CUSTOMER_READ.
   */
  async listPage(
    page: number,
    size: number,
    filters?: CustomerListQuery,
    signal?: AbortSignal,
  ): Promise<CustomerPageResponse> {
    const response = await apiClient.get<ApiResponse<CustomerPageResponse>>(CUSTOMERS_PATH, {
      query: buildListQuery(page, size, filters),
      signal,
    });
    return response.data;
  },

  /** Every customer (all pages), optionally filtered. Needs CUSTOMER_READ. */
  async listAll(filters?: CustomerListQuery, signal?: AbortSignal): Promise<Customer[]> {
    const customers = await fetchAllPages((page, size) =>
      customerService.listPage(page, size, filters, signal),
    );
    return customers.map(toCustomer);
  },

  /** One customer by id. A 404 ApiError means it does not exist. Needs CUSTOMER_READ. */
  async getById(id: string, signal?: AbortSignal): Promise<Customer> {
    const response = await apiClient.get<ApiResponse<CustomerResponse>>(`${CUSTOMERS_PATH}/${id}`, { signal });
    return toCustomer(response.data);
  },

  /**
   * Creates an active customer; the backend generates the code (CUS-000001 style).
   * A 400 ApiError means an invalid value, e.g. a BUSINESS customer without a phone number,
   * a bad phone or email format, or a blank name. Needs CUSTOMER_CREATE.
   */
  async create(request: CreateCustomerRequest): Promise<Customer> {
    const response = await apiClient.post<ApiResponse<CustomerResponse>>(CUSTOMERS_PATH, request);
    return toCustomer(response.data);
  },

  /**
   * Changes the name, phone, email and/or address. Fields left out stay unchanged;
   * an empty string for phoneNumber, email or address clears it.
   * A 400 ApiError means an invalid value, a 404 that the customer does not exist, and a 409 that it is
   * the walk-in customer, which cannot be updated. Needs CUSTOMER_UPDATE.
   */
  async update(id: string, request: UpdateCustomerRequest): Promise<Customer> {
    const response = await apiClient.put<ApiResponse<CustomerResponse>>(`${CUSTOMERS_PATH}/${id}`, request);
    return toCustomer(response.data);
  },

  /** Makes the customer usable again. 409 if it is already active. Needs CUSTOMER_UPDATE. */
  async activate(id: string): Promise<Customer> {
    const response = await apiClient.post<ApiResponse<CustomerResponse>>(`${CUSTOMERS_PATH}/${id}/activate`);
    return toCustomer(response.data);
  },

  /**
   * Disables the customer. 409 if it is already inactive or if it is the walk-in customer,
   * which cannot be deactivated. Needs CUSTOMER_UPDATE.
   */
  async deactivate(id: string): Promise<Customer> {
    const response = await apiClient.post<ApiResponse<CustomerResponse>>(`${CUSTOMERS_PATH}/${id}/deactivate`);
    return toCustomer(response.data);
  },
};