/**
 * Request/response shapes of the /customers endpoints.
 * They match CustomerResponse, CustomerPageResponse, CreateCustomerRequest and
 * UpdateCustomerRequest on the backend (tsgp.yah_enterprise.customer.presentation.dto).
 */
import type { PageResponse } from "@/types/iam/common-dto";
import type { ISODateTime, UUID } from "@/types/iam/user";

/** Mirrors the backend CustomerType enum (sent as a string). */
export type CustomerTypeDto = "INDIVIDUAL" | "BUSINESS";

/** Mirrors the backend CustomerStatus enum (sent as a string). */
export type CustomerStatusDto = "ACTIVE" | "INACTIVE";

/** The customer returned by the /customers endpoints. */
export interface CustomerResponse {
  customerId: UUID;
  /** Generated, unique, e.g. "CUS-000001". */
  customerCode: string;
  customerName: string;
  /** Null when the customer has no phone number. */
  phoneNumber: string | null;
  /** Null when the customer has no email. */
  email: string | null;
  /** Null when the customer has no address. */
  address: string | null;
  customerType: CustomerTypeDto;
  customerStatus: CustomerStatusDto;
  /** True for the protected walk-in customer. */
  walkIn: boolean;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CustomerPageResponse = PageResponse<CustomerResponse>;

export interface CreateCustomerRequest {
  /** Required. Max 150 characters. */
  customerName: string;
  /**
   * Required for BUSINESS customers, optional otherwise.
   * 8-15 digits with an optional leading "+". Stored with only digits (and the "+").
   */
  phoneNumber?: string;
  /** Optional. Valid email, max 150 characters. Stored in lower case. */
  email?: string;
  /** Optional. Max 300 characters. */
  address?: string;
  /** Required. Cannot be changed afterwards. */
  customerType: CustomerTypeDto;
}

/**
 * Fields left out (or null) are not changed. Nothing is required.
 * The code and the type cannot be changed, and the status is changed with the
 * activate/deactivate endpoints. The walk-in customer cannot be updated.
 * The name cannot be cleared (a blank name is rejected with a 400), but sending an
 * empty string for phoneNumber, email or address clears that field.
 * A BUSINESS customer should keep its phone number.
 */
export interface UpdateCustomerRequest {
  /** Max 150 characters. */
  customerName?: string;
  /** 8-15 digits with an optional leading "+". Empty string clears it. */
  phoneNumber?: string;
  /** Valid email, max 150 characters. Empty string clears it. */
  email?: string;
  /** Max 300 characters. Empty string clears it. */
  address?: string;
}

/**
 * Query parameters of GET /customers (besides page and size).
 * When `search` is not blank the backend searches and ignores `status`.
 */
export interface CustomerListQuery {
  /** Text to search for. */
  search?: string;
  status?: CustomerStatusDto;
}