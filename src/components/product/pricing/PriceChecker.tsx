"use client";

import { useId, useState } from "react";
import Card from "@/components/ui/Card";
import DatePicker from "@/components/ui/DatePicker";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { useApplicablePrice } from "@/hooks/product/use-price";
import { getErrorMessage } from "@/lib/api/api-error";
import { formatFcfa } from "@/types/product/price";
import type { VariantUnit } from "@/types/product/product";

type PriceCheckerProps = {
  /** The variant whose prices are checked. Key the checker by it, so switching variants starts afresh. */
  variantId: string;
  units: VariantUnit[];
};

/** "What would this quantity cost?" Calls the same resolver the sales module will use, so it doubles as a tier test. */
export default function PriceChecker({ variantId, units }: PriceCheckerProps) {
  const id = useId();
  const [unitId, setUnitId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [date, setDate] = useState("");

  const quantityValue = /^\d+$/.test(quantity.trim()) ? Number(quantity.trim()) : undefined;
  const query = useApplicablePrice(variantId, {
    unitId: unitId || undefined,
    quantity: quantityValue,
    at: date ? `${date}T00:00:00Z` : undefined,
  });

  return (
    <Card className="flex flex-col gap-3 p-4">
      <h3 className="text-sm font-semibold text-foreground">Price checker</h3>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-unit`} className="text-sm font-medium text-foreground">
          Unit
        </label>
        <Select id={`${id}-unit`} value={unitId} onChange={(e) => setUnitId(e.target.value)}>
          <option value="">Select a unit</option>
          {units
            .filter((u) => u.status === "ACTIVE")
            .map((u) => (
              <option key={u.unitId} value={u.unitId}>
                {u.unitName ?? "Unknown unit"}
              </option>
            ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={`${id}-qty`} className="text-sm font-medium text-foreground">
          Quantity
        </label>
        <Input
          id={`${id}-qty`}
          inputMode="numeric"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          autoComplete="off"
          invalid={quantity.trim() !== "" && quantityValue === undefined}
        />
      </div>

      <DatePicker label="On" value={date} onChange={setDate} />
      <p className="-mt-1 text-sm text-muted-foreground">Leave the date empty to check right now.</p>

      <div aria-live="polite" className="border-t border-border pt-3 text-sm">
        {!unitId ? (
          <p className="text-muted-foreground">Choose a unit and a quantity.</p>
        ) : query.isFetching ? (
          <p className="text-muted-foreground">Checking...</p>
        ) : query.isError ? (
          <p role="alert" className="text-foreground">
            {getErrorMessage(query.error, "No price applies to this quantity.")}
          </p>
        ) : query.data ? (
          <dl className="grid grid-cols-2 gap-1">
            <dt className="text-muted-foreground">Unit price</dt>
            <dd className="text-right font-medium text-foreground">{formatFcfa(query.data.unitPrice)}</dd>
            <dt className="text-muted-foreground">Line total</dt>
            <dd className="text-right font-medium text-foreground">{formatFcfa(query.data.lineTotal)}</dd>
          </dl>
        ) : null}
      </div>
    </Card>
  );
}