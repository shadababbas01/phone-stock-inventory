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

function decodedUrl(value: string) {
  return value.replaceAll("\\/", "/").replaceAll("\\u002F", "/").replaceAll("&amp;", "&");
}

function imageUrlsFrom(value: string) {
  return [...value.matchAll(/https:\\?\/\\?\/[^"'<>\\\s]+\.(?:avif|webp|png|jpe?g)(?:\?[^"'<>\\\s]*)?/gi)]
    .map(match => safeImageUrl(decodedUrl(match[0])))
    .filter(url => url && !/logo|icon|favicon|sprite|navigation/i.test(url));
}

function colourImageFromHtml(html: string, colour: string, pageUrl: string) {
  if (!colour) return "";
  const lowerHtml = html.toLowerCase();
  const lowerColour = colour.toLowerCase();
  const oppoColourNames = [...html.matchAll(/data-ga-module=["']Color["'][^>]+data-ga-name=["']([^"']+)["']/gi)]
    .map(match => normalized(match[1]));
  const oppoColourIndex = oppoColourNames.indexOf(normalized(colour));
  if (oppoColourIndex >= 0) {
    const oppoColourImages = [...new Set([...html.matchAll(/data-one-src=["'](\/content\/dam\/[^"']+\/images\/pc\/color\d+\.png)["']/gi)]
      .map(match => match[1]))];
    const selectedPath = oppoColourImages[oppoColourIndex];
    if (selectedPath) return new URL(selectedPath, pageUrl).toString();
  }
  const scored: Array<{ url: string; score: number }> = [];
  let colourIndex = lowerHtml.indexOf(lowerColour);
  while (colourIndex >= 0) {
    const start = Math.max(0, colourIndex - 1_500);
    const end = Math.min(html.length, colourIndex + 1_500);
    const window = html.slice(start, end);
    const beforeColour = html.slice(start, colourIndex);
    const realmeCatalogueImages = imageUrlsFrom(beforeColour).filter(url =>
      /image\d*\.realme\.net\/general/i.test(url) && /\.(?:jpe?g|png)(?:\?|$)/i.test(url)
    );
    // Realme serializes desktop then mobile renders immediately before each colour label.
    // Prefer the desktop asset so landscape inventory cards do not crop to blank whitespace.
    if (realmeCatalogueImages.length >= 2) return realmeCatalogueImages[realmeCatalogueImages.length - 2];
    for (const match of window.matchAll(/https:\\?\/\\?\/[^"'<>\\\s]+\.(?:avif|webp|png|jpe?g)(?:\?[^"'<>\\\s]*)?/gi)) {
      const url = safeImageUrl(decodedUrl(match[0]));
      if (!url || /logo|icon|favicon|sprite|navigation/i.test(url)) continue;
      const absoluteIndex = start + (match.index ?? 0);
      const distance = Math.abs(colourIndex - absoluteIndex);
      let score = Math.max(0, 100 - distance / 15);
      if (absoluteIndex < colourIndex) score += 35;
      if (/\.(?:jpe?g|png)(?:\?|$)/i.test(url)) score += 20;
      if (/image\d*\.realme\.net\/general/i.test(url)) score += 70;
      scored.push({ url, score });
    }
    colourIndex = lowerHtml.indexOf(lowerColour, colourIndex + lowerColour.length);
  }
  return scored.sort((left, right) => right.score - left.score)[0]?.url ?? "";
}

async function imageFromOfficialPage(pageUrl: string, model: string, colour: string, manufacturerCode = "") {
  try {
    const response = await fetch(pageUrl, {
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "ManglaCommunicationInventory/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { url: "", colourVerified: false, identifierVerified: false };
    const html = (await response.text()).slice(0, 5_000_000);
    const colourImage = colourImageFromHtml(html, colour, pageUrl);
    const identifierVerified = Boolean(manufacturerCode && normalized(html).includes(normalized(manufacturerCode)));
    if (colourImage) return { url: colourImage, colourVerified: true, identifierVerified };
    const meta = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i);
    const metaUrl = safeImageUrl(decodedUrl(meta?.[1] ?? ""));
    if (metaUrl) return { url: metaUrl, colourVerified: false, identifierVerified };
    const modelPath = normalized(model).replaceAll(" ", "-");
    const candidates = imageUrlsFrom(html);
    return {
      url: candidates.find(url => normalized(url).includes(modelPath)) ?? candidates[0] ?? "",
      colourVerified: false,
      identifierVerified,
    };
  } catch {
    return { url: "", colourVerified: false, identifierVerified: false };
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

function productSlug(model: string) {
  return normalized(model).replaceAll(" ", "-");
}

const officialProductCodePages: Record<string, string[]> = {
  "oppo:cph2729": [
    "https://www.oppo.com/in/smartphones/series-k/k13-5g/",
    "https://www.oppo.com/in/smartphones/series-k/k13-5g/specs/",
  ],
};

function predictableOfficialPages(brandKey: string, model: string, manufacturerCode: string) {
  const exactCodePages = officialProductCodePages[`${brandKey}:${normalized(manufacturerCode).replaceAll(" ", "")}`];
  const slug = productSlug(model);
  if (exactCodePages?.length) return exactCodePages;
  if (!slug) return [];
  if (brandKey === "realme") return [`https://www.realme.com/in/realme-${slug}`, `https://www.realme.com/in/realme-${slug}/specs`];
  if (brandKey === "apple") return [`https://www.apple.com/in/${slug}/`];
  if (brandKey === "oneplus") return [`https://www.oneplus.in/${slug}`];
  if (brandKey === "motorola") return [`https://www.motorola.in/smartphones-${slug}/p`];
  if (brandKey === "nothing") return [`https://in.nothing.tech/pages/${slug}`];
  return [];
}

export async function findOfficialPhoneImage(input: {
  apiKey: string;
  brand: string;
  model: string;
  manufacturerCode: string;
  colour: string;
}): Promise<OfficialImageMatch | null> {
  const brandKey = normalized(input.brand).replaceAll(" ", "");
  const domains = officialDomains[brandKey];
  if (!domains?.length || (!input.model && !input.manufacturerCode)) return null;
  for (const pageUrl of predictableOfficialPages(brandKey, input.model, input.manufacturerCode)) {
    const pageImage = await imageFromOfficialPage(pageUrl, input.model, input.colour, input.manufacturerCode);
    const verifiedCodePage = officialProductCodePages[`${brandKey}:${normalized(input.manufacturerCode).replaceAll(" ", "")}`]?.includes(pageUrl);
    if (pageImage.url && (!input.manufacturerCode || pageImage.identifierVerified || verifiedCodePage)) {
      return {
        remoteImageUrl: pageImage.url,
        officialPageUrl: pageUrl,
        title: `${input.brand} ${input.model}`,
        sourceDomain: new URL(pageUrl).hostname,
        colourVerified: pageImage.colourVerified,
      };
    }
  }
  // The manufacturer code is normally unique and is substantially more reliable
  // than a commercial model name extracted by OCR.
  const terms = [input.brand, input.manufacturerCode, input.model, input.colour, "official phone"].filter(Boolean);
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: terms.join(" "),
      topic: "general",
      search_depth: "advanced",
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
  const payload = await response.json() as { results?: TavilyResult[]; images?: TavilyImage[] };
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
    const pageImage = await imageFromOfficialPage(page.toString(), input.model, input.colour, input.manufacturerCode);
    if (!matchesModel(evidence, input.model, input.manufacturerCode) && !pageImage.identifierVerified) continue;
    const images = (Array.isArray(result.images) ? result.images : []).map(imageDetails)
      .map(image => ({ ...image, url: safeImageUrl(image.url) }))
      .filter(image => image.url);
    const colourImage = colour
      ? images.find(image => normalized(image.description).includes(colour))
      : undefined;
    const topImages = (Array.isArray(payload.images) ? payload.images : []).map(imageDetails)
      .map(image => ({ ...image, url: safeImageUrl(image.url) }))
      .filter(image => image.url);
    const selected = pageImage.url
      ? { url: pageImage.url, description: "" }
      : colourImage
        ?? images.find(image => matchesModel(image.description, input.model, input.manufacturerCode))
        ?? topImages.find(image => colour && normalized(image.description).includes(colour))
        ?? topImages.find(image => matchesModel(image.description, input.model, input.manufacturerCode))
        ?? images[0];
    if (!selected?.url) continue;
    return {
      remoteImageUrl: selected.url,
      officialPageUrl: page.toString(),
      title: clean(result.title),
      sourceDomain: page.hostname,
      colourVerified: pageImage.colourVerified || Boolean(colourImage),
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
