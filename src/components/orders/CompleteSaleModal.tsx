"use client";

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";

import Button from "@/components/ui/Button";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import Select from "@/components/ui/Select";
import { PAYMENT_METHOD_LABEL, formatFcfa, shortId } from "@/components/orders/order-display";
import type { OrderLookups } from "@/hooks/order/use-order-lookups";
import { getErrorMessage } from "@/lib/api/api-error";
import {
  SALE_MAX_PAYMENTS,
  SALE_PAYMENT_REFERENCE_MAX_LENGTH,
  isFullyPriced,
  type Order,
  type SaleReceipt,
  type SalesPaymentMethod,
} from "@/types/order/order";
import type { CompleteSaleRequest } from "@/types/order/order-dto";

type PaymentRow = { key: string; method: SalesPaymentMethod; amount: string; reference: string };

type CompleteSaleModalProps = {
  /** The PENDING order to complete; null closes the modal. */
  order: Order | null;
  lookups: OrderLookups;
  /** Must be a stable function (useCallback). */
  onClose: () => void;
  /** Should reject on failure (the error is shown here). Resolves with the receipt. */
  onSubmit: (request: CompleteSaleRequest) => Promise<SaleReceipt>;
};

const toWhole = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value.trim()) : NaN);
const newRow = (method: SalesPaymentMethod, amount: number | ""): PaymentRow => ({
  key: crypto.randomUUID(),
  method,
  amount: amount === "" ? "" : String(amount),
  reference: "",
});

/**
 * The manager completes a PENDING order: optionally the price per unit agreed with the customer on each line
 * (sent to the backend as an ordinary discount), then what the customer pays now.
 * Only the amount kept is recorded (no change). If payments cover less than the total, an approved credit is needed.
 * The server prices the order again with today's price, then deducts stock, settles and issues the receipt.
 */
export default function CompleteSaleModal({ order, lookups, onClose, onSubmit }: CompleteSaleModalProps) {
  const formId = useId();
  /** Agreed selling price per unit, by line id, as typed. Empty means the list price. */
  const [agreedPrices, setAgreedPrices] = useState<Record<string, string>>({});
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [paymentsTouched, setPaymentsTouched] = useState(false);
  const [creditApprovalId, setCreditApprovalId] = useState("");
  const [error, setError] = useState<string>();
  const [submitting, setSubmitting] = useState(false);

  // Reset for every order opened.
  useEffect(() => {
    setAgreedPrices({});
    setPayments(order && order.totalAmount > 0 ? [newRow("CASH", order.totalAmount)] : []);
    setPaymentsTouched(false);
    setCreditApprovalId("");
    setError(undefined);
    setSubmitting(false);
  }, [order]);

  /**
   * The manager types the price per unit agreed with the customer; the discount sent to the backend is
   * (list price - agreed price) x quantity, so the backend sees an ordinary sale with a discount.
   */
  const figures = useMemo(() => {
    if (!order) return null;
    let discountTotal = 0;
    const lineErrors: Record<string, string> = {};
    const discounts: Record<string, number> = {};
    for (const item of order.items) {
      const raw = agreedPrices[item.id]?.trim() ?? "";
      if (raw === "" || item.unitPrice === null) continue;
      const agreed = toWhole(raw);
      if (Number.isNaN(agreed)) lineErrors[item.id] = "Whole FCFA only";
      else if (agreed < 1) lineErrors[item.id] = "At least 1 FCFA";
      else if (agreed > item.unitPrice) lineErrors[item.id] = `At most the list price, ${formatFcfa(item.unitPrice)}`;
      else {
        const discount = (item.unitPrice - agreed) * item.quantity;
        discounts[item.id] = discount;
        discountTotal += discount;
      }
    }
    const total = order.subtotal - discountTotal;
    const paid = payments.reduce((sum, p) => sum + (toWhole(p.amount) || 0), 0);
    return { discountTotal, discounts, total, paid, due: total - paid, lineErrors };
  }, [order, agreedPrices, payments]);

  // While the payment was not edited by hand, it follows the total (discounts change it).
  useEffect(() => {
    if (!figures || paymentsTouched) return;
    setPayments((rows) =>
      figures.total > 0 ? [rows[0] ? { ...rows[0], amount: String(figures.total) } : newRow("CASH", figures.total)] : [],
    );
  }, [figures?.total, paymentsTouched]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!order || !figures) return null;

  function updatePayment(key: string, patch: Partial<PaymentRow>) {
    setPaymentsTouched(true);
    setPayments((rows) => rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!order || !figures) return;
    if (Object.keys(figures.lineErrors).length > 0) {
      setError("Fix the discounted prices first.");
      return;
    }
    const lines = payments.filter((p) => p.amount.trim() !== "");
    if (lines.some((p) => !(toWhole(p.amount) >= 1))) {
      setError("Every payment must be a whole amount of at least 1 FCFA.");
      return;
    }
    if (figures.paid > figures.total) {
      setError("Payments are more than the total. Record only the amount kept, not the cash handed back.");
      return;
    }
    if (figures.due > 0 && !creditApprovalId.trim()) {
      setError(`${formatFcfa(figures.due)} is not paid: enter the approved credit for this order, or take the full amount.`);
      return;
    }
    setError(undefined);

    const request: CompleteSaleRequest = {
      payments: lines.map((p) => ({
        paymentMethod: p.method,
        amount: toWhole(p.amount),
        reference: p.reference.trim() || null,
      })),
      discounts: order.items
        .filter((i) => (figures.discounts[i.id] ?? 0) > 0)
        .map((i) => ({ productId: i.productId, unitId: i.unitId, discountAmount: figures.discounts[i.id] as number })),
      creditApprovalId: figures.due > 0 ? creditApprovalId.trim() : null,
    };

    setSubmitting(true);
    try {
      await onSubmit(request);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, "The sale could not be completed. Nothing was changed."));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      busy={submitting}
      size="lg"
      title={`Complete ${order.orderNumber}`}
      footer={
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Total <span className="font-semibold tabular-nums text-foreground">{formatFcfa(figures.total)}</span>
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Not now
            </Button>
            <Button type="submit" form={formId} loading={submitting}>
              Complete sale
            </Button>
          </div>
        </div>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        {!isFullyPriced(order.items) && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Some lines have no price. The sale can only be completed once every line has one.
          </p>
        )}

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-foreground">Discounts (optional)</legend>
          <p className="text-xs text-muted-foreground">
            To give a discount, type the price per unit agreed with the customer. Leave it empty for no discount.
          </p>
          <ul className="divide-y divide-border border border-border">
            {order.items.map((item) => {
              const name = lookups.productName(item.productId) ?? `Product ${shortId(item.productId)}`;
              const unit = lookups.unitName(item.productId, item.unitId) ?? "unit";
              const discount = figures.discounts[item.id] ?? 0;
              return (
                <li key={item.id} className="flex flex-wrap items-start justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-foreground">{name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {item.unitPrice === null
                        ? `${item.quantity} ${unit} · no price`
                        : `${item.quantity} ${unit} × ${formatFcfa(item.unitPrice)} = ${formatFcfa(item.grossAmount)}`}
                    </span>
                    {discount > 0 && (
                      <span className="block text-xs font-medium text-foreground">
                        After discount {formatFcfa(item.grossAmount - discount)}{" "}
                        <span className="text-muted-foreground">(discount −{formatFcfa(discount)})</span>
                      </span>
                    )}
                  </span>
                  <span className="w-40">
                    <Input
                      inputMode="numeric"
                      placeholder={item.unitPrice === null ? "" : String(item.unitPrice)}
                      aria-label={`Price after discount, per ${unit}, for ${name}`}
                      value={agreedPrices[item.id] ?? ""}
                      disabled={item.unitPrice === null}
                      invalid={!!figures.lineErrors[item.id]}
                      onChange={(e) => setAgreedPrices((d) => ({ ...d, [item.id]: e.target.value }))}
                    />
                    <span className="mt-1 block text-xs text-muted-foreground">price after discount, per {unit}</span>
                    {figures.lineErrors[item.id] && (
                      <span className="mt-1 block text-xs text-red-600">{figures.lineErrors[item.id]}</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold text-foreground">Payment</legend>
          {payments.map((p, i) => (
            <div key={p.key} className="flex flex-wrap items-end gap-2">
              <div className="w-40">
                <Select
                  aria-label={`Payment ${i + 1} method`}
                  value={p.method}
                  onChange={(e) => updatePayment(p.key, { method: e.target.value as SalesPaymentMethod })}
                >
                  {(Object.keys(PAYMENT_METHOD_LABEL) as SalesPaymentMethod[]).map((m) => (
                    <option key={m} value={m}>
                      {PAYMENT_METHOD_LABEL[m]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-36">
                <Input
                  inputMode="numeric"
                  aria-label={`Payment ${i + 1} amount`}
                  value={p.amount}
                  onChange={(e) => updatePayment(p.key, { amount: e.target.value })}
                />
              </div>
              <div className="min-w-[10rem] flex-1">
                <Input
                  aria-label={`Payment ${i + 1} reference`}
                  placeholder={p.method === "MOBILE_MONEY" ? "Transaction id" : "Reference (optional)"}
                  maxLength={SALE_PAYMENT_REFERENCE_MAX_LENGTH}
                  value={p.reference}
                  onChange={(e) => updatePayment(p.key, { reference: e.target.value })}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPaymentsTouched(true);
                  setPayments((rows) => rows.filter((r) => r.key !== p.key));
                }}
              >
                Remove
              </Button>
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {payments.length < SALE_MAX_PAYMENTS && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setPaymentsTouched(true);
                  setPayments((rows) => [...rows, newRow("MOBILE_MONEY", figures.due > 0 ? figures.due : "")]);
                }}
              >
                Add payment
              </Button>
            )}
            {figures.due !== 0 && figures.total > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPaymentsTouched(false);
                  setPayments([newRow(payments[0]?.method ?? "CASH", figures.total)]);
                }}
              >
                Pay in full
              </Button>
            )}
          </div>
        </fieldset>

        <div className="space-y-1.5 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular-nums">{formatFcfa(order.subtotal)}</span>
          </div>
          {figures.discountTotal > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Discounts</span>
              <span className="tabular-nums">−{formatFcfa(figures.discountTotal)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Paid now</span>
            <span className="tabular-nums">{formatFcfa(figures.paid)}</span>
          </div>
          {figures.due !== 0 && (
            <div className="flex justify-between font-medium">
              <span className={figures.due < 0 ? "text-red-600" : "text-amber-700 dark:text-amber-300"}>
                {figures.due < 0 ? "Paid too much" : "Left to pay (credit)"}
              </span>
              <span className="tabular-nums">{formatFcfa(Math.abs(figures.due))}</span>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Prices are checked again when you complete: the final total can differ if a price changed today.
          </p>
        </div>

        {figures.due > 0 && (
          <FormField
            id={`${formId}-credit`}
            label="Approved credit"
            hint="The id of the credit approved for this order. Without it, take the full amount."
          >
            <Input
              id={`${formId}-credit`}
              value={creditApprovalId}
              onChange={(e) => setCreditApprovalId(e.target.value)}
              placeholder="Credit approval id"
            />
          </FormField>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
      </form>
    </Modal>
  );
}