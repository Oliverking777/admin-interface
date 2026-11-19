/**
 * Product operations from the frontend's point of view.
 * Talks to /products through the shared apiClient. Variants and their units have their own service
 * (variant-service): what is stocked and sold is a variant.
 */
import { apiClient } from "@/lib/api/api-client";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import type { Product, ProductVariant, VariantSummary, VariantUnit } from "@/types/product/product";
import type {
  AddVariantRequest,
  ChangeProductCategoryRequest,
  CreateProductRequest,
  ProductListQuery,
  ProductPageResponse,
  ProductResponse,
  UpdateProductRequest,
  VariantResponse,
  VariantSummaryResponse,
  VariantUnitResponse,
} from "@/types/product/product-dto";
import type { ApiResponse } from "@/types/iam/common-dto";

const PRODUCTS_PATH = "/products";

export function toVariantUnit(dto: VariantUnitResponse): VariantUnit {
  return {
    id: dto.variantUnitId,
    unitId: dto.unitId,
    unitCode: dto.unitCode,
    unitName: dto.unitName,
    isBase: dto.baseUnit,
    conversionFactor: dto.conversionFactor,
    status: dto.unitStatus,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toVariant(dto: VariantResponse): ProductVariant {
  return {
    id: dto.variantId,
    name: dto.variantName,
    fullName: dto.fullName,
    sku: dto.sku,
    status: dto.variantStatus,
    units: dto.units.map(toVariantUnit),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toProduct(dto: ProductResponse): Product {
  return {
    id: dto.productId,
    code: dto.productCode,
    name: dto.productName,
    description: dto.description,
    imageUrl: dto.productImageUrl,
    categoryId: dto.categoryId,
    status: dto.productStatus,
    simple: dto.simple,
    variants: dto.variants.map(toVariant),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toVariantSummary(dto: VariantSummaryResponse): VariantSummary {
  return {
    id: dto.variantId,
    productId: dto.productId,
    productCode: dto.productCode,
    productName: dto.productName,
    name: dto.variantName,
    fullName: dto.fullName,
    sku: dto.sku,
    usable: dto.usable,
    baseUnitId: dto.baseUnitId,
    units: dto.units.map(toVariantUnit),
  };
}

/** Builds the query string values, leaving out filters that are empty. */
function buildListQuery(page: number, size: number, filters?: ProductListQuery) {
  const search = filters?.search?.trim();
  return {
    page,
    size,
    ...(search ? { search } : {}),
    ...(filters?.status ? { status: filters.status } : {}),
  };
}

export const productService = {
  /**
   * One page of products, with their variants. Page numbers start at 0 (the backend default size is 20).
   * `filters.search` matches the product name or code, or a variant's name or SKU; while searching,
   * `filters.status` is ignored by the backend. Needs PRODUCT_READ.
   */
  async listPage(
    page: number,
    size: number,
    filters?: ProductListQuery,
    signal?: AbortSignal,
  ): Promise<ProductPageResponse> {
    const response = await apiClient.get<ApiResponse<ProductPageResponse>>(PRODUCTS_PATH, {
      query: buildListQuery(page, size, filters),
      signal,
    });
    return response.data;
  },

  /** Every product (all pages), optionally filtered. Needs PRODUCT_READ. */
  async listAll(filters?: ProductListQuery, signal?: AbortSignal): Promise<Product[]> {
    const products = await fetchAllPages((page, size) =>
      productService.listPage(page, size, filters, signal),
    );
    return products.map(toProduct);
  },

  /** One product by id, with its variants and their units. A 404 ApiError means it does not exist. Needs PRODUCT_READ. */
  async getById(id: string, signal?: AbortSignal): Promise<Product> {
    const response = await apiClient.get<ApiResponse<ProductResponse>>(`${PRODUCTS_PATH}/${id}`, { signal });
    return toProduct(response.data);
  },

  /**
   * Creates an active product with all its variants and their units at once; the code and the SKUs are generated.
   * One unnamed variant makes a simple product. A 409 ApiError means two variants have the same name, a unit is
   * repeated on a variant, or the category or a unit does not exist or is inactive. A 400 means an invalid value
   * (e.g. a missing variant name among several). Needs PRODUCT_CREATE.
   */
  async create(request: CreateProductRequest): Promise<Product> {
    const response = await apiClient.post<ApiResponse<ProductResponse>>(PRODUCTS_PATH, request);
    return toProduct(response.data);
  },

  /**
   * Changes the name, description and/or image URL. Fields left out stay unchanged;
   * an empty string for the description clears it. A 400 ApiError means an invalid value
   * (the name and the image URL cannot be blank), a 404 that the product does not exist.
   * Needs PRODUCT_UPDATE.
   */
  async update(id: string, request: UpdateProductRequest): Promise<Product> {
    const response = await apiClient.put<ApiResponse<ProductResponse>>(`${PRODUCTS_PATH}/${id}`, request);
    return toProduct(response.data);
  },

  /** Moves the product to another category. 409 if the category does not exist or is inactive. Needs PRODUCT_UPDATE. */
  async changeCategory(id: string, categoryId: string): Promise<Product> {
    const body: ChangeProductCategoryRequest = { categoryId };
    const response = await apiClient.put<ApiResponse<ProductResponse>>(`${PRODUCTS_PATH}/${id}/category`, body);
    return toProduct(response.data);
  },

  /** Makes the product usable again. 409 if it is already active or has no active variant. Needs PRODUCT_UPDATE. */
  async activate(id: string): Promise<Product> {
    const response = await apiClient.post<ApiResponse<ProductResponse>>(`${PRODUCTS_PATH}/${id}/activate`);
    return toProduct(response.data);
  },

  /** Disables the product and so every variant of it. 409 if it is already inactive. Needs PRODUCT_UPDATE. */
  async deactivate(id: string): Promise<Product> {
    const response = await apiClient.post<ApiResponse<ProductResponse>>(`${PRODUCTS_PATH}/${id}/deactivate`);
    return toProduct(response.data);
  },

  /**
   * Adds a named variant with its units (its SKU is generated) and answers the whole product. A simple product's
   * unnamed variant must be named first (variantService.update). A 409 ApiError means the name is taken in this
   * product, the product is inactive, or a unit is missing, inactive or repeated. Needs PRODUCT_UPDATE.
   */
  async addVariant(productId: string, request: AddVariantRequest): Promise<Product> {
    const response = await apiClient.post<ApiResponse<ProductResponse>>(
      `${PRODUCTS_PATH}/${productId}/variants`,
      request,
    );
    return toProduct(response.data);
  },
};