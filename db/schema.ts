import { sql } from "drizzle-orm";
import { check, index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

const timestamps = {
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
};

export const brands = sqliteTable("brands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  logoUrl: text("logo_url"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, table => [uniqueIndex("brands_name_unique").on(table.name), uniqueIndex("brands_slug_unique").on(table.slug)]);

export const phoneModels = sqliteTable("phone_models", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  brandId: integer("brand_id").notNull().references(() => brands.id),
  modelName: text("model_name").notNull(),
  modelNumber: text("model_number"),
  series: text("series"),
  launchYear: integer("launch_year"),
  description: text("description"),
  primaryImageUrl: text("primary_image_url"),
  networkType: text("network_type").notNull().default("5G"),
  simType: text("sim_type"),
  esimSupported: integer("esim_supported", { mode: "boolean" }).notNull().default(false),
  operatingSystem: text("operating_system"),
  chipset: text("chipset"),
  displaySize: real("display_size"),
  batteryCapacityMah: integer("battery_capacity_mah"),
  warrantyMonths: integer("warranty_months").notNull().default(12),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
}, table => [uniqueIndex("models_brand_name_unique").on(table.brandId, table.modelName), index("models_brand_idx").on(table.brandId)]);

export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  supplierName: text("supplier_name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  email: text("email"),
  gstin: text("gstin"),
  address: text("address"),
  notes: text("notes"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  ...timestamps,
});

export const phoneVariants = sqliteTable("phone_variants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  phoneModelId: integer("phone_model_id").notNull().references(() => phoneModels.id),
  sku: text("sku").notNull(),
  barcode: text("barcode"),
  slug: text("slug").notNull(),
  ramGb: integer("ram_gb").notNull(),
  storageGb: integer("storage_gb").notNull(),
  storageType: text("storage_type"),
  colourName: text("colour_name").notNull(),
  colourHex: text("colour_hex").notNull().default("#a9c4d4"),
  regionVariant: text("region_variant").notNull().default("India"),
  condition: text("condition").notNull().default("New"),
  grade: text("grade"),
  boxStatus: text("box_status").notNull().default("Sealed"),
  includedAccessories: text("included_accessories"),
  mrp: real("mrp").notNull(),
  sellingPrice: real("selling_price").notNull(),
  discountPrice: real("discount_price"),
  taxPercentage: real("tax_percentage").notNull().default(0),
  publicNotes: text("public_notes"),
  availableStock: integer("available_stock").notNull().default(0),
  reservedStock: integer("reserved_stock").notNull().default(0),
  reorderLevel: integer("reorder_level").notNull().default(2),
  stockLocation: text("stock_location"),
  rackNumber: text("rack_number"),
  imageUrl: text("image_url").notNull().default("/phones/phone-silver.webp"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  featured: integer("featured", { mode: "boolean" }).notNull().default(false),
  ...timestamps,
}, table => [
  uniqueIndex("variants_sku_unique").on(table.sku),
  uniqueIndex("variants_slug_unique").on(table.slug),
  uniqueIndex("variants_exact_unique").on(table.phoneModelId, table.ramGb, table.storageGb, table.colourName, table.regionVariant, table.condition),
  index("variants_model_idx").on(table.phoneModelId),
  index("variants_price_idx").on(table.sellingPrice),
  check("stock_nonnegative", sql`${table.availableStock} >= 0 AND ${table.reservedStock} >= 0 AND ${table.availableStock} >= ${table.reservedStock}`),
  check("price_valid", sql`${table.mrp} >= 0 AND ${table.sellingPrice} >= 0 AND ${table.sellingPrice} <= ${table.mrp}`),
]);

export const inventoryPrivate = sqliteTable("inventory_private", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  phoneVariantId: integer("phone_variant_id").notNull().references(() => phoneVariants.id),
  purchasePrice: real("purchase_price").notNull().default(0),
  landedCost: real("landed_cost").notNull().default(0),
  minimumSellingPrice: real("minimum_selling_price").notNull().default(0),
  supplierId: integer("supplier_id").references(() => suppliers.id),
  purchaseInvoiceNumber: text("purchase_invoice_number"),
  purchaseDate: text("purchase_date"),
  internalNotes: text("internal_notes"),
  ...timestamps,
}, table => [uniqueIndex("inventory_private_variant_unique").on(table.phoneVariantId)]);

export const phoneUnits = sqliteTable("phone_units", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  phoneVariantId: integer("phone_variant_id").notNull().references(() => phoneVariants.id),
  imei1: text("imei_1"),
  imei2: text("imei_2"),
  serialNumber: text("serial_number"),
  purchaseDate: text("purchase_date"),
  warrantyStatus: text("warranty_status"),
  unitStatus: text("unit_status").notNull().default("in_stock"),
  ...timestamps,
}, table => [uniqueIndex("phone_units_imei1_unique").on(table.imei1), index("phone_units_variant_idx").on(table.phoneVariantId)]);

export const stockMovements = sqliteTable("stock_movements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  phoneVariantId: integer("phone_variant_id").notNull().references(() => phoneVariants.id),
  movementType: text("movement_type").notNull(),
  quantityChange: integer("quantity_change").notNull(),
  quantityBefore: integer("quantity_before").notNull(),
  quantityAfter: integer("quantity_after").notNull(),
  referenceNumber: text("reference_number"),
  reason: text("reason").notNull(),
  performedBy: text("performed_by").notNull().default("admin"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("stock_movements_variant_idx").on(table.phoneVariantId), index("stock_movements_date_idx").on(table.createdAt)]);

export const priceHistory = sqliteTable("price_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  phoneVariantId: integer("phone_variant_id").notNull().references(() => phoneVariants.id),
  oldMrp: real("old_mrp"),
  newMrp: real("new_mrp"),
  oldSellingPrice: real("old_selling_price"),
  newSellingPrice: real("new_selling_price"),
  changedBy: text("changed_by").notNull().default("admin"),
  reason: text("reason"),
  changedAt: text("changed_at").notNull().default(sql`CURRENT_TIMESTAMP`),
}, table => [index("price_history_variant_idx").on(table.phoneVariantId)]);

export const auditLogs = sqliteTable("audit_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  administratorId: text("administrator_id").notNull().default("admin"),
  action: text("action").notNull(),
  tableName: text("table_name").notNull(),
  recordId: integer("record_id"),
  beforeData: text("before_data", { mode: "json" }),
  afterData: text("after_data", { mode: "json" }),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const shopSettings = sqliteTable("shop_settings", {
  id: integer("id").primaryKey().default(1),
  shopName: text("shop_name").notNull().default("PhoneStock Inventory"),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  address: text("address"),
  currency: text("currency").notNull().default("INR"),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  exactStockVisible: integer("exact_stock_visible", { mode: "boolean" }).notNull().default(true),
  defaultReorderLevel: integer("default_reorder_level").notNull().default(2),
  ...timestamps,
});
