"use client";

/**
 * The ONLY file that depends on the Categories module. I have not seen your category hook or type,
 * so the two imports below and the field names (id, name, status) are assumptions: adjust them here
 * and nothing else needs to change.
 */
import Select from "@/components/ui/Select";
import { useAllCategories } from "@/hooks/business/use-categories";
import { getErrorMessage } from "@/lib/api/api-error";

type CategorySelectProps = {
  id: string;
  value: string;
  onChange: (categoryId: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  "aria-describedby"?: string;
};

/** Name of a category, for display (e.g. in the product detail page). */
export function useCategoryName(categoryId: string | undefined): string | undefined {
  const query = useAllCategories();
  return (query.data ?? []).find((c) => c.id === categoryId)?.name;
}

/** Only active categories can be chosen: the backend refuses inactive ones with a 409. */
export default function CategorySelect({ id, value, onChange, invalid, disabled = false, ...rest }: CategorySelectProps) {
  const query = useAllCategories();
  const categories = (query.data ?? []).filter((c) => c.status === "ACTIVE" || c.id === value);

  return (
    <>
      <Select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || query.isLoading}
        invalid={invalid}
        aria-describedby={rest["aria-describedby"]}
      >
        <option value="">{query.isLoading ? "Loading categories..." : "Select a category"}</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
      {query.isError && (
        <p role="alert" className="text-sm text-red-600">
          {getErrorMessage(query.error, "Could not load categories.")}
        </p>
      )}
    </>
  );
}