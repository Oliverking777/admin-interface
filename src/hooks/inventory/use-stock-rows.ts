"use client";

/**
 * Everything the Stock page lists, in one hook.
 *
 * Stock is kept per variant: a level's productId is a variant id, its code the variant's SKU and its name the
 * variant's full name. The backend sends no category, unit or image, so each level is joined with its variant
 * (units) and that variant's product (image, category). Category and location lists feed the filters.
 *
 * Every query switches itself off without its permission. When products cannot be read, rows still show
 * (name, code, quantity) but without image, category and unit.
 *
 * When one location is selected, active variants of active products with no stock record there are added with
 * quantity 0, because the backend has no row for a variant that never had stock at a location.
 */

import { useMemo } from "react";

import { useAllCategories } from "@/hooks/business/use-categories";
import { useAllLocations } from "@/hooks/business/use-locations";
import { useAllStockLevels } from "@/hooks/inventory/use-inventory";
import { useAllProducts } from "@/hooks/product/use-products";
import { getStockStatus } from "@/lib/inventory/stock-status";
import type { StockRow } from "@/types/inventory/stock-row";

export function useStockRows(locationId: string | null) {
  const levels = useAllStockLevels({ locationId: locationId ?? undefined });
  const products = useAllProducts();
  const categories = useAllCategories();
  const locations = useAllLocations();

  const levelData = levels.data;
  const productData = products.data;
  const categoryData = categories.data;
  const locationData = locations.data;

  const rows = useMemo<StockRow[]>(() => {
    if (!levelData) return [];

    // variant id -> the variant and its product
    const byVariantId = new Map(
      (productData ?? []).flatMap((p) => p.variants.map((v) => [v.id, { product: p, variant: v }] as const)),
    );
    const categoryNameById = new Map((categoryData ?? []).map((c) => [c.id, c.name]));

    const result: StockRow[] = levelData.map((level) => {
      const entry = byVariantId.get(level.productId);
      const product = entry?.product;
      return {
        key: `${level.productId}:${level.locationId}`,
        productId: level.productId,
        productCode: level.productCode,
        productName: level.productName,
        imageUrl: product?.imageUrl ?? null,
        categoryId: product?.categoryId ?? null,
        categoryName: product ? (categoryNameById.get(product.categoryId) ?? null) : null,
        locationId: level.locationId,
        locationName: level.locationName,
        quantity: level.quantity,
        lowStockThreshold: level.lowStockThreshold,
        lowStock: level.lowStock,
        updatedAt: level.updatedAt,
        status: getStockStatus(level.quantity, level.lowStock),
        units: entry?.variant.units ?? [],
      };
    });

    if (locationId && productData) {
      const locationName =
        locationData?.find((l) => l.id === locationId)?.name ?? levelData[0]?.locationName ?? null;
      if (locationName) {
        const present = new Set(levelData.map((l) => l.productId));
        for (const product of productData) {
          if (product.status !== "ACTIVE") continue;
          for (const variant of product.variants) {
            if (variant.status !== "ACTIVE" || present.has(variant.id)) continue;
            result.push({
              key: `${variant.id}:${locationId}`,
              productId: variant.id,
              productCode: variant.sku,
              productName: variant.fullName,
              imageUrl: product.imageUrl,
              categoryId: product.categoryId,
              categoryName: categoryNameById.get(product.categoryId) ?? null,
              locationId,
              locationName,
              quantity: 0,
              lowStockThreshold: null,
              lowStock: false,
              updatedAt: null,
              status: "OUT_OF_STOCK",
              units: variant.units,
            });
          }
        }
      }
    }

    return result;
  }, [levelData, productData, categoryData, locationData, locationId]);

  return {
    rows,
    categories: categoryData ?? [],
    locations: locationData ?? [],
    isLoading: levels.isLoading || products.isLoading,
    error: levels.error,
    refetch: levels.refetch,
  };
}