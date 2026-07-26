import { isAdminRequest } from "@/lib/admin-auth";
import { parseIcecatProduct } from "@/lib/icecat";
import { phoneArtUrl } from "@/lib/phone-art";
import { getRuntimeEnv } from "@/lib/runtime-env";
import { lookupUpcImage } from "@/lib/upcitemdb";
import { findOfficialPhoneImage, signOfficialImageUrl } from "@/lib/tavily-image";

function clean(value: unknown, max = 100) {
  return String(value ?? "").trim().slice(0, max);
}

function fallback(body: Record<string, unknown>) {
  return phoneArtUrl({ brand: clean(body.brand), model: clean(body.model), colour: clean(body.colour) });
}

function canonicalGtin(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits && digits.length <= 14 ? digits.padStart(14, "0") : digits;
}

function identifier(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export async function POST(request: Request) {
  if (!(await isAdminRequest(request))) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const gtin = clean(body.gtin, 18).replace(/[^0-9]/g, "");
  const manufacturerCode = clean(body.manufacturerCode, 60);
  const brand = clean(body.brand, 50);
  const model = clean(body.model, 80);
  const colour = clean(body.colour, 50);
  const fallbackUrl = fallback(body);
  if (!gtin && !(brand && manufacturerCode)) {
    return Response.json({ matched: false, reason: "Enter a GTIN/barcode or manufacturer code for an exact image.", fallbackUrl });
  }
  const shopname = getRuntimeEnv().ICECAT_SHOPNAME;

  const params = new URLSearchParams({ lang: "en", shopname, content: "essentialinfo,title,gallery" });
  const matchType = gtin ? "gtin" : "manufacturer_code";
  if (gtin) params.set("GTIN", gtin);
  else {
    params.set("Brand", brand);
    params.set("ProductCode", manufacturerCode);
  }

  if (shopname) try {
    const response = await fetch(`https://live.icecat.biz/api?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(9_000),
    });
    if (!response.ok) {
      const reason = response.status === 401 || response.status === 403
        ? "Icecat rejected the account request. Check account activation or IP access in Icecat."
        : "No exact Icecat image was available; generated artwork will be used.";
      if (!gtin) return Response.json({ matched: false, reason, fallbackUrl });
    }
    const product = parseIcecatProduct(await response.json());
    if (product) {

      if (gtin && !product.gtins.some(value => canonicalGtin(value) === canonicalGtin(gtin))) {
        return Response.json({ matched: false, verified: false, reason: "Icecat returned a different barcode, so the image was rejected.", fallbackUrl });
      }
      if (!gtin) {
        if (identifier(product.productCode) !== identifier(manufacturerCode)) {
          return Response.json({ matched: false, verified: false, reason: "Icecat returned a different manufacturer code, so the image was rejected.", fallbackUrl });
        }
        if (brand && identifier(product.brand) !== identifier(brand)) {
          return Response.json({ matched: false, verified: false, reason: "Icecat returned a different brand, so the image was rejected.", fallbackUrl });
        }
      }
      return Response.json({ matched: true, verified: true, matchType, source: "icecat", ...product, fallbackUrl });
    }
  } catch {
    if (!gtin) return Response.json({ matched: false, reason: "Icecat could not be reached; generated artwork will be used.", fallbackUrl });
  }

  const tavilyApiKey = getRuntimeEnv().TAVILY_API_KEY;
  if (tavilyApiKey && brand && model) try {
    const official = await findOfficialPhoneImage({
      apiKey: tavilyApiKey,
      brand,
      model,
      manufacturerCode,
      colour,
    });
    if (official) {
      const signature = await signOfficialImageUrl(official.remoteImageUrl, tavilyApiKey);
      const imageUrl = `/api/product-image?url=${encodeURIComponent(official.remoteImageUrl)}&sig=${signature}`;
      return Response.json({
        matched: true,
        verified: true,
        matchType: manufacturerCode ? "manufacturer_code" : "model",
        source: "official_website",
        imageUrl,
        title: official.title || `${brand} ${model}`,
        brand,
        productCode: manufacturerCode,
        officialPageUrl: official.officialPageUrl,
        colourVerified: official.colourVerified,
        sourceDomain: official.sourceDomain,
        fallbackUrl,
      });
    }
  } catch {
    // Continue to the barcode catalogue; an unavailable search must not block inventory creation.
  }

  if (gtin) try {
    const product = await lookupUpcImage(gtin);
    if (product) {
      if (brand && product.brand && !identifier(product.brand).includes(identifier(brand)) && !identifier(brand).includes(identifier(product.brand))) {
        return Response.json({ matched: false, verified: false, reason: "The barcode catalogue returned a different brand, so the image was rejected.", fallbackUrl });
      }
      return Response.json({
        matched: true,
        verified: true,
        matchType: "gtin",
        source: "upcitemdb",
        title: product.title,
        brand: product.brand,
        gtins: [product.gtin],
        imageUrl: `/api/product-image?gtin=${encodeURIComponent(product.gtin)}`,
        fallbackUrl,
      });
    }
  } catch {
    // The generated artwork below is safer than an unverified search result.
  }
  return Response.json({ matched: false, reason: "No verified image was found in Icecat or the barcode catalogue. Generated artwork will be used.", fallbackUrl });
}
