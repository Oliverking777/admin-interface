"use client";

/**
 * Stock rows, sized to the space available (see ResponsiveTable):
 *   narrow  cards: name, code and location, quantity and status
 *   @2xl    Product, Location, On hand, Status (category under the code)
 *   @4xl    + Updated
 *   @5xl    + Category and Alert level columns
 */

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  CardList,
  CardMessage,
  HIDE_FROM,
  MobileCard,
  ResponsiveTable,
  SHOW_FROM,
} from "@/components/ui/ResponsiveTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  type SortDirection,
} from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import { formatBreakdown, formatDateTime, formatQuantity } from "@/lib/inventory/stock-format";
import { STATUS_LABEL, STATUS_VARIANT } from "@/lib/inventory/stock-status";
import type { StockRow } from "@/types/inventory/stock-row";

export type StockSortKey = "product" | "location" | "quantity" | "status" | "updatedAt";
export type StockSort = { key: StockSortKey; direction: SortDirection };

type StockTableProps = {
  /** The rows of the current page. */
  rows: StockRow[];
  sort: StockSort;
  onSort: (key: StockSortKey) => void;
  onViewHistory: (row: StockRow) => void;
  loading: boolean;
};

const COLUMN_COUNT = 8;

const COL = {
  category: SHOW_FROM["5xl"],
  alert: SHOW_FROM["5xl"],
  updated: SHOW_FROM["4xl"],
};

function directionOf(sort: StockSort, key: StockSortKey): SortDirection | null {
  return sort.key === key ? sort.direction : null;
}

const QUANTITY_TONE = {
  IN_STOCK: "text-foreground",
  LOW_STOCK: "text-amber-700 dark:text-amber-300",
  OUT_OF_STOCK: "text-red-600",
} as const;

const ROW_TONE = {
  IN_STOCK: "",
  LOW_STOCK: "bg-amber-500/5",
  OUT_OF_STOCK: "bg-red-600/5",
} as const;

function Thumbnail({ url }: { url: string | null | undefined }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-8 w-8 shrink-0 border border-border object-cover" />
  ) : (
    <span className="h-8 w-8 shrink-0 border border-border bg-muted/40" aria-hidden="true" />
  );
}

const historyLabel = (row: StockRow) => `View stock history of ${row.productName} at ${row.locationName}`;

export default function StockTable({ rows, sort, onSort, onViewHistory, loading }: StockTableProps) {
  const emptyMessage = loading ? "Loading stock..." : "No stock matches these filters.";

  const cards =
    rows.length === 0 ? (
      <CardMessage title={emptyMessage} />
    ) : (
      <CardList>
        {rows.map((row) => (
          <MobileCard
            key={row.key}
            className={ROW_TONE[row.status]}
            onOpen={() => onViewHistory(row)}
            openLabel={historyLabel(row)}
            leading={<Thumbnail url={row.imageUrl} />}
            title={row.productName}
            subtitle={
              <p className="truncate">
                {row.productCode} · {row.locationName}
              </p>
            }
            aside={
              <>
                <p className={cn("text-sm font-semibold tabular-nums", QUANTITY_TONE[row.status])}>
                  {formatQuantity(row.quantity, row.units)}
                </p>
                <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
              </>
            }
          />
        ))}
      </CardList>
    );

  const table = (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell sortDirection={directionOf(sort, "product")} onSort={() => onSort("product")}>
            Product
          </TableHeaderCell>
          <TableHeaderCell className={COL.category}>Category</TableHeaderCell>
          <TableHeaderCell sortDirection={directionOf(sort, "location")} onSort={() => onSort("location")}>
            Location
          </TableHeaderCell>
          <TableHeaderCell
            className="whitespace-nowrap"
            sortDirection={directionOf(sort, "quantity")}
            onSort={() => onSort("quantity")}
          >
            On hand
          </TableHeaderCell>
          <TableHeaderCell className={cn(COL.alert, "whitespace-nowrap")}>Alert level</TableHeaderCell>
          <TableHeaderCell sortDirection={directionOf(sort, "status")} onSort={() => onSort("status")}>
            Status
          </TableHeaderCell>
          <TableHeaderCell
            className={COL.updated}
            sortDirection={directionOf(sort, "updatedAt")}
            onSort={() => onSort("updatedAt")}
          >
            Updated
          </TableHeaderCell>
          <TableHeaderCell className="text-right">
            <span className="sr-only">Actions</span>
          </TableHeaderCell>
        </tr>
      </TableHead>

      <TableBody>
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-muted-foreground">
              {emptyMessage}
            </TableCell>
          </TableRow>
        )}

        {rows.map((row) => {
          const breakdown = formatBreakdown(row.quantity, row.units);
          return (
            <TableRow key={row.key} className={ROW_TONE[row.status]}>
              <TableCell>
                <div className="flex max-w-52 items-center gap-3 @4xl:max-w-64 @6xl:max-w-80">
                  <Thumbnail url={row.imageUrl} />
                  <div className="min-w-0">
                    <p className="truncate font-medium" title={row.productName}>
                      {row.productName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.productCode}
                      {row.categoryName && <span className={HIDE_FROM["5xl"]}> · {row.categoryName}</span>}
                    </p>
                  </div>
                </div>
              </TableCell>

              <TableCell className={cn(COL.category, "text-muted-foreground")}>{row.categoryName ?? "—"}</TableCell>

              <TableCell>{row.locationName}</TableCell>

              <TableCell>
                <p className={cn("whitespace-nowrap font-semibold tabular-nums", QUANTITY_TONE[row.status])}>
                  {formatQuantity(row.quantity, row.units)}
                </p>
                {breakdown && <p className="text-xs text-muted-foreground">{breakdown}</p>}
              </TableCell>

              <TableCell className={cn(COL.alert, "whitespace-nowrap tabular-nums text-muted-foreground")}>
                {row.lowStockThreshold === null ? "—" : formatQuantity(row.lowStockThreshold, row.units)}
              </TableCell>

              <TableCell>
                <Badge variant={STATUS_VARIANT[row.status]}>{STATUS_LABEL[row.status]}</Badge>
              </TableCell>

              <TableCell className={cn(COL.updated, "whitespace-nowrap text-muted-foreground")}>
                {formatDateTime(row.updatedAt)}
              </TableCell>

              <TableCell className="text-right">
                <Button variant="ghost" size="sm" onClick={() => onViewHistory(row)} aria-label={historyLabel(row)}>
                  History
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return <ResponsiveTable cards={cards} table={table} />;
}