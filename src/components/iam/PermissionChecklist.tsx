"use client";

import { useState } from "react";

import Input from "@/components/ui/Input";
import type { PermissionGroup } from "@/lib/iam/permission-groups";
import type { UUID } from "@/types/iam/user";

type PermissionChecklistProps = {
  groups: PermissionGroup[];
  selected: ReadonlySet<UUID>;
  /** Receives a new Set; the checklist never changes `selected` itself. */
  onChange: (next: Set<UUID>) => void;
  disabled?: boolean;
};

const checkboxClass = "h-4 w-4 shrink-0 accent-primary disabled:cursor-not-allowed";

/** Permissions grouped by module, with a filter and a select-all checkbox per group. */
export default function PermissionChecklist({
  groups,
  selected,
  onChange,
  disabled = false,
}: PermissionChecklistProps) {
  const [query, setQuery] = useState("");
  const text = query.trim().toLowerCase();
  const codeText = text.replace(/\s+/g, "_");

  const visible = groups
    .map((group) => ({
      ...group,
      permissions: group.permissions.filter(
        (p) =>
          !text ||
          p.permissionCode.toLowerCase().includes(codeText) ||
          group.label.toLowerCase().includes(text),
      ),
    }))
    .filter((group) => group.permissions.length > 0);

  function toggle(id: UUID) {
    const next = new Set(selected);
    if (!next.delete(id)) next.add(id);
    onChange(next);
  }

  /** Selects every shown permission of the group, or clears them if they are all selected already. */
  function toggleGroup(group: PermissionGroup) {
    const next = new Set(selected);
    const allSelected = group.permissions.every((p) => next.has(p.permissionId));
    for (const p of group.permissions) {
      if (allSelected) next.delete(p.permissionId);
      else next.add(p.permissionId);
    }
    onChange(next);
  }

  return (
    <div>
      <div className="border-b border-border p-4">
        <div className="max-w-sm">
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter permissions"
            aria-label="Filter permissions"
          />
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          No permissions match your filter.
        </p>
      ) : (
        visible.map((group) => {
          const count = group.permissions.filter((p) => selected.has(p.permissionId)).length;
          const all = count === group.permissions.length;
          const some = count > 0 && !all;

          return (
            <section key={group.id} className="border-b border-border last:border-b-0">
              <label className="flex items-center gap-3 bg-muted/40 px-4 py-2.5 text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  className={checkboxClass}
                  checked={all}
                  ref={(el) => {
                    if (el) el.indeterminate = some;
                  }}
                  onChange={() => toggleGroup(group)}
                  disabled={disabled}
                />
                <span className="flex-1">{group.label}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {count} of {group.permissions.length}
                </span>
              </label>

              <ul className="grid gap-x-6 gap-y-1 px-4 py-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.permissions.map((p) => (
                  <li key={p.permissionId}>
                    <label className="flex items-center gap-3 py-1 text-sm text-foreground">
                      <input
                        type="checkbox"
                        className={checkboxClass}
                        checked={selected.has(p.permissionId)}
                        onChange={() => toggle(p.permissionId)}
                        disabled={disabled}
                      />
                      <span className="break-all font-mono text-xs">{p.permissionCode}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}