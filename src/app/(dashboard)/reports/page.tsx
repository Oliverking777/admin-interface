"use client";

/**
 * Reports: one tab per report, sharing the period and location filter.
 * The location scope is decided by the backend from the user's permissions: users with REPORT_VIEW_ALL may
 * pick any location (or all of them); the others only ever see their own location, so they get no filter.
 */

import { useMemo, useState } from "react";
import ReportFilters from "@/components/report/ReportFilters";
import SalesReportView from "@/components/report/SalesReportView";
import { periodError, presetPeriod, type Period } from "@/components/report/report-format";
import Card from "@/components/ui/Card";
import Tabs, { type TabItem } from "@/components/ui/Tabs";
import { useToast } from "@/components/ui/ToastProvider";
import { useAllLocations } from "@/hooks/business/use-locations";
import { useAuth } from "@/hooks/iam/use-auth";
import { useExportReport, useReportAbilities, useSalesReport } from "@/hooks/report/use-reports";
import { getErrorMessage } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import type { SalesGroupBy } from "@/types/report/report";

/** The tabs grow as each report view is added. */
type ReportTab = "SALES";

const TABS: TabItem<ReportTab>[] = [{ value: "SALES", label: "Sales" }];

export default function ReportsPage() {
  const { toast } = useToast();
  const auth = useAuth();
  const abilities = useReportAbilities();
  const canViewAll = auth.hasPermission(PERMISSIONS.AUDIT_READ);

  const [tab, setTab] = useState<ReportTab>("SALES");
  const [period, setPeriod] = useState<Period>(() => presetPeriod("THIS_MONTH"));
  const [locationId, setLocationId] = useState("");
  const [salesGroupBy, setSalesGroupBy] = useState<SalesGroupBy>("NONE");

  // Only users who may see every location choose one; the list needs LOCATION_READ.
  const locationsQuery = useAllLocations({ enabled: canViewAll });
  const locations = useMemo(
    () =>
      (locationsQuery.data ?? [])
        .filter((l) => l.status !== "INACTIVE")
        .map((l) => ({ id: l.id, name: l.name })),
    [locationsQuery.data],
  );

  const invalidPeriod = periodError(period);
  // An invalid period is never sent: the queries wait until it is fixed.
  const validPeriod = invalidPeriod ? { from: "", to: "" } : period;
  const scope = canViewAll && locationId ? { locationId } : {};

  const sales = useSalesReport({ ...validPeriod, ...scope, groupBy: salesGroupBy }, { enabled: tab === "SALES" });
  const exportReport = useExportReport();

  function handleExport() {
    if (invalidPeriod) return;
    exportReport.mutate(
      { report: "SALES", filters: { ...period, ...scope, groupBy: salesGroupBy } },
      {
        onSuccess: (file) => toast({ title: "Report exported", description: file.filename }),
        onError: (error) =>
          toast({ title: "Could not export the report", description: getErrorMessage(error), variant: "error" }),
      },
    );
  }

  if (!auth.isLoading && !abilities.view) {
    return (
      <Card>
        <p className="text-sm font-medium text-foreground">You do not have access to reports</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask an administrator to give your role the REPORT_VIEW permission.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {TABS.length > 1 && <Tabs items={TABS} value={tab} onChange={setTab} aria-label="Report" />}

      <ReportFilters
        period={period}
        onPeriodChange={setPeriod}
        periodError={invalidPeriod}
        locationId={locationId}
        onLocationChange={setLocationId}
        locations={canViewAll ? locations : undefined}
        onExport={abilities.export ? handleExport : undefined}
        exporting={exportReport.isPending}
        canExport={!invalidPeriod && !sales.isError}
      />

      {tab === "SALES" && (
        <SalesReportView
          report={sales.data}
          loading={sales.isLoading}
          refreshing={sales.isFetching && sales.isPlaceholderData}
          error={sales.error}
          onRetry={() => void sales.refetch()}
          groupBy={salesGroupBy}
          onGroupByChange={setSalesGroupBy}
        />
      )}
    </div>
  );
}