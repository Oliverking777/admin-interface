"use client";

/**
 * Product queries and mutations.
 *
 *   component -> hook -> productService -> apiClient
 *
 * Queries switch themselves off when the user lacks the permission, so no pointless 403 is sent.
 * (The backend still enforces everything; this only saves requests.)
 * Errors are ApiError: use error.fieldErrors for forms, error.message for toasts
 * (a 409 means a variant name is taken, the status is already as requested, the product is inactive,
 * or the category / unit is missing or inactive; a 404 means the product does not exist).
 *
 * Permissions: reading needs PRODUCT_READ; creating, editing, changing the category, activating/deactivating
 * and adding variants need PRODUCT_CREATE / PRODUCT_UPDATE. Variants and their units: see use-variants.
 */

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { productKeys } from "@/hooks/product/product-query-keys";
import { useAuth } from "@/hooks/iam/use-auth";
import type { ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { productService, toProduct } from "@/services/product/product-service";
import type { PageParams } from "@/services/iam/role-service";
import type { Product } from "@/types/product/product";
import type {
  AddVariantRequest,
  CreateProductRequest,
  ProductListQuery,
  ProductPageResponse,
  UpdateProductRequest,
} from "@/types/product/product-dto";
import type { PageResponse } from "@/types/iam/common-dto";
import type { UUID } from "@/types/iam/user";

type QueryOptions = { enabled?: boolean };

/** Same filters, in a stable shape for the query key (a blank search counts as no search). */
function normalizeFilters(filters: ProductListQuery = {}) {
  return { search: filters.search?.trim() ?? "", status: filters.status ?? null };
}

/* -------------------------------------------------------------------------- */
/*  Queries                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * One page of products. The previous page stays visible while the next one loads.
 * `filters.search` looks products up by text; while it is not blank the backend ignores `filters.status`.
 */
export function useProducts(params: PageParams & ProductListQuery = {}, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const { search, status } = normalizeFilters(params);

  return useQuery<ProductPageResponse, ApiError, PageResponse<Product>>({
    queryKey: productKeys.productList({ page, size, search, status }),
    queryFn: ({ signal }) =>
      productService.listPage(page, size, { search, status: status ?? undefined }, signal),
    select: (result) => ({ ...result, content: result.content.map(toProduct) }),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.PRODUCT_READ),
    placeholderData: keepPreviousData,
  });
}

/** Every product (all pages) with its variants, optionally filtered, e.g. to build variant dropdowns. */
export function useAllProducts(filters: ProductListQuery = {}, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();
  const { search, status } = normalizeFilters(filters);

  return useQuery<Product[], ApiError>({
    queryKey: productKeys.productAll({ search, status }),
    queryFn: ({ signal }) => productService.listAll({ search, status: status ?? undefined }, signal),
    enabled: (options.enabled ?? true) && hasPermission(PERMISSIONS.PRODUCT_READ),
  });
}

/** One product, with its variants and their units. */
export function useProduct(productId: UUID | undefined, options: QueryOptions = {}) {
  const { hasPermission } = useAuth();

  return useQuery<Product, ApiError>({
    queryKey: productKeys.product(productId ?? ""),
    queryFn: ({ signal }) => productService.getById(productId as UUID, signal),
    enabled: (options.enabled ?? true) && !!productId && hasPermission(PERMISSIONS.PRODUCT_READ),
  });
}

/* -------------------------------------------------------------------------- */
/*  Product mutations                                                         */
/* -------------------------------------------------------------------------- */

/** Needs PRODUCT_CREATE. A code already in use gives a 409; so does a category or base unit that is missing or inactive. */
export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation<Product, ApiError, CreateProductRequest>({
    mutationFn: (request) => productService.create(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productKeys.all }),
  });
}

/** Needs PRODUCT_UPDATE. Fields left out stay unchanged; send "" for the description to clear it. The code cannot be changed. */
export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation<Product, ApiError, { productId: UUID; request: UpdateProductRequest }>({
    mutationFn: ({ productId, request }) => productService.update(productId, request),
    onSuccess: async (product, { productId }) => {
      queryClient.setQueryData(productKeys.product(productId), product);
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

/** Needs PRODUCT_UPDATE. Moves the product to another category; a 409 means the category is missing or inactive. */
export function useChangeProductCategory() {
  const queryClient = useQueryClient();

  return useMutation<Product, ApiError, { productId: UUID; categoryId: UUID }>({
    mutationFn: ({ productId, categoryId }) => productService.changeCategory(productId, categoryId),
    onSuccess: async (product, { productId }) => {
      queryClient.setQueryData(productKeys.product(productId), product);
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

/** Needs PRODUCT_UPDATE. Fails with a 409 if the product is already active. */
export function useActivateProduct() {
  const queryClient = useQueryClient();

  return useMutation<Product, ApiError, UUID>({
    mutationFn: (productId) => productService.activate(productId),
    onSuccess: async (product, productId) => {
      queryClient.setQueryData(productKeys.product(productId), product);
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

/** Needs PRODUCT_UPDATE. Fails with a 409 if the product is already inactive. */
export function useDeactivateProduct() {
  const queryClient = useQueryClient();

  return useMutation<Product, ApiError, UUID>({
    mutationFn: (productId) => productService.deactivate(productId),
    onSuccess: async (product, productId) => {
      queryClient.setQueryData(productKeys.product(productId), product);
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

/**
 * Needs PRODUCT_UPDATE. Adds a named variant and answers the whole product. A simple product's unnamed variant
 * must be named first (useUpdateVariant). A 409 means the name is taken, the product is inactive,
 * or the unit is missing or inactive.
 */
export function useAddVariant() {
  const queryClient = useQueryClient();

  return useMutation<Product, ApiError, { productId: UUID; request: AddVariantRequest }>({
    mutationFn: ({ productId, request }) => productService.addVariant(productId, request),
    onSuccess: async (product, { productId }) => {
      queryClient.setQueryData(productKeys.product(productId), product);
      await queryClient.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}