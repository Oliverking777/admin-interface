"use client";

import Button from "@/components/ui/Button";
import DatePicker from "@/components/ui/DatePicker";
import Select from "@/components/ui/Select";
import { cn } from "@/lib/cn";
import {
  PERIOD_PRESETS,
  businessToday,
  matchingPreset,
  presetPeriod,
  type Period,
} from "@/components/report/report-format";

type LocationOption = { id: string; name: string };

type ReportFiltersProps = {
  /** Leave out for reports without a period (stock). */
  period?: Period;
  onPeriodChange?: (period: Period) => void;
  /** Shown under the dates when the period is not valid. */
  periodError?: string | null;
  /** "" means every location the user may see. */
  locationId: string;
  onLocationChange: (locationId: string) => void;
  /**
   * Locations the user may choose from. Leave out (or pass one) to hide the filter:
   * users without REPORT_VIEW_ALL only ever see their own location.
   */
  locations?: LocationOption[];
  /** Leave out to hide the Export button (users without REPORT_EXPORT). */
  onExport?: () => void;
  exporting?: boolean;
  /** False while the period is invalid or the report failed. */
  canExport?: boolean;
};

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
      <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
    </svg>
  );
}

/** Period, location and export, shared by every report tab. */
export default function ReportFilters({
  period,
  onPeriodChange,
  periodError,
  locationId,
  onLocationChange,
  locations,
  onExport,
  exporting = false,
  canExport = true,
}: ReportFiltersProps) {
  const preset = period ? matchingPreset(period) : null;
  const today = businessToday();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {period && onPeriodChange && (
          <>
            <div role="group" aria-label="Quick periods" className="inline-flex flex-wrap border border-border bg-background">
              {PERIOD_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => onPeriodChange(presetPeriod(p.value))}
                  aria-pressed={preset === p.value}
                  className={cn(
                    "whitespace-nowrap px-3 py-2 text-sm font-medium transition",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary",
                    preset === p.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <DatePicker
              label="From"
              value={period.from}
              max={period.to || today}
              onChange={(from) => onPeriodChange({ ...period, from })}
            />
            <DatePicker
              label="To"
              value={period.to}
              min={period.from || undefined}
              max={today}
              onChange={(to) => onPeriodChange({ ...period, to })}
            />
          </>
        )}

        {locations && locations.length > 1 && (
          <div className="w-full sm:w-56">
            <Select
              value={locationId}
              onChange={(e) => onLocationChange(e.target.value)}
              aria-label="Location"
              className="py-2 text-sm"
            >
              <option value="">All locations</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        {onExport && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onExport}
            loading={exporting}
            disabled={!canExport}
            className="sm:ml-auto"
          >
            <DownloadIcon />
            Export CSV
          </Button>
        )}
      </div>

      {periodError && (
        <p role="alert" className="text-sm text-red-600">
          {periodError}
        </p>
      )}
    </div>
  );
}