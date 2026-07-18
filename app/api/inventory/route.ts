import { sampleInventory } from "@/lib/catalog";
import { phoneArtUrl } from "@/lib/phone-art";
import { getRuntimeEnv } from "@/lib/runtime-env";

type D1Rows = { results?: Record<string, unknown>[] };

export async function GET() {
  const db = getRuntimeEnv().DB;
  if (!db) return Response.json({ inventory: sampleInventory.map(phone => ({ ...phone, imageUrl: phoneArtUrl(phone) })), demo: true }, { headers: { "Cache-Control": "no-store" } });
  try {
    const data = await db.prepare(`
      SELECT v.id, b.name AS brand, m.model_name AS model, v.slug, v.ram_gb AS ramGb,
        v.storage_gb AS storageGb, v.colour_name AS colour, v.colour_hex AS colourHex,
        v.condition, m.network_type AS networkType, v.mrp, v.selling_price AS sellingPrice,
        v.available_stock AS availableStock, v.reserved_stock AS reservedStock,
        v.reorder_level AS reorderLevel, v.image_url AS imageUrl,
        CASE WHEN date(v.updated_at) = date('now') THEN 'Today' ELSE 'Recently' END AS updatedAt
      FROM phone_variants v
      JOIN phone_models m ON m.id = v.phone_model_id
      JOIN brands b ON b.id = m.brand_id
      WHERE v.active = 1 AND m.active = 1 AND b.active = 1
      ORDER BY v.featured DESC, v.id ASC
    `).all() as D1Rows;
    const inventory = (data.results ?? []).map(row => ({ ...row, imageUrl: phoneArtUrl({ brand: String(row.brand), model: String(row.model), colour: String(row.colour), colourHex: String(row.colourHex) }) }));
    return Response.json({ inventory }, { headers: { "Cache-Control": "public, max-age=15, stale-while-revalidate=30" } });
  } catch {
    return Response.json({ inventory: sampleInventory.map(phone => ({ ...phone, imageUrl: phoneArtUrl(phone) })), demo: true }, { headers: { "Cache-Control": "no-store" } });
  }
}
