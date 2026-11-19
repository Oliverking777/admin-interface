"use client";

/**
 * The only place where Purchasing reads other modules (suppliers, locations, catalog).
 * Pages get plain option lists from here, so the purchase components never depend on those modules.
 */

import { useCallback, useEffect, useMemo } from "react";

import type { NamedOption, ProductOption, UnitLabel } from "@/components/purchase/purchase-display";
import { useAllLocations, useMyLocation } from "@/hooks/business/use-locations";
import { useAllProducts } from "@/hooks/product/use-products";
import { useAllUnits } from "@/hooks/product/use-unit";
import { useAllSuppliers } from "@/hooks/purchase/use-supplier";

type PurchaseOptions = {
  /** Active suppliers. */
  suppliers: NamedOption[];
  /** Locations the user may order for. */
  locations: NamedOption[];
  /**
   * What can be bought: one option per usable variant (active product and variant) with its active units.
   * A line sends the option's id as its productId: the backend reads it as a variant id.
   */
  products: ProductOption[];
  unitLabel: UnitLabel;
  isLoading: boolean;
};

export function usePurchaseOptions({ enabled = true }: { enabled?: boolean } = {}): PurchaseOptions {
  // Every active supplier, all pages. Needs SUPPLIER_READ: without it the list stays empty.
  const suppliersQuery = useAllSuppliers({ status: "ACTIVE" }, { enabled });

  const suppliers = useMemo<NamedOption[]>(
    () => (suppliersQuery.data ?? []).map((s) => ({ id: s.id, name: `${s.name} (${s.code})` })),
    [suppliersQuery.data],
  );

  // A user assigned to a location can only order for it (the backend answers 403 otherwise).
  // Users without one (owners, cross-location roles) choose among every active location (needs LOCATION_READ).
  // Both load independently: if /locations/me fails or returns nothing, the full list is still there.
  // useAllLocations switches itself off for users without LOCATION_READ.
  const myLocationQuery = useMyLocation({ enabled });
  const allLocationsQuery = useAllLocations({ enabled });

  const locations = useMemo<NamedOption[]>(() => {
    const mine = myLocationQuery.data;
    // Only a real location (with an id) limits the choice; anything else falls back to the full list.
    if (mine?.id) return [{ id: mine.id, name: `${mine.name} (${mine.code})` }];
    return (allLocationsQuery.data ?? [])
      .filter((l) => l.id && l.status !== "INACTIVE")
      .map((l) => ({ id: l.id, name: `${l.name} (${l.code})` }));
  }, [myLocationQuery.data, allLocationsQuery.data]);

  // Temporary: shows in the browser console what the location queries returned. Remove once locations appear.
  useEffect(() => {
    if (process.env.NODE_ENV === "production" || !enabled) return;
    console.info("[purchase options] locations", {
      mine: { status: myLocationQuery.status, fetchStatus: myLocationQuery.fetchStatus, data: myLocationQuery.data, error: myLocationQuery.error },
      all: { status: allLocationsQuery.status, fetchStatus: allLocationsQuery.fetchStatus, count: allLocationsQuery.data?.length, first: allLocationsQuery.data?.[0], error: allLocationsQuery.error },
      options: locations,
    });
  }, [enabled, locations, myLocationQuery.status, myLocationQuery.fetchStatus, myLocationQuery.data, myLocationQuery.error, allLocationsQuery.status, allLocationsQuery.fetchStatus, allLocationsQuery.data, allLocationsQuery.error]);

  // Every active product; one option per active variant, with its active units (base unit first). Needs PRODUCT_READ.
  // "Indian Rice · 50 kg 10% broken (PRD-000001-01)", or "Flour (PRD-000002-01)" for a product sold in one form.
  // A purchase line refers to the unit itself (VariantUnit.unitId), not the variant-unit link.
  const productsQuery = useAllProducts({ status: "ACTIVE" }, { enabled });

  const products = useMemo<ProductOption[]>(
    () =>
      (productsQuery.data ?? [])
        .flatMap((p) => p.variants.filter((v) => v.status === "ACTIVE"))
        .map((v) => ({
          id: v.id,
          name: `${v.fullName} (${v.sku})`,
          units: v.units
            .filter((u) => u.status === "ACTIVE")
            .sort((a, b) => Number(b.isBase) - Number(a.isBase) || a.conversionFactor - b.conversionFactor)
            .map((u) => ({ id: u.unitId, name: u.unitName ?? "Unknown unit", conversionFactor: u.conversionFactor })),
        }))
        .filter((v) => v.units.length > 0),
    [productsQuery.data],
  );

  // Unit names for lines already on purchases, including units no longer on an active variant.
  // Needs UNIT_READ; without it, names come from the variants above only.
  const unitsQuery = useAllUnits({}, { enabled });

  const unitNames = useMemo(() => {
    const names = new Map<string, string>();
    for (const unit of unitsQuery.data ?? []) names.set(unit.id, unit.name);
    for (const product of productsQuery.data ?? []) {
      for (const variant of product.variants) {
        for (const u of variant.units) if (u.unitName) names.set(u.unitId, u.unitName);
      }
    }
    return names;
  }, [unitsQuery.data, productsQuery.data]);
  const unitLabel = useCallback<UnitLabel>((unitId) => unitNames.get(unitId), [unitNames]);

  return {
    suppliers,
    locations,
    products,
    unitLabel,
    isLoading:
      suppliersQuery.isLoading || myLocationQuery.isLoading || allLocationsQuery.isLoading || productsQuery.isLoading,
  };
}