import { cn } from "@/lib/cn";
import { formatDateTime, humanize, timeAgo } from "@/components/dashboard/dashboard-format";
import type { RecentActivityItem } from "@/types/dashboard/dashboard";

/** Badge colour by module, taken from the start of the action code ("PURCHASE.CONFIRMED" -> PURCHASE). RECEIPT stays for older entries. */
function accentFor(module: string): string {
  switch (module) {
    case "SALE":
    case "ORDER":
    case "PAYMENT":
    case "CREDIT":
      return "bg-primary text-primary-foreground";
    case "PURCHASE":
    case "RECEIPT":
    case "SUPPLIER":
      return "bg-secondary text-secondary-foreground";
    case "STOCK":
    case "TRANSFER":
    case "INVENTORY":
      return "bg-accent text-accent-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}

/** "STOCK.ADJUSTMENT_APPROVED" -> { module: "STOCK", text: "Stock adjustment approved" }. */
function describe(action: string): { module: string; text: string } {
  const [module = action, ...rest] = action.split(".");
  return { module, text: humanize([module, ...rest].join(" ")) };
}

type ActivityItemProps = {
  item: RecentActivityItem;
  /** Name of item.locationId, when known. */
  locationName?: string | null;
};

export default function ActivityItem({ item, locationName }: ActivityItemProps) {
  const { module, text } = describe(item.action);
  const failed = item.outcome !== "SUCCESS";
  const details = [
    locationName,
    item.actorId === null ? "System" : null,
    failed ? humanize(item.outcome) : null,
  ].filter(Boolean);

  return (
    <li className="flex items-start gap-3 py-2.5">
      <span
        className={cn(
          "mt-0.5 shrink-0 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
          failed ? "bg-red-600 text-white" : accentFor(module),
        )}
      >
        {humanize(module)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{text}</p>
        {details.length > 0 && <p className="text-xs text-muted-foreground">{details.join(" · ")}</p>}
      </div>
      <time
        dateTime={item.occurredAt}
        title={formatDateTime(item.occurredAt)}
        className="shrink-0 text-xs text-muted-foreground"
      >
        {timeAgo(item.occurredAt)}
      </time>
    </li>
  );
}