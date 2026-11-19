/**
 * The single reusable HTTP client of the frontend.
 *
 *   Component -> Service (auth, roles, ...) -> apiClient -> Spring Boot backend
 *
 * Every service uses this client; none creates its own.
 *
 * Authentication: WEB sessions use an HttpOnly cookie, so requests are sent with
 * `credentials: "include"` and the browser attaches the cookie. JavaScript never
 * sees the token. (`getToken` exists only for clients that hold a Bearer token.)
 *
 * There is no token refresh: sessions have a fixed 12-hour lifetime and are never
 * extended. A 401 therefore means "logged out", and is reported through `onUnauthorized`.
 */

import { ApiError } from "@/lib/api/api-error";

/* -------------------------------------------------------------------------- */
/*  Configuration                                                             */
/* -------------------------------------------------------------------------- */

export interface ApiClientConfig {
  /** Prefix of every request, without a trailing slash. */
  baseUrl: string;
  /** Requests taking longer than this fail with a TIMEOUT error. */
  timeoutMs: number;
  /**
   * Header the backend requires on every state-changing request (POST, PUT, PATCH, DELETE)
   * that is authenticated by the session cookie. It is the backend's CSRF protection:
   * without it those requests get a 403. Must match `app.security.csrf-header` on the backend.
   * Set to null to send nothing.
   */
  csrfHeaderName: string | null;
  /** Optional Bearer token provider. Leave unset for cookie-based (WEB) sessions. */
  getToken?: () => string | null | undefined;
  /**
   * Called when a response is 401 (session missing or expired), so the app can
   * clear its auth state and redirect to login. Not called for requests made
   * with `skipUnauthorizedHandler`.
   */
  onUnauthorized?: (error: ApiError) => void;
}

/**
 * Where the backend API lives. Read from the environment (Next.js inlines NEXT_PUBLIC_ variables at build time).
 * Unset: a relative URL, which works when Next.js proxies /yah/* to the backend (see next.config.ts).
 * Set (e.g. http://localhost:8080/yah/api/v1): the browser calls the backend directly (CORS applies).
 */
const DEFAULT_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "/yah/api/v1").replace(/\/+$/, "");

const config: ApiClientConfig = {
  baseUrl: DEFAULT_BASE_URL,
  timeoutMs: 15_000,
  csrfHeaderName: "X-Requested-With",
};

/** Methods that never change data; the backend does not ask for the CSRF header on them. */
const SAFE_METHODS: readonly HttpMethod[] = ["GET"];

/**
 * Overrides the defaults. Call once at app startup, e.g.
 *
 *   configureApiClient({ timeoutMs: 20_000 });
 *
 * The base URL normally comes from NEXT_PUBLIC_API_BASE_URL (see DEFAULT_BASE_URL), so this is rarely needed.
 * (The auth layer registers `onUnauthorized` itself in initializeAuth().)
 */
export function configureApiClient(overrides: Partial<ApiClientConfig>): void {
  Object.assign(config, overrides);
  config.baseUrl = config.baseUrl.replace(/\/+$/, "");
}

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

type QueryValue = string | number | boolean | null | undefined | Array<string | number | boolean>;

export interface RequestOptions {
  /** Query-string parameters. null/undefined values are skipped; arrays repeat the key. */
  query?: Record<string, QueryValue>;
  /** Request body. Plain values are sent as JSON; FormData is sent as-is. */
  body?: unknown;
  headers?: Record<string, string>;
  /** Lets the caller cancel the request (it then fails with an ABORTED error). */
  signal?: AbortSignal;
  /** Overrides the default timeout for this request. */
  timeoutMs?: number;
  /**
   * Do not call `onUnauthorized` if this request gets a 401.
   * Use it for login: a 401 there means wrong credentials, not an expired session.
   */
  skipUnauthorizedHandler?: boolean;
}

/* -------------------------------------------------------------------------- */
/*  Core request                                                              */
/* -------------------------------------------------------------------------- */

async function request<T>(
  method: HttpMethod,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = buildUrl(path, options.query);
  const headers: Record<string, string> = { Accept: "application/json", ...options.headers };

  const token = config.getToken?.();
  if (token) headers.Authorization = `Bearer ${token}`;

  // Proves the request comes from our own frontend, not from another site (CSRF).
  if (config.csrfHeaderName && !SAFE_METHODS.includes(method) && !(config.csrfHeaderName in headers)) {
    headers[config.csrfHeaderName] = "XMLHttpRequest";
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      body = options.body; // the browser sets the multipart Content-Type itself
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
  }

  // One controller covers both the timeout and the caller's own signal.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, options.timeoutMs ?? config.timeoutMs);
  const onCallerAbort = () => controller.abort();
  if (options.signal?.aborted) controller.abort();
  options.signal?.addEventListener("abort", onCallerAbort, { once: true });

  try {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body,
        credentials: "include", // sends/receives the HttpOnly session cookie
        signal: controller.signal,
      });
    } catch (error) {
      if (timedOut) throw ApiError.timeout();
      if (options.signal?.aborted) throw ApiError.aborted();
      throw ApiError.network(error);
    }

    const data = await parseBody(response);

    if (!response.ok) {
      const apiError = ApiError.fromResponse(response.status, data, path);
      if (apiError.isUnauthorized && !options.skipUnauthorizedHandler) {
        config.onUnauthorized?.(apiError);
      }
      throw apiError;
    }

    return data as T;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", onCallerAbort);
  }
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  let url = `${config.baseUrl}${normalizedPath}`;

  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined) continue;
      if (Array.isArray(value)) {
        value.forEach((item) => params.append(key, String(item)));
      } else {
        params.append(key, String(value));
      }
    }
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
  }
  return url;
}

/** Empty bodies (204, etc.) give undefined; JSON is parsed; anything else comes back as text. */
async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* -------------------------------------------------------------------------- */
/*  Public API                                                                */
/* -------------------------------------------------------------------------- */

export const apiClient = {
  request,

  get: <T>(path: string, options?: Omit<RequestOptions, "body">) =>
    request<T>("GET", path, options),

  post: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) =>
    request<T>("POST", path, { ...options, body }),

  put: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) =>
    request<T>("PUT", path, { ...options, body }),

  patch: <T>(path: string, body?: unknown, options?: Omit<RequestOptions, "body">) =>
    request<T>("PATCH", path, { ...options, body }),

  delete: <T = void>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, options),
};