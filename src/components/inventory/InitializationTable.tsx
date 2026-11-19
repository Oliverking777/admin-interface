"use client";

import InitializationStatusBadge from "@/components/inventory/InitializationStatusBadge";
import Button from "@/components/ui/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { formatProductCount } from "@/lib/inventory/initialization-format";
import { formatDateTime } from "@/lib/inventory/stock-format";
import type { StockInitialization } from "@/types/inventory/inventory";

type InitializationTableProps = {
  rows: StockInitialization[];
  loading: boolean;
  onOpen: (initialization: StockInitialization) => void;
};

const COLUMN_COUNT = 6;

export default function InitializationTable({ rows, loading, onOpen }: InitializationTableProps) {
  return (
    <Table>
      <TableHead>
        <tr>
          <TableHeaderCell>Initialization</TableHeaderCell>
          <TableHeaderCell>Location</TableHeaderCell>
          <TableHeaderCell>Products</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell>Date</TableHeaderCell>
          <TableHeaderCell className="text-right">
            <span className="sr-only">Actions</span>
          </TableHeaderCell>
        </tr>
      </TableHead>

      <TableBody>
        {loading && rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-muted-foreground">
              Loading initializations...
            </TableCell>
          </TableRow>
        )}

        {!loading && rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={COLUMN_COUNT} className="py-10 text-center text-muted-foreground">
              No stock has been initialized yet.
            </TableCell>
          </TableRow>
        )}

        {rows.map((initialization) => (
          <TableRow key={initialization.id}>
            <TableCell className="font-medium">{initialization.number}</TableCell>
            <TableCell>{initialization.locationName ?? "—"}</TableCell>
            <TableCell className="text-muted-foreground">{formatProductCount(initialization.items.length)}</TableCell>
            <TableCell>
              <InitializationStatusBadge status={initialization.status} />
            </TableCell>
            <TableCell className="whitespace-nowrap text-muted-foreground">
              {formatDateTime(initialization.completedAt ?? initialization.createdAt)}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpen(initialization)}
                aria-label={`View initialization ${initialization.number}`}
              >
                View
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
