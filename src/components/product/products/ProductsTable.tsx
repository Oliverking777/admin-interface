"use client";

/**
 * Products, sized to the space available (see ResponsiveTable):
 *   narrow  cards: image, name, code and variant count, status; Edit / (De)activate under it
 *   @2xl    Product, Status, actions (code under the name)
 *   @3xl    + Code and Variants columns (a simple product, sold in one form, shows "-")
 * Long names are cut with "..." (full name on hover).
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
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { cn } from "@/lib/cn";
import type { Product, ProductStatus } from "@/types/product/product";

/** What the current user is allowed to do. Controls are hidden when an action is not allowed. */
export type ProductAbilities = {
  update: boolean;
  activate: boolean;
  deactivate: boolean;
};

type ProductsTableProps = {
  products: Product[];
  loading: boolean;
  error: string | null;
  /** True when a search term or status filter is active (changes the empty message). */
  filtered: boolean;
  abilities: ProductAbilities;
  /** Id of the product whose status is being changed, to disable its button. */
  busyId: string | null;
  onRetry: () => void;
  onEdit: (product: Product) => void;
  onToggleStatus: (product: Product) => void;
};

const COL = {
  code: SHOW_FROM["3xl"],
  variants: SHOW_FROM["3xl"],
};

/** One class per column, in header order. */
const CELLS = ["", COL.code, COL.variants, "", ""] as const;

const STATUS: Record<ProductStatus, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: "Active", variant: "success" },
  INACTIVE: { label: "Inactive", variant: "neutral" },
};

const productHref = (product: Product) => `/product/products/${product.id}`;

const variantCount = (n: number) => `${n} ${n === 1 ? "variant" : "variants"}`;

function Thumbnail({ url }: { url: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className="h-8 w-8 shrink-0 border border-border bg-muted object-cover" />;
}

function MessageRow({ children }: { children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={CELLS.length} className="py-12 text-center">
        {children}
      </TableCell>
    </TableRow>
  );
}

export default function ProductsTable({
  products,
  loading,
  error,
  filtered,
  abilities,
  busyId,
  onRetry,
  onEdit,
  onToggleStatus,
}: ProductsTableProps) {
  const emptyTitle = filtered ? "No products match your search" : "No products yet";
  const emptyHint = filtered ? "Try a different name, code or status." : "Use New product to add the first one.";

  /** Edit and Activate / Deactivate, shared by the table and the cards. */
  function manageButtons(product: Product) {
    const isActive = product.status === "ACTIVE";
    const canToggle = isActive ? abilities.deactivate : abilities.activate;
    return (
      <>
        {abilities.update && (
          <Button variant="ghost" size="sm" onClick={() => onEdit(product)} aria-label={`Edit ${product.name}`}>
            Edit
          </Button>
        )}
        {canToggle && (
          <Button
            variant="ghost"
            size="sm"
            disabled={busyId === product.id}
            onClick={() => onToggleStatus(product)}
            aria-label={`${isActive ? "Deactivate" : "Activate"} ${product.name}`}
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
  ) : products.length === 0 ? (
    <CardMessage title={emptyTitle} hint={emptyHint} />
  ) : (
    <CardList>
      {products.map((product) => {
        const status = STATUS[product.status];
        return (
          <MobileCard
            key={product.id}
            href={productHref(product)}
            leading={<Thumbnail url={product.imageUrl} />}
            title={product.name}
            subtitle={
              <p className="truncate">
                {product.simple ? product.code : `${product.code} · ${variantCount(product.variants.length)}`}
              </p>
            }
            aside={<Badge variant={status.variant}>{status.label}</Badge>}
            actions={hasManageButtons ? manageButtons(product) : undefined}
          />
        );
      })}
    </CardList>
  );

  const table = (
    <Table aria-busy={loading || undefined}>
      <TableHead>
        <tr>
          <TableHeaderCell>Product</TableHeaderCell>
          <TableHeaderCell className={COL.code}>Code</TableHeaderCell>
          <TableHeaderCell className={COL.variants}>Variants</TableHeaderCell>
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
        ) : products.length === 0 ? (
          <MessageRow>
            <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
            <p className="mt-1 text-sm text-muted-foreground">{emptyHint}</p>
          </MessageRow>
        ) : (
          products.map((product) => {
            const status = STATUS[product.status];
            return (
              <TableRow key={product.id}>
                <TableCell>
                  <div className="flex max-w-60 items-center gap-3 @4xl:max-w-80">
                    <Thumbnail url={product.imageUrl} />
                    <div className="min-w-0">
                      <Link
                        href={productHref(product)}
                        title={product.name}
                        className="block truncate font-medium hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                      >
                        {product.name}
                      </Link>
                      <p className={cn("truncate text-xs text-muted-foreground", HIDE_FROM["3xl"])}>
                        {product.code}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell className={cn(COL.code, "whitespace-nowrap text-muted-foreground")}>
                  {product.code}
                </TableCell>
                <TableCell className={cn(COL.variants, "text-muted-foreground")}>
                  {product.simple ? "-" : product.variants.length}
                </TableCell>
                <TableCell>
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Link
                      href={productHref(product)}
                      aria-label={`View ${product.name}`}
                      className="inline-flex items-center justify-center border border-transparent px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      View
                    </Link>
                    {manageButtons(product)}
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