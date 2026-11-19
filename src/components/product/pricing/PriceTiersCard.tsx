"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { formatFcfa, formatQuantityRange, type Price } from "@/types/product/price";
import type { VariantUnit } from "@/types/product/product";

type PriceTiersCardProps = {
  unit: VariantUnit;
  /** Name of the variant's base unit, e.g. "Bag". */
  baseUnitName: string;
  /** The current prices of this unit only. */
  prices: Price[];
  /** False when the product, the variant or this unit is inactive: the backend would refuse the change. */
  editable: boolean;
  canCreate: boolean;
  canUpdate: boolean;
  canDeactivate: boolean;
  onAdd: (unit: VariantUnit) => void;
  onChange: (price: Price) => void;
  onDeactivate: (price: Price) => void;
};

const dateFormat = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" });

export function formatEffective(from: string, to: string | null): string {
  const start = dateFormat.format(new Date(from));
  return to ? `${start} to ${dateFormat.format(new Date(to))}` : `from ${start}`;
}

/** One unit of the variant with the tiers (quantity ranges) that currently apply to it. */
export default function PriceTiersCard({
  unit,
  baseUnitName,
  prices,
  editable,
  canCreate,
  canUpdate,
  canDeactivate,
  onAdd,
  onChange,
  onDeactivate,
}: PriceTiersCardProps) {
  const name = unit.unitName ?? "Unknown unit";
  const sorted = [...prices].sort((a, b) => a.minimumQuantity - b.minimumQuantity);

  return (
    <Card padded={false}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">{name}</h3>
          <span className="text-sm text-muted-foreground">
            {unit.isBase ? "base unit" : `1 = ${unit.conversionFactor} ${baseUnitName}`}
          </span>
          {unit.status === "INACTIVE" && <Badge>Inactive</Badge>}
        </div>
        {canCreate && (
          <Button size="sm" variant="secondary" disabled={!editable} onClick={() => onAdd(unit)}>
            Add price
          </Button>
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="px-4 py-6 text-sm text-muted-foreground">No current price for this unit.</p>
      ) : (
        <Table>
          <TableHead>
            <tr>
              <TableHeaderCell>Quantity</TableHeaderCell>
              <TableHeaderCell>Price per unit</TableHeaderCell>
              <TableHeaderCell>Effective</TableHeaderCell>
              <TableHeaderCell className="text-right">
                <span className="sr-only">Actions</span>
              </TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {sorted.map((price) => (
              <TableRow key={price.id}>
                <TableCell className="font-medium">
                  {formatQuantityRange(price.minimumQuantity, price.maximumQuantity)}
                </TableCell>
                <TableCell>{formatFcfa(price.amount)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {formatEffective(price.effectiveFrom, price.effectiveTo)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {canUpdate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={!editable}
                        onClick={() => onChange(price)}
                        aria-label={`Change the ${name} price for quantity ${formatQuantityRange(price.minimumQuantity, price.maximumQuantity)}`}
                      >
                        Change
                      </Button>
                    )}
                    {canDeactivate && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeactivate(price)}
                        aria-label={`Deactivate the ${name} price for quantity ${formatQuantityRange(price.minimumQuantity, price.maximumQuantity)}`}
                      >
                        Deactivate
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}