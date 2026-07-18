import { isAdminRequest } from "@/lib/admin-auth";
import { sampleAdminInventory } from "@/lib/admin-sample";
import { getRuntimeEnv } from "@/lib/runtime-env";

function dbBinding() {
  return getRuntimeEnv().DB;
}

function cleanText(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function positiveNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = dbBinding();
  if (!db) return Response.json({ inventory: sampleAdminInventory, demo: true });
  const rows = await db.prepare(`
    SELECT v.id, b.name AS brand, m.model_name AS model, v.slug, v.sku,
      v.ram_gb AS ramGb, v.storage_gb AS storageGb, v.colour_name AS colour,
      v.colour_hex AS colourHex, v.condition, m.network_type AS networkType,
      v.mrp, v.selling_price AS sellingPrice, v.available_stock AS availableStock,
      v.reserved_stock AS reservedStock, v.reorder_level AS reorderLevel,
      v.image_url AS imageUrl, COALESCE(p.purchase_price, 0) AS purchasePrice,
      COALESCE(p.minimum_selling_price, 0) AS minimumSellingPrice,
      CASE WHEN date(v.updated_at) = date('now') THEN 'Today' ELSE 'Recently' END AS updatedAt
    FROM phone_variants v
    JOIN phone_models m ON m.id = v.phone_model_id
    JOIN brands b ON b.id = m.brand_id
    LEFT JOIN inventory_private p ON p.phone_variant_id = v.id
    WHERE v.active = 1
    ORDER BY v.id DESC
  `).all();
  return Response.json({ inventory: rows.results ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const db = dbBinding();
  if (!db) return Response.json({ error: "Persistent database is not connected in this environment." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const action = cleanText(body.action, 30);

  try {
    if (action === "create") {
      const brand = cleanText(body.brand, 50);
      const model = cleanText(body.model, 80);
      const colour = cleanText(body.colour, 50);
      const ram = positiveNumber(body.ramGb);
      const storage = positiveNumber(body.storageGb);
      const mrp = positiveNumber(body.mrp);
      const sellingPrice = positiveNumber(body.sellingPrice);
      const availableStock = Math.floor(positiveNumber(body.availableStock));
      if (!brand || !model || !colour || !ram || !storage || !mrp || !sellingPrice) return Response.json({ error: "Complete all required fields." }, { status: 400 });
      if (sellingPrice > mrp) return Response.json({ error: "Selling price cannot exceed MRP." }, { status: 400 });

      await db.prepare("INSERT OR IGNORE INTO brands (name, slug) VALUES (?, ?)").bind(brand, brand.toLowerCase().replace(/[^a-z0-9]+/g, "-")).run();
      const brandRow = await db.prepare("SELECT id FROM brands WHERE lower(name) = lower(?)").bind(brand).first<{ id: number }>();
      if (!brandRow) throw new Error("Unable to create brand");
      await db.prepare("INSERT OR IGNORE INTO phone_models (brand_id, model_name, network_type) VALUES (?, ?, ?)").bind(brandRow.id, model, cleanText(body.networkType, 10) || "5G").run();
      const modelRow = await db.prepare("SELECT id FROM phone_models WHERE brand_id = ? AND lower(model_name) = lower(?)").bind(brandRow.id, model).first<{ id: number }>();
      if (!modelRow) throw new Error("Unable to create model");
      const slug = `${brand}-${model}-${ram}-${storage}-${colour}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const sku = cleanText(body.sku, 60) || `${brand.slice(0,3)}-${model.slice(0,4)}-${ram}-${storage}-${colour.slice(0,2)}`.toUpperCase().replace(/\s/g, "");
      const result = await db.prepare(`
        INSERT INTO phone_variants (phone_model_id, sku, slug, ram_gb, storage_gb, colour_name, colour_hex, condition, mrp, selling_price, available_stock, reserved_stock, reorder_level, image_url, featured)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0)
        RETURNING id
      `).bind(modelRow.id, sku, slug, ram, storage, colour, cleanText(body.colourHex, 9) || "#a9c4d4", cleanText(body.condition, 20) || "New", mrp, sellingPrice, availableStock, Math.floor(positiveNumber(body.reorderLevel, 2)), cleanText(body.imageUrl, 200) || "/phones/phone-silver.webp").first<{ id: number }>();
      if (!result) throw new Error("Unable to create variant");
      await db.prepare("INSERT INTO inventory_private (phone_variant_id, purchase_price, minimum_selling_price) VALUES (?, ?, ?)").bind(result.id, positiveNumber(body.purchasePrice), positiveNumber(body.minimumSellingPrice)).run();
      await db.prepare("INSERT INTO audit_logs (action, table_name, record_id, after_data) VALUES ('CREATE', 'phone_variants', ?, ?)").bind(result.id, JSON.stringify({ brand, model, sku })).run();
      return Response.json({ ok: true, id: result.id }, { status: 201 });
    }

    const id = Math.floor(positiveNumber(body.id));
    if (!id) return Response.json({ error: "A valid inventory item is required." }, { status: 400 });

    if (action === "adjustStock") {
      const change = Math.trunc(Number(body.change));
      const reason = cleanText(body.reason, 180);
      if (!Number.isFinite(change) || change === 0 || !reason) return Response.json({ error: "Enter a quantity change and reason." }, { status: 400 });
      const current = await db.prepare("SELECT available_stock AS stock, reserved_stock AS reserved FROM phone_variants WHERE id = ? AND active = 1").bind(id).first<{ stock: number; reserved: number }>();
      if (!current || current.stock + change < current.reserved || current.stock + change < 0) return Response.json({ error: "Stock cannot become negative or lower than reserved stock." }, { status: 409 });
      await db.batch([
        db.prepare("UPDATE phone_variants SET available_stock = available_stock + ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND available_stock + ? >= reserved_stock AND available_stock + ? >= 0").bind(change, id, change, change),
        db.prepare("INSERT INTO stock_movements (phone_variant_id, movement_type, quantity_change, quantity_before, quantity_after, reason) VALUES (?, 'STOCK_CORRECTION', ?, ?, ?, ?)").bind(id, change, current.stock, current.stock + change, reason),
        db.prepare("INSERT INTO audit_logs (action, table_name, record_id, after_data) VALUES ('STOCK_ADJUST', 'phone_variants', ?, ?)").bind(id, JSON.stringify({ change, reason })),
      ]);
      return Response.json({ ok: true });
    }

    if (action === "updatePrice") {
      const sellingPrice = positiveNumber(body.sellingPrice);
      const current = await db.prepare("SELECT selling_price AS sellingPrice, mrp FROM phone_variants WHERE id = ?").bind(id).first<{ sellingPrice: number; mrp: number }>();
      if (!current || !sellingPrice || sellingPrice > current.mrp) return Response.json({ error: "Enter a selling price not higher than MRP." }, { status: 400 });
      await db.batch([
        db.prepare("UPDATE phone_variants SET selling_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(sellingPrice, id),
        db.prepare("INSERT INTO price_history (phone_variant_id, old_selling_price, new_selling_price, reason) VALUES (?, ?, ?, ?)").bind(id, current.sellingPrice, sellingPrice, cleanText(body.reason, 180) || "Admin price update"),
        db.prepare("INSERT INTO audit_logs (action, table_name, record_id, after_data) VALUES ('PRICE_UPDATE', 'phone_variants', ?, ?)").bind(id, JSON.stringify({ sellingPrice })),
      ]);
      return Response.json({ ok: true });
    }

    if (action === "archive") {
      await db.batch([
        db.prepare("UPDATE phone_variants SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id),
        db.prepare("INSERT INTO audit_logs (action, table_name, record_id) VALUES ('ARCHIVE', 'phone_variants', ?)").bind(id),
      ]);
      return Response.json({ ok: true });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update inventory.";
    if (/UNIQUE constraint/i.test(message)) return Response.json({ error: "This exact phone variant or SKU already exists." }, { status: 409 });
    return Response.json({ error: message }, { status: 500 });
  }
}
