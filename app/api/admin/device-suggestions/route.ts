import { isAdminRequest } from "@/lib/admin-auth";
import { localSuggestions } from "@/lib/device-catalog";
import { getRuntimeEnv } from "@/lib/runtime-env";

type Suggestions = {
  brands: string[];
  models: string[];
  colours: string[];
  ramGb: number[];
  storageGb: number[];
  exactMatch: boolean;
};

function uniqueText(values: unknown[]) {
  return [...new Set(values.map(value => String(value ?? "").trim()).filter(Boolean))].slice(0, 30);
}

function uniqueNumbers(values: unknown[]) {
  return [...new Set(values.map(Number).filter(value => Number.isFinite(value) && value > 0))].sort((a, b) => a - b).slice(0, 20);
}

function merge(base: Suggestions, extra: Partial<Suggestions>): Suggestions {
  return {
    brands: uniqueText([...base.brands, ...(extra.brands ?? [])]),
    models: uniqueText([...base.models, ...(extra.models ?? [])]),
    colours: uniqueText([...base.colours, ...(extra.colours ?? [])]),
    ramGb: uniqueNumbers([...base.ramGb, ...(extra.ramGb ?? [])]),
    storageGb: uniqueNumbers([...base.storageGb, ...(extra.storageGb ?? [])]),
    exactMatch: base.exactMatch || Boolean(extra.exactMatch)
  };
}

function list(value: unknown) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") return value.split(/[,/|]/).map(item => item.trim());
  return [];
}

function capacities(value: unknown) {
  const values = list(value).flatMap(item => {
    const text = typeof item === "object" && item ? JSON.stringify(item) : String(item);
    const matches = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(TB|GB)/gi)];
    return matches.map(match => Math.round(Number(match[1]) * (match[2].toUpperCase() === "TB" ? 1024 : 1)));
  });
  return uniqueNumbers(values);
}

function normalizeInternet(payload: unknown, brand: string, model: string): Partial<Suggestions> {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const candidates = [record.data, record.results, record.devices, payload].find(Array.isArray);
  const single = record.data && typeof record.data === "object" && !Array.isArray(record.data)
    ? record.data as Record<string, unknown>
    : record;
  const devices: unknown[] = Array.isArray(candidates)
    ? candidates
    : (single.name || single.model ? [single] : []);
  const rows = devices.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  const selected = rows.find(device => String(device.name ?? device.model ?? "").toLowerCase() === model.toLowerCase());
  const exact = selected ?? (rows.length === 1 ? rows[0] : undefined);
  const hardware = exact?.hardware;
  const ramSource = hardware && typeof hardware === "object"
    ? (hardware as Record<string, unknown>).ram
    : hardware;

  return {
    brands: uniqueText(rows.map(device => device.brand_name ?? device.brand).filter(Boolean)),
    models: uniqueText(rows.filter(device => !brand || String(device.brand_name ?? device.brand ?? "").toLowerCase().includes(brand.toLowerCase())).map(device => device.name ?? device.model)),
    colours: uniqueText(list(exact?.colors ?? exact?.colours)),
    ramGb: capacities(ramSource ?? exact?.ram ?? exact?.memory),
    storageGb: capacities(exact?.storage ?? exact?.storages),
    exactMatch: Boolean(selected)
  };
}

export async function GET(request: Request) {
  if (!(await isAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const brand = (url.searchParams.get("brand") ?? "").slice(0, 50);
  const query = (url.searchParams.get("q") ?? "").slice(0, 80);
  const model = (url.searchParams.get("model") ?? "").slice(0, 80);
  let suggestions = localSuggestions(brand, query, model);
  let source: "catalog" | "saved" | "internet" = "catalog";
  const env = getRuntimeEnv();

  if (env.DB) {
    try {
      const rows = await env.DB.prepare(`
        SELECT DISTINCT b.name AS brand, m.model_name AS model, v.colour_name AS colour,
          v.ram_gb AS ramGb, v.storage_gb AS storageGb
        FROM phone_variants v
        JOIN phone_models m ON m.id = v.phone_model_id
        JOIN brands b ON b.id = m.brand_id
        WHERE v.active = 1
          AND (? = '' OR lower(b.name) LIKE lower(?) || '%')
          AND (? = '' OR lower(m.model_name) LIKE '%' || lower(?) || '%')
        ORDER BY m.model_name
        LIMIT 80
      `).bind(brand, brand, query, query).all<Record<string, unknown>>();
      const saved = rows.results ?? [];
      suggestions = merge(suggestions, {
        brands: saved.map(row => row.brand),
        models: saved.map(row => row.model),
        colours: model ? saved.filter(row => String(row.model).toLowerCase() === model.toLowerCase()).map(row => row.colour) : [],
        ramGb: model ? saved.filter(row => String(row.model).toLowerCase() === model.toLowerCase()).map(row => row.ramGb) : [],
        storageGb: model ? saved.filter(row => String(row.model).toLowerCase() === model.toLowerCase()).map(row => row.storageGb) : [],
        exactMatch: saved.some(row => String(row.model).toLowerCase() === model.toLowerCase())
      });
      if (saved.length) source = "saved";
    } catch {
      // Suggestions still work from the built-in offline catalogue.
    }
  }

  const lookup = `${brand} ${query || model}`.trim();
  if (env.MOBILE_API_KEY && lookup.length >= 2) {
    try {
      const endpoint = new URL("https://api.mobileapi.dev/devices/search");
      endpoint.searchParams.set("name", lookup);
      endpoint.searchParams.set("key", env.MOBILE_API_KEY);
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(3500) });
      if (response.ok) {
        suggestions = merge(suggestions, normalizeInternet(await response.json(), brand, model));
        source = "internet";
      }
    } catch {
      // A slow external catalogue must never block stock entry.
    }
  }

  return Response.json({ ...suggestions, source }, { headers: { "Cache-Control": "private, no-store" } });
}
