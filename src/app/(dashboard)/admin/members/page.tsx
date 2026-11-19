"use client";

import { useCallback, useState } from "react";
import AddMemberDrawer from "@/components/members/AddMemberDrawer";
import MembersTable, { type MemberAbilities } from "@/components/members/MembersTable";
import MembersToolbar from "@/components/members/MembersToolbar";
import Card from "@/components/ui/Card";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import { useAuth } from "@/hooks/iam/use-auth";
import { useMembers } from "@/hooks/iam/use-members";
import { getErrorMessage } from "@/lib/api/api-error";
import { PERMISSIONS, SYSTEM_ROLES } from "@/lib/iam/permission-codes";
import type { Member } from "@/types/iam/member";
import type { CreateUserRequest } from "@/types/iam/member-dto";

export default function MembersPage() {
  const { toast } = useToast();
  const auth = useAuth();

  const canRead = auth.hasPermission(PERMISSIONS.USER_READ);
  const canCreate = auth.hasPermission(PERMISSIONS.USER_CREATE);
  const abilities: MemberAbilities = {
    assignRole: auth.hasAllPermissions([PERMISSIONS.USER_UPDATE, PERMISSIONS.USER_ASSIGN_ROLE]),
    activate: auth.hasPermission(PERMISSIONS.USER_ACTIVATE),
    // The backend also requires the OWNER role to deactivate a user.
    deactivate: auth.hasPermission(PERMISSIONS.USER_DEACTIVATE) && auth.hasRole(SYSTEM_ROLES.OWNER),
  };

  const data = useMembers(canRead);

  const [addOpen, setAddOpen] = useState(false);
  const [memberToSuspend, setMemberToSuspend] = useState<Member | null>(null);
  const [suspending, setSuspending] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ member: Member; roleId: string } | null>(null);
  const [changingRole, setChangingRole] = useState(false);

  // Stable identities: Drawer and ConfirmDialog re-run effects when these change.
  const closeAdd = useCallback(() => setAddOpen(false), []);
  const closeSuspend = useCallback(() => setMemberToSuspend(null), []);
  const closeRoleChange = useCallback(() => setPendingRoleChange(null), []);

  const roleNameOf = (roleId: string) => data.roles.find((r) => r.id === roleId)?.name ?? "Unknown role";

  async function handleCreate(request: CreateUserRequest) {
    const created = await data.create(request);
    toast({
      title: "Member added",
      description: `Their username is ${created.userName}. Share it with the password you set.`,
      duration: 10_000,
    });
  }

  /** The dropdown only asks: nothing changes until the admin confirms. */
  function requestRoleChange(member: Member, roleId: string) {
    if (roleId === member.roleId) return;
    setPendingRoleChange({ member, roleId });
  }

  async function confirmRoleChange() {
    if (!pendingRoleChange) return;
    const { member, roleId } = pendingRoleChange;
    setChangingRole(true);
    try {
      await data.changeRole(member, roleId);
      toast({ title: "Role updated", description: `${member.name} is now ${roleNameOf(roleId)}.` });
      setPendingRoleChange(null);
    } catch (error) {
      toast({
        title: "Could not change role",
        description: getErrorMessage(error),
        variant: "error",
      });
    } finally {
      setChangingRole(false);
    }
  }

  async function handleToggleSuspend(member: Member) {
    if (member.status === "ACTIVE") {
      setMemberToSuspend(member);
      return;
    }
    try {
      await data.setStatus(member.id, "ACTIVE");
      toast({ title: "Member reactivated", description: `${member.name} can sign in again.` });
    } catch (error) {
      toast({
        title: "Could not reactivate member",
        description: getErrorMessage(error),
        variant: "error",
      });
    }
  }

  async function confirmSuspend() {
    if (!memberToSuspend) return;
    setSuspending(true);
    try {
      await data.setStatus(memberToSuspend.id, "SUSPENDED");
      toast({
        title: "Member suspended",
        description: `${memberToSuspend.name} can no longer sign in.`,
      });
      setMemberToSuspend(null);
    } catch (error) {
      toast({
        title: "Could not suspend member",
        description: getErrorMessage(error),
        variant: "error",
      });
    } finally {
      setSuspending(false);
    }
  }

  if (!auth.isLoading && !canRead) {
    return (
      <Card>
        <p className="text-sm font-medium text-foreground">You do not have access to members</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask an administrator to give your role the USER_READ permission.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <MembersToolbar
        search={data.search}
        onSearchChange={data.setSearch}
        onAdd={() => setAddOpen(true)}
        canAdd={canCreate && data.roles.length > 0}
      />

      <Card padded={false}>
        <MembersTable
          members={data.members}
          roles={data.roles}
          loading={auth.isLoading || data.loading}
          error={data.error}
          searching={data.search.trim() !== ""}
          sort={data.sort}
          abilities={abilities}
          currentUserId={auth.user?.userId ?? null}
          onSort={data.toggleSort}
          onRetry={data.retry}
          onChangeRole={requestRoleChange}
          onToggleSuspend={handleToggleSuspend}
        />
      </Card>

      <AddMemberDrawer
        open={addOpen}
        onClose={closeAdd}
        roles={data.roles}
        onCreate={handleCreate}
      />

      <ConfirmDialog
        open={pendingRoleChange !== null}
        onClose={closeRoleChange}
        onConfirm={confirmRoleChange}
        title="Change this member's role?"
        description={
          pendingRoleChange
            ? `${pendingRoleChange.member.name} will go from ${roleNameOf(pendingRoleChange.member.roleId)} to ${roleNameOf(pendingRoleChange.roleId)} and get that role's permissions.`
            : undefined
        }
        confirmLabel="Change role"
        loading={changingRole}
      />

      <ConfirmDialog
        open={memberToSuspend !== null}
        onClose={closeSuspend}
        onConfirm={confirmSuspend}
        title="Suspend this member?"
        description={
          memberToSuspend
            ? `${memberToSuspend.name} will be signed out and blocked until you reactivate them.`
            : undefined
        }
        confirmLabel="Suspend"
        destructive
        loading={suspending}
      />
    </div>
  );
}