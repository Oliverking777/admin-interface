"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Drawer from "@/components/ui/Drawer";
import Select from "@/components/ui/Select";
import { useToast } from "@/components/ui/ToastProvider";
import {
  useAssignUserToLocation,
  useLocationUsers,
  useRemoveUserFromLocation,
} from "@/hooks/business/use-locations";
import { useAuth } from "@/hooks/iam/use-auth";
import { getErrorMessage, type ApiError } from "@/lib/api/api-error";
import { PERMISSIONS } from "@/lib/iam/permission-codes";
import { formatRoleName } from "@/lib/iam/role-utils";
import { memberService } from "@/services/iam/member-service";
import type { Location, LocationUser } from "@/types/business/location";
import type { Member } from "@/types/iam/member";

type LocationUsersDrawerProps = {
  open: boolean;
  /** Must be a stable function (useCallback): Drawer re-focuses its close button whenever this changes. */
  onClose: () => void;
  location: Location | null;
  canAssign: boolean;
  canRemove: boolean;
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export default function LocationUsersDrawer({
  open,
  onClose,
  location,
  canAssign,
  canRemove,
}: LocationUsersDrawerProps) {
  const { toast } = useToast();
  const { hasPermission } = useAuth();

  const locationId = location?.id;
  const locationActive = location?.status === "ACTIVE";
  // Picking a member needs USER_READ (the member list), on top of LOCATION_USER_ASSIGN.
  const canPickMember = canAssign && hasPermission(PERMISSIONS.USER_READ);

  const usersQuery = useLocationUsers(locationId, { enabled: open });
  const membersQuery = useQuery<Member[], ApiError>({
    queryKey: ["iam", "members", "all"],
    queryFn: ({ signal }) => memberService.listAll(signal),
    enabled: open && canPickMember,
  });
  const assignUser = useAssignUserToLocation();
  const removeUser = useRemoveUserFromLocation();

  const [selectedUserId, setSelectedUserId] = useState("");
  const [userToRemove, setUserToRemove] = useState<LocationUser | null>(null);

  // While the confirm dialog is open, Escape must close only the dialog, not this drawer too.
  const confirmingRef = useRef(false);
  confirmingRef.current = userToRemove !== null;
  const handleDrawerClose = useCallback(() => {
    if (!confirmingRef.current) onClose();
  }, [onClose]);
  const closeConfirm = useCallback(() => setUserToRemove(null), []);

  useEffect(() => {
    if (!open) {
      setSelectedUserId("");
      setUserToRemove(null);
    }
  }, [open]);

  const users = usersQuery.data ?? [];

  // Active members who are not already in this location. (A member of another location is refused by the backend.)
  const candidates = useMemo(() => {
    const assigned = new Set(users.map((u) => u.id));
    return (membersQuery.data ?? [])
      .filter((m) => m.status === "ACTIVE" && !assigned.has(m.id))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  }, [membersQuery.data, users]);

  async function handleAssign() {
    if (!locationId || !selectedUserId) return;
    const member = candidates.find((m) => m.id === selectedUserId);
    try {
      await assignUser.mutateAsync({ locationId, userId: selectedUserId });
      toast({
        title: "User assigned",
        description: `${member?.name ?? "The user"} now works at ${location?.name}.`,
      });
      setSelectedUserId("");
    } catch (error) {
      toast({
        title: "Could not assign user",
        description: getErrorMessage(error),
        variant: "error",
      });
    }
  }

  async function confirmRemove() {
    if (!locationId || !userToRemove) return;
    try {
      await removeUser.mutateAsync({ locationId, userId: userToRemove.id });
      toast({
        title: "User removed",
        description: `${userToRemove.name} no longer works at ${location?.name}.`,
      });
      setUserToRemove(null);
    } catch (error) {
      toast({
        title: "Could not remove user",
        description: getErrorMessage(error),
        variant: "error",
      });
    }
  }

  return (
    <>
      <Drawer open={open} onClose={handleDrawerClose} title={location ? `Users at ${location.name}` : "Users"}>
        <div className="flex flex-col gap-5">
          {canAssign && (
            <section aria-label="Assign a user" className="flex flex-col gap-2">
              {!locationActive ? (
                <p className="text-sm text-muted-foreground">Activate this location before assigning users to it.</p>
              ) : !canPickMember ? (
                <p className="text-sm text-muted-foreground">
                  Choosing a member also needs the USER_READ permission.
                </p>
              ) : (
                <>
                  <label htmlFor="assign-user" className="text-sm font-medium text-foreground">
                    Assign a user
                  </label>
                  <div className="flex gap-2">
                    <div className="min-w-0 flex-1">
                      <Select
                        id="assign-user"
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        disabled={membersQuery.isLoading || assignUser.isPending}
                      >
                        <option value="">
                          {membersQuery.isLoading ? "Loading members..." : "Select a member"}
                        </option>
                        {candidates.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.userName})
                          </option>
                        ))}
                      </Select>
                    </div>
                    <Button onClick={handleAssign} disabled={!selectedUserId} loading={assignUser.isPending}>
                      Assign
                    </Button>
                  </div>
                  {membersQuery.isError ? (
                    <p role="alert" className="text-sm text-red-600">
                      {getErrorMessage(membersQuery.error, "Could not load members.")}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      A user belongs to one location only. Users whose role works across all locations cannot be assigned.
                    </p>
                  )}
                </>
              )}
            </section>
          )}

          <section aria-label="Assigned users" className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-foreground">Assigned users</h3>

            {usersQuery.isLoading ? (
              <ul className="flex flex-col gap-2" aria-busy="true">
                {Array.from({ length: 3 }, (_, i) => (
                  <li key={i} className="h-12 animate-pulse bg-muted motion-reduce:animate-none" />
                ))}
              </ul>
            ) : usersQuery.isError ? (
              <div>
                <p role="alert" className="text-sm text-foreground">
                  {getErrorMessage(usersQuery.error, "Could not load the users.")}
                </p>
                <Button variant="secondary" size="sm" onClick={() => void usersQuery.refetch()} className="mt-2">
                  Try again
                </Button>
              </div>
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No users are assigned to this location yet.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border border border-border">
                {users.map((user) => (
                  <li key={user.id} className="flex items-center gap-3 px-3 py-2.5">
                    <Avatar name={user.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {user.userName} · {formatRoleName(user.roleName)} · since{" "}
                        {dateFormat.format(new Date(user.assignedAt))}
                      </p>
                    </div>
                    {!user.active && <Badge variant="danger">Suspended</Badge>}
                    {canRemove && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUserToRemove(user)}
                        aria-label={`Remove ${user.name} from ${location?.name}`}
                      >
                        Remove
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </Drawer>

      <ConfirmDialog
        open={userToRemove !== null}
        onClose={closeConfirm}
        onConfirm={confirmRemove}
        title="Remove this user from the location?"
        description={
          userToRemove
            ? `${userToRemove.name} will no longer be assigned to ${location?.name}. You can assign them again later.`
            : undefined
        }
        confirmLabel="Remove"
        destructive
        loading={removeUser.isPending}
      />
    </>
  );
}