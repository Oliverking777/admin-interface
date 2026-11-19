"use client";

import { useMemo } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { useInTransit } from "@/hooks/inventory/use-transfers";
import { formatNumber } from "@/lib/inventory/stock-format";

type InTransitPanelProps = {
  /** Empty string means every location the user can see. */
  locationId: string;
};

/**
 * Goods that left their source and have not been received yet, per destination and product.
 * Derived from dispatched transfers: it is not a stock balance, and quantities are in base units.
 */
export default function InTransitPanel({ locationId }: InTransitPanelProps) {
  const query = useInTransit({ locationId: locationId || undefined });

  const lines = useMemo(
    () =>
      [...(query.data ?? [])].sort(
        (a, b) =>
          a.destinationLocationName.localeCompare(b.destinationLocationName) ||
          a.productName.localeCompare(b.productName),
      ),
    [query.data],
  );

  if (query.error) {
    return (
      <Card className="flex items-center justify-between gap-3">
        <p role="alert" className="text-sm text-red-600">
          {query.error.message}
        </p>
        <Button variant="secondary" size="sm" onClick={() => void query.refetch()}>
          Try again
        </Button>
      </Card>
    );
  }

  return (
    <Card padded={false}>
      <Table>
        <TableHead>
          <tr>
            <TableHeaderCell>Destination</TableHeaderCell>
            <TableHeaderCell>Product</TableHeaderCell>
            <TableHeaderCell className="text-right">Quantity (base units)</TableHeaderCell>
          </tr>
        </TableHead>
        <TableBody>
          {query.isLoading && (
            <TableRow>
              <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                Loading goods in transit...
              </TableCell>
            </TableRow>
          )}

          {!query.isLoading && lines.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                Nothing is in transit right now.
              </TableCell>
            </TableRow>
          )}

          {lines.map((line) => (
            <TableRow key={`${line.destinationLocationId}:${line.productId}`}>
              <TableCell>{line.destinationLocationName}</TableCell>
              <TableCell className="font-medium">{line.productName}</TableCell>
              <TableCell className="text-right font-semibold tabular-nums">{formatNumber(line.baseQuantity)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}