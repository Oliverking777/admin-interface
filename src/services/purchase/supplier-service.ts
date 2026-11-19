/**
 * Supplier operations from the frontend's point of view.
 * Talks to /suppliers through the shared apiClient.
 */
import { apiClient } from "@/lib/api/api-client";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import type { Supplier } from "@/types/purchase/supplier";
import type {
  CreateSupplierRequest,
  SupplierListQuery,
  SupplierPageResponse,
  SupplierResponse,
  UpdateSupplierRequest,
} from "@/types/purchase/supplier-dto";
import type { ApiResponse } from "@/types/iam/common-dto";

const SUPPLIERS_PATH = "/suppliers";

export function toSupplier(dto: SupplierResponse): Supplier {
  return {
    id: dto.supplierId,
    code: dto.supplierCode,
    name: dto.supplierName,
    contactPerson: dto.contactPerson,
    phone: dto.phoneNumber,
    email: dto.email,
    address: dto.address,
    status: dto.supplierStatus,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

/** Builds the query string values, leaving out filters that are empty. */
function buildListQuery(page: number, size: number, filters?: SupplierListQuery) {
  const search = filters?.search?.trim();
  return {
    page,
    size,
    ...(search ? { search } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
  };
}

export const supplierService = {
  /**
   * One page of suppliers. Page numbers start at 0 (the backend default size is 20).
   * `filters.search` looks suppliers up by text; while searching, `filters.status` is ignored by the backend.
   * Needs SUPPLIER_READ.
   */
  async listPage(
    page: number,
    size: number,
    filters?: SupplierListQuery,
    signal?: AbortSignal,
  ): Promise<SupplierPageResponse> {
    const response = await apiClient.get<ApiResponse<SupplierPageResponse>>(SUPPLIERS_PATH, {
      query: buildListQuery(page, size, filters),
      signal,
    });
    return response.data;
  },

  /** Every supplier (all pages), optionally filtered. Needs SUPPLIER_READ. */
  async listAll(filters?: SupplierListQuery, signal?: AbortSignal): Promise<Supplier[]> {
    const suppliers = await fetchAllPages((page, size) =>
      supplierService.listPage(page, size, filters, signal),
    );
    return suppliers.map(toSupplier);
  },

  /** One supplier by id. A 404 ApiError means it does not exist. Needs SUPPLIER_READ. */
  async getById(id: string, signal?: AbortSignal): Promise<Supplier> {
    const response = await apiClient.get<ApiResponse<SupplierResponse>>(`${SUPPLIERS_PATH}/${id}`, { signal });
    return toSupplier(response.data);
  },

  /**
   * Creates an active supplier; the backend generates the code (SUP-000001 style).
   * A name already in use gives a 409 ApiError; a 400 means an invalid value
   * (a bad phone or email format, or a blank name). Needs SUPPLIER_CREATE.
   */
  async create(request: CreateSupplierRequest): Promise<Supplier> {
    const response = await apiClient.post<ApiResponse<SupplierResponse>>(SUPPLIERS_PATH, request);
    return toSupplier(response.data);
  },

  /**
   * Changes the name, contact person, phone, email and/or address. Fields left out stay unchanged;
   * an empty string for contactPerson, phoneNumber, email or address clears it.
   * A 409 ApiError means the new name belongs to another supplier, a 404 that the supplier
   * does not exist, and a 400 an invalid value. Needs SUPPLIER_UPDATE.
   */
  async update(id: string, request: UpdateSupplierRequest): Promise<Supplier> {
    const response = await apiClient.put<ApiResponse<SupplierResponse>>(`${SUPPLIERS_PATH}/${id}`, request);
    return toSupplier(response.data);
  },

  /** Makes the supplier usable again. 409 if it is already active. Needs SUPPLIER_UPDATE. */
  async activate(id: string): Promise<Supplier> {
    const response = await apiClient.post<ApiResponse<SupplierResponse>>(`${SUPPLIERS_PATH}/${id}/activate`);
    return toSupplier(response.data);
  },

  /** Disables the supplier. 409 if it is already inactive. Needs SUPPLIER_UPDATE. */
  async deactivate(id: string): Promise<Supplier> {
    const response = await apiClient.post<ApiResponse<SupplierResponse>>(`${SUPPLIERS_PATH}/${id}/deactivate`);
    return toSupplier(response.data);
  },
};