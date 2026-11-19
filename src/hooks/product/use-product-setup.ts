"use client";

/**
 * Creates a product with all its variants, their units and one price per unit:
 *
 *   1. create the product: one request with every variant and its units (the backend creates them together,
 *      and generates the product code and the SKUs)
 *   2. create each price: for any quantity, from now on, with no end date
 *
 * Prices live in another module, so they are separate requests. A product without some prices is still valid, so
 * nothing is undone when a price fails. The error carries the progress made so far instead: calling `run` again
 * with that progress only creates the prices that are left, so the product is never created twice.
 * Quantity tiers and dated prices stay on the Pricing page.
 */

import { useCreatePrice } from "@/hooks/product/use-price";
import { useCreateProduct } from "@/hooks/product/use-products";
import { MIN_PRICE_QUANTITY } from "@/types/product/price";
import { variantNameKey, type Product } from "@/types/product/product";
import type { CreateProductRequest } from "@/types/product/product-dto";

/** One price to set: `variantName` as sent in the request (absent for a simple product's variant). */
export type SetupPrice = { variantName?: string; unitId: string; price: number };

export type ProductSetup = {
  product: CreateProductRequest;
  /** Whole FCFA, one per variant and unit that has one. The others are set later on the Pricing page. */
  prices: SetupPrice[];
};

/** What is already saved. Pass it back to `run` to finish a setup that stopped half way. */
export type SetupProgress = {
  product: Product | null;
  /** setupPriceKey of each price saved. */
  pricedKeys: string[];
};

export const NO_PROGRESS: SetupProgress = { product: null, pricedKeys: [] };

/** Identifies a price of the setup before the variants have ids: the variant's name key and the unit. */
export function setupPriceKey(variantName: string | undefined, unitId: string): string {
  return `${variantNameKey(variantName ?? "")}|${unitId}`;
}

export type SetupStep = "product" | "price";

/** A step failed. `price` says which one for the "price" step; `error` is usually an ApiError. */
export class ProductSetupError extends Error {
  readonly step: SetupStep;
  readonly price: SetupPrice | null;
  readonly progress: SetupProgress;
  readonly error: unknown;

  constructor(step: SetupStep, price: SetupPrice | null, progress: SetupProgress, error: unknown) {
    super(`Product setup stopped at the ${step} step`);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = "ProductSetupError";
    this.step = step;
    this.price = price;
    this.progress = progress;
    this.error = error;
  }
}

export function useProductSetup() {
  const createProduct = useCreateProduct();
  const createPrice = useCreatePrice();

  /** Runs what is left of the setup. Throws ProductSetupError, with the progress made, when a step fails. */
  async function run(setup: ProductSetup, from: SetupProgress = NO_PROGRESS): Promise<SetupProgress> {
    let product = from.product;
    const priced = [...from.pricedKeys];
    const snapshot = (): SetupProgress => ({ product, pricedKeys: [...priced] });

    if (!product) {
      try {
        product = await createProduct.mutateAsync(setup.product);
      } catch (error) {
        throw new ProductSetupError("product", null, snapshot(), error);
      }
    }

    // Variant names are unique within the product (ignoring case and spaces), so they find the new ids.
    const variantIds = new Map(product.variants.map((v) => [variantNameKey(v.name ?? ""), v.id]));

    for (const item of setup.prices) {
      const key = setupPriceKey(item.variantName, item.unitId);
      if (priced.includes(key)) continue;
      try {
        const variantId = variantIds.get(variantNameKey(item.variantName ?? ""));
        if (!variantId) throw new Error("The variant of this price was not found on the new product.");
        await createPrice.mutateAsync({
          variantId,
          request: { unitId: item.unitId, price: item.price, minimumQuantity: MIN_PRICE_QUANTITY },
        });
        priced.push(key);
      } catch (error) {
        throw new ProductSetupError("price", item, snapshot(), error);
      }
    }

    return snapshot();
  }

  return { run };
}