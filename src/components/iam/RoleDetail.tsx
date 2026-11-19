"use client";

import Link from "next/link";
import { useCallback, useState, type ReactNode } from "react";

import QueryError from "@/components/iam/QueryError";
import RoleFormDrawer from "@/components/iam/RoleFormDrawer";
import RolePermissionsPanel from "@/components/iam/RolePermissionsPanel";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Tabs from "@/components/ui/Tabs";
import { useAuth } from "@/hooks/iam/use-auth";
import { useRole } from "@/hooks/iam/use-roles";
import { formatDateTime } from "@/lib/format";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { LOCATION_SCOPE_HELP, LOCATION_SCOPE_LABELS } from "@/lib/iam/role-labels";
import type { RoleResponse } from "@/types/iam/role-dto";

type TabValue = "details" | "permissions";

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}

function DetailsPanel({ role }: { role: RoleResponse }) {
  return (
    <Card className="p-5">
      <dl className="grid gap-5 sm:grid-cols-2">
        <Detail label="Description">{role.description ?? "No description"}</Detail>
        <Detail label="Location scope">
          {LOCATION_SCOPE_LABELS[role.locationScope] ?? role.locationScope}
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {LOCATION_SCOPE_HELP[role.locationScope]}
          </span>
        </Detail>
        <Detail label="Type">{role.system ? "Built-in" : "Custom"}</Detail>
        <Detail label="Created">{formatDateTime(role.createdAt)}</Detail>
        <Detail label="Last updated">{formatDateTime(role.updatedAt)}</Detail>
      </dl>
    </Card>
  );
}

export default function RoleDetail({ roleId }: { roleId: string }) {
  const { hasPermission } = useAuth();
  const role = useRole(roleId);

  const [tab, setTab] = useState<TabValue>("details");
  const [editing, setEditing] = useState(false);
  const closeEdit = useCallback(() => setEditing(false), []);

  const canSeePermissions = hasPermission(PERMISSIONS.ROLE_PERMISSION_READ);
  const canUpdate = hasPermission(PERMISSIONS.ROLE_UPDATE);

  const back = (
    <Link href="/admin/roles" className="text-sm text-primary underline-offset-4 hover:underline">
      Back to roles
    </Link>
  );

  if (role.isError) {
    return (
      <div className="space-y-4">
        {back}
        <QueryError error={role.error} onRetry={() => void role.refetch()} />
      </div>
    );
  }

  if (role.isPending) {
    return (
      <div className="space-y-4">
        {back}
        <p role="status" className="border border-border bg-background p-6 text-center text-sm text-muted-foreground">
          Loading role...
        </p>
      </div>
    );
  }

  const data = role.data;
  const tabs = [
    { value: "details" as const, label: "Details" },
    ...(canSeePermissions ? [{ value: "permissions" as const, label: "Permissions" }] : []),
  ];

  return (
    <div className="space-y-4">
      {back}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold text-foreground">{data.roleName}</h2>
          {data.system && <Badge>Built-in</Badge>}
        </div>
        {canUpdate && <Button onClick={() => setEditing(true)}>Edit role</Button>}
      </div>

      <Tabs items={tabs} value={tab} onChange={setTab} aria-label="Role sections" />

      <div role="tabpanel">
        {tab === "details" ? <DetailsPanel role={data} /> : <RolePermissionsPanel role={data} />}
      </div>

      <RoleFormDrawer open={editing} role={data} onClose={closeEdit} />
    </div>
  );
}