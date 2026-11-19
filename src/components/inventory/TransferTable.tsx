"use client";

/**
 * Transfer rows, sized to the space available (see ResponsiveTable):
 *   narrow  cards: number, from → to, product count and date, status
 *   @2xl    Transfer, From, To, Status (product count under the number)
 *   @3xl    + Products
 *   @4xl    + Sent
 */

import TransferStatusBadge from "@/components/inventory/TransferStatusBadge";
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
} from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/inventory/stock-format";
import { formatProductCount } from "@/lib/inventory/transfer-format";
import type { Transfer } from "@/types/inventory/transfer";

type TransferTableProps = {
  rows: Transfer[];
  loading: boolean;
  onOpen: (transfer: Transfer) => void;
};

const COLUMN_COUNT = 7;

const COL = {
  products: SHOW_FROM["3xl"],
  created: SHOW_FROM["4xl"],
};

function Place({ name }: { name: string }) {
  return (
    <span className="block max-w-40 truncate @5xl:max-w-56" title={name}>
      {name}
    </span>
  );
}

export default function TransferTable({ rows, loading, onOpen }: TransferTableProps) {
  const emptyMessage = loading ? "Loading transfers..." : "No transfers match these filters.";

  const cards =
    rows.length === 0 ? (
      <CardMessage title={emptyMessage} />
    ) : (
      <CardList>
        {rows.map((transfer) => (
          <MobileCard
            key={transfer.id}
            onOpen={() => onOpen(transfer)}
            openLabel={`View transfer ${transfer.number}`}
            title={transfer.number}
            subtitle={
              <>
                <p className="truncate">
                  {transfer.sourceLocationName} → {transfer.destinationLocationName}
                </p>
                <p className="truncate">
                  {formatProductCount(transfer.items.length)} · {formatDateTime(transfer.createdAt)}
                </p>
              </>
            }
            aside={<TransferStatusBadge transfer={transfer} />}
          />
        ))}
      </CardList>
    );

  const table = (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Transfer</TableHeaderCell>
          <TableHeaderCell>From</TableHeaderCell>
          <TableHeaderCell>To</TableHeaderCell>
          <TableHeaderCell className={COL.products}>Products</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell className={COL.created}>Sent</TableHeaderCell>
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

        {rows.map((transfer) => (
          <TableRow key={transfer.id}>
            <TableCell className="whitespace-nowrap">
              <p className="font-medium">{transfer.number}</p>
              <p className={cn("text-xs text-muted-foreground", HIDE_FROM["3xl"])}>
                {formatProductCount(transfer.items.length)}
              </p>
            </TableCell>
            <TableCell>
              <Place name={transfer.sourceLocationName} />
            </TableCell>
            <TableCell>
              <Place name={transfer.destinationLocationName} />
            </TableCell>
            <TableCell className={cn(COL.products, "whitespace-nowrap text-muted-foreground")}>
              {formatProductCount(transfer.items.length)}
            </TableCell>
            <TableCell>
              <TransferStatusBadge transfer={transfer} />
            </TableCell>
            <TableCell className={cn(COL.created, "whitespace-nowrap text-muted-foreground")}>
              {formatDateTime(transfer.createdAt)}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpen(transfer)}
                aria-label={`View transfer ${transfer.number}`}
              >
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return <ResponsiveTable cards={cards} table={table} />;
}