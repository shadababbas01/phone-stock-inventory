type UpcItem = {
  ean?: unknown;
  upc?: unknown;
  title?: unknown;
  brand?: unknown;
  images?: unknown;
};

export type UpcImageMatch = {
  gtin: string;
  title: string;
  brand: string;
  remoteImageUrl: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function canonical(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? digits.padStart(14, "0") : "";
}

function safeRemoteImage(value: unknown) {
  const candidate = clean(value);
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && !url.username && !url.password ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function lookupUpcImage(gtin: string): Promise<UpcImageMatch | null> {
  const digits = gtin.replace(/\D/g, "");
  if (![8, 12, 13, 14].includes(digits.length)) return null;
  const response = await fetch(`https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(digits)}`, {
    headers: { Accept: "application/json", "User-Agent": "ManglaCommunicationInventory/1.0" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) return null;
  const payload = await response.json() as { items?: UpcItem[] };
  const item = payload.items?.find(candidate =>
    [clean(candidate.ean), clean(candidate.upc)].some(value => canonical(value) === canonical(digits))
  );
  if (!item) return null;
  const remoteImageUrl = (Array.isArray(item.images) ? item.images : []).map(safeRemoteImage).find(Boolean) ?? "";
  if (!remoteImageUrl) return null;
  return {
    gtin: digits,
    title: clean(item.title),
    brand: clean(item.brand),
    remoteImageUrl,
  };
}
