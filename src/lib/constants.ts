// FACTORYFLOW - shared constants & string-union "enums".
// (Prisma enums aren't supported on SQLite; these are validated in the app
// layer via Zod. On PostgreSQL they could become native enums.)

export const ROLES = {
  SALESMAN: "SALESMAN",
  ADMIN: "ADMIN",
  PRODUCTION: "PRODUCTION",
  ACCOUNTANT: "ACCOUNTANT",
  OWNER: "OWNER",
} as const;
export type Role = (typeof ROLES)[keyof typeof ROLES];
export const ALL_ROLES: Role[] = [
  ROLES.SALESMAN,
  ROLES.ADMIN,
  ROLES.PRODUCTION,
  ROLES.ACCOUNTANT,
  ROLES.OWNER,
];

export const ITEM_CATEGORY = {
  RAW_MATERIAL: "RAW_MATERIAL",
  PACKAGING: "PACKAGING",
  FINISHED_GOOD: "FINISHED_GOOD",
} as const;
export type ItemCategory = (typeof ITEM_CATEGORY)[keyof typeof ITEM_CATEGORY];

export const ORDER_STATUS = {
  DRAFT: "DRAFT",
  SUBMITTED: "SUBMITTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  INVOICED: "INVOICED",
  PARTIALLY_DISPATCHED: "PARTIALLY_DISPATCHED",
  DISPATCHED: "DISPATCHED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export const INVOICE_STATUS = {
  POSTED: "POSTED",
  PARTIALLY_PAID: "PARTIALLY_PAID",
  PAID: "PAID",
  CANCELLED: "CANCELLED",
} as const;
export type InvoiceStatus = (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS];

export const PRODUCTION_STATUS = {
  DRAFT: "DRAFT",
  POSTED: "POSTED",
  REVERSED: "REVERSED",
} as const;
export type ProductionStatus =
  (typeof PRODUCTION_STATUS)[keyof typeof PRODUCTION_STATUS];

export const BOM_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
} as const;

export const MOVEMENT_TYPES = {
  OPENING: "OPENING",
  PURCHASE_RECEIPT: "PURCHASE_RECEIPT",
  PRODUCTION_ISSUE: "PRODUCTION_ISSUE",
  PRODUCTION_RECEIPT: "PRODUCTION_RECEIPT",
  DISPATCH: "DISPATCH",
  CUSTOMER_RETURN: "CUSTOMER_RETURN",
  DAMAGE: "DAMAGE",
  ADJUSTMENT: "ADJUSTMENT",
  REVERSAL: "REVERSAL",
} as const;
export type MovementType = (typeof MOVEMENT_TYPES)[keyof typeof MOVEMENT_TYPES];

// Source document types that produced a stock movement (for traceability).
export const SOURCE_DOC = {
  OPENING: "OPENING",
  PURCHASE: "PURCHASE",
  PRODUCTION_RUN: "PRODUCTION_RUN",
  SALES_ORDER: "SALES_ORDER",
  INVOICE: "INVOICE",
  DISPATCH: "DISPATCH",
  ADJUSTMENT: "ADJUSTMENT",
} as const;

export const CUSTOMER_TYPE = {
  RETAILER: "RETAILER",
  DISTRIBUTOR: "DISTRIBUTOR",
} as const;

export const PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "BANK",
  "CHEQUE",
  "RTGS",
  "NEFT",
] as const;

// Variance severity thresholds applied relative to the configured tolerance.
// |v| <= tolerance          => GREEN (within tolerance)
// tolerance < |v| <= 2x tol  => AMBER (warning)
// |v| > 2x tol              => RED   (beyond tolerance)
export type VarianceFlag = "GREEN" | "AMBER" | "RED";

// Seller (our company) shown on GST invoices — fictional demo data from .env.
export const SELLER = {
  name: process.env.SELLER_NAME ?? "Annapoorna Snacks Pvt Ltd (DEMO)",
  gstin: process.env.SELLER_GSTIN ?? "33ABCDE1234F1Z5",
  address:
    process.env.SELLER_ADDRESS ??
    "12 Industrial Estate, Tiruchirappalli, Tamil Nadu - 620001",
  state: process.env.SELLER_STATE ?? "Tamil Nadu",
  stateCode: process.env.SELLER_STATE_CODE ?? "33",
};

// Default production variance tolerance (percent), overridable per BOM.
export const DEFAULT_TOLERANCE = Number(process.env.DEFAULT_TOLERANCE ?? 3);

// Session cookie names.
export const SESSION_COOKIE = "ff_session";
export const ROLE_COOKIE = "ff_role";
