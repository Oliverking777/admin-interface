"use client";

/**
 * Units of measure. The table is small, so it stays a table down to 32rem of room and only
 * then becomes cards (name, code, status; Rename / (De)activate under it).
 */

import type { ReactNode } from "react";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  CardList,
  CardMessage,
  CardSkeleton,
  MobileCard,
  ResponsiveTable,
  SkeletonRows,
} from "@/components/ui/ResponsiveTable";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import type { Unit, UnitStatus } from "@/types/product/unit";

/** What the current user is allowed to do. Controls are hidden when an action is not allowed. */
export type UnitAbilities = {
  update: boolean;
  activate: boolean;
  deactivate: boolean;
};

type UnitsTableProps = {
  units: Unit[];
  loading: boolean;
  error: string | null;
  /** True when a status filter is active (changes the empty message). */
  filtered: boolean;
  abilities: UnitAbilities;
  /** Id of the unit whose status is being changed, to disable its button. */
  busyId: string | null;
  onRetry: () => void;
  onEdit: (unit: Unit) => void;
  onToggleStatus: (unit: Unit) => void;
};

/** One class per column, in header order. */
const CELLS = ["", "", "", ""] as const;

const STATUS: Record<UnitStatus, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "neutral" },
};

function MessageRow({ children }: { children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={CELLS.length} className="py-12 text-center">
        {children}
      </TableCell>
    </TableRow>
  );
}

export default function UnitsTable({
  units,
  loading,
  error,
  filtered,
  abilities,
  busyId,
  onRetry,
  onEdit,
  onToggleStatus,
}: UnitsTableProps) {
  const emptyTitle = filtered ? "No units match this filter" : "No units yet";
  const emptyHint = filtered
    ? "Try another status."
    : "Use New unit to add the first unit of measure, for example Piece or Carton.";

  /** Rename and Activate / Deactivate, shared by the table and the cards. */
  function manageButtons(unit: Unit) {
    const isActive = unit.status === "ACTIVE";
    const canToggle = isActive ? abilities.deactivate : abilities.activate;
    return (
      <>
        {abilities.update && (
          <Button variant="ghost" size="sm" onClick={() => onEdit(unit)} aria-label={`Rename ${unit.name}`}>
            Rename
          </Button>
        )}
        {canToggle && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busyId === unit.id}
            onClick={() => onToggleStatus(unit)}
            aria-label={`${isActive ? "Deactivate" : "Activate"} ${unit.name}`}
          >
            {isActive ? "Deactivate" : "Activate"}
          </Button>
        )}
      </>
    );
  }

  const hasManageButtons = abilities.update || abilities.activate || abilities.deactivate;

  const cards = loading ? (
    <CardSkeleton />
  ) : error ? (
    <CardMessage title={error} alert onRetry={onRetry} />
  ) : units.length === 0 ? (
    <CardMessage title={emptyTitle} hint={emptyHint} />
  ) : (
    <CardList>
      {units.map((unit) => {
        const status = STATUS[unit.status];
        return (
          <MobileCard
            key={unit.id}
            title={unit.name}
            subtitle={<p className="truncate">{unit.code}</p>}
            aside={<Badge variant={status.variant}>{status.label}</Badge>}
            actions={hasManageButtons ? manageButtons(unit) : undefined}
          />
        );
      })}
    </CardList>
  );

  const table = (
    <Table aria-busy={loading || undefined}>
      <TableHead>
        <tr>
          <TableHeaderCell>Code</TableHeaderCell>
          <TableHeaderCell>Name</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell className="text-right">
            <span className="sr-only">Actions</span>
          </TableHeaderCell>
        </tr>
      </TableHead>

      <TableBody>
        {loading ? (
          <SkeletonRows cells={CELLS} />
        ) : error ? (
          <MessageRow>
            <p role="alert" className="text-sm text-foreground">
              {error}
            </p>
            <Button variant="secondary" size="sm" onClick={onRetry} className="mt-3">
              Try again
            </Button>
          </MessageRow>
        ) : units.length === 0 ? (
          <MessageRow>
            <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{emptyHint}</p>
          </MessageRow>
        ) : (
          units.map((unit) => {
            const status = STATUS[unit.status];
            return (
              <TableRow key={unit.id}>
                <TableCell className="whitespace-nowrap font-medium">{unit.code}</TableCell>
                <TableCell>
                  <span className="block max-w-56 truncate" title={unit.name}>
                    {unit.name}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">{manageButtons(unit)}</div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  return <ResponsiveTable cards={cards} table={table} switchAt="lg" />;
}