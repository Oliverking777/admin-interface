"use client";

// app/.../product/pricing/page.tsx
import { useCallback, useId, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Select from "@/components/ui/Select";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/ToastProvider";
import PriceChecker from "@/components/product/pricing/PriceChecker";
import PriceDrawer from "@/components/product/pricing/PriceDrawer";
import PriceHistoryPanel from "@/components/product/pricing/PriceHistoryPanel";
import PriceTiersCard from "@/components/product/pricing/PriceTiersCard";
import ProductPicker from "@/components/product/pricing/ProductPicker";
import { useAuth } from "@/hooks/iam/use-auth";
import {
  useChangePrice,
  useCreatePrice,
  useCurrentPrices,
  useDeactivatePrice,
} from "@/hooks/product/use-price";
import { useProduct } from "@/hooks/product/use-products";
import { getErrorMessage } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { formatFcfa, formatQuantityRange, type Price } from "@/types/product/price";
import type { ChangeProductPriceRequest, CreateProductPriceRequest } from "@/types/product/price-dto";
import { firstVariant, type Product, type ProductVariant } from "@/types/product/product";

type Tab = "current" | "history";
const TABS: TabItem<Tab>[] = [
  { value: "current", label: "Current prices" },
  { value: "history", label: "History" },
];

type DrawerState = { price: Price | null; unitId?: string } | null;

/** The variant to show first: the first active one, else the first. */
function defaultVariant(product: Product): ProductVariant {
  return product.variants.find((v) => v.status === "ACTIVE") ?? firstVariant(product);
}

export default function PricingPage() {
  const { hasPermission, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const variantFieldId = useId();
  const [productId, setProductId] = useState<string | undefined>();
  const [chosenVariantId, setChosenVariantId] = useState<string | undefined>();
  const [tab, setTab] = useState<Tab>("current");
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [toDeactivate, setToDeactivate] = useState<Price | null>(null);

  const productQuery = useProduct(productId);
  const product = productQuery.data;
  // Prices belong to a variant. A simple product has one, which the page does not mention.
  const variant = product
    ? (product.variants.find((v) => v.id === chosenVariantId) ?? defaultVariant(product))
    : undefined;
  const variantId = variant?.id;
  const pricesQuery = useCurrentPrices(variantId);
  const createPrice = useCreatePrice();
  const changePrice = useChangePrice();
  const deactivatePrice = useDeactivatePrice();

  // Prices are reached through a product, so both reads are needed.
  const canRead = hasPermission(PERMISSIONS.PRICE_RULE_READ) && hasPermission(PERMISSIONS.PRODUCT_READ);
  const canCreate = hasPermission(PERMISSIONS.PRICE_RULE_CREATE);
  const canUpdate = hasPermission(PERMISSIONS.PRICE_RULE_UPDATE);
  const canDeactivate = hasPermission(PERMISSIONS.PRICE_RULE_DEACTIVATE);

  const productActive = product?.status === "ACTIVE";
  const variantActive = variant?.status === "ACTIVE";
  const usable = productActive && variantActive;
  const baseUnitName = variant?.units.find((u) => u.isBase)?.unitName ?? "base units";

  const pricesByUnit = useMemo(() => {
    const map = new Map<string, Price[]>();
    for (const price of pricesQuery.data ?? []) {
      map.set(price.unitId, [...(map.get(price.unitId) ?? []), price]);
    }
    return map;
  }, [pricesQuery.data]);

  const closeDrawer = useCallback(() => setDrawer(null), []);
  const closeConfirm = useCallback(() => setToDeactivate(null), []);

  function handleSelect(selected: Product) {
    setProductId(selected.id);
    setChosenVariantId(undefined);
    setTab("current");
  }

  async function handleCreate(request: CreateProductPriceRequest) {
    if (!variantId) return;
    await createPrice.mutateAsync({ variantId, request });
    toast({ title: "Price created", description: "The new price applies from its start date." });
  }

  async function handleChange(priceId: string, request: ChangeProductPriceRequest) {
    if (!variantId) return;
    await changePrice.mutateAsync({ variantId, priceId, request });
    toast({ title: "Price changed", description: "The old price is closed and kept in the history." });
  }

  async function confirmDeactivate() {
    if (!variantId || !toDeactivate) return;
    try {
      await deactivatePrice.mutateAsync({ variantId, priceId: toDeactivate.id });
      toast({ title: "Price deactivated", description: "It no longer applies. It stays in the history." });
      setToDeactivate(null);
    } catch (error) {
      toast({ title: "Could not deactivate the price", description: getErrorMessage(error), variant: "error" });
    }
  }

  if (!authLoading && !canRead) {
    return (
      <Card>
        <p className="text-sm font-medium text-foreground">You do not have access to pricing</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask an administrator to give your role the PRICE_RULE_READ and PRODUCT_READ permissions.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ProductPicker onSelect={handleSelect} />

      {!productId ? (
        <Card className="py-12 text-center">
          <p className="text-sm font-medium text-foreground">Choose a product to see its prices</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Prices belong to a product and one of its units, so start by searching for the product.
            For a product with variants, each variant has its own prices.
          </p>
        </Card>
      ) : productQuery.isLoading ? (
        <div className="h-24 animate-pulse bg-muted motion-reduce:animate-none" aria-busy="true" />
      ) : productQuery.isError || !product || !variant ? (
        <Card className="py-8 text-center">
          <p role="alert" className="text-sm text-foreground">
            {getErrorMessage(productQuery.error, "Could not load the product.")}
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void productQuery.refetch()}>
            Try again
          </Button>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-foreground">{product.name}</h2>
            <span className="text-sm text-muted-foreground">{product.code}</span>
            <Badge variant={productActive ? "success" : "neutral"}>{productActive ? "Active" : "Inactive"}</Badge>
          </div>

          {!product.simple && (
            <div className="flex max-w-xl flex-col gap-1.5">
              <label htmlFor={variantFieldId} className="text-sm font-medium text-foreground">
                Variant
              </label>
              <Select
                id={variantFieldId}
                value={variant.id}
                onChange={(e) => {
                  setChosenVariantId(e.target.value);
                  setDrawer(null);
                }}
              >
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.sku}){v.status === "INACTIVE" ? " - inactive" : ""}
                  </option>
                ))}
              </Select>
            </div>
          )}

          {!usable && (
            <p role="status" className="border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-sm text-foreground">
              {productActive ? "This variant" : "This product"} is inactive, so prices cannot be added or changed. You
              can still deactivate a price.
            </p>
          )}

          <Tabs items={TABS} value={tab} onChange={setTab} aria-label="Pricing view" />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex min-w-0 flex-col gap-4">
              {tab === "history" ? (
                <PriceHistoryPanel key={variant.id} variantId={variant.id} units={variant.units} />
              ) : pricesQuery.isLoading ? (
                <div className="h-32 animate-pulse bg-muted motion-reduce:animate-none" aria-busy="true" />
              ) : pricesQuery.isError ? (
                <Card className="py-8 text-center">
                  <p role="alert" className="text-sm text-foreground">
                    {getErrorMessage(pricesQuery.error, "Could not load the prices.")}
                  </p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => void pricesQuery.refetch()}>
                    Try again
                  </Button>
                </Card>
              ) : (
                variant.units.map((unit) => (
                  <PriceTiersCard
                    key={unit.id}
                    unit={unit}
                    baseUnitName={baseUnitName}
                    prices={pricesByUnit.get(unit.unitId) ?? []}
                    editable={usable && unit.status === "ACTIVE"}
                    canCreate={canCreate}
                    canUpdate={canUpdate}
                    canDeactivate={canDeactivate}
                    onAdd={(u) => setDrawer({ price: null, unitId: u.unitId })}
                    onChange={(price) => setDrawer({ price })}
                    onDeactivate={setToDeactivate}
                  />
                ))
              )}
            </div>

            <PriceChecker key={variant.id} variantId={variant.id} units={variant.units} />
          </div>

          <PriceDrawer
            open={drawer !== null}
            onClose={closeDrawer}
            price={drawer?.price ?? null}
            units={variant.units}
            defaultUnitId={drawer?.unitId}
            onCreate={handleCreate}
            onChange={handleChange}
          />

          <ConfirmDialog
            open={toDeactivate !== null}
            onClose={closeConfirm}
            onConfirm={confirmDeactivate}
            title="Deactivate this price?"
            description={
              toDeactivate
                ? `The price of ${formatFcfa(toDeactivate.amount)} for quantity ${formatQuantityRange(toDeactivate.minimumQuantity, toDeactivate.maximumQuantity)} will stop applying. It stays in the history.`
                : undefined
            }
            confirmLabel="Deactivate"
            destructive
            loading={deactivatePrice.isPending}
          />
        </>
      )}
    </div>
  );
}