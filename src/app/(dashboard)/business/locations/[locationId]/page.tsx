"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState, type ReactNode } from "react";
import LocationDrawer from "@/components/locations/LocationDrawer";
import LocationUsersPanel from "@/components/locations/LocationUsersPanel";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import {
  useActivateLocation,
  useDeactivateLocation,
  useLocation,
  useUpdateLocation,
} from "@/hooks/business/use-locations";
import { useAuth } from "@/hooks/iam/use-auth";
import { getErrorMessage } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import type { LocationType } from "@/types/business/location";
import type { UpdateLocationRequest } from "@/types/business/location-dto";

const TYPE_LABELS: Record<LocationType, string> = {
  WAREHOUSE: "Warehouse",
  STORE: "Store",
};

const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function BackLink() {
  return (
    <Link
      href="/business/locations"
      className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="h-4 w-4" aria-hidden="true">
        <path d="M15 6l-6 6 6 6" />
      </svg>
      Back to locations
    </Link>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default function LocationDetailPage() {
  const { locationId } = useParams<{ locationId: string }>();
  const { toast } = useToast();
  const auth = useAuth();

  const canRead = auth.hasPermission(PERMISSIONS.LOCATION_READ);
  const canUpdate = auth.hasPermission(PERMISSIONS.LOCATION_UPDATE);
  const canActivate = auth.hasPermission(PERMISSIONS.LOCATION_ACTIVATE);
  const canDeactivate = auth.hasPermission(PERMISSIONS.LOCATION_DEACTIVATE);
  const canViewUsers = auth.hasPermission(PERMISSIONS.LOCATION_USER_READ);
  const canAssignUsers = auth.hasPermission(PERMISSIONS.LOCATION_USER_ASSIGN);
  const canRemoveUsers = auth.hasPermission(PERMISSIONS.LOCATION_USER_REMOVE);

  const query = useLocation(locationId, { enabled: canRead });
  const updateLocation = useUpdateLocation();
  const activateLocation = useActivateLocation();
  const deactivateLocation = useDeactivateLocation();

  const [editOpen, setEditOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);

  // Stable identities: Drawer and ConfirmDialog re-run effects when these change.
  const closeEdit = useCallback(() => setEditOpen(false), []);
  const closeDeactivate = useCallback(() => setDeactivateOpen(false), []);

  const location = query.data;

  async function handleUpdate(id: string, request: UpdateLocationRequest) {
    const updated = await updateLocation.mutateAsync({ locationId: id, request });
    toast({ title: "Location updated", description: `${updated.name} was saved.` });
  }

  async function handleActivate() {
    if (!location) return;
    try {
      await activateLocation.mutateAsync(location.id);
      toast({ title: "Location activated", description: `${location.name} is operational again.` });
    } catch (error) {
      toast({
        title: "Could not activate location",
        description: getErrorMessage(error),
        variant: "error",
      });
    }
  }

  async function confirmDeactivate() {
    if (!location) return;
    try {
      await deactivateLocation.mutateAsync(location.id);
      toast({
        title: "Location deactivated",
        description: `${location.name} is disabled. Its users stay assigned.`,
      });
      setDeactivateOpen(false);
    } catch (error) {
      toast({
        title: "Could not deactivate location",
        description: getErrorMessage(error),
        variant: "error",
      });
    }
  }

  if (!auth.isLoading && !canRead) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <Card>
          <p className="text-sm font-medium text-foreground">You do not have access to locations</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask an administrator to give your role the LOCATION_READ permission.
          </p>
        </Card>
      </div>
    );
  }

  if (auth.isLoading || query.isLoading) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <BackLink />
        <Card>
          <div className="flex flex-col gap-3">
            <div className="h-6 w-56 animate-pulse bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-80 animate-pulse bg-muted motion-reduce:animate-none" />
            <div className="h-4 w-64 animate-pulse bg-muted motion-reduce:animate-none" />
          </div>
        </Card>
      </div>
    );
  }

  if (query.isError || !location) {
    const notFound = query.error?.isNotFound ?? false;
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <Card>
          <p role="alert" className="text-sm font-medium text-foreground">
            {notFound ? "This location does not exist" : getErrorMessage(query.error, "Could not load the location.")}
          </p>
          {!notFound && (
            <Button variant="secondary" size="sm" onClick={() => void query.refetch()} className="mt-3">
              Try again
            </Button>
          )}
        </Card>
      </div>
    );
  }

  const isActive = location.status === "ACTIVE";

  return (
    <div className="flex flex-col gap-4">
      <BackLink />

      <Card className="flex flex-col gap-5 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold text-foreground">{location.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge>{TYPE_LABELS[location.type]}</Badge>
              <Badge variant={isActive ? "success" : "neutral"}>{isActive ? "Active" : "Inactive"}</Badge>
            </div>
          </div>

          <div className="flex gap-2">
            {canUpdate && (
              <Button variant="secondary" onClick={() => setEditOpen(true)}>
                Edit
              </Button>
            )}
            {isActive && canDeactivate && (
              <Button variant="secondary" onClick={() => setDeactivateOpen(true)}>
                Deactivate
              </Button>
            )}
            {!isActive && canActivate && (
              <Button onClick={handleActivate} loading={activateLocation.isPending}>
                Activate
              </Button>
            )}
          </div>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2">
          <Detail label="Code">{location.code}</Detail>
          <Detail label="Type">{TYPE_LABELS[location.type]}</Detail>
          <div className="sm:col-span-2">
            <Detail label="Address">{location.address ?? "No address"}</Detail>
          </div>
          <Detail label="Created">{dateTimeFormat.format(new Date(location.createdAt))}</Detail>
          <Detail label="Last updated">{dateTimeFormat.format(new Date(location.updatedAt))}</Detail>
        </dl>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-lg font-semibold text-foreground">Users</h2>
        {canViewUsers ? (
          <LocationUsersPanel location={location} canAssign={canAssignUsers} canRemove={canRemoveUsers} />
        ) : (
          <p className="text-sm text-muted-foreground">
            You do not have permission to see this location&apos;s users. Ask an administrator to give your role
            the LOCATION_USER_READ permission.
          </p>
        )}
      </Card>

      <LocationDrawer open={editOpen} onClose={closeEdit} location={location} onUpdate={handleUpdate} />

      <ConfirmDialog
        open={deactivateOpen}
        onClose={closeDeactivate}
        onConfirm={confirmDeactivate}
        title="Deactivate this location?"
        description={`${location.name} will be disabled, and no new users can be assigned to it. Its current users stay assigned, and you can activate it again at any time.`}
        confirmLabel="Deactivate"
        destructive
        loading={deactivateLocation.isPending}
      />
    </div>
  );
}