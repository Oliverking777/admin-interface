import Tabs from "@/components/ui/Tabs";

/** "all" or a location id. */
export type LocationFilter = string;

type OrderLocationTabsProps = {
  value: LocationFilter;
  onChange: (value: LocationFilter) => void;
  /** The locations the user may see. With fewer than two there is nothing to choose, so nothing is shown. */
  locations: { id: string; name: string }[];
};

export default function OrderLocationTabs({ value, onChange, locations }: OrderLocationTabsProps) {
  if (locations.length < 2) return null;
  return (
    <Tabs
      aria-label="Filter by location"
      value={value}
      onChange={onChange}
      items={[{ value: "all", label: "All" }, ...locations.map((l) => ({ value: l.id, label: l.name }))]}
    />
  );
}