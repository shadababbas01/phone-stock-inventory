type PhoneArtDetails = {
  brand: string;
  model: string;
  colour: string;
  colourHex?: string;
};

const colourKeywords: Array<[RegExp, string]> = [
  [/black|graphite|obsidian|eclipse|shadow/i, "#292b30"],
  [/white|porcelain|ivory|cream/i, "#eeeae3"],
  [/silver|grey|gray|titanium|moonstone|slipstream/i, "#aeb5bd"],
  [/navy|indigo|ultramarine|blue|iris|ocean/i, "#536f9f"],
  [/green|mint|olive|sage|jade|emerald/i, "#6f9381"],
  [/purple|violet|lavender|grape/i, "#8b78a7"],
  [/pink|rose/i, "#d99aa8"],
  [/orange|copper|desert|sand|gold/i, "#c8884f"],
  [/red|scarlet|crimson/i, "#b84f4f"],
  [/yellow|lime/i, "#c8b64a"],
];

export function colourToHex(colour: string, supplied?: string) {
  if (supplied && /^#[0-9a-f]{6}$/i.test(supplied)) return supplied;
  return colourKeywords.find(([pattern]) => pattern.test(colour))?.[1] ?? "#8799a6";
}

export function phoneArtUrl(phone: PhoneArtDetails) {
  const params = new URLSearchParams({
    brand: phone.brand,
    model: phone.model,
    colour: phone.colour,
    hex: colourToHex(phone.colour, phone.colourHex),
  });
  return `/api/phone-art?${params.toString()}`;
}
