"use client";

import type { ReactNode } from "react";

import { useAuth } from "@/hooks/iam/use-auth";

type CanProps = {
  /** The user must have this permission. */
  permission?: string;
  /** The user must have at least one of these. */
  anyOf?: readonly string[];
  /** The user must have all of these. */
  allOf?: readonly string[];
  /** Shown when access is missing. Nothing by default. */
  fallback?: ReactNode;
  children: ReactNode;
};

/**
 * Shows its children only to users with the permission(s). Every condition given must hold.
 * This only hides UI: the backend still checks every request.
 *
 *   <Can permission={PERMISSIONS.ROLE_CREATE}><Button>New role</Button></Can>
 */
export default function Can({ permission, anyOf, allOf, fallback = null, children }: CanProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuth();

  const allowed =
    (permission === undefined || hasPermission(permission)) &&
    (anyOf === undefined || hasAnyPermission(anyOf)) &&
    (allOf === undefined || hasAllPermissions(allOf));

  return <>{allowed ? children : fallback}</>;
}