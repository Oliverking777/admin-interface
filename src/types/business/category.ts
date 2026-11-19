/** A category is active (usable) or inactive (hidden from new products). */
export type CategoryStatus = "ACTIVE" | "INACTIVE";

/** Max length of a category name (matches CategoryName.MAX_LENGTH on the backend). */
export const CATEGORY_NAME_MAX_LENGTH = 100;

/** Max length of a category description (matches Category.MAX_DESCRIPTION_LENGTH on the backend). */
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 255;

/** What category dropdowns need (e.g. when picking a category for a product). */
export type CategoryOption = {
  id: string;
  name: string;
};

/** Frontend representation of a category (what the UI works with). */
export type Category = {
  id: string;
  /** Unique ignoring case. Max 100 characters. */
  name: string;
  /** Null when no description is set. Max 255 characters. */
  description: string | null;
  status: CategoryStatus;
  /** ISO date-time. */
  createdAt: string;
  /** ISO date-time. */
  updatedAt: string;
};