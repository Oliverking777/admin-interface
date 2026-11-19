/**
 * Pricing operations from the frontend's point of view.
 * A price belongs to a product variant. Every call goes through /products/{variantId}/prices with the shared
 * apiClient: the backend path still says "products", but the id is the variant's (a simple product's only variant
 * has the product's id).
 */
import { apiClient } from "@/lib/api/api-client";
import type { ApplicablePrice, Price } from "@/types/product/price";
import type {
  ApplicablePriceQuery,
  ApplicablePriceResponse,
  ChangeProductPriceRequest,
  CreateProductPriceRequest,
  PricePageResponse,
  ProductPriceResponse,
} from "@/types/product/price-dto";
import type { ApiResponse } from "@/types/iam/common-dto";

function pricesPath(variantId: string): string {
  return `/products/${variantId}/prices`;
}

export function toPrice(dto: ProductPriceResponse): Price {
  return {
    id: dto.priceId,
    variantId: dto.productId,
    unitId: dto.unitId,
    amount: dto.price,
    minimumQuantity: dto.minimumQuantity,
    maximumQuantity: dto.maximumQuantity ?? null,
    effectiveFrom: dto.effectiveFrom,
    effectiveTo: dto.effectiveTo ?? null,
    status: dto.priceStatus,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toApplicablePrice(dto: ApplicablePriceResponse): ApplicablePrice {
  return {
    priceId: dto.priceId,
    unitPrice: dto.unitPrice,
    quantity: dto.quantity,
    lineTotal: dto.lineTotal,
  };
}

export const priceService = {
  /**
   * The prices of a variant that are active and in force right now (not paged).
   * Pass `unitId` to see one unit only. Needs PRICE_RULE_READ.
   */
  async listCurrent(variantId: string, unitId?: string, signal?: AbortSignal): Promise<Price[]> {
    const response = await apiClient.get<ApiResponse<ProductPriceResponse[]>>(pricesPath(variantId), {
      query: { unitId },
      signal,
    });
    return response.data.map(toPrice);
  },

  /**
   * One page of every price row of the variant, active and closed, newest first.
   * Page numbers start at 0, size is 1 to 100. Pass `unitId` to see one unit only. Needs PRICE_RULE_READ.
   */
  async listHistoryPage(
    variantId: string,
    page: number,
    size: number,
    unitId?: string,
    signal?: AbortSignal,
  ): Promise<PricePageResponse> {
    const response = await apiClient.get<ApiResponse<PricePageResponse>>(`${pricesPath(variantId)}/history`, {
      query: { page, size, unitId },
      signal,
    });
    return response.data;
  },

  /** One price by id. A 404 ApiError means it does not exist for this variant. Needs PRICE_RULE_READ. */
  async getById(variantId: string, priceId: string, signal?: AbortSignal): Promise<Price> {
    const response = await apiClient.get<ApiResponse<ProductPriceResponse>>(
      `${pricesPath(variantId)}/${priceId}`,
      { signal },
    );
    return toPrice(response.data);
  },

  /**
   * The unit price and line total for a quantity of one unit (a price is never converted from another unit).
   * A 404 ApiError means the unit has no price for this quantity; a 400 means an invalid quantity.
   * Needs PRICE_RULE_READ.
   */
  async getApplicable(
    variantId: string,
    { unitId, quantity, at }: ApplicablePriceQuery,
    signal?: AbortSignal,
  ): Promise<ApplicablePrice> {
    const response = await apiClient.get<ApiResponse<ApplicablePriceResponse>>(
      `${pricesPath(variantId)}/applicable`,
      { query: { unitId, quantity, at }, signal },
    );
    return toApplicablePrice(response.data);
  },

  /**
   * Creates an active price for one unit of the variant.
   * A 409 ApiError means the variant or the unit cannot be priced (it does not exist or is inactive,
   * or the unit is not on the variant), or the price overlaps another active price of the same unit
   * in both quantity and period. A 400 means an invalid price, quantity range or period.
   * Needs PRICE_RULE_CREATE.
   */
  async create(variantId: string, request: CreateProductPriceRequest): Promise<Price> {
    const response = await apiClient.post<ApiResponse<ProductPriceResponse>>(pricesPath(variantId), request);
    return toPrice(response.data);
  },

  /**
   * Changes the amount and/or the quantity range. The old price is closed (kept in the history) and a NEW
   * price with a new id is returned. If nothing really changes, the current price comes back unchanged.
   * A 400 ApiError means nothing to change, a maximumQuantity without a minimumQuantity, an invalid value,
   * or an expired price. A 404 means the price does not exist for this variant. A 409 means the price is
   * already inactive, the variant or unit cannot be priced, or the new range overlaps another price.
   * Needs PRICE_RULE_UPDATE.
   */
  async change(variantId: string, priceId: string, request: ChangeProductPriceRequest): Promise<Price> {
    const response = await apiClient.put<ApiResponse<ProductPriceResponse>>(
      `${pricesPath(variantId)}/${priceId}`,
      request,
    );
    return toPrice(response.data);
  },

  /** Stops the price from applying; the row stays in the history. 409 if it is already inactive. Needs PRICE_RULE_DEACTIVATE. */
  async deactivate(variantId: string, priceId: string): Promise<Price> {
    const response = await apiClient.post<ApiResponse<ProductPriceResponse>>(
      `${pricesPath(variantId)}/${priceId}/deactivate`,
    );
    return toPrice(response.data);
  },
};