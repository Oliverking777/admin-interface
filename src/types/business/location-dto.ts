/**
 * Request/response shapes of the /locations endpoints.
 * They match LocationResponse, LocationPageResponse, LocationUserResponse, CreateLocationRequest,
 * UpdateLocationRequest and AssignUserToLocationRequest on the backend
 * (tsgp.yah_enterprise.location.presentation.dto).
 */
import type { PageResponse } from "@/types/iam/common-dto";
import type { ISODateTime, UUID } from "@/types/iam/user";

/** Mirrors the backend LocationType enum (sent as a string). */
export type LocationTypeDto = "WAREHOUSE" | "STORE";

/** Mirrors the backend LocationStatus enum (sent as a string). */
export type LocationStatusDto = "ACTIVE" | "INACTIVE";

/** The location returned by the /locations endpoints. */
export interface LocationResponse {
  locationId: UUID;
  /** Generated (LOC-0001...), unique. */
  code: string;
  name: string;
  locationType: LocationTypeDto;
  /** Null when the location has no address. */
  address: string | null;
  locationStatus: LocationStatusDto;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type LocationPageResponse = PageResponse<LocationResponse>;

/** A user assigned to a location. */
export interface LocationUserResponse {
  userId: UUID;
  fullName: string;
  userName: string;
  roleName: string;
  active: boolean;
  assignedAt: ISODateTime;
}

/** The code is not sent: the backend generates it (LOC-0001, LOC-0002...). */
export interface CreateLocationRequest {
  /** Required. Max 150 characters. */
  name: string;
  /** Required. */
  locationType: LocationTypeDto;
  /** Optional. Max 500 characters. Empty or null means no address. */
  address?: string | null;
}

/**
 * Fields left out (or null) are not changed. Nothing is required.
 * The code cannot be changed, and the status is changed with the activate/deactivate endpoints.
 * The name cannot be cleared (a blank name is rejected with a 400); an empty address removes the address.
 */
export interface UpdateLocationRequest {
  /** Max 150 characters. */
  name?: string;
  locationType?: LocationTypeDto;
  /** Max 500 characters. */
  address?: string;
}

export interface AssignUserToLocationRequest {
  userId: UUID;
}