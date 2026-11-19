"use client";

/**
 * Names for the ids an order carries. The Sales API sends ids only, so the order screens resolve
 * product, unit, location and customer names from the lists the app already loads
 * (each hook checks its own permission; without it the name is null and the UI shows a short id).
 *
 * Products: an order line is a variant. Its productId is the variant's id, so names and units come from the
 * variant ("Indian Rice · 50 kg 10% broken", with that variant's own units). Every variant is kept, inactive
 * ones included, so old orders still show a name; only active ones can be picked for a new line.
 *
 * Customers: every customer is loaded, inactive ones included, so old orders still show a name.
 */

import { useCallback, useMemo } from "react";

import { useAllLocations, useMyLocation } from "@/hooks/business/use-locations";
import { useAllCustomers } from "@/hooks/customer/use-customer";
import { useAllProducts } from "@/hooks/product/use-products";
import { toStockVariants, type StockVariant } from "@/lib/inventory/stock-variants";

export type OrderLookups = {
  /** The variant's full name, e.g. "Indian Rice · 50 kg 10% broken". */
  productName: (variantId: string) => string | null;
  /** The name of a unit of that variant. */
  unitName: (variantId: string, unitId: string) => string | null;
  locationName: (locationId: string) => string | null;
  customerName: (customerId: string) => string | null;
  /** The variant behind a line, with its units. */
  variant: (variantId: string) => StockVariant | null;
  /** Variants that can go on a new line (product and variant active, at least one active unit), by name. */
  sellableVariants: StockVariant[];
  /** Active locations the user may pick from (empty for users tied to one location). */
  locations: { id: string; name: string }[];
  /** True when the user is not tied to one location (an owner or a role that works everywhere). */
  anyLocation: boolean;
  /** The user's own location, when they have one. */
  myLocationId: string | null;
  /** False until we know whether the user has a location of their own. */
  ready: boolean;
};

export function useOrderLookups(): OrderLookups {
  const products = useAllProducts();
  const customers = useAllCustomers();
  const mine = useMyLocation();
  const all = useAllLocations();

  const variants = useMemo(() => toStockVariants(products.data ?? []), [products.data]);
  const variantMap = useMemo(() => new Map(variants.map((v) => [v.id, v])), [variants]);
  const sellableVariants = useMemo(
    () => variants.filter((v) => v.active && v.units.some((u) => u.status === "ACTIVE")),
    [variants],
  );

  const customerMap = useMemo(
    () => new Map((customers.data ?? []).map((c) => [c.id, c.name])),
    [customers.data],
  );

  const locationMap = useMemo(() => {
    const names = new Map<string, string>();
    for (const l of all.data ?? []) names.set(l.id, l.name);
    if (mine.data) names.set(mine.data.id, mine.data.name);
    return names;
  }, [all.data, mine.data]);

  const locations = useMemo(
    () =>
      (all.data ?? [])
        .filter((l) => l.status !== "INACTIVE")
        .map((l) => ({ id: l.id, name: l.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [all.data],
  );

  const variant = useCallback((id: string) => variantMap.get(id) ?? null, [variantMap]);
  const productName = useCallback((id: string) => variantMap.get(id)?.name ?? null, [variantMap]);
  const unitName = useCallback(
    (variantId: string, unitId: string) =>
      variantMap.get(variantId)?.units.find((u) => u.unitId === unitId)?.unitName ?? null,
    [variantMap],
  );
  const locationName = useCallback((id: string) => locationMap.get(id) ?? null, [locationMap]);
  const customerName = useCallback((id: string) => customerMap.get(id) ?? null, [customerMap]);

  const anyLocation = mine.isSuccess && mine.data === null;

  return {
    productName,
    unitName,
    locationName,
    customerName,
    variant,
    sellableVariants,
    locations: anyLocation ? locations : [],
    anyLocation,
    myLocationId: mine.data?.id ?? null,
    ready: !mine.isPending,
  };
}