/** The location an order belongs to. */
export default function OrderLocationBadge({ name }: { name: string | null }) {
  return (
    <span className="inline-block max-w-[10rem] truncate border border-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
      {name ?? "Unknown location"}
    </span>
  );
}