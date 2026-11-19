"use client";

import Button from "@/components/ui/Button";
import { RECEIPT_PRINT_ID } from "@/components/receipts/SaleReceiptView";

/**
 * Prints only the receipt: while printing, everything else on the page is hidden and the receipt is placed at the
 * top-left at till-slip width (80 mm). Works with the app layout untouched.
 */
export const RECEIPT_PRINT_CSS = `
@media print {
  @page { margin: 4mm; }
  body * { visibility: hidden !important; }
  #${RECEIPT_PRINT_ID}, #${RECEIPT_PRINT_ID} * { visibility: visible !important; }
  #${RECEIPT_PRINT_ID} {
    position: absolute; left: 0; top: 0; width: 72mm;
    color: #000 !important; background: #fff !important;
  }
  #${RECEIPT_PRINT_ID} * { color: #000 !important; border-color: #000 !important; }
}
`;

export default function PrintReceiptButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <>
      <style>{RECEIPT_PRINT_CSS}</style>
      <Button onClick={() => window.print()} disabled={disabled}>
        Print receipt
      </Button>
    </>
  );
}