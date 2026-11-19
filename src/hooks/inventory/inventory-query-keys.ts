/**
 * Query keys for the Inventory module, in one place so invalidation is never a typo.
 * Keys are hierarchical:
 *   inventoryKeys.stockLevels()      refreshes stock levels, low-stock lists and single product stocks
 *   inventoryKeys.movements()        refreshes the ledger
 *   inventoryKeys.adjustments()      refreshes adjustment lists and details
 *   inventoryKeys.initializations()  refreshes stock initialization lists and details
 * Approving an adjustment and submitting an initialization both move stock, so they invalidate
 * stock levels and the ledger too.
 */

import type {
  AdjustmentStatusDto,
  MovementTypeDto,
  StockInitializationStatusDto,
} from "@/types/inventory/inventory-dto";
import type { ISODateTime, UUID } from "@/types/iam/user";

export const inventoryKeys = {
  all: ["inventory"] as const,

  /* Stock levels, low-stock lists and single product stocks (everything that shows a quantity). */
  stockLevels: () => [...inventoryKeys.all, "stock-levels"] as const,
  stockLevelList: (params: {
    page: number;
    size: number;
    locationId: UUID | null;
    productId: UUID | null;
  }) => [...inventoryKeys.stockLevels(), "list", params] as const,
  stockLevelAll: (filters: { locationId: UUID | null; productId: UUID | null }) =>
    [...inventoryKeys.stockLevels(), "all", filters] as const,
  lowStockList: (params: { page: number; size: number; locationId: UUID | null }) =>
    [...inventoryKeys.stockLevels(), "low-stock", params] as const,
  productStock: (productId: UUID, locationId: UUID) =>
    [...inventoryKeys.stockLevels(), "product", productId, locationId] as const,

  /* The ledger. */
  movements: () => [...inventoryKeys.all, "movements"] as const,
  movementList: (params: {
    page: number;
    size: number;
    productId: UUID | null;
    locationId: UUID | null;
    movementType: MovementTypeDto | null;
    from: ISODateTime | null;
    to: ISODateTime | null;
  }) => [...inventoryKeys.movements(), "list", params] as const,

  /* Adjustments. */
  adjustments: () => [...inventoryKeys.all, "adjustments"] as const,
  adjustmentList: (params: {
    page: number;
    size: number;
    status: AdjustmentStatusDto | null;
    locationId: UUID | null;
    productId: UUID | null;
  }) => [...inventoryKeys.adjustments(), "list", params] as const,
  adjustment: (adjustmentId: UUID) =>
    [...inventoryKeys.adjustments(), "detail", adjustmentId] as const,

  /* Stock initializations. */
  initializations: () => [...inventoryKeys.all, "initializations"] as const,
  initializationList: (params: {
    page: number;
    size: number;
    status: StockInitializationStatusDto | null;
    locationId: UUID | null;
  }) => [...inventoryKeys.initializations(), "list", params] as const,
  initializationAll: (filters: { status: StockInitializationStatusDto | null; locationId: UUID | null }) =>
    [...inventoryKeys.initializations(), "all", filters] as const,
  initialization: (initializationId: UUID) =>
    [...inventoryKeys.initializations(), "detail", initializationId] as const,
};