export type BoxLabelResult = {
  brand: string;
  model: string;
  manufacturerCode: string;
  colour: string;
  ramGb: string;
  storageGb: string;
  gtin: string;
  imei1: string;
  imei2: string;
  serialNumber: string;
  confidence: number;
};

const brands = ["Samsung", "Apple", "Realme", "Motorola", "OnePlus", "Xiaomi", "Redmi", "Poco", "Vivo", "Oppo", "Nothing", "Infinix", "Tecno", "Nokia", "Google"];

function validLuhn(value: string) {
  let sum = 0;
  for (let index = 0; index < value.length; index += 1) {
    let digit = Number(value[value.length - 1 - index]);
    if (index % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
}

function validGtin(value: string) {
  if (![8, 12, 13, 14].includes(value.length)) return false;
  const digits = [...value].map(Number);
  const check = digits.pop();
  const sum = digits.reverse().reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return check === (10 - (sum % 10)) % 10;
}

function nearby(text: string, labels: RegExp, pattern: RegExp) {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (let index = 0; index < lines.length; index += 1) {
    if (!labels.test(lines[index])) continue;
    const candidate = [lines[index], lines[index + 1] ?? ""].join(" ");
    const match = candidate.match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

export function parseBoxLabel(rawText: string, decodedCodes: string[] = []): BoxLabelResult {
  const text = rawText.replace(/[|]/g, "I").replace(/[ \t]+/g, " ");
  const upper = text.toUpperCase();
  const brand = brands.find(name => upper.includes(name.toUpperCase())) ?? "";
  const imeis = [...new Set((text.match(/\b\d{15}\b/g) ?? []).filter(validLuhn))];
  const allCodes = [...decodedCodes, ...(text.match(/\b\d{8,14}\b/g) ?? [])].map(value => value.replace(/\D/g, ""));
  const gtin = allCodes.find(code => validGtin(code) && !imeis.includes(code)) ?? "";
  const manufacturerCode = (
    upper.match(/\b(?:RMX\d{4,5}|CPH\d{4,5}|SM-[A-Z0-9]{5,15}|XT\d{4,5}(?:-\d)?|V\d{4,5}|A\d{4,5}|M\d{4,5})\b/)?.[0] ?? ""
  );

  const capacities = [...text.matchAll(/\b(2|3|4|6|8|12|16|24|32|64|128|256|512|1024)\s*GB\b/gi)].map(match => Number(match[1]));
  const ram = capacities.find(value => value <= 24);
  const storage = capacities.find(value => value >= 32 && value !== ram);
  const variant = text.match(/\b(2|3|4|6|8|12|16|24)\s*(?:GB)?\s*[+/|]\s*(32|64|128|256|512|1024)\s*(?:GB)?\b/i);

  const colour = nearby(text, /colou?r|clr/i, /(?:colou?r|clr)\s*[:\-]?\s*([A-Za-z][A-Za-z ]{2,30})/i)
    .replace(/\s+(?:RAM|ROM|IMEI|S\/N|MODEL).*$/i, "").trim();
  const serialNumber = nearby(text, /serial|s\/n|sn\b/i, /(?:serial(?:\s*no)?|s\/n|sn)\s*[:\-]?\s*([A-Z0-9-]{6,30})/i);

  let model = nearby(text, /model name|product name|device/i, /(?:model name|product name|device)\s*[:\-]?\s*([A-Za-z0-9 +._-]{2,45})/i);
  if (!model && brand) {
    const line = text.split(/\r?\n/).find(value => value.toUpperCase().includes(brand.toUpperCase()) && !/manufactured|marketed/i.test(value));
    model = line?.replace(new RegExp(brand, "i"), "").replace(/(?:8|12|16)\s*GB.*$/i, "").trim() ?? "";
  }

  const populated = [brand, model, manufacturerCode, colour, variant?.[1] ?? ram, variant?.[2] ?? storage, gtin, imeis[0], serialNumber].filter(Boolean).length;
  return {
    brand,
    model,
    manufacturerCode,
    colour,
    ramGb: String(variant?.[1] ?? ram ?? ""),
    storageGb: String(variant?.[2] ?? storage ?? ""),
    gtin,
    imei1: imeis[0] ?? "",
    imei2: imeis[1] ?? "",
    serialNumber,
    confidence: Math.round((populated / 9) * 100),
  };
}
