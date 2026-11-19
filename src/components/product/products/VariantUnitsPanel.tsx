"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { Table, TableBody, TableCell, TableHead, TableHeaderCell, TableRow } from "@/components/ui/Table";
import { useToast } from "@/components/ui/ToastProvider";
import { useAllUnits } from "@/hooks/product/use-unit";
import {
  useAssignUnitToVariant,
  useChangeVariantConversion,
  useDeactivateVariantUnit,
  useRemoveUnitFromVariant,
} from "@/hooks/product/use-variants";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";
import { MIN_CONVERSION_FACTOR, type Product, type ProductVariant, type VariantUnit } from "@/types/product/product";

type VariantUnitsPanelProps = {
  product: Product;
  /** The variant whose units are shown. For a simple product, its only variant. */
  variant: ProductVariant;
  /** Shows the Assign control (needs UNIT_CREATE). */
  canAssign: boolean;
  /** Shows the Edit factor buttons (needs UNIT_UPDATE). */
  canUpdate: boolean;
  /** Shows the Deactivate and Remove buttons (needs UNIT_DEACTIVATE). */
  canDeactivate: boolean;
};

const WHOLE_NUMBER = /^\d+$/;

function parseFactor(text: string): number | null {
  const trimmed = text.trim();
  if (!WHOLE_NUMBER.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= MIN_CONVERSION_FACTOR ? value : null;
}

const nameOf = (unit: VariantUnit | undefined) => unit?.unitName ?? "Unknown unit";

/**
 * The units of one variant: assign units, set how each converts to the variant's base unit, and try conversions.
 * Every variant has its own units: a 50 kg bag and a 25 kg bag of the same rice are two variants, each counted in
 * its own bags.
 */
export default function VariantUnitsPanel({ product, variant, canAssign, canUpdate, canDeactivate }: VariantUnitsPanelProps) {
  const { toast } = useToast();
  const assignId = useId();

  const productActive = product.status === "ACTIVE";
  const units = variant.units;
  const baseUnit = units.find((u) => u.isBase);
  const baseName = baseUnit?.unitName ?? "base units";
  /** "this product" for a simple product, the variant's name otherwise. */
  const owner = variant.name ?? product.name;

  // Active units of the catalog that are not on this variant yet. Needs UNIT_READ (the hook switches itself off without it).
  const unitsQuery = useAllUnits({ status: "ACTIVE" }, { enabled: canAssign && productActive });
  const assignUnit = useAssignUnitToVariant();
  const changeConversion = useChangeVariantConversion();
  const removeUnit = useRemoveUnitFromVariant();
  const deactivateUnit = useDeactivateVariantUnit();

  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [factor, setFactor] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);

  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [factorDraft, setFactorDraft] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const [unitToRemove, setUnitToRemove] = useState<VariantUnit | null>(null);
  const closeConfirm = useCallback(() => setUnitToRemove(null), []);

  // Switching to another variant starts from a clean form.
  useEffect(() => {
    setSelectedUnitId("");
    setFactor("");
    setAssignError(null);
    setEditingUnitId(null);
    setEditError(null);
  }, [variant.id]);

  const candidates = useMemo(() => {
    const assigned = new Set(units.map((u) => u.unitId));
    return (unitsQuery.data ?? []).filter((u) => !assigned.has(u.id));
  }, [unitsQuery.data, units]);

  async function handleAssign() {
    const parsed = parseFactor(factor);
    if (!selectedUnitId) return;
    if (parsed === null) {
      setAssignError(`Enter a whole number of at least ${MIN_CONVERSION_FACTOR}.`);
      return;
    }
    setAssignError(null);
    const unit = candidates.find((u) => u.id === selectedUnitId);
    try {
      await assignUnit.mutateAsync({
        variantId: variant.id,
        request: { unitId: selectedUnitId, conversionFactor: parsed },
      });
      toast({ title: "Unit assigned", description: `${unit?.name ?? "The unit"} was added to ${owner}.` });
      setSelectedUnitId("");
      setFactor("");
    } catch (error) {
      if (isApiError(error) && error.isValidation) {
        setAssignError(error.fieldError("conversionFactor") ?? error.message);
      } else {
        toast({ title: "Could not assign unit", description: getErrorMessage(error), variant: "error" });
      }
    }
  }

  function startEdit(unit: VariantUnit) {
    setEditingUnitId(unit.unitId);
    setFactorDraft(String(unit.conversionFactor));
    setEditError(null);
  }

  async function saveEdit(unit: VariantUnit) {
    const parsed = parseFactor(factorDraft);
    if (parsed === null) {
      setEditError(`Whole number, at least ${MIN_CONVERSION_FACTOR}.`);
      return;
    }
    if (parsed === unit.conversionFactor) {
      setEditingUnitId(null);
      return;
    }
    try {
      await changeConversion.mutateAsync({ variantId: variant.id, unitId: unit.unitId, conversionFactor: parsed });
      toast({ title: "Conversion updated", description: `1 ${nameOf(unit)} now equals ${parsed} ${baseName}.` });
      setEditingUnitId(null);
    } catch (error) {
      setEditError(getErrorMessage(error, "Could not save the factor."));
    }
  }

  async function handleDeactivate(unit: VariantUnit) {
    try {
      await deactivateUnit.mutateAsync({ variantId: variant.id, unitId: unit.unitId });
      toast({ title: "Unit deactivated", description: `${nameOf(unit)} is kept on record but can no longer be used.` });
    } catch (error) {
      toast({ title: "Could not deactivate unit", description: getErrorMessage(error), variant: "error" });
    }
  }

  async function confirmRemove() {
    if (!unitToRemove) return;
    try {
      await removeUnit.mutateAsync({ variantId: variant.id, unitId: unitToRemove.unitId });
      toast({ title: "Unit removed", description: `${nameOf(unitToRemove)} is no longer a unit of ${owner}.` });
      setUnitToRemove(null);
    } catch (error) {
      toast({ title: "Could not remove unit", description: getErrorMessage(error), variant: "error" });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {canAssign && (
        <section aria-label="Assign a unit" className="flex flex-col gap-2">
          {!productActive ? (
            <p className="text-sm text-muted-foreground">Activate this product before assigning units to it.</p>
          ) : (
            <>
              <label htmlFor={assignId} className="text-sm font-medium text-foreground">
                Assign a unit
              </label>
              <div className="flex flex-wrap items-start gap-2">
                <div className="min-w-0 flex-1 sm:max-w-xs">
                  <Select
                    id={assignId}
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    disabled={unitsQuery.isLoading || assignUnit.isPending}
                  >
                    <option value="">{unitsQuery.isLoading ? "Loading units..." : "Select a unit"}</option>
                    {candidates.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.code})
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="w-40">
                  <Input
                    inputMode="numeric"
                    value={factor}
                    onChange={(e) => setFactor(e.target.value)}
                    placeholder={`Base units (${MIN_CONVERSION_FACTOR}+)`}
                    aria-label="Conversion factor"
                    invalid={!!assignError}
                    autoComplete="off"
                  />
                </div>
                <Button onClick={handleAssign} disabled={!selectedUnitId || !factor.trim()} loading={assignUnit.isPending}>
                  Assign
                </Button>
              </div>
              {assignError ? (
                <p role="alert" className="text-sm text-red-600">
                  {assignError}
                </p>
              ) : unitsQuery.isError ? (
                <p role="alert" className="text-sm text-red-600">
                  {getErrorMessage(unitsQuery.error, "Could not load units.")}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  The factor is how many {baseName} make 1 of the new unit, for example 12 for a carton of 12.
                </p>
              )}
            </>
          )}
        </section>
      )}

      <section aria-label={`Units of ${owner}`}>
        <div className="border border-border">
          <Table>
            <TableHead>
              <tr>
                <TableHeaderCell>Unit</TableHeaderCell>
                <TableHeaderCell>Conversion</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
                <TableHeaderCell className="text-right">
                  <span className="sr-only">Actions</span>
                </TableHeaderCell>
              </tr>
            </TableHead>
            <TableBody>
              {units.map((unit) => {
                const editing = editingUnitId === unit.unitId;
                const active = unit.status === "ACTIVE";
                const canEditFactor = canUpdate && productActive && active && !unit.isBase;
                const canRemove = canDeactivate && productActive && !unit.isBase;
                const canDeactivateUnit = canDeactivate && productActive && active;

                return (
                  <TableRow key={unit.id}>
                    <TableCell className="font-medium">
                      {nameOf(unit)} {unit.unitCode && <span className="text-muted-foreground">({unit.unitCode})</span>}
                      {unit.isBase && (
                        <Badge className="ml-2" variant="success">
                          Base
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {unit.isBase ? (
                        <span className="text-muted-foreground">1 (fixed)</span>
                      ) : editing ? (
                        <div className="flex items-center gap-2">
                          <div className="w-24">
                            <Input
                              inputMode="numeric"
                              value={factorDraft}
                              onChange={(e) => setFactorDraft(e.target.value)}
                              aria-label={`Conversion factor of ${nameOf(unit)}`}
                              invalid={!!editError}
                              autoComplete="off"
                            />
                          </div>
                          <span className="text-muted-foreground">{baseName}</span>
                        </div>
                      ) : (
                        <span>
                          1 = {unit.conversionFactor} {baseName}
                        </span>
                      )}
                      {editing && editError && (
                        <p role="alert" className="mt-1 text-sm text-red-600">
                          {editError}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={active ? "success" : "neutral"}>{active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {editing ? (
                          <>
                            <Button size="sm" onClick={() => void saveEdit(unit)} loading={changeConversion.isPending}>
                              Save
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditingUnitId(null)}>
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            {canEditFactor && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(unit)}
                                aria-label={`Edit the factor of ${nameOf(unit)}`}
                              >
                                Edit factor
                              </Button>
                            )}
                            {canDeactivateUnit && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={deactivateUnit.isPending}
                                onClick={() => void handleDeactivate(unit)}
                                aria-label={`Deactivate ${nameOf(unit)} on ${owner}`}
                              >
                                Deactivate
                              </Button>
                            )}
                            {canRemove && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setUnitToRemove(unit)}
                                aria-label={`Remove ${nameOf(unit)} from ${owner}`}
                              >
                                Remove
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      <Converter key={variant.id} units={units} />

      <ConfirmDialog
        open={unitToRemove !== null}
        onClose={closeConfirm}
        onConfirm={confirmRemove}
        title="Remove this unit?"
        description={
          unitToRemove
            ? `${nameOf(unitToRemove)} will no longer be a unit of ${owner}. Use Deactivate instead to keep it on record.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        loading={removeUnit.isPending}
      />
    </div>
  );
}

/** Quick conversion between two units of the variant, using their factors (1 for the base unit). */
function Converter({ units }: { units: VariantUnit[] }) {
  const active = units.filter((u) => u.status === "ACTIVE");
  const [quantity, setQuantity] = useState("1");
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");

  const from = active.find((u) => u.unitId === fromId);
  const to = active.find((u) => u.unitId === toId);
  const qty = WHOLE_NUMBER.test(quantity.trim()) ? Number(quantity.trim()) : null;

  let result: string | null = null;
  if (from && to && qty !== null) {
    const baseTotal = qty * from.conversionFactor;
    result =
      baseTotal % to.conversionFactor === 0
        ? `${qty} ${nameOf(from)} = ${baseTotal / to.conversionFactor} ${nameOf(to)}`
        : `${qty} ${nameOf(from)} is not a whole number of ${nameOf(to)}`;
  }

  return (
    <section aria-label="Converter" className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-foreground">Converter</h3>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-24">
          <Input
            inputMode="numeric"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-label="Quantity to convert"
            invalid={quantity.trim() !== "" && qty === null}
            autoComplete="off"
          />
        </div>
        <Select aria-label="From unit" value={fromId} onChange={(e) => setFromId(e.target.value)}>
          <option value="">From</option>
          {active.map((u) => (
            <option key={u.unitId} value={u.unitId}>
              {nameOf(u)}
            </option>
          ))}
        </Select>
        <span className="text-sm text-muted-foreground">to</span>
        <Select aria-label="To unit" value={toId} onChange={(e) => setToId(e.target.value)}>
          <option value="">To</option>
          {active.map((u) => (
            <option key={u.unitId} value={u.unitId}>
              {nameOf(u)}
            </option>
          ))}
        </Select>
      </div>
      <p aria-live="polite" className="text-sm text-foreground">
        {result ?? <span className="text-muted-foreground">Choose two units and a whole quantity.</span>}
      </p>
    </section>
  );
}