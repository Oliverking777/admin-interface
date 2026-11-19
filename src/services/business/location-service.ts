/**
 * Location operations from the frontend's point of view.
 * Talks to /locations through the shared apiClient.
 */
import { apiClient } from "@/lib/api/api-client";
import { fetchAllPages } from "@/lib/api/fetch-all-pages";
import type { Location, LocationUser } from "@/types/business/location";
import type {
  AssignUserToLocationRequest,
  CreateLocationRequest,
  LocationPageResponse,
  LocationResponse,
  LocationUserResponse,
  UpdateLocationRequest,
} from "@/types/business/location-dto";
import type { ApiResponse } from "@/types/iam/common-dto";
import type { UUID } from "@/types/iam/user";

const LOCATIONS_PATH = "/locations";

export function toLocation(dto: LocationResponse): Location {
  return {
    id: dto.locationId,
    code: dto.code,
    name: dto.name,
    type: dto.locationType,
    address: dto.address,
    status: dto.locationStatus,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toLocationUser(dto: LocationUserResponse): LocationUser {
  return {
    id: dto.userId,
    name: dto.fullName,
    userName: dto.userName,
    roleName: dto.roleName,
    active: dto.active,
    assignedAt: dto.assignedAt,
  };
}

export const locationService = {
  /** One page of locations, ordered by name. Page numbers start at 0, size is 1 to 100. Needs LOCATION_READ. */
  async listPage(page: number, size: number, signal?: AbortSignal): Promise<LocationPageResponse> {
    const response = await apiClient.get<ApiResponse<LocationPageResponse>>(LOCATIONS_PATH, {
      query: { page, size },
      signal,
    });
    return response.data;
  },

  /** Every location (all pages). Needs LOCATION_READ. */
  async listAll(signal?: AbortSignal): Promise<Location[]> {
    const locations = await fetchAllPages((page, size) => locationService.listPage(page, size, signal));
    return locations.map(toLocation);
  },

  /** One location by id. A 404 ApiError means it does not exist. Needs LOCATION_READ. */
  async getById(id: string, signal?: AbortSignal): Promise<Location> {
    const response = await apiClient.get<ApiResponse<LocationResponse>>(`${LOCATIONS_PATH}/${id}`, { signal });
    return toLocation(response.data);
  },

  /**
   * The location the logged-in user is assigned to, or null if they have none (e.g. an owner).
   * Needs no permission, only a session.
   */
  async getMine(signal?: AbortSignal): Promise<Location | null> {
    const response = await apiClient.get<ApiResponse<LocationResponse | null>>(`${LOCATIONS_PATH}/me`, { signal });
    // The backend leaves "data" out of the JSON when there is no location.
    return response.data ? toLocation(response.data) : null;
  },

  /**
   * Creates an active location. A code already in use gives a 409 ApiError.
   * Needs LOCATION_CREATE.
   */
  async create(request: CreateLocationRequest): Promise<Location> {
    const response = await apiClient.post<ApiResponse<LocationResponse>>(LOCATIONS_PATH, request);
    return toLocation(response.data);
  },

  /** Changes the name, type and/or address. Fields left out stay unchanged. Needs LOCATION_UPDATE. */
  async update(id: string, request: UpdateLocationRequest): Promise<Location> {
    const response = await apiClient.put<ApiResponse<LocationResponse>>(`${LOCATIONS_PATH}/${id}`, request);
    return toLocation(response.data);
  },

  /** Makes the location operational. 409 if it is already active. Needs LOCATION_ACTIVATE. */
  async activate(id: string): Promise<Location> {
    const response = await apiClient.post<ApiResponse<LocationResponse>>(`${LOCATIONS_PATH}/${id}/activate`);
    return toLocation(response.data);
  },

  /** Disables the location; its user assignments are kept. 409 if already inactive. Needs LOCATION_DEACTIVATE. */
  async deactivate(id: string): Promise<Location> {
    const response = await apiClient.post<ApiResponse<LocationResponse>>(`${LOCATIONS_PATH}/${id}/deactivate`);
    return toLocation(response.data);
  },

  /** The users assigned to a location, oldest assignment first. Needs LOCATION_USER_READ. */
  async listUsers(locationId: string, signal?: AbortSignal): Promise<LocationUser[]> {
    const response = await apiClient.get<ApiResponse<LocationUserResponse[]>>(
      `${LOCATIONS_PATH}/${locationId}/users`,
      { signal },
    );
    return response.data.map(toLocationUser);
  },

  /**
   * Assigns a user to a location. A 409 ApiError means: the location or the user is inactive,
   * the user already has a location, or the user's role works across all locations.
   * Needs LOCATION_USER_ASSIGN.
   */
  async assignUser(locationId: string, userId: string): Promise<LocationUser> {
    const body: AssignUserToLocationRequest = { userId };
    const response = await apiClient.post<ApiResponse<LocationUserResponse>>(
      `${LOCATIONS_PATH}/${locationId}/users`,
      body,
    );
    return toLocationUser(response.data);
  },

  /** Removes a user from a location. A 404 ApiError means the user is not assigned to it. Needs LOCATION_USER_REMOVE. */
  async removeUser(locationId: string, userId: string): Promise<void> {
    await apiClient.delete<void>(`${LOCATIONS_PATH}/${locationId}/users/${userId}`);
  },
};

/**
 * Id of the location the logged-in user is assigned to, or null if they have none.
 * Used by auth-service when it loads the session, so keep this export and its name.
 */
export async function getMyLocationId(signal?: AbortSignal): Promise<UUID | null> {
  const location = await locationService.getMine(signal);
  return location?.id ?? null;
}