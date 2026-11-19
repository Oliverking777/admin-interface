/**
 * Groups permissions by module for the role permission checklist.
 * Pure function: no API calls. Codes the frontend does not know about
 * (e.g. added on the backend later) go in a final "Other" group, so none is ever hidden.
 */

import { PERMISSION_MODULES } from "@/lib/iam/permission-codes";
import type { PermissionResponse } from "@/types/iam/permission-dto";

export interface PermissionGroup {
  id: string;
  label: string;
  permissions: PermissionResponse[];
}

const OTHER_GROUP_ID = "other";

export function groupPermissionsByModule(
  permissions: readonly PermissionResponse[],
): PermissionGroup[] {
  const byCode = new Map(permissions.map((p) => [p.permissionCode.toUpperCase(), p]));
  const used = new Set<string>();
  const groups: PermissionGroup[] = [];

  for (const module of PERMISSION_MODULES) {
    const items: PermissionResponse[] = [];
    for (const code of module.codes) {
      const permission = byCode.get(code);
      if (permission) {
        items.push(permission);
        used.add(code);
      }
    }
    if (items.length > 0) {
      groups.push({ id: module.id, label: module.label, permissions: items });
    }
  }

  const others = permissions
    .filter((p) => !used.has(p.permissionCode.toUpperCase()))
    .sort((a, b) => a.permissionCode.localeCompare(b.permissionCode));
  if (others.length > 0) {
    groups.push({ id: OTHER_GROUP_ID, label: "Other", permissions: others });
  }

  return groups;
}