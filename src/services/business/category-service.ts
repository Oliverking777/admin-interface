/**
 * Category operations from the frontend's point of view.
 * Talks to /categories through the shared apiClient.
 */
import { apiClient } from "@/lib/api/api-client";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import type { Category } from "@/types/business/category";
import type {
  CategoryPageResponse,
  CategoryResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "@/types/business/category-dto";
import type { ApiResponse } from "@/types/iam/common-dto";

const CATEGORIES_PATH = "/categories";

export function toCategory(dto: CategoryResponse): Category {
  return {
    id: dto.categoryId,
    name: dto.categoryName,
    description: dto.description ?? null,
    status: dto.categoryStatus,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export const categoryService = {
  /** One page of categories, ordered by name. Page numbers start at 0, size is 1 to 100. Needs CATEGORY_READ. */
  async listPage(page: number, size: number, signal?: AbortSignal): Promise<CategoryPageResponse> {
    const response = await apiClient.get<ApiResponse<CategoryPageResponse>>(CATEGORIES_PATH, {
      query: { page, size },
      signal,
    });
    return response.data;
  },

  /** Every category (all pages). Needs CATEGORY_READ. */
  async listAll(signal?: AbortSignal): Promise<Category[]> {
    const categories = await fetchAllPages((page, size) => categoryService.listPage(page, size, signal));
    return categories.map(toCategory);
  },

  /** One category by id. A 404 ApiError means it does not exist. Needs CATEGORY_READ. */
  async getById(id: string, signal?: AbortSignal): Promise<Category> {
    const response = await apiClient.get<ApiResponse<CategoryResponse>>(`${CATEGORIES_PATH}/${id}`, { signal });
    return toCategory(response.data);
  },

  /**
   * Creates an active category. A name already in use (ignoring case) gives a 409 ApiError.
   * Needs CATEGORY_CREATE.
   */
  async create(request: CreateCategoryRequest): Promise<Category> {
    const response = await apiClient.post<ApiResponse<CategoryResponse>>(CATEGORIES_PATH, request);
    return toCategory(response.data);
  },

  /**
   * Changes the name and/or description. Fields left out stay unchanged;
   * an empty description ("") clears it. Another category using the name gives a 409 ApiError.
   * Needs CATEGORY_UPDATE.
   */
  async update(id: string, request: UpdateCategoryRequest): Promise<Category> {
    const response = await apiClient.put<ApiResponse<CategoryResponse>>(`${CATEGORIES_PATH}/${id}`, request);
    return toCategory(response.data);
  },

  /** Makes the category available again. 409 if it is already active. Needs CATEGORY_ACTIVATE. */
  async activate(id: string): Promise<Category> {
    const response = await apiClient.post<ApiResponse<CategoryResponse>>(`${CATEGORIES_PATH}/${id}/activate`);
    return toCategory(response.data);
  },

  /** Retires the category (kept, not deleted). 409 if it is already inactive. Needs CATEGORY_DEACTIVATE. */
  async deactivate(id: string): Promise<Category> {
    const response = await apiClient.post<ApiResponse<CategoryResponse>>(`${CATEGORIES_PATH}/${id}/deactivate`);
    return toCategory(response.data);
  },
};