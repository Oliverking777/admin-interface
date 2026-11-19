"use client";

/**
 * Category queries and mutations.
 *
 *   component -> hook -> categoryService -> apiClient
 *
 * Queries switch themselves off when the user lacks CATEGORY_READ, so no pointless 403 is sent.
 * (The backend still enforces everything; this only saves requests.)
 * Errors are ApiError: use error.fieldErrors for forms, error.message for toasts
 * (a 409 means the name is taken, or the category already has the requested status).
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { categoryKeys } from "@/hooks/business/category-query-keys";
import { useAuth } from "@/hooks/iam/use-auth";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import type { PageParams } from "@/services/iam/role-service";
import { categoryService, toCategory } from "@/services/business/category-service";
import type { Category } from "@/types/business/category";
import type {
  CategoryPageResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "@/types/business/category-dto";
import type { PageResponse } from "@/types/iam/common-dto";
import type { UUID } from "@/types/iam/user";

type QueryOptions = { enabled?: boolean };

/* -------------------------------------------------------------------------- */
/*  Queries                                                                   */
/* -------------------------------------------------------------------------- */

/** One page of categories, ordered by name. The previous page stays visible while the next one loads. */
export function useCategories(params: PageParams = {}, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const page = params.page ?? 0;
  const size = params.size ?? 20;

  return useQuery<CategoryPageResponse, ApiError, PageResponse<Category>>({
    queryKey: categoryKeys.categoryList({ page, size }),
    queryFn: ({ signal }) => categoryService.listPage(page, size, signal),
    select: (result) => ({ ...result, content: result.content.map(toCategory) }),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.CATEGORY_READ),
    placeholderData: keepPreviousData,
  });
}

/** Every category (all pages), for dropdowns and filters. */
export function useAllCategories(options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<Category[], ApiError>({
    queryKey: categoryKeys.categoryAll(),
    queryFn: ({ signal }) => categoryService.listAll(signal),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.CATEGORY_READ),
  });
}

/** One category. */
export function useCategory(categoryId: UUID | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<Category, ApiError>({
    queryKey: categoryKeys.category(categoryId ?? ""),
    queryFn: ({ signal }) => categoryService.getById(categoryId as UUID, signal),
    enabled: (options.enabled ?? true) && !!categoryId && hasPermission(PERMISSIONS.CATEGORY_READ),
  });
}

/* -------------------------------------------------------------------------- */
/*  Mutations                                                                 */
/* -------------------------------------------------------------------------- */

/** Needs CATEGORY_CREATE. A name already in use gives a 409. */
export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation<Category, ApiError, CreateCategoryRequest>({
    mutationFn: (request) => categoryService.create(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryKeys.categories() }),
  });
}

/** Needs CATEGORY_UPDATE. Send description "" to clear it; fields left out stay unchanged. */
export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation<Category, ApiError, { categoryId: UUID; request: UpdateCategoryRequest }>({
    mutationFn: ({ categoryId, request }) => categoryService.update(categoryId, request),
    onSuccess: async (category, { categoryId }) => {
      queryClient.setQueryData(categoryKeys.category(categoryId), category);
      await queryClient.invalidateQueries({ queryKey: categoryKeys.categories() });
    },
  });
}

/** Needs CATEGORY_ACTIVATE. Fails with a 409 if the category is already active. */
export function useActivateCategory() {
  const queryClient = useQueryClient();

  return useMutation<Category, ApiError, UUID>({
    mutationFn: (categoryId) => categoryService.activate(categoryId),
    onSuccess: async (category, categoryId) => {
      queryClient.setQueryData(categoryKeys.category(categoryId), category);
      await queryClient.invalidateQueries({ queryKey: categoryKeys.categories() });
    },
  });
}

/** Needs CATEGORY_DEACTIVATE. Fails with a 409 if the category is already inactive. */
export function useDeactivateCategory() {
  const queryClient = useQueryClient();

  return useMutation<Category, ApiError, UUID>({
    mutationFn: (categoryId) => categoryService.deactivate(categoryId),
    onSuccess: async (category, categoryId) => {
      queryClient.setQueryData(categoryKeys.category(categoryId), category);
      await queryClient.invalidateQueries({ queryKey: categoryKeys.categories() });
    },
  });
}