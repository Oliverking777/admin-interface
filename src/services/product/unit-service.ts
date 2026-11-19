/**
 * Unit operations from the frontend's point of view.
 * Talks to /units through the shared apiClient.
 */
import { apiClient } from "@/lib/api/api-client";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import type { Unit } from "@/types/product/unit";
import type {
  CreateUnitRequest,
  UnitListQuery,
  UnitPageResponse,
  UnitResponse,
  UpdateUnitRequest,
} from "@/types/product/unit-dto";
import type { ApiResponse } from "@/types/iam/common-dto";

const UNITS_PATH = "/units";

export function toUnit(dto: UnitResponse): Unit {
  return {
    id: dto.unitId,
    code: dto.unitCode,
    name: dto.unitName,
    status: dto.unitStatus,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export const unitService = {
  /**
   * One page of units, ordered by name. Page numbers start at 0, size is 1 to 100.
   * Pass `filters.status` to see only active or only inactive units. Needs UNIT_READ.
   */
  async listPage(
    page: number,
    size: number,
    filters?: UnitListQuery,
    signal?: AbortSignal,
  ): Promise<UnitPageResponse> {
    const response = await apiClient.get<ApiResponse<UnitPageResponse>>(UNITS_PATH, {
      query: { page, size, status: filters?.status },
      signal,
    });
    return response.data;
  },

  /** Every unit (all pages), optionally filtered by status. Needs UNIT_READ. */
  async listAll(filters?: UnitListQuery, signal?: AbortSignal): Promise<Unit[]> {
    const units = await fetchAllPages((page, size) => unitService.listPage(page, size, filters, signal));
    return units.map(toUnit);
  },

  /** One unit by id. A 404 ApiError means it does not exist. Needs UNIT_READ. */
  async getById(id: string, signal?: AbortSignal): Promise<Unit> {
    const response = await apiClient.get<ApiResponse<UnitResponse>>(`${UNITS_PATH}/${id}`, { signal });
    return toUnit(response.data);
  },

  /**
   * Creates an active unit. A 409 ApiError means the name (ignoring case) or the code is already in use;
   * a 400 means an invalid name or code. Needs UNIT_CREATE.
   */
  async create(request: CreateUnitRequest): Promise<Unit> {
    const response = await apiClient.post<ApiResponse<UnitResponse>>(UNITS_PATH, request);
    return toUnit(response.data);
  },

  /**
   * Renames a unit; the code never changes. A 409 ApiError means another unit already uses the name,
   * a 404 that the unit does not exist, and a 400 an invalid name. Needs UNIT_UPDATE.
   */
  async update(id: string, request: UpdateUnitRequest): Promise<Unit> {
    const response = await apiClient.put<ApiResponse<UnitResponse>>(`${UNITS_PATH}/${id}`, request);
    return toUnit(response.data);
  },

  /** Makes the unit available for new assignments again. 409 if it is already active. Needs UNIT_UPDATE. */
  async activate(id: string): Promise<Unit> {
    const response = await apiClient.post<ApiResponse<UnitResponse>>(`${UNITS_PATH}/${id}/activate`);
    return toUnit(response.data);
  },

  /**
   * Retires the unit: it is kept, and only new assignments are blocked (products already using it keep working).
   * 409 if it is already inactive. Needs UNIT_DEACTIVATE.
   */
  async deactivate(id: string): Promise<Unit> {
    const response = await apiClient.post<ApiResponse<UnitResponse>>(`${UNITS_PATH}/${id}/deactivate`);
    return toUnit(response.data);
  },
};