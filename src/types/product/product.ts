/**
 * Products and their variants.
 *
 * A product is the commercial item (e.g. "Indian Rice"). What is stocked, bought, sold and priced is always one of
 * its variants: "50 kg 10% broken", "25 kg 10% broken"... A simple product has a single unnamed variant, which the
 * screens hide: its units are shown as the product's units. The packaging (bag, carton) is not part of a variant's
 * name: it is the variant's unit.
 */

/** An inactive product can no longer be used for new operations, whatever the status of its variants. */
export type ProductStatus = "ACTIVE" | "INACTIVE";

/** An inactive variant can no longer be bought, sold or transferred. */
export type VariantStatus = "ACTIVE" | "INACTIVE";

/** Status of one unit on one variant. */
export type VariantUnitStatus = "ACTIVE" | "INACTIVE";

/** Limits that match the backend (ProductName, ProductImageUrl, VariantName). Codes and SKUs are generated. */
export const PRODUCT_NAME_MAX_LENGTH = 150;
export const PRODUCT_DESCRIPTION_MAX_LENGTH = 500;
export const PRODUCT_IMAGE_URL_MAX_LENGTH = 2048;
export const VARIANT_NAME_MAX_LENGTH = 100;

/** Most variants a product can be created with in one go. */
export const MAX_NEW_VARIANTS = 50;

/** Most other units (besides the base unit) a variant can be created with. */
export const MAX_NEW_VARIANT_UNITS = 20;

/** A non-base unit must contain at least this many base units. The base unit itself is always 1. */
export const MIN_CONVERSION_FACTOR = 2;

/** Separator of product and variant names in a full name: "Indian Rice · 50 kg 10% broken". */
export const VARIANT_NAME_SEPARATOR = " · ";

/**
 * The image must be a valid http or https URL with a host (e.g. a Cloudinary secure_url).
 * Pass the trimmed value.
 */
export function isValidProductImageUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (url.protocol === "http:" || url.protocol === "https:") && url.hostname !== "";
  } catch {
    return false;
  }
}

/** Variant names are unique within a product ignoring case and spaces: "50 kg" and "50KG" are the same name. */
export function variantNameKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "");
}

/**
 * A unit of measure on a variant, with how it converts to the variant's base unit.
 * Every variant has exactly one base unit (conversion factor 1). A non-base unit has a factor of 2 or more:
 * 1 of that unit equals `conversionFactor` base units (e.g. 1 carton = 24 bottles).
 */
export type VariantUnit = {
  /** Id of this variant-unit link. */
  id: string;
  /** Id of the unit itself (the id used in the /units/{unitId} endpoints). */
  unitId: string;
  /** Null when the unit can no longer be found. */
  unitCode: string | null;
  unitName: string | null;
  /** True for the variant's base unit. It cannot be removed, and its factor cannot be changed. */
  isBase: boolean;
  conversionFactor: number;
  status: VariantUnitStatus;
  /** ISO date-time. */
  createdAt: string;
  /** ISO date-time. */
  updatedAt: string;
};

/** A variant of a product: what is stocked and sold. */
export type ProductVariant = {
  id: string;
  /** e.g. "50 kg 10% broken". Null for the unnamed variant of a simple product. */
  name: string | null;
  /** What screens show: "Indian Rice · 50 kg 10% broken", or just "Flour" for a simple product. */
  fullName: string;
  /** Generated from the product code (PRD-000123-01, -02...). Never changes. Older variants may have other SKUs. */
  sku: string;
  status: VariantStatus;
  /** The base unit and every other unit of the variant. */
  units: VariantUnit[];
  /** ISO date-time. */
  createdAt: string;
  /** ISO date-time. */
  updatedAt: string;
};

/** Frontend representation of a product (what the UI works with). */
export type Product = {
  id: string;
  /** Generated: PRD-000123 (older products may have a typed code). Never changes. */
  code: string;
  /** Max 150 characters. */
  name: string;
  /** Max 500 characters. Null when not set. */
  description: string | null;
  /** Public http(s) URL of the product image. Required. */
  imageUrl: string;
  /** Id of the product's category. */
  categoryId: string;
  status: ProductStatus;
  /** One unnamed variant, shown as a plain product. */
  simple: boolean;
  /** Oldest first. Never empty. The first one has the product's id. */
  variants: ProductVariant[];
  /** ISO date-time. */
  createdAt: string;
  /** ISO date-time. */
  updatedAt: string;
};

/** The first variant: the only one of a simple product, whose units are shown as the product's units. */
export function firstVariant(product: Product): ProductVariant {
  return product.variants[0];
}

/** True when the variant may be used now: the product and the variant are both active. */
export function isVariantUsable(product: Product, variant: ProductVariant): boolean {
  return product.status === "ACTIVE" && variant.status === "ACTIVE";
}

/**
 * A variant with its product's names, as other screens need it (lines, stock, prices).
 * usable: the product and the variant are both active.
 */
export type VariantSummary = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  /** Null for the unnamed variant of a simple product. */
  name: string | null;
  fullName: string;
  sku: string;
  usable: boolean;
  /** Null only if the variant has no base unit, which the backend never allows. */
  baseUnitId: string | null;
  units: VariantUnit[];
};

/** What variant dropdowns need (e.g. choosing what a sale line is for). */
export type VariantOption = {
  id: string;
  sku: string;
  /** The full name. */
  name: string;
};