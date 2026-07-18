CREATE TABLE `audit_logs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`administrator_id` text DEFAULT 'admin' NOT NULL,
	`action` text NOT NULL,
	`table_name` text NOT NULL,
	`record_id` integer,
	`before_data` text,
	`after_data` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`logo_url` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `brands_name_unique` ON `brands` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `brands_slug_unique` ON `brands` (`slug`);--> statement-breakpoint
CREATE TABLE `inventory_private` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone_variant_id` integer NOT NULL,
	`purchase_price` real DEFAULT 0 NOT NULL,
	`landed_cost` real DEFAULT 0 NOT NULL,
	`minimum_selling_price` real DEFAULT 0 NOT NULL,
	`supplier_id` integer,
	`purchase_invoice_number` text,
	`purchase_date` text,
	`internal_notes` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`phone_variant_id`) REFERENCES `phone_variants`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `inventory_private_variant_unique` ON `inventory_private` (`phone_variant_id`);--> statement-breakpoint
CREATE TABLE `phone_models` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`brand_id` integer NOT NULL,
	`model_name` text NOT NULL,
	`model_number` text,
	`series` text,
	`launch_year` integer,
	`description` text,
	`primary_image_url` text,
	`network_type` text DEFAULT '5G' NOT NULL,
	`sim_type` text,
	`esim_supported` integer DEFAULT false NOT NULL,
	`operating_system` text,
	`chipset` text,
	`display_size` real,
	`battery_capacity_mah` integer,
	`warranty_months` integer DEFAULT 12 NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `models_brand_name_unique` ON `phone_models` (`brand_id`,`model_name`);--> statement-breakpoint
CREATE INDEX `models_brand_idx` ON `phone_models` (`brand_id`);--> statement-breakpoint
CREATE TABLE `phone_units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone_variant_id` integer NOT NULL,
	`imei_1` text,
	`imei_2` text,
	`serial_number` text,
	`purchase_date` text,
	`warranty_status` text,
	`unit_status` text DEFAULT 'in_stock' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`phone_variant_id`) REFERENCES `phone_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `phone_units_imei1_unique` ON `phone_units` (`imei_1`);--> statement-breakpoint
CREATE INDEX `phone_units_variant_idx` ON `phone_units` (`phone_variant_id`);--> statement-breakpoint
CREATE TABLE `phone_variants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone_model_id` integer NOT NULL,
	`sku` text NOT NULL,
	`barcode` text,
	`slug` text NOT NULL,
	`ram_gb` integer NOT NULL,
	`storage_gb` integer NOT NULL,
	`storage_type` text,
	`colour_name` text NOT NULL,
	`colour_hex` text DEFAULT '#a9c4d4' NOT NULL,
	`region_variant` text DEFAULT 'India' NOT NULL,
	`condition` text DEFAULT 'New' NOT NULL,
	`grade` text,
	`box_status` text DEFAULT 'Sealed' NOT NULL,
	`included_accessories` text,
	`mrp` real NOT NULL,
	`selling_price` real NOT NULL,
	`discount_price` real,
	`tax_percentage` real DEFAULT 0 NOT NULL,
	`public_notes` text,
	`available_stock` integer DEFAULT 0 NOT NULL,
	`reserved_stock` integer DEFAULT 0 NOT NULL,
	`reorder_level` integer DEFAULT 2 NOT NULL,
	`stock_location` text,
	`rack_number` text,
	`image_url` text DEFAULT '/phones/phone-silver.webp' NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	`featured` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`phone_model_id`) REFERENCES `phone_models`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stock_nonnegative" CHECK("phone_variants"."available_stock" >= 0 AND "phone_variants"."reserved_stock" >= 0 AND "phone_variants"."available_stock" >= "phone_variants"."reserved_stock"),
	CONSTRAINT "price_valid" CHECK("phone_variants"."mrp" >= 0 AND "phone_variants"."selling_price" >= 0 AND "phone_variants"."selling_price" <= "phone_variants"."mrp")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `variants_sku_unique` ON `phone_variants` (`sku`);--> statement-breakpoint
CREATE UNIQUE INDEX `variants_slug_unique` ON `phone_variants` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `variants_exact_unique` ON `phone_variants` (`phone_model_id`,`ram_gb`,`storage_gb`,`colour_name`,`region_variant`,`condition`);--> statement-breakpoint
CREATE INDEX `variants_model_idx` ON `phone_variants` (`phone_model_id`);--> statement-breakpoint
CREATE INDEX `variants_price_idx` ON `phone_variants` (`selling_price`);--> statement-breakpoint
CREATE TABLE `price_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone_variant_id` integer NOT NULL,
	`old_mrp` real,
	`new_mrp` real,
	`old_selling_price` real,
	`new_selling_price` real,
	`changed_by` text DEFAULT 'admin' NOT NULL,
	`reason` text,
	`changed_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`phone_variant_id`) REFERENCES `phone_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `price_history_variant_idx` ON `price_history` (`phone_variant_id`);--> statement-breakpoint
CREATE TABLE `shop_settings` (
	`id` integer PRIMARY KEY DEFAULT 1 NOT NULL,
	`shop_name` text DEFAULT 'PhoneStock Inventory' NOT NULL,
	`phone` text,
	`whatsapp` text,
	`address` text,
	`currency` text DEFAULT 'INR' NOT NULL,
	`timezone` text DEFAULT 'Asia/Kolkata' NOT NULL,
	`exact_stock_visible` integer DEFAULT true NOT NULL,
	`default_reorder_level` integer DEFAULT 2 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stock_movements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`phone_variant_id` integer NOT NULL,
	`movement_type` text NOT NULL,
	`quantity_change` integer NOT NULL,
	`quantity_before` integer NOT NULL,
	`quantity_after` integer NOT NULL,
	`reference_number` text,
	`reason` text NOT NULL,
	`performed_by` text DEFAULT 'admin' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`phone_variant_id`) REFERENCES `phone_variants`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `stock_movements_variant_idx` ON `stock_movements` (`phone_variant_id`);--> statement-breakpoint
CREATE INDEX `stock_movements_date_idx` ON `stock_movements` (`created_at`);--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`supplier_name` text NOT NULL,
	`contact_person` text,
	`phone` text,
	`email` text,
	`gstin` text,
	`address` text,
	`notes` text,
	`active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `brands` (`id`,`name`,`slug`) VALUES
  (1,'Samsung','samsung'),(2,'Apple','apple'),(3,'Motorola','motorola'),
  (4,'OnePlus','oneplus'),(5,'Nothing','nothing'),(6,'Google','google'),
  (7,'Xiaomi','xiaomi'),(8,'Vivo','vivo'),(9,'Oppo','oppo'),(10,'Realme','realme');
--> statement-breakpoint
INSERT INTO `phone_models` (`id`,`brand_id`,`model_name`,`network_type`) VALUES
  (1,1,'Galaxy S25','5G'),(2,2,'iPhone 16','5G'),(3,3,'Edge 60 Fusion','5G'),
  (4,4,'Nord 5','5G'),(5,5,'Phone (3a)','5G'),(6,6,'Pixel 9a','5G');
--> statement-breakpoint
INSERT INTO `phone_variants` (`id`,`phone_model_id`,`sku`,`slug`,`ram_gb`,`storage_gb`,`colour_name`,`colour_hex`,`condition`,`mrp`,`selling_price`,`available_stock`,`reserved_stock`,`reorder_level`,`image_url`,`featured`) VALUES
  (1,1,'SAM-S25-12-256-NV','samsung-galaxy-s25-12-256-navy',12,256,'Navy','#263c67','New',80999,74999,6,0,2,'/phones/phone-navy.webp',1),
  (2,2,'APL-IP16-8-128-UM','apple-iphone-16-8-128-ultramarine',8,128,'Ultramarine','#4466d8','New',79900,69900,4,1,2,'/phones/phone-blue.webp',1),
  (3,3,'MOT-E60F-8-256-SS','motorola-edge-60-fusion-8-256-silver',8,256,'Slipstream','#a9c4d4','New',25999,22999,9,0,3,'/phones/phone-silver.webp',1),
  (4,4,'ONE-N5-12-256-PB','oneplus-nord-5-12-256-blue',12,256,'Phantom Blue','#5b84ba','New',34999,31999,3,0,2,'/phones/phone-blue.webp',0),
  (5,5,'NTH-3A-8-128-WH','nothing-phone-3a-8-128-white',8,128,'White','#e8e5df','New',26999,24999,2,0,2,'/phones/phone-silver.webp',0),
  (6,6,'GOO-P9A-8-256-IR','google-pixel-9a-8-256-navy',8,256,'Iris','#626e9a','New',49999,46999,0,0,2,'/phones/phone-navy.webp',0);
--> statement-breakpoint
INSERT INTO `inventory_private` (`phone_variant_id`,`purchase_price`,`landed_cost`,`minimum_selling_price`) VALUES
  (1,68100,68600,71500),(2,64200,64700,67500),(3,19800,20150,21500),
  (4,28600,29000,30500),(5,21800,22100,23500),(6,42300,42800,44900);
--> statement-breakpoint
INSERT INTO `stock_movements` (`phone_variant_id`,`movement_type`,`quantity_change`,`quantity_before`,`quantity_after`,`reason`) VALUES
  (1,'PURCHASE',6,0,6,'Opening inventory'),(2,'PURCHASE',4,0,4,'Opening inventory'),
  (3,'PURCHASE',9,0,9,'Opening inventory'),(4,'PURCHASE',3,0,3,'Opening inventory'),
  (5,'PURCHASE',2,0,2,'Opening inventory');
--> statement-breakpoint
INSERT INTO `shop_settings` (`id`,`shop_name`,`currency`,`timezone`,`exact_stock_visible`,`default_reorder_level`) VALUES
  (1,'PhoneStock Inventory','INR','Asia/Kolkata',1,2);
