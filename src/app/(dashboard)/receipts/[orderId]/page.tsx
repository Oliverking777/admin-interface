"use client";

/**
 * One sale receipt, ready to print. Right after a sale is completed the full receipt (with payments) is already
 * in the cache; opened later, it comes from GET /orders/{id}/receipt, which has the totals but not the payments.
 */

import Link from "next/link";
import { useParams } from "next/navigation";

import PrintReceiptButton from "@/components/receipts/PrintReceiptButton";
import SaleReceiptView from "@/components/receipts/SaleReceiptView";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useOrder, useOrderAbilities, useSaleReceipt } from "@/hooks/order/use-order";
import { useOrderLookups } from "@/hooks/order/use-order-lookups";
import { getErrorMessage, isApiError } from "@/lib/api/api-error";

const backLinkClass = "text-sm font-medium text-primary hover:underline print:hidden";

export default function ReceiptPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const abilities = useOrderAbilities();
  const lookups = useOrderLookups();

  // The order tells whether a receipt exists (only COMPLETED orders have one) and avoids a 409.
  const order = useOrder(orderId);
  const completed = order.data?.status === "COMPLETED";
  const receipt = useSaleReceipt(orderId, { enabled: completed });

  if (!abilities.read) {
    return (
      <Card className="px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">You don&apos;t have access to receipts.</p>
      </Card>
    );
  }

  const error = order.error ?? receipt.error;
  const loading = order.isPending || (completed && receipt.isPending);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/receipts" className={backLinkClass}>
          ← Back to receipts
        </Link>
        {receipt.data && <PrintReceiptButton />}
      </div>

      {loading ? (
        <div className="mx-auto max-w-sm space-y-3 border border-border p-5" aria-busy="true">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="h-4 animate-pulse bg-muted motion-reduce:animate-none" style={{ width: `${90 - (i % 3) * 20}%` }} />
          ))}
        </div>
      ) : error ? (
        <Card className="mx-auto max-w-md px-6 py-10 text-center">
          <p role="alert" className="text-sm text-foreground">
            {isApiError(error) && error.isNotFound
              ? "This order does not exist."
              : getErrorMessage(error, "Could not load the receipt.")}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => (order.error ? order.refetch() : receipt.refetch())}
          >
            Try again
          </Button>
        </Card>
      ) : !completed ? (
        <Card className="mx-auto max-w-md px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">
            {order.data?.orderNumber} has no receipt
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.data?.status === "CANCELLED"
              ? "It was cancelled, so it never became a sale."
              : "A receipt is issued when the sale is completed."}
          </p>
          <Link href="/orders" className="mt-3 inline-block text-sm font-medium text-primary hover:underline">
            Go to orders
          </Link>
        </Card>
      ) : (
        receipt.data && (
          <>
            <SaleReceiptView receipt={receipt.data} lookups={lookups} />
            {!receipt.data.payments && (
              <p className="text-center text-xs text-muted-foreground print:hidden">
                Payment methods are shown only on the receipt printed when the sale was completed.
              </p>
            )}
          </>
        )
      )}
    </div>
  );
}