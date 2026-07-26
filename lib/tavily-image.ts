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

async function imageFromOfficialPage(pageUrl: string, model: string, colour: string) {
  try {
    const response = await fetch(pageUrl, {
      headers: { Accept: "text/html,application/xhtml+xml", "User-Agent": "ManglaCommunicationInventory/1.0" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { url: "", colourVerified: false };
    const html = (await response.text()).slice(0, 5_000_000);
    const colourNeedle = normalized(colour);
    if (colourNeedle) {
      const normalizedHtml = normalized(html);
      const colourIndex = normalizedHtml.indexOf(colourNeedle);
      if (colourIndex >= 0) {
        // Normalization changes offsets, so search all occurrences in the original HTML.
        const originalIndex = html.toLowerCase().indexOf(colour.toLowerCase());
        const nearby = html.slice(Math.max(0, originalIndex - 1_200), originalIndex + 2_400);
        const candidates = imageUrlsFrom(nearby);
        if (candidates[0]) return { url: candidates[0], colourVerified: true };
      }
    }
    const meta = html.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i);
    const metaUrl = safeImageUrl(decodedUrl(meta?.[1] ?? ""));
    if (metaUrl) return { url: metaUrl, colourVerified: false };
    const modelPath = normalized(model).replaceAll(" ", "-");
    const candidates = imageUrlsFrom(html);
    return {
      url: candidates.find(url => normalized(url).includes(modelPath)) ?? candidates[0] ?? "",
      colourVerified: false,
    };
  } catch {
    return { url: "", colourVerified: false };
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

function predictableOfficialPages(brandKey: string, model: string) {
  const slug = productSlug(model);
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
  if (!domains?.length || !input.model) return null;
  for (const pageUrl of predictableOfficialPages(brandKey, input.model)) {
    const pageImage = await imageFromOfficialPage(pageUrl, input.model, input.colour);
    if (pageImage.url) {
      return {
        remoteImageUrl: pageImage.url,
        officialPageUrl: pageUrl,
        title: `${input.brand} ${input.model}`,
        sourceDomain: new URL(pageUrl).hostname,
        colourVerified: pageImage.colourVerified,
      };
    }
  }
  const terms = [input.brand, input.model, input.colour, "official phone"].filter(Boolean);
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: terms.join(" "),
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
    if (!matchesModel(evidence, input.model, input.manufacturerCode)) continue;
    const images = (Array.isArray(result.images) ? result.images : []).map(imageDetails)
      .map(image => ({ ...image, url: safeImageUrl(image.url) }))
      .filter(image => image.url);
    const pageImage = await imageFromOfficialPage(page.toString(), input.model, input.colour);
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
