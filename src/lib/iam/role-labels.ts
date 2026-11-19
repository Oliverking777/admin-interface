import type { LocationScope } from "@/types/iam/user";

export const LOCATION_SCOPE_LABELS: Record<LocationScope, string> = {
  ALL: "All locations",
  ASSIGNED: "Assigned location",
};

export const LOCATION_SCOPE_HELP: Record<LocationScope, string> = {
  ALL: "Users work across every location and need no assignment.",
  ASSIGNED: "Each user must belong to exactly one location.",
};