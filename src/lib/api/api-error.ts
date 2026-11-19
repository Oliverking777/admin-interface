/**
 * Standardized representation of every failure that can happen when calling the backend.
 *
 * Components and services never inspect `response.status` themselves.
 * They catch an ApiError and use `kind` or the `is*` helpers instead.
 */

import type { ApiErrorResponse } from "@/types/iam/common-dto";

export type ApiErrorKind =
  | "BAD_REQUEST" // 400 without field errors
  | "VALIDATION" // 400 with field-level errors
  | "UNAUTHORIZED" // 401
  | "FORBIDDEN" // 403
  | "NOT_FOUND" // 404
  | "CONFLICT" // 409
  | "SERVER" // 5xx
  | "NETWORK" // the server could not be reached
  | "TIMEOUT" // the request took too long
  | "ABORTED" // cancelled by the caller
  | "UNKNOWN"; // any other status

export interface ApiErrorInit {
  kind: ApiErrorKind;
  /** HTTP status code, or 0 when no response was received. */
  status: number;
  message: string;
  path?: string;
  timestamp?: string;
  fieldErrors?: Record<string, string>;
  /** The underlying error (e.g. the fetch TypeError), for logging. */
  originalError?: unknown;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly path?: string;
  readonly timestamp?: string;
  /** Field name -> message. Only set for validation errors. */
  readonly fieldErrors?: Record<string, string>;
  readonly originalError?: unknown;

  constructor(init: ApiErrorInit) {
    super(init.message);
    // Keeps `instanceof ApiError` working whatever the compile target.
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = "ApiError";
    this.kind = init.kind;
    this.status = init.status;
    this.path = init.path;
    this.timestamp = init.timestamp;
    this.fieldErrors = init.fieldErrors;
    this.originalError = init.originalError;
  }

  /* ------------------------------ helpers ------------------------------ */

  get isUnauthorized(): boolean {
    return this.kind === "UNAUTHORIZED";
  }

  get isForbidden(): boolean {
    return this.kind === "FORBIDDEN";
  }

  get isNotFound(): boolean {
    return this.kind === "NOT_FOUND";
  }

  get isConflict(): boolean {
    return this.kind === "CONFLICT";
  }

  get isValidation(): boolean {
    return this.kind === "VALIDATION";
  }

  get isServerError(): boolean {
    return this.kind === "SERVER";
  }

  /** True when the failure is about connectivity rather than the server's answer. */
  get isNetworkError(): boolean {
    return this.kind === "NETWORK" || this.kind === "TIMEOUT";
  }

  /** Message for one form field, if the backend reported one. */
  fieldError(field: string): string | undefined {
    return this.fieldErrors?.[field];
  }

  /* ------------------------------ factories ----------------------------- */

  /**
   * Builds an ApiError from a non-2xx response.
   * `body` is the parsed response body: usually the backend's ApiErrorResponse,
   * but it may be anything (e.g. an HTML page from a proxy), so it is read defensively.
   */
  static fromResponse(status: number, body: unknown, fallbackPath?: string): ApiError {
    const parsed = isRecord(body) ? (body as Partial<ApiErrorResponse>) : undefined;
    const fieldErrors =
      parsed?.fieldErrors && isRecord(parsed.fieldErrors)
        ? (parsed.fieldErrors as Record<string, string>)
        : undefined;

    return new ApiError({
      kind: ApiError.kindFromStatus(status, fieldErrors !== undefined),
      status,
      message:
        typeof parsed?.message === "string" && parsed.message.trim() !== ""
          ? parsed.message
          : defaultMessage(status),
      path: typeof parsed?.path === "string" ? parsed.path : fallbackPath,
      timestamp: typeof parsed?.timestamp === "string" ? parsed.timestamp : undefined,
      fieldErrors,
    });
  }

  static network(originalError?: unknown): ApiError {
    return new ApiError({
      kind: "NETWORK",
      status: 0,
      message: "Unable to reach the server. Please check your connection.",
      originalError,
    });
  }

  static timeout(): ApiError {
    return new ApiError({
      kind: "TIMEOUT",
      status: 0,
      message: "The server took too long to respond. Please try again.",
    });
  }

  static aborted(): ApiError {
    return new ApiError({
      kind: "ABORTED",
      status: 0,
      message: "The request was cancelled.",
    });
  }

  static kindFromStatus(status: number, hasFieldErrors = false): ApiErrorKind {
    if (status === 400) return hasFieldErrors ? "VALIDATION" : "BAD_REQUEST";
    if (status === 401) return "UNAUTHORIZED";
    if (status === 403) return "FORBIDDEN";
    if (status === 404) return "NOT_FOUND";
    if (status === 409) return "CONFLICT";
    if (status >= 500) return "SERVER";
    return "UNKNOWN";
  }
}

/* -------------------------------------------------------------------------- */
/*  Utilities                                                                 */
/* -------------------------------------------------------------------------- */

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/**
 * A message that is safe to show for any thrown value.
 * Only an ApiError carries a message meant for users (the server's, or one of ours for network failures).
 * Anything else is a bug in the client (e.g. a TypeError while mapping a response): the user sees the fallback,
 * and the real error goes to the console in development.
 */
export function getErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (isApiError(error)) return error.message;
  if (process.env.NODE_ENV !== "production" && error !== undefined && error !== null) {
    console.error(error);
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function defaultMessage(status: number): string {
  switch (status) {
    case 400:
      return "The request was invalid.";
    case 401:
      return "You are not logged in, or your session has expired.";
    case 403:
      return "You do not have permission to do this.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return "This conflicts with existing data.";
    default:
      return status >= 500
        ? "The server encountered an error. Please try again later."
        : `Request failed with status ${status}.`;
  }
}