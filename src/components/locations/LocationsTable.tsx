"use client";

/**
 * Locations, sized to the space available (see ResponsiveTable):
 *   narrow  cards: name, code and type, address, status; Edit / (De)activate under it
 *   @2xl    Name, Status, actions (code and type under the name)
 *   @3xl    + Address
 *   @4xl    + Code and Type columns
 * Long names and addresses are cut with "..." (full text on hover).
 */

import Link from "next/link";
import type { ReactNode } from "react";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import {
  CardList,
  CardMessage,
  CardSkeleton,
  HIDE_FROM,
  MobileCard,
  ResponsiveTable,
  SHOW_FROM,
  SkeletonRows,
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
import type { Location, LocationStatus, LocationType } from "@/types/business/location";

export type LocationSortKey = "name" | "code";
export type LocationSortState = { key: LocationSortKey; direction: SortDirection };

/** What the current user is allowed to do. Controls are hidden when an action is not allowed. */
export type LocationAbilities = {
  update: boolean;
  activate: boolean;
  deactivate: boolean;
};

type LocationsTableProps = {
  locations: Location[];
  loading: boolean;
  error: string | null;
  /** True when a search term or type filter is active (changes the empty message). */
  filtered: boolean;
  sort: LocationSortState;
  abilities: LocationAbilities;
  /** Id of the location whose status is being changed, to disable its button. */
  busyId: string | null;
  onSort: (key: LocationSortKey) => void;
  onRetry: () => void;
  onEdit: (location: Location) => void;
  onToggleStatus: (location: Location) => void;
};

const COL = {
  code: SHOW_FROM["4xl"],
  type: SHOW_FROM["4xl"],
  address: SHOW_FROM["3xl"],
};

/** One class per column, in header order. */
const CELLS = ["", COL.code, COL.type, COL.address, "", ""] as const;

const TYPE_LABELS: Record<LocationType, string> = {
  WAREHOUSE: "Warehouse",
  STORE: "Store",
};

const STATUS: Record<LocationStatus, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "neutral" },
};

const locationHref = (location: Location) => `/business/locations/${location.id}`;

function MessageRow({ children }: { children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={CELLS.length} className="py-12 text-center">
        {children}
      </TableCell>
    </TableRow>
  );
}

export default function LocationsTable({
  locations,
  loading,
  error,
  filtered,
  sort,
  abilities,
  busyId,
  onSort,
  onRetry,
  onEdit,
  onToggleStatus,
}: LocationsTableProps) {
  const directionFor = (key: LocationSortKey) => (sort.key === key ? sort.direction : null);

  const emptyTitle = filtered ? "No locations match your search" : "No locations yet";
  const emptyHint = filtered
    ? "Try a different name, code or type."
    : "Use New location to add the first warehouse or store.";

  /** Edit and Activate / Deactivate, shared by the table and the cards. */
  function manageButtons(location: Location) {
    const isActive = location.status === "ACTIVE";
    const canToggle = isActive ? abilities.deactivate : abilities.activate;
    return (
      <>
        {abilities.update && (
          <Button variant="ghost" size="sm" onClick={() => onEdit(location)} aria-label={`Edit ${location.name}`}>
            Edit
          </Button>
        )}
        {canToggle && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busyId === location.id}
            onClick={() => onToggleStatus(location)}
            aria-label={`${isActive ? "Deactivate" : "Activate"} ${location.name}`}
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
  ) : locations.length === 0 ? (
    <CardMessage title={emptyTitle} hint={emptyHint} />
  ) : (
    <CardList>
      {locations.map((location) => {
        const status = STATUS[location.status];
        return (
          <MobileCard
            key={location.id}
            href={locationHref(location)}
            title={location.name}
            subtitle={
              <>
                <p className="truncate">
                  {location.code} · {TYPE_LABELS[location.type]}
                </p>
                {location.address && <p className="truncate">{location.address}</p>}
              </>
            }
            aside={<Badge variant={status.variant}>{status.label}</Badge>}
            actions={hasManageButtons ? manageButtons(location) : undefined}
          />
        );
      })}
    </CardList>
  );

  const table = (
    <Table aria-busy={loading || undefined}>
      <TableHead>
        <tr>
          <TableHeaderCell onSort={() => onSort("name")} sortDirection={directionFor("name")}>
            Name
          </TableHeaderCell>
          <TableHeaderCell className={COL.code} onSort={() => onSort("code")} sortDirection={directionFor("code")}>
            Code
          </TableHeaderCell>
          <TableHeaderCell className={COL.type}>Type</TableHeaderCell>
          <TableHeaderCell className={COL.address}>Address</TableHeaderCell>
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
        ) : locations.length === 0 ? (
          <MessageRow>
            <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{emptyHint}</p>
          </MessageRow>
        ) : (
          locations.map((location) => {
            const status = STATUS[location.status];
            return (
              <TableRow key={location.id}>
                <TableCell>
                  <div className="max-w-48 @5xl:max-w-64">
                    <Link
                      href={locationHref(location)}
                      title={location.name}
                      className="block truncate font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      {location.name}
                    </Link>
                    <p className={cn("truncate text-xs text-muted-foreground", HIDE_FROM["4xl"])}>
                      {location.code} · {TYPE_LABELS[location.type]}
                    </p>
                  </div>
                </TableCell>
                <TableCell className={cn(COL.code, "whitespace-nowrap text-muted-foreground")}>
                  {location.code}
                </TableCell>
                <TableCell className={COL.type}>
                  <Badge>{TYPE_LABELS[location.type]}</Badge>
                </TableCell>
                <TableCell className={cn(COL.address, "text-muted-foreground")}>
                  <span className="block max-w-56 truncate @5xl:max-w-xs" title={location.address ?? undefined}>
                    {location.address ?? "—"}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="px-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={locationHref(location)}
                      aria-label={`View ${location.name}`}
                      className="inline-flex items-center justify-center border border-transparent px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      View
                    </Link>
                    {manageButtons(location)}
                  </div>
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );

  return <ResponsiveTable cards={cards} table={table} />;
}