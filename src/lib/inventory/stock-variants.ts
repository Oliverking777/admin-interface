/**
 * What the inventory screens pick and show: stock is kept per variant, so every product becomes one entry per
 * variant ("Indian Rice · 50 kg 10% broken"), with that variant's own units. A product sold in one form gives a
 * single entry named like the product. The id is the variant's id: the inventory and transfer APIs still call it
 * productId.
 */

import type { Product, VariantUnit } from "@/types/product/product";

export type StockVariant = {
  /** The variant's id (sent as productId). */
  id: string;
  productId: string;
  /** Full name, e.g. "Indian Rice · 50 kg 10% broken", or "Flour". */
  name: string;
  sku: string;
  /** For dropdowns: "Indian Rice · 50 kg 10% broken (PRD-000001-01)". */
  label: string;
  /** The product and the variant are both active: only these can be picked for something new. */
  active: boolean;
  units: VariantUnit[];
};

/** Every variant of every product, sorted by name. */
export function toStockVariants(products: Product[]): StockVariant[] {
  return products
    .flatMap((p) =>
      p.variants.map((v) => ({
        id: v.id,
        productId: p.id,
        name: v.fullName,
        sku: v.sku,
        label: `${v.fullName} (${v.sku})`,
        active: p.status === "ACTIVE" && v.status === "ACTIVE",
        units: v.units,
      })),
    )
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** "Carton (12 Bottle)" for a bigger unit, "Bottle" for the base unit. */
export function unitOptionLabel(unit: VariantUnit, baseName: string): string {
  const name = unit.unitName ?? "Unknown unit";
  return unit.isBase ? name : `${name} (${unit.conversionFactor} ${baseName})`;
}