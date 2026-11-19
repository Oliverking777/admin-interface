/**
 * Request/response shapes of the /suppliers endpoints.
 * They match SupplierResponse, SupplierPageResponse, CreateSupplierRequest and
 * UpdateSupplierRequest on the backend (tsgp.yah_enterprise.supplier.presentation.dto).
 */
import type { PageResponse } from "@/types/iam/common-dto";
import type { ISODateTime, UUID } from "@/types/iam/user";

/** Mirrors the backend SupplierStatus enum (sent as a string). */
export type SupplierStatusDto = "ACTIVE" | "INACTIVE";

/** The supplier returned by the /suppliers endpoints. */
export interface SupplierResponse {
  supplierId: UUID;
  /** Generated, unique, e.g. "SUP-000001". */
  supplierCode: string;
  supplierName: string;
  /** Null when not set. */
  contactPerson: string | null;
  /** Null when the supplier has no phone number. */
  phoneNumber: string | null;
  /** Null when the supplier has no email. */
  email: string | null;
  /** Null when the supplier has no address. */
  address: string | null;
  supplierStatus: SupplierStatusDto;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type SupplierPageResponse = PageResponse<SupplierResponse>;

export interface CreateSupplierRequest {
  /** Required. Unique. Max 150 characters. */
  supplierName: string;
  /** Optional. Max 100 characters. */
  contactPerson?: string;
  /** Optional. 8-15 digits with an optional leading "+". Stored with only digits (and the "+"). */
  phoneNumber?: string;
  /** Optional. Valid email, max 150 characters. Stored in lower case. */
  email?: string;
  /** Optional. Max 300 characters. */
  address?: string;
}

/**
 * Fields left out (or null) are not changed. Nothing is required.
 * The code cannot be changed, and the status is changed with the activate/deactivate endpoints.
 * The name cannot be cleared (a blank name is rejected with a 400) and must stay unique (409),
 * but sending an empty string for contactPerson, phoneNumber, email or address clears that field.
 */
export interface UpdateSupplierRequest {
  /** Max 150 characters. */
  supplierName?: string;
  /** Max 100 characters. Empty string clears it. */
  contactPerson?: string;
  /** 8-15 digits with an optional leading "+". Empty string clears it. */
  phoneNumber?: string;
  /** Valid email, max 150 characters. Empty string clears it. */
  email?: string;
  /** Max 300 characters. Empty string clears it. */
  address?: string;
}

/**
 * Query parameters of GET /suppliers (besides page and size).
 * When `search` is not blank the backend searches and ignores `status`.
 */
export interface SupplierListQuery {
  /** Text to search for. */
  search?: string;
  status?: SupplierStatusDto;
}