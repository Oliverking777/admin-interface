import { formatBreakdown } from "@/lib/inventory/stock-format";
import { STATUS_LABEL } from "@/lib/inventory/stock-status";
import type { StockRow } from "@/types/inventory/stock-row";

function cell(value: string | number | null): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

/**
 * Downloads the given rows as a CSV file. Uses ";" as separator and a BOM so that
 * Excel with French regional settings opens it with the right columns and accents.
 */
export function exportStockCsv(rows: StockRow[]): void {
  const header = [
    "Product code",
    "Product",
    "Category",
    "Location",
    "Quantity (base unit)",
    "Base unit",
    "In bigger units",
    "Low-stock threshold",
    "Status",
    "Last updated",
  ];

  const lines = rows.map((r) =>
    [
      r.productCode,
      r.productName,
      r.categoryName,
      r.locationName,
      r.quantity,
      r.units.find((u) => u.isBase)?.unitName ?? "",
      formatBreakdown(r.quantity, r.units),
      r.lowStockThreshold,
      STATUS_LABEL[r.status],
      r.updatedAt,
    ]
      .map(cell)
      .join(";"),
  );

  const csv = "\uFEFF" + [header.map(cell).join(";"), ...lines].join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `stock-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}