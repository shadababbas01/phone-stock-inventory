import { isAdminRequest } from "@/lib/admin-auth";
import { parseIcecatProduct } from "@/lib/icecat";
import { phoneArtUrl } from "@/lib/phone-art";
import { getRuntimeEnv } from "@/lib/runtime-env";

function clean(value: unknown, max = 100) {
  return String(value ?? "").trim().slice(0, max);
}

function fallback(body: Record<string, unknown>) {
  return phoneArtUrl({ brand: clean(body.brand), model: clean(body.model), colour: clean(body.colour) });
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const gtin = clean(body.gtin, 18).replace(/[^0-9]/g, "");
  const manufacturerCode = clean(body.manufacturerCode, 60);
  const brand = clean(body.brand, 50);
  const fallbackUrl = fallback(body);
  if (!gtin && !(brand && manufacturerCode)) {
    return Response.json({ matched: false, reason: "Enter a GTIN/barcode or manufacturer code for an exact image.", fallbackUrl });
  }
  const shopname = getRuntimeEnv().ICECAT_SHOPNAME;
  if (!shopname) {
    return Response.json({ matched: false, reason: "Open Icecat is not configured in this environment yet.", fallbackUrl });
  }

  const params = new URLSearchParams({ lang: "en", shopname, content: "essentialinfo,title,gallery" });
  const matchType = gtin ? "gtin" : "manufacturer_code";
  if (gtin) params.set("GTIN", gtin);
  else {
    params.set("Brand", brand);
    params.set("ProductCode", manufacturerCode);
  }

  try {
    const response = await fetch(`https://live.icecat.biz/api?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(9_000),
    });
    if (!response.ok) {
      const reason = response.status === 401 || response.status === 403
        ? "Icecat rejected the account request. Check account activation or IP access in Icecat."
        : "No exact Icecat image was available; generated artwork will be used.";
      return Response.json({ matched: false, reason, fallbackUrl });
    }
    const product = parseIcecatProduct(await response.json());
    if (!product) return Response.json({ matched: false, reason: "No exact Icecat image was found; generated artwork will be used.", fallbackUrl });
    return Response.json({ matched: true, matchType, ...product, fallbackUrl });
  } catch {
    return Response.json({ matched: false, reason: "Icecat could not be reached; generated artwork will be used.", fallbackUrl });
  }
}
