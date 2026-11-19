/**
 * Variant operations: what is stocked and sold is a variant of a product, counted in its own units.
 * Talks to /variants through the shared apiClient. Changes to a variant answer the whole product.
 */
import { apiClient } from "@/lib/api/api-client";
import { toProduct, toVariantSummary, toVariantUnit } from "@/services/product/product-service";
import type { Product, VariantSummary, VariantUnit } from "@/types/product/product";
import type {
  AssignUnitToVariantRequest,
  DefineVariantConversionRequest,
  ProductResponse,
  UpdateVariantRequest,
  VariantSummaryResponse,
  VariantUnitResponse,
} from "@/types/product/product-dto";
import type { ApiResponse } from "@/types/iam/common-dto";

const VARIANTS_PATH = "/variants";

export const variantService = {
  /** Several variants with their product's names and units. Unknown ids are skipped. Needs PRODUCT_READ. */
  async getMany(ids: string[], signal?: AbortSignal): Promise<VariantSummary[]> {
    if (ids.length === 0) return [];
    const response = await apiClient.get<ApiResponse<VariantSummaryResponse[]>>(VARIANTS_PATH, {
      query: { ids: ids.join(",") },
      signal,
    });
    return response.data.map(toVariantSummary);
  },

  /** The variant with this SKU (any case). A 404 ApiError means none. Needs PRODUCT_READ. */
  async findBySku(sku: string, signal?: AbortSignal): Promise<VariantSummary> {
    const response = await apiClient.get<ApiResponse<VariantSummaryResponse>>(
      `${VARIANTS_PATH}/by-sku/${encodeURIComponent(sku.trim())}`,
      { signal },
    );
    return toVariantSummary(response.data);
  },

  /**
   * Renames a variant; an empty name removes it. A 409 ApiError means the name is taken or the product is
   * inactive; a 400 that the name would be removed while the product has several variants. Needs PRODUCT_UPDATE.
   */
  async update(variantId: string, request: UpdateVariantRequest): Promise<Product> {
    const response = await apiClient.put<ApiResponse<ProductResponse>>(`${VARIANTS_PATH}/${variantId}`, request);
    return toProduct(response.data);
  },

  /** 409 if it is already active. Needs PRODUCT_UPDATE. */
  async activate(variantId: string): Promise<Product> {
    const response = await apiClient.post<ApiResponse<ProductResponse>>(`${VARIANTS_PATH}/${variantId}/activate`);
    return toProduct(response.data);
  },

  /**
   * 409 if it is already inactive, or if it is the last active variant of an active product (deactivate the
   * product instead). Needs PRODUCT_UPDATE.
   */
  async deactivate(variantId: string): Promise<Product> {
    const response = await apiClient.post<ApiResponse<ProductResponse>>(`${VARIANTS_PATH}/${variantId}/deactivate`);
    return toProduct(response.data);
  },

  /** The units of a variant (base unit included). 404 if the variant does not exist. Needs PRODUCT_READ. */
  async listUnits(variantId: string, signal?: AbortSignal): Promise<VariantUnit[]> {
    const response = await apiClient.get<ApiResponse<VariantUnitResponse[]>>(
      `${VARIANTS_PATH}/${variantId}/units`,
      { signal },
    );
    return response.data.map(toVariantUnit);
  },

  /**
   * Assigns a unit to a variant. `conversionFactor` is how many base units make 1 of this unit (2 or more).
   * A 409 ApiError means the product is inactive, the unit is already on the variant, or the unit does not
   * exist or is inactive. Needs UNIT_CREATE.
   */
  async assignUnit(variantId: string, request: AssignUnitToVariantRequest): Promise<VariantUnit> {
    const response = await apiClient.post<ApiResponse<VariantUnitResponse>>(
      `${VARIANTS_PATH}/${variantId}/units`,
      request,
    );
    return toVariantUnit(response.data);
  },

  /**
   * Changes the conversion factor (2 or more) of a non-base unit. A 404 ApiError means the unit is not on the
   * variant, a 409 that the product is inactive, and a 400 that the factor is below 2 or the unit is the base
   * unit. Needs UNIT_UPDATE.
   */
  async changeConversion(variantId: string, unitId: string, conversionFactor: number): Promise<VariantUnit> {
    const body: DefineVariantConversionRequest = { conversionFactor };
    const response = await apiClient.put<ApiResponse<VariantUnitResponse>>(
      `${VARIANTS_PATH}/${variantId}/units/${unitId}`,
      body,
    );
    return toVariantUnit(response.data);
  },

  /** Removes a non-base unit from the variant. 404 if it is not on the variant, 409 for the base unit. Needs UNIT_DEACTIVATE. */
  async removeUnit(variantId: string, unitId: string): Promise<void> {
    await apiClient.delete<void>(`${VARIANTS_PATH}/${variantId}/units/${unitId}`);
  },

  /**
   * Deactivates a unit on the variant, keeping it on record. 404 if it is not on the variant; 409 if the product is
   * inactive, or for the base unit while other units are still active. Needs UNIT_DEACTIVATE.
   */
  async deactivateUnit(variantId: string, unitId: string): Promise<VariantUnit> {
    const response = await apiClient.post<ApiResponse<VariantUnitResponse>>(
      `${VARIANTS_PATH}/${variantId}/units/${unitId}/deactivate`,
    );
    return toVariantUnit(response.data);
  },
};