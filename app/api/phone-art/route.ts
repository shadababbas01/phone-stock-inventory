import { colourToHex } from "@/lib/phone-art";

function safeText(value: string, max: number) {
  return value.slice(0, max).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
  })[character] ?? character);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const brand = safeText(url.searchParams.get("brand") || "Phone", 40);
  const model = safeText(url.searchParams.get("model") || "Smartphone", 60);
  const colour = safeText(url.searchParams.get("colour") || "Colour", 35);
  const body = colourToHex(colour, url.searchParams.get("hex") ?? undefined);
  const initial = safeText(brand.charAt(0).toUpperCase(), 1);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 560" role="img" aria-labelledby="title description">
  <title id="title">${brand} ${model} in ${colour}</title>
  <description id="description">Automatically generated illustrative catalogue artwork</description>
  <defs>
    <linearGradient id="background" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fffaf1"/><stop offset="1" stop-color="#f2e7d8"/></linearGradient>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff" stop-opacity=".38"/><stop offset=".42" stop-color="${body}"/><stop offset="1" stop-color="#111" stop-opacity=".25"/></linearGradient>
    <linearGradient id="screen" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#17243a"/><stop offset=".55" stop-color="#40697d"/><stop offset="1" stop-color="#d99a36"/></linearGradient>
    <filter id="shadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="18" stdDeviation="17" flood-color="#5c3d1e" flood-opacity=".2"/></filter>
  </defs>
  <rect width="640" height="560" rx="38" fill="url(#background)"/>
  <ellipse cx="320" cy="458" rx="208" ry="30" fill="#6c4c2d" opacity=".14"/>
  <g filter="url(#shadow)">
    <g transform="translate(120 68) rotate(-8 135 184)">
      <rect width="246" height="390" rx="38" fill="url(#body)" stroke="#fff" stroke-opacity=".55" stroke-width="3"/>
      <rect x="18" y="18" width="82" height="112" rx="25" fill="#191919" opacity=".88"/>
      <circle cx="44" cy="48" r="18" fill="#0a0a0a" stroke="#8c8c8c" stroke-width="5"/><circle cx="76" cy="80" r="18" fill="#0a0a0a" stroke="#8c8c8c" stroke-width="5"/><circle cx="44" cy="108" r="13" fill="#0a0a0a" stroke="#777" stroke-width="4"/>
      <circle cx="78" cy="45" r="7" fill="#f4dca9"/>
      <circle cx="123" cy="214" r="25" fill="#fff" opacity=".22"/><text x="123" y="226" text-anchor="middle" font-family="system-ui,sans-serif" font-size="34" font-weight="800" fill="#fff" opacity=".82">${initial}</text>
    </g>
    <g transform="translate(292 55) rotate(7 135 198)">
      <rect width="252" height="402" rx="39" fill="#171717"/>
      <rect x="8" y="8" width="236" height="386" rx="32" fill="url(#screen)"/>
      <circle cx="126" cy="23" r="7" fill="#080808"/>
      <path d="M24 300 C96 214 135 270 228 156 L228 378 L24 378Z" fill="#f4a72c" opacity=".5"/>
      <path d="M24 245 C100 158 153 215 228 105" fill="none" stroke="#fff" stroke-opacity=".26" stroke-width="4"/>
    </g>
  </g>
  <text x="320" y="506" text-anchor="middle" font-family="system-ui,sans-serif" font-size="20" font-weight="800" fill="#49321e">${brand} ${model}</text>
  <text x="320" y="532" text-anchor="middle" font-family="system-ui,sans-serif" font-size="14" fill="#806c5d">${colour} · Illustrative image</text>
</svg>`;

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=604800, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
