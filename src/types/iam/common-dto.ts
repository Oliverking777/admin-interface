/**
 * Response shapes shared by every IAM endpoint.
 * They match the backend's ApiResponse envelope (tsgp.yah_enterprise.config.ApiResponse).
 */

import type { ISODateTime } from "@/types/iam/user";

/**
 * Envelope around every successful JSON response (ApiResponse.ok / created):
 * { success: true, status, message, data, timestamp }.
 *
 * Failed responses never reach callers as a value: the client throws an ApiError instead
 * (see ApiErrorResponse for the body it is built from).
 * Endpoints that answer 204 have no body at all.
 */
export interface ApiResponse<T> {
  success: true;
  /** HTTP status code (200 or 201). */
  status: number;
  /** Human-readable summary, e.g. "Logged in". */
  message: string;
  /** The payload. */
  data: T;
  timestamp: ISODateTime;
}

/**
 * Envelope of every failed response (ApiResponse.error / validationError):
 * { success: false, status, message, fieldErrors?, path, timestamp }.
 */
export interface ApiErrorResponse {
  success: false;
  /** HTTP status code, e.g. 404. */
  status: number;
  message: string;
  /** Only present for validation errors (400): field name -> message. */
  fieldErrors?: Record<string, string>;
  /** Request path. */
  path: string;
  timestamp: ISODateTime;
}

/** The payload of a paged list. `page` is zero-based. */
export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}