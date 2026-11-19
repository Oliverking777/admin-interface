"use client";

import { useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Pagination from "@/components/ui/Pagination";
import Select from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { formatEffective } from "@/components/product/pricing/PriceTiersCard";
import { usePriceHistory } from "@/hooks/product/use-price";
import { getErrorMessage } from "@/lib/api/api-error";
import { formatFcfa, formatQuantityRange } from "@/types/product/price";
import type { VariantUnit } from "@/types/product/product";

type PriceHistoryPanelProps = {
  /** The variant whose history is shown. Key the panel by it, so switching variants goes back to page 1. */
  variantId: string;
  units: VariantUnit[];
};

const PAGE_SIZE = 20;
const COLUMNS = 5;

/** Read-only: history is never rewritten, a change closes a row and adds a new one. */
export default function PriceHistoryPanel({ variantId, units }: PriceHistoryPanelProps) {
  const [unitId, setUnitId] = useState("");
  const [page, setPage] = useState(0);

  const query = usePriceHistory(variantId, { page, size: PAGE_SIZE, unitId: unitId || undefined });
  const data = query.data;
  const unitName = (id: string) => units.find((u) => u.unitId === id)?.unitName ?? "Unknown unit";

  return (
    <div className="flex flex-col gap-3">
      <div className="max-w-xs">
        <Select
          aria-label="Filter by unit"
          value={unitId}
          onChange={(e) => {
            setUnitId(e.target.value);
            setPage(0);
          }}
        >
          <option value="">All units</option>
          {units.map((u) => (
            <option key={u.unitId} value={u.unitId}>
              {u.unitName ?? "Unknown unit"}
            </option>
          ))}
        </Select>
      </div>

      <Card padded={false}>
        <Table aria-busy={query.isLoading || undefined}>
          <TableHead>
            <tr>
              <TableHeaderCell>Unit</TableHeaderCell>
              <TableHeaderCell>Quantity</TableHeaderCell>
              <TableHeaderCell>Price per unit</TableHeaderCell>
              <TableHeaderCell>Effective</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </tr>
          </TableHead>
          <TableBody>
            {query.isLoading ? (
              Array.from({ length: 4 }, (_, i) => (
                <TableRow key={i} className="hover:bg-transparent">
                  {Array.from({ length: COLUMNS }, (_, j) => (
                    <TableCell key={j}>
                      <div className="h-4 w-20 animate-pulse bg-muted motion-reduce:animate-none" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : query.isError ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={COLUMNS} className="py-12 text-center">
                  <p role="alert" className="text-sm text-foreground">
                    {getErrorMessage(query.error, "Could not load the history.")}
                  </p>
                  <Button variant="secondary" size="sm" className="mt-3" onClick={() => void query.refetch()}>
                    Try again
                  </Button>
                </TableCell>
              </TableRow>
            ) : !data || data.content.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={COLUMNS} className="py-12 text-center text-sm text-muted-foreground">
                  No price has been set yet.
                </TableCell>
              </TableRow>
            ) : (
              data.content.map((price) => (
                <TableRow key={price.id}>
                  <TableCell>{unitName(price.unitId)}</TableCell>
                  <TableCell>{formatQuantityRange(price.minimumQuantity, price.maximumQuantity)}</TableCell>
                  <TableCell>{formatFcfa(price.amount)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatEffective(price.effectiveFrom, price.effectiveTo)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={price.status === "ACTIVE" ? "success" : "neutral"}>
                      {price.status === "ACTIVE" ? "Active" : "Closed"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {data && (
          <Pagination
            page={page}
            totalPages={data.totalPages}
            totalElements={data.totalElements}
            noun="price rows"
            onPageChange={setPage}
            disabled={query.isFetching}
          />
        )}
      </Card>
    </div>
  );
}