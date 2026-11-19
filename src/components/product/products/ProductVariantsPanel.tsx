"use client";

/**
 * The variants of a product and the units of each, for the product page.
 *
 *   simple product   its units, as before, with Add a variant
 *   with variants    one row per variant (name, SKU, base unit, status); the chosen one's units below
 *
 * A simple product becomes a product with variants the first time a variant is added (see VariantModal), which
 * also takes the new variant's units and prices.
 */

import { useCallback, useState } from "react";
import VariantModal from "@/components/product/products/VariantModal";
import VariantUnitsPanel from "@/components/product/products/VariantUnitsPanel";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { useToast } from "@/components/ui/ToastProvider";
import { useActivateVariant, useDeactivateVariant } from "@/hooks/product/use-variants";
import { getErrorMessage } from "@/lib/api/api-error";
import { cn } from "@/lib/cn";
import { firstVariant, type Product, type ProductVariant } from "@/types/product/product";

export type VariantAbilities = {
  /** PRODUCT_UPDATE: add, rename, activate and deactivate variants. */
  update: boolean;
  /** PRICE_RULE_CREATE: set the prices of a variant while adding it. */
  setPrices: boolean;
  /** UNIT_CREATE, UNIT_UPDATE and UNIT_DEACTIVATE: the unit controls. */
  assignUnits: boolean;
  updateUnits: boolean;
  deactivateUnits: boolean;
};

type ProductVariantsPanelProps = {
  product: Product;
  abilities: VariantAbilities;
};

type DialogState = { variant: ProductVariant | null } | null;

const baseUnitName = (variant: ProductVariant) => variant.units.find((u) => u.isBase)?.unitName ?? "-";

export default function ProductVariantsPanel({ product, abilities }: ProductVariantsPanelProps) {
  const { toast } = useToast();
  const activateVariant = useActivateVariant();
  const deactivateVariant = useDeactivateVariant();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [toDeactivate, setToDeactivate] = useState<ProductVariant | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  const closeDialog = useCallback(() => setDialog(null), []);
  const closeConfirm = useCallback(() => setToDeactivate(null), []);

  const productActive = product.status === "ACTIVE";
  // The last active variant of an active product cannot be deactivated: the product is deactivated instead.
  const lastActive = productActive && product.variants.filter((v) => v.status === "ACTIVE").length === 1;
  const selected = product.variants.find((v) => v.id === selectedId) ?? firstVariant(product);
  const unitProps = {
    product,
    canAssign: abilities.assignUnits,
    canUpdate: abilities.updateUnits,
    canDeactivate: abilities.deactivateUnits,
  };

  async function handleActivate(variant: ProductVariant) {
    setActivatingId(variant.id);
    try {
      await activateVariant.mutateAsync(variant.id);
      toast({ title: "Variant activated", description: `${variant.name} can be used again.` });
    } catch (error) {
      toast({ title: "Could not activate the variant", description: getErrorMessage(error), variant: "error" });
    } finally {
      setActivatingId(null);
    }
  }

  async function confirmDeactivate() {
    if (!toDeactivate) return;
    try {
      await deactivateVariant.mutateAsync(toDeactivate.id);
      toast({ title: "Variant deactivated", description: `${toDeactivate.name} can no longer be bought or sold.` });
      setToDeactivate(null);
    } catch (error) {
      toast({ title: "Could not deactivate the variant", description: getErrorMessage(error), variant: "error" });
    }
  }

  const addButton = abilities.update && productActive && (
    <Button variant="secondary" size="sm" onClick={() => setDialog({ variant: null })}>
      Add a variant
    </Button>
  );

  return (
    <>
      {product.simple ? (
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground">Units</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Sold in one form. Add a variant if it comes in several, for example 50 kg and 25 kg.
              </p>
            </div>
            {addButton}
          </div>
          <VariantUnitsPanel {...unitProps} variant={selected} />
        </Card>
      ) : (
        <>
          <Card padded={false}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="text-lg font-semibold text-foreground">Variants</h2>
              {addButton}
            </div>
            <Table>
              <TableHead>
                <tr>
                  <TableHeaderCell>Variant</TableHeaderCell>
                  <TableHeaderCell className="hidden sm:table-cell">Base unit</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell className="text-right">
                    <span className="sr-only">Actions</span>
                  </TableHeaderCell>
                </tr>
              </TableHead>
              <TableBody>
                {product.variants.map((variant) => {
                  const active = variant.status === "ACTIVE";
                  const isSelected = variant.id === selected.id;
                  return (
                    <TableRow key={variant.id} className={cn(isSelected && "bg-accent/60")}>
                      <TableCell>
                        <p className="max-w-64 truncate font-medium" title={variant.name ?? undefined}>
                          {variant.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{variant.sku}</p>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{baseUnitName(variant)}</TableCell>
                      <TableCell>
                        <Badge variant={active ? "success" : "neutral"}>{active ? "Active" : "Inactive"}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            aria-pressed={isSelected}
                            onClick={() => setSelectedId(variant.id)}
                            aria-label={`Show the units of ${variant.name}`}
                          >
                            Units
                          </Button>
                          {abilities.update && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDialog({ variant })}
                              aria-label={`Rename ${variant.name}`}
                            >
                              Rename
                            </Button>
                          )}
                          {abilities.update &&
                            !(active && lastActive) &&
                            (active ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setToDeactivate(variant)}
                                aria-label={`Deactivate ${variant.name}`}
                              >
                                Deactivate
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={activatingId === variant.id}
                                onClick={() => void handleActivate(variant)}
                                aria-label={`Activate ${variant.name}`}
                              >
                                Activate
                              </Button>
                            ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <Card className="flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">Units of {selected.name}</h2>
              {selected.status === "INACTIVE" && <Badge>Inactive</Badge>}
            </div>
            <VariantUnitsPanel {...unitProps} variant={selected} />
          </Card>
        </>
      )}

      <VariantModal
        open={dialog !== null}
        onClose={closeDialog}
        product={product}
        variant={dialog?.variant ?? null}
        canSetPrices={abilities.setPrices}
      />

      <ConfirmDialog
        open={toDeactivate !== null}
        onClose={closeConfirm}
        onConfirm={confirmDeactivate}
        title="Deactivate this variant?"
        description={
          toDeactivate
            ? `${toDeactivate.name} can no longer be bought, sold or transferred. Its stock, prices and history are kept, and you can activate it again at any time.`
            : undefined
        }
        confirmLabel="Deactivate"
        destructive
        loading={deactivateVariant.isPending}
      />
    </>
  );
}