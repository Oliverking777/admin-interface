"use client";

/**
 * Sale receipts. The backend issues exactly one receipt per COMPLETED order and has no receipt list of its own,
 * so this page lists completed orders and opens each one's receipt. Every sale is listed by default; "From" and
 * "To" narrow the list (either one alone works), and "All dates" clears them.
 */

import { useState } from "react";

import OrderLocationTabs from "@/components/orders/OrderLocationTabs";
import OrderSearchBar from "@/components/orders/OrderSearchBar";
import { businessToday, formatCount, formatFcfa } from "@/components/orders/order-display";
import ReceiptsTable from "@/components/receipts/ReceiptsTable";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import DatePicker from "@/components/ui/DatePicker";
import Pagination from "@/components/ui/Pagination";
import { useOrderAbilities, useOrders } from "@/hooks/order/use-order";
import { useOrderLookups } from "@/hooks/order/use-order-lookups";
import { getErrorMessage } from "@/lib/api/api-error";
import { businessDayRange } from "@/types/order/order";

const PAGE_SIZE = 20;

/** The instants for the chosen days. An empty day leaves that side open (from inclusive, to exclusive). */
function periodRange(fromDay: string, toDay: string): { from?: string; to?: string } {
  return {
    ...(fromDay ? { from: businessDayRange(fromDay, fromDay).from } : {}),
    ...(toDay ? { to: businessDayRange(toDay, toDay).to } : {}),
  };
}

export default function ReceiptsPage() {
  const abilities = useOrderAbilities();
  const lookups = useOrderLookups();
  const today = businessToday();

  /** "" = no limit on that side. */
  const [fromDay, setFromDay] = useState("");
  const [toDay, setToDay] = useState("");
  const [location, setLocation] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const validPeriod = fromDay === "" || toDay === "" || fromDay <= toDay;
  const range = validPeriod ? periodRange(fromDay, toDay) : {};
  const locationId = lookups.anyLocation && location !== "all" ? location : undefined;
  const datePicked = fromDay !== "" || toDay !== "";

  const query = useOrders(
    { status: "COMPLETED", ...range, locationId, page, size: PAGE_SIZE },
    { enabled: lookups.ready && validPeriod },
  );

  const term = search.trim().toLowerCase();
  const all = query.data?.content ?? [];
  const sales = term
    ? all.filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(term) ||
          (lookups.customerName(o.customerId) ?? "").toLowerCase().includes(term),
      )
    : all;
  const pageTotal = sales.reduce((sum, o) => sum + o.totalAmount, 0);

  // Any filter change goes back to the first page.
  const reset =
    <T,>(set: (v: T) => void) =>
    (v: T) => {
      set(v);
      setPage(0);
    };

  function clearDates() {
    setFromDay("");
    setToDay("");
    setPage(0);
  }

  if (!abilities.read) {
    return (
      <Card className="px-6 py-12 text-center">
        <p className="text-sm font-medium text-foreground">You don&apos;t have access to receipts.</p>
        <p className="mt-1 text-sm text-muted-foreground">Ask an administrator for the SALE_READ permission.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Receipts</h2>
        <p className="text-sm text-muted-foreground">
          Completed sales and their receipts, newest first. Pick dates to see a period.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-sm flex-1">
          <OrderSearchBar value={search} onChange={setSearch} />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DatePicker label="From" value={fromDay} max={today} onChange={reset(setFromDay)} />
          <DatePicker label="To" value={toDay} max={today} onChange={reset(setToDay)} />
          {datePicked && (
            <Button variant="ghost" size="sm" onClick={clearDates}>
              All dates
            </Button>
          )}
        </div>
      </div>
      {!validPeriod && (
        <p role="alert" className="text-sm text-red-600">
          Choose a start day on or before the end day.
        </p>
      )}

      {lookups.anyLocation && (
        <OrderLocationTabs value={location} onChange={reset(setLocation)} locations={lookups.locations} />
      )}

      <Card padded={false} className="overflow-x-auto">
        <ReceiptsTable
          sales={sales}
          lookups={lookups}
          loading={!lookups.ready || (validPeriod && query.isPending)}
          error={query.isError ? getErrorMessage(query.error, "Could not load the receipts.") : null}
          onRetry={() => query.refetch()}
          filtered={term !== "" || datePicked || location !== "all"}
          showLocation={lookups.anyLocation && location === "all"}
        />
      </Card>

      {query.data && query.data.totalElements > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {formatCount(sales.length)} sale{sales.length === 1 ? "" : "s"} on this page · {formatFcfa(pageTotal)}
          </p>
          <Pagination
            page={page}
            totalPages={query.data.totalPages}
            totalElements={query.data.totalElements}
            noun="sales"
            onPageChange={setPage}
            disabled={query.isFetching}
          />
        </div>
      )}
    </div>
  );
}