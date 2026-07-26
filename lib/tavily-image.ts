type TavilyImage = string | { url?: unknown; description?: unknown };
type TavilyResult = {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  images?: unknown;
};

const officialDomains: Record<string, string[]> = {
  apple: ["apple.com"],
  google: ["store.google.com"],
  hmd: ["hmd.com"],
  honor: ["honor.com"],
  infinix: ["infinixmobility.com"],
  iqoo: ["iqoo.com"],
  lava: ["lavamobiles.com"],
  motorola: ["motorola.in", "motorola.com"],
  nokia: ["hmd.com", "nokia.com"],
  nothing: ["nothing.tech"],
  oneplus: ["oneplus.in", "oneplus.com"],
  oppo: ["oppo.com"],
  poco: ["po.co", "mi.com"],
  realme: ["realme.com"],
  redmi: ["mi.com"],
  samsung: ["samsung.com"],
  tecno: ["tecno-mobile.com"],
  vivo: ["vivo.com"],
  xiaomi: ["mi.com"],
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalized(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function imageDetails(value: TavilyImage) {
  if (typeof value === "string") return { url: value, description: "" };
  return { url: clean(value?.url), description: clean(value?.description) };
}

function safeImageUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.hostname !== "localhost" && !/^\d+(?:\.\d+){3}$/.test(url.hostname)
      ? url.toString()
      : "";
  } catch {
    return "";
  }
}

function matchesModel(haystack: string, model: string, manufacturerCode: string) {
  const content = normalized(haystack);
  const code = normalized(manufacturerCode);
  if (code && content.includes(code)) return true;
  const meaningful = normalized(model).split(" ").filter(token => token.length > 1 && !["5g", "4g"].includes(token));
  return meaningful.length > 0 && meaningful.every(token => content.includes(token));
}

export type OfficialImageMatch = {
  remoteImageUrl: string;
  officialPageUrl: string;
  title: string;
  sourceDomain: string;
  colourVerified: boolean;
};

export async function findOfficialPhoneImage(input: {
  apiKey: string;
  brand: string;
  model: string;
  manufacturerCode: string;
  colour: string;
}): Promise<OfficialImageMatch | null> {
  const brandKey = normalized(input.brand).replaceAll(" ", "");
  const domains = officialDomains[brandKey];
  if (!domains?.length || !input.model) return null;
  const terms = [input.brand, input.model, input.manufacturerCode, input.colour, "official product image"].filter(Boolean);
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: terms.map(term => `"${term}"`).join(" "),
      topic: "general",
      search_depth: "basic",
      max_results: 5,
      include_images: true,
      include_image_descriptions: true,
      include_raw_content: false,
      include_domains: domains,
      country: "india",
      safe_search: true,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) return null;
  const payload = await response.json() as { results?: TavilyResult[] };
  const colour = normalized(input.colour);
  for (const result of payload.results ?? []) {
    const pageUrl = clean(result.url);
    let page: URL;
    try {
      page = new URL(pageUrl);
    } catch {
      continue;
    }
    if (!domains.some(domain => page.hostname === domain || page.hostname.endsWith(`.${domain}`))) continue;
    const evidence = `${clean(result.title)} ${clean(result.content)} ${page.pathname}`;
    if (!matchesModel(evidence, input.model, input.manufacturerCode)) continue;
    const images = (Array.isArray(result.images) ? result.images : []).map(imageDetails)
      .map(image => ({ ...image, url: safeImageUrl(image.url) }))
      .filter(image => image.url);
    if (!images.length) continue;
    const colourImage = colour
      ? images.find(image => normalized(image.description).includes(colour))
      : undefined;
    const selected = colourImage ?? images.find(image => matchesModel(image.description, input.model, input.manufacturerCode)) ?? images[0];
    return {
      remoteImageUrl: selected.url,
      officialPageUrl: page.toString(),
      title: clean(result.title),
      sourceDomain: page.hostname,
      colourVerified: Boolean(colourImage),
    };
  }
  return null;
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

export async function signOfficialImageUrl(remoteUrl: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(remoteUrl));
  return bytesToHex(new Uint8Array(signature));
}

export async function verifyOfficialImageUrl(remoteUrl: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = await signOfficialImageUrl(remoteUrl, secret);
  let mismatch = 0;
  for (let index = 0; index < expected.length; index += 1) mismatch |= expected.charCodeAt(index) ^ signature.charCodeAt(index);
  return mismatch === 0;
}
