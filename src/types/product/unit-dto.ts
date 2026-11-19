/**
 * Request/response shapes of the /units endpoints.
 * They match UnitResponse, UnitPageResponse, CreateUnitRequest and UpdateUnitRequest on the backend
 * (tsgp.yah_enterprise.unit.presentation.dto).
 */
import type { PageResponse } from "@/types/iam/common-dto";
import type { ISODateTime, UUID } from "@/types/iam/user";

/** Mirrors the backend UnitStatus enum (sent as a string). */
export type UnitStatusDto = "ACTIVE" | "INACTIVE";

/** The unit returned by the /units endpoints. */
export interface UnitResponse {
  unitId: UUID;
  unitName: string;
  /** Generated (U0001...), unique, never changes. */
  unitCode: string;
  unitStatus: UnitStatusDto;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type UnitPageResponse = PageResponse<UnitResponse>;

/** The code is not sent: the backend generates it (U0001, U0002...). */
export interface CreateUnitRequest {
  /** Required. Unique ignoring case. Max 50 characters. */
  unitName: string;
}

/**
 * Only the name can change. The code never changes, and the status is changed with the
 * activate/deactivate endpoints. A name left out (or null) is not changed; a blank name is rejected with a 400.
 */
export interface UpdateUnitRequest {
  /** Max 50 characters. Must not belong to another unit (ignoring case). */
  unitName?: string;
}

/** Query parameter of GET /units (besides page and size). Units are ordered by name. */
export interface UnitListQuery {
  /** Only units with this status. */
  status?: UnitStatusDto;
}