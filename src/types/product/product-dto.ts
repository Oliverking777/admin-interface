/**
 * Request/response shapes of the /products and /variants endpoints.
 * They match tsgp.yah_enterprise.product.presentation.dto on the backend.
 */
import type { PageResponse } from "@/types/iam/common-dto";
import type { ISODateTime, UUID } from "@/types/iam/user";

/** Mirrors the backend ProductStatus enum (sent as a string). */
export type ProductStatusDto = "ACTIVE" | "INACTIVE";
export type VariantStatusDto = "ACTIVE" | "INACTIVE";
export type VariantUnitStatusDto = "ACTIVE" | "INACTIVE";

/** A unit of a variant. */
export interface VariantUnitResponse {
  /** Id of the variant-unit link. */
  variantUnitId: UUID;
  /** Id of the unit itself. */
  unitId: UUID;
  /** Null when the unit can no longer be found. */
  unitCode: string | null;
  unitName: string | null;
  /** True for the variant's base unit. */
  baseUnit: boolean;
  /** 1 for the base unit, 2 or more for the others. */
  conversionFactor: number;
  unitStatus: VariantUnitStatusDto;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface VariantResponse {
  variantId: UUID;
  /** Null for the unnamed variant of a simple product. */
  variantName: string | null;
  /** "Indian Rice · 50 kg 10% broken", or just the product name. */
  fullName: string;
  sku: string;
  variantStatus: VariantStatusDto;
  units: VariantUnitResponse[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

/** The product returned by the /products endpoints (and by the variant changes, which answer the whole product). */
export interface ProductResponse {
  productId: UUID;
  /** Upper case, unique. */
  productCode: string;
  productName: string;
  /** Null when not set. */
  description: string | null;
  productImageUrl: string;
  categoryId: UUID;
  productStatus: ProductStatusDto;
  /** One unnamed variant, shown as a plain product. */
  simple: boolean;
  /** Oldest first. */
  variants: VariantResponse[];
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type ProductPageResponse = PageResponse<ProductResponse>;

/** GET /variants?ids=... and GET /variants/by-code/{code}. */
export interface VariantSummaryResponse {
  variantId: UUID;
  productId: UUID;
  productCode: string;
  productName: string;
  variantName: string | null;
  fullName: string;
  sku: string;
  /** The product and the variant are both active. */
  usable: boolean;
  baseUnitId: UUID | null;
  units: VariantUnitResponse[];
}

/** A variant created with its product, with the units it is counted in. Its SKU is generated. */
export interface NewVariantRequest {
  /** e.g. "50 kg 10% broken", max 100 characters. Leave out only for the single variant of a simple product. */
  variantName?: string;
  /** Required. Base unit of the variant (conversion factor 1), e.g. Bag. */
  baseUnitId: UUID;
  /** Its other units, each with how many base units it holds. At most 20. */
  units?: AssignUnitToVariantRequest[];
}

/**
 * POST /products. A new product with all its variants and their units, created at once. The product code
 * (PRD-000123) and the SKUs (PRD-000123-01...) are generated. One unnamed variant makes a simple product;
 * with several, each needs a name, unique within the product ignoring case and spaces.
 */
export interface CreateProductRequest {
  /** Required. Max 150 characters. */
  productName: string;
  /** Optional. Max 500 characters. */
  description?: string;
  /** Required. A valid http or https URL, max 2048 characters (e.g. a Cloudinary secure_url). */
  productImageUrl: string;
  /** Required. Id of an existing category. */
  categoryId: UUID;
  /** Required. 1 to 50 variants. */
  variants: NewVariantRequest[];
}

/**
 * Fields left out (or null) are not changed. Nothing is required.
 * The code cannot be changed, the category has its own endpoint (ChangeProductCategoryRequest),
 * and the status is changed with the activate/deactivate endpoints.
 * The name and the image URL cannot be blank: a blank value is rejected with a 400.
 * Sending an empty string for the description clears it.
 */
export interface UpdateProductRequest {
  /** Max 150 characters. */
  productName?: string;
  /** Max 500 characters. Empty string clears it. */
  description?: string;
  /** A valid http or https URL, max 2048 characters. */
  productImageUrl?: string;
}

export interface ChangeProductCategoryRequest {
  /** Required. Id of an existing category. */
  categoryId: UUID;
}

/**
 * POST /products/{productId}/variants. A named variant with its units; its SKU is generated.
 * A simple product's unnamed variant must be named first.
 */
export interface AddVariantRequest {
  /** Required. Max 100 characters, unique within the product ignoring case and spaces. */
  variantName: string;
  /** Required. Base unit of the variant (conversion factor 1). */
  baseUnitId: UUID;
  /** Its other units, each with how many base units it holds. At most 20. */
  units?: AssignUnitToVariantRequest[];
}

/**
 * PUT /variants/{variantId}. Renames a variant; an empty string removes the name, only while it is the product's
 * only variant. The SKU never changes.
 */
export interface UpdateVariantRequest {
  variantName: string;
}

export interface AssignUnitToVariantRequest {
  /** Required. A unit not yet on the variant. */
  unitId: UUID;
  /** Required. 2 or more: how many base units make 1 of this unit. */
  conversionFactor: number;
}

export interface DefineVariantConversionRequest {
  /** Required. 2 or more. The base unit's factor cannot be changed. */
  conversionFactor: number;
}

/**
 * Query parameters of GET /products (besides page and size).
 * When `search` is not blank the backend searches (product name or code, or a variant's name or SKU)
 * and ignores `status`.
 */
export interface ProductListQuery {
  /** Text to search for. */
  search?: string;
  status?: ProductStatusDto;
}