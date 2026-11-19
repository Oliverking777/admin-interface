/**
 * Request/response shapes of the /categories endpoints.
 * They match CategoryResponse, CategoryPageResponse, CreateCategoryRequest and
 * UpdateCategoryRequest on the backend (tsgp.yah_enterprise.category.presentation.dto).
 */
import type { PageResponse } from "@/types/iam/common-dto";
import type { ISODateTime, UUID } from "@/types/iam/user";

/** Mirrors the backend CategoryStatus enum (sent as a string). */
export type CategoryStatusDto = "ACTIVE" | "INACTIVE";

/** The category returned by every /categories endpoint. */
export interface CategoryResponse {
  categoryId: UUID;
  categoryName: string;
  /** Null (or absent) when no description is set. */
  description: string | null;
  categoryStatus: CategoryStatusDto;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type CategoryPageResponse = PageResponse<CategoryResponse>;

export interface CreateCategoryRequest {
  /** Required. Trimmed, max 100 characters. Unique, ignoring case. */
  categoryName: string;
  /** Optional. Max 255 characters. */
  description?: string;
}

/**
 * Fields left out (or null) are not changed. Nothing is required.
 * The status is changed with the activate/deactivate endpoints.
 */
export interface UpdateCategoryRequest {
  /** Max 100 characters. Unique, ignoring case (renaming "parts" to "Parts" is allowed). */
  categoryName?: string;
  /** Max 255 characters. Send an empty string "" to clear it: null means "do not change". */
  description?: string;
}