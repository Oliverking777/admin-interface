/**
 * Request/response shapes of the /products/{id}/prices endpoints. A price belongs to a variant: the id in the path
 * (and productId in the response) is the variant's id. A simple product's only variant has the product's id.
 * They match ProductPriceResponse, PricePageResponse, ApplicablePriceResponse,
 * CreateProductPriceRequest and ChangeProductPriceRequest on the backend
 * (tsgp.yah_enterprise.pricing.presentation.dto).
 */
import type { PageResponse } from "@/types/iam/common-dto";
import type { ISODateTime, UUID } from "@/types/iam/user";

/** Mirrors the backend PriceStatus enum (sent as a string). */
export type PriceStatusDto = "ACTIVE" | "INACTIVE";

/** One price returned by the pricing endpoints. */
export interface ProductPriceResponse {
  priceId: UUID;
  /** The variant's id (the backend still calls it productId). */
  productId: UUID;
  unitId: UUID;
  /** Price per unit, in whole FCFA. */
  price: number;
  minimumQuantity: number;
  /** Left out of the JSON (or null) when there is no upper limit. */
  maximumQuantity?: number | null;
  effectiveFrom: ISODateTime;
  /** Left out of the JSON (or null) when the price is open ended. */
  effectiveTo?: ISODateTime | null;
  priceStatus: PriceStatusDto;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type PricePageResponse = PageResponse<ProductPriceResponse>;

export interface ApplicablePriceResponse {
  priceId: UUID;
  /** Price per unit, in whole FCFA. */
  unitPrice: number;
  quantity: number;
  /** unitPrice x quantity, in whole FCFA. */
  lineTotal: number;
}

export interface CreateProductPriceRequest {
  /** Required. An active unit of the variant. */
  unitId: UUID;
  /** Required. Whole FCFA, greater than 0. */
  price: number;
  /** Required. At least 1. Use 1 for a flat price. */
  minimumQuantity: number;
  /** Optional. At least 1 and not below minimumQuantity. Leave out for no upper limit. */
  maximumQuantity?: number;
  /** Optional. ISO-8601 UTC. Leave out to start now. */
  effectiveFrom?: ISODateTime;
  /** Optional. ISO-8601 UTC, exclusive, after effectiveFrom. Leave out for open ended. */
  effectiveTo?: ISODateTime;
}

/**
 * Fields left out are not changed, but at least one of price and minimumQuantity is needed.
 * Changing a price never edits it in place: the old price is closed and kept in the history,
 * and a NEW price (with a new id) is created and returned.
 * Giving minimumQuantity replaces the whole quantity range: a missing maximumQuantity then means no upper limit.
 * maximumQuantity alone is rejected with a 400.
 */
export interface ChangeProductPriceRequest {
  /** New price per unit, whole FCFA, greater than 0. */
  price?: number;
  /** New smallest quantity, at least 1. */
  minimumQuantity?: number;
  /** New largest quantity, at least 1. Only used together with minimumQuantity. */
  maximumQuantity?: number;
}

/** Query parameters of GET .../prices/applicable. */
export interface ApplicablePriceQuery {
  unitId: UUID;
  /** At least 1. */
  quantity: number;
  /** Moment to price at, ISO-8601 UTC. Leave out for now. */
  at?: ISODateTime;
}