"use client";

import type { ReactNode } from "react";
import Avatar from "@/components/ui/Avatar";
import Badge, { type BadgeVariant } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import type { MemberSortKey, SortState } from "@/hooks/iam/use-members";
import type { Member, MemberStatus, RoleOption } from "@/types/iam/member";

/** What the current user is allowed to do. Controls are hidden when an action is not allowed. */
export type MemberAbilities = {
  assignRole: boolean;
  activate: boolean;
  deactivate: boolean;
};

type MembersTableProps = {
  members: Member[];
  roles: RoleOption[];
  loading: boolean;
  error: string | null;
  /** True when a search term is active (changes the empty message). */
  searching: boolean;
  sort: SortState;
  abilities: MemberAbilities;
  /** The logged-in user: they cannot suspend themselves. */
  currentUserId: string | null;
  onSort: (key: MemberSortKey) => void;
  onRetry: () => void;
  onChangeRole: (member: Member, roleId: string) => void;
  onToggleSuspend: (member: Member) => void;
};

const COLUMNS = 6;

const STATUS: Record<MemberStatus, { label: string; variant: BadgeVariant }> = {
  ACTIVE: { label: "Active", variant: "success" },
  SUSPENDED: { label: "Suspended", variant: "danger" },
};

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }, (_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          <TableCell>
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 animate-pulse bg-muted motion-reduce:animate-none" />
              <div className="h-4 w-32 animate-pulse bg-muted motion-reduce:animate-none" />
            </div>
          </TableCell>
          {Array.from({ length: COLUMNS - 1 }, (_, j) => (
            <TableCell key={j}>
              <div className="h-4 w-24 animate-pulse bg-muted motion-reduce:animate-none" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function MessageRow({ children }: { children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={COLUMNS} className="py-12 text-center">
        {children}
      </TableCell>
    </TableRow>
  );
}

export default function MembersTable({
  members,
  roles,
  loading,
  error,
  searching,
  sort,
  abilities,
  currentUserId,
  onSort,
  onRetry,
  onChangeRole,
  onToggleSuspend,
}: MembersTableProps) {
  const directionFor = (key: MemberSortKey) => (sort.key === key ? sort.direction : null);

  return (
    <Table aria-busy={loading || undefined} className="table-fixed">
      {/* Fixed column widths (they add up to 100%): the table always fits its card, long text is cut with "...". */}
      <colgroup>
        <col className="w-[24%]" />
        <col className="w-[16%]" />
        <col className="w-[14%]" />
        <col className="w-[16%]" />
        <col className="w-[12%]" />
        <col className="w-[18%]" />
      </colgroup>
      <TableHead>
        <tr>
          <TableHeaderCell onSort={() => onSort("name")} sortDirection={directionFor("name")}>
            Name
          </TableHeaderCell>
          <TableHeaderCell onSort={() => onSort("userName")} sortDirection={directionFor("userName")}>
            Username
          </TableHeaderCell>
          <TableHeaderCell>Last active</TableHeaderCell>
          <TableHeaderCell>Role</TableHeaderCell>
          <TableHeaderCell>Status</TableHeaderCell>
          <TableHeaderCell className="text-right">
            <span className="sr-only">Actions</span>
          </TableHeaderCell>
        </tr>
      </TableHead>

      <TableBody>
        {loading ? (
          <SkeletonRows />
        ) : error ? (
          <MessageRow>
            <p role="alert" className="text-sm text-foreground">
              {error}
            </p>
            <Button variant="secondary" size="sm" onClick={onRetry} className="mt-3">
              Try again
            </Button>
          </MessageRow>
        ) : members.length === 0 ? (
          <MessageRow>
            <p className="text-sm font-medium text-foreground">
              {searching ? "No members match your search" : "No members yet"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {searching
                ? "Try a different name, username or role."
                : "Use Add member to create the first one."}
            </p>
          </MessageRow>
        ) : (
          members.map((member) => {
            const status = STATUS[member.status];
            const roleName = roles.find((r) => r.id === member.roleId)?.name;
            const roleOptions = roleName
              ? roles
              : [{ id: member.roleId, name: "Unknown role" }, ...roles];

            const isSelf = member.id === currentUserId;
            const canToggle =
              !isSelf && (member.status === "ACTIVE" ? abilities.deactivate : abilities.activate);

            return (
              <TableRow key={member.id}>
                <TableCell className="overflow-hidden">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={member.name} />
                    <span className="min-w-0 truncate font-medium" title={member.name}>
                      {member.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="truncate text-muted-foreground" title={member.userName}>
                  {member.userName}
                </TableCell>
                <TableCell className="truncate">
                  {member.lastActiveAt ? (
                    <Badge>{dateFormat.format(new Date(member.lastActiveAt))}</Badge>
                  ) : (
                    <span className="text-muted-foreground">Never</span>
                  )}
                </TableCell>
                <TableCell className="overflow-hidden py-2">
                  {abilities.assignRole && roles.length > 0 ? (
                    <Select
                      variant="inline"
                      aria-label={`Role for ${member.name}`}
                      value={member.roleId}
                      onChange={(e) => onChangeRole(member, e.target.value)}
                    >
                      {roleOptions.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <span className="block truncate">{roleName ?? "Unknown role"}</span>
                  )}
                </TableCell>
                <TableCell className="truncate">
                  <Badge variant={status.variant}>{status.label}</Badge>
                </TableCell>
                <TableCell className="px-2 text-right">
                  {canToggle && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onToggleSuspend(member)}
                      aria-label={`${member.status === "SUSPENDED" ? "Reactivate" : "Suspend"} ${member.name}`}
                    >
                      {member.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}