/**
 * An inactive price no longer applies. A price that was changed is closed and becomes inactive too:
 * it stays in the history, and a new price carries the new values.
 */
export type PriceStatus = "ACTIVE" | "INACTIVE";

/** What the backend counts as the smallest quantity and the smallest price. */
export const MIN_PRICE_QUANTITY = 1;
export const MIN_PRICE_AMOUNT = 1;

/** Prices are whole FCFA (no decimals): "1 500 FCFA". */
export function formatFcfa(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
}

/** The quantity range as the backend writes it: "1-5" for a closed range, "6+" for no upper limit. */
export function formatQuantityRange(minimumQuantity: number, maximumQuantity: number | null): string {
  return maximumQuantity === null ? `${minimumQuantity}+` : `${minimumQuantity}-${maximumQuantity}`;
}

/**
 * The price of one unit of a product variant, for a quantity range and a period.
 * A flat price has minimumQuantity 1 and no maximumQuantity.
 * Two active prices of the same unit cannot overlap in both quantity and period.
 */
export type Price = {
  id: string;
  /** Id of the variant this price is for (a simple product's only variant has the product's id). */
  variantId: string;
  /** Id of the unit this price is for. A price is never converted to another unit. */
  unitId: string;
  /** Price per unit, in whole FCFA. */
  amount: number;
  /** Smallest quantity this price applies to (inclusive). */
  minimumQuantity: number;
  /** Largest quantity this price applies to (inclusive). Null means no upper limit. */
  maximumQuantity: number | null;
  /** When the price starts. ISO date-time (UTC). */
  effectiveFrom: string;
  /** When the price ends (exclusive). ISO date-time (UTC). Null means open ended. */
  effectiveTo: string | null;
  status: PriceStatus;
  /** ISO date-time. */
  createdAt: string;
  /** ISO date-time. */
  updatedAt: string;
};

/** The price that applies to a quantity of one unit, with the line total. */
export type ApplicablePrice = {
  /** Id of the price that was applied. */
  priceId: string;
  /** Price per unit, in whole FCFA. */
  unitPrice: number;
  quantity: number;
  /** unitPrice x quantity, in whole FCFA. */
  lineTotal: number;
};