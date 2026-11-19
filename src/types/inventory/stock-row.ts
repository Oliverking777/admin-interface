import type { VariantUnit } from "@/types/product/product";

/** Derived from the quantity and the low-stock flag: the backend has no "status" field for stock. */
export type StockStatus = "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

/**
 * One line of the Stock page: a variant at a location, joined with its product data (image, category) and the
 * variant's units. Stock is kept per variant: "Indian Rice · 50 kg 10% broken" and "· 25 kg" are two rows.
 * Quantities are in BASE units, like everywhere in the inventory module.
 */
export type StockRow = {
  /** `${productId}:${locationId}`, stable and unique. */
  key: string;
  /** The variant's id (the inventory API still calls it productId). */
  productId: string;
  /** The variant's SKU, e.g. "PRD-000001-01". */
  productCode: string;
  /** The variant's full name, e.g. "Indian Rice · 50 kg 10% broken", or "Flour" for a product sold in one form. */
  productName: string;
  imageUrl: string | null;
  categoryId: string | null;
  categoryName: string | null;
  locationId: string;
  locationName: string;
  /** Base units. Never negative. */
  quantity: number;
  /** Base units. Null when no threshold is set. */
  lowStockThreshold: number | null;
  lowStock: boolean;
  /** ISO date-time. Null when nothing was ever recorded for this product at this location. */
  updatedAt: string | null;
  status: StockStatus;
  /** The variant's units (base unit included). Empty when the user cannot read products. */
  units: VariantUnit[];
};