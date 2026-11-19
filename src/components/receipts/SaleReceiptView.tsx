import { PAYMENT_METHOD_LABEL, formatDateTime, formatFcfa, shortId } from "@/components/orders/order-display";
import type { OrderLookups } from "@/hooks/order/use-order-lookups";
import type { SaleReceipt } from "@/types/order/order";

/** The element printed by PrintReceiptButton. */
export const RECEIPT_PRINT_ID = "sale-receipt-print";

/** The header of every receipt. Set the real phone number here; leave it empty to print no phone line. */
export const RECEIPT_BUSINESS_NAME = "Yah Enterprise";
export const RECEIPT_BUSINESS_PHONE = "+237 6XX XX XX XX";

type SaleReceiptViewProps = {
  receipt: SaleReceipt;
  lookups: OrderLookups;
  /** Printed at the top, e.g. the business name. */
  businessName?: string;
  /** Printed under the business name. */
  businessPhone?: string;
};

function Line({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between text-base font-semibold" : "flex justify-between"}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

/**
 * A sale receipt laid out like a till slip (narrow, monospace-friendly). Data only comes from the backend;
 * product, unit and location names are resolved here. Payments are only known right after completing:
 * a receipt read later shows the paid and credit totals instead.
 */
export default function SaleReceiptView({
  receipt,
  lookups,
  businessName = RECEIPT_BUSINESS_NAME,
  businessPhone = RECEIPT_BUSINESS_PHONE,
}: SaleReceiptViewProps) {
  const location = receipt.locationName ?? lookups.locationName(receipt.locationId);
  const customer = receipt.customerName ?? lookups.customerName(receipt.customerId);

  return (
    <article
      id={RECEIPT_PRINT_ID}
      aria-label={`Receipt ${receipt.receiptNumber}`}
      className="mx-auto w-full max-w-sm border border-border bg-background p-5 font-mono text-sm text-foreground print:max-w-none print:border-0 print:p-0"
    >
      <header className="text-center">
        <p className="text-base font-bold uppercase tracking-wide">{businessName}</p>
        {businessPhone.trim() && <p className="text-xs">Tel: {businessPhone.trim()}</p>}
        {location && <p className="text-xs">{location}</p>}
        <p className="mt-2 text-xs">Receipt {receipt.receiptNumber}</p>
        <p className="text-xs">Order {receipt.orderNumber}</p>
        <p className="text-xs">{formatDateTime(receipt.issuedAt)}</p>
      </header>

      <p className="mt-3 border-t border-dashed border-border pt-2 text-xs">
        Customer: {customer ?? shortId(receipt.customerId)}
      </p>

      <ul className="mt-2 space-y-2 border-t border-dashed border-border pt-2">
        {receipt.lines.map((l) => (
          <li key={l.id}>
            <p className="break-words">{lookups.productName(l.productId) ?? `Product ${shortId(l.productId)}`}</p>
            <div className="flex justify-between text-xs">
              <span>
                {l.quantity} {lookups.unitName(l.productId, l.unitId) ?? "unit(s)"}
                {l.unitPrice !== null && ` × ${formatFcfa(l.unitPrice)}`}
              </span>
              <span className="tabular-nums">{formatFcfa(l.lineTotal + l.discountAmount)}</span>
            </div>
            {l.discountAmount > 0 && (
              <div className="flex justify-between text-xs">
                <span>Discount</span>
                <span className="tabular-nums">−{formatFcfa(l.discountAmount)}</span>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-2 space-y-1 border-t border-dashed border-border pt-2">
        {receipt.discountTotal > 0 && (
          <>
            <Line label="Subtotal" value={formatFcfa(receipt.subtotal)} />
            <Line label="Discounts" value={`−${formatFcfa(receipt.discountTotal)}`} />
          </>
        )}
        <Line label="TOTAL" value={formatFcfa(receipt.totalAmount)} strong />
      </div>

      <div className="mt-2 space-y-1 border-t border-dashed border-border pt-2 text-xs">
        {receipt.payments?.map((p, i) => (
          <Line
            key={i}
            label={`${PAYMENT_METHOD_LABEL[p.method]}${p.reference ? ` (${p.reference})` : ""}`}
            value={formatFcfa(p.amount)}
          />
        ))}
        <Line label="Paid" value={formatFcfa(receipt.amountPaid)} />
        {receipt.amountDue > 0 && <Line label="Left on credit" value={formatFcfa(receipt.amountDue)} />}
      </div>

      {receipt.note && <p className="mt-2 border-t border-dashed border-border pt-2 text-xs">{receipt.note}</p>}

      <footer className="mt-4 text-center text-xs">
        <p>{receipt.fullyPaid ? "Paid in full" : "Balance to be paid"}</p>
        <p>Thank you for your purchase</p>
      </footer>
    </article>
  );
}