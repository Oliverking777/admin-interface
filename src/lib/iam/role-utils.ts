import type { RoleOption } from "@/types/iam/member";
import type { RoleResponse } from "@/types/iam/role-dto";

/** "STOCK_KEEPER" -> "Stock keeper". The backend stores role names in upper case. */
export function formatRoleName(raw: string): string {
  const text = raw.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Turns an API role into a dropdown option with a display-ready name. */
export function toRoleOption(role: RoleResponse): RoleOption {
  return { id: role.roleId, name: formatRoleName(role.roleName) };
}