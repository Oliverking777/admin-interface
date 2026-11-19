/** A member is a backend "user". Active users can log in; deactivated ones are shown as Suspended. */
export type MemberStatus = "ACTIVE" | "SUSPENDED";

/** What the role dropdowns need. `name` is already formatted for display ("Stock keeper"). */
export type RoleOption = {
  id: string;
  name: string;
};

/** Frontend representation of a member (what the UI works with). */
export type Member = {
  id: string;
  firstName: string;
  lastName: string;
  /** First and last name together. */
  name: string;
  /** Generated login name, e.g. "john.doe". Never changes. */
  userName: string;
  roleId: string;
  status: MemberStatus;
  /** ISO date-time, or null when the member was never active. */
  lastActiveAt: string | null;
};