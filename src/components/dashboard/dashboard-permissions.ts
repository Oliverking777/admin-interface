/**
 * Permission codes used by the dashboard and navigation.
 * Replace with the real codes from your backend.
 */
export const DASHBOARD_PERMISSIONS = {
  viewDashboard: "DASHBOARD_VIEW",
  viewSales: "SALE_VIEW",
  viewInventory: "INVENTORY_VIEW",
  viewPurchases: "PURCHASE_VIEW",
  viewTransfers: "TRANSFER_VIEW",
  viewCustomers: "CUSTOMER_VIEW",
  viewReports: "REPORT_VIEW",
  viewSettings: "SETTINGS_VIEW",
  viewAuditLog: "AUDIT_LOG_VIEW",
  createSale: "SALE_CREATE",
  createPurchase: "PURCHASE_CREATE",
  createTransfer: "TRANSFER_CREATE",
  createPayment: "PAYMENT_CREATE",
  createCustomer: "CUSTOMER_CREATE",
  createAdjustment: "STOCK_ADJUSTMENT_CREATE",
} as const;