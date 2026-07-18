import { isTrustedPhoneImageUrl } from "@/lib/phone-art";

type JsonRecord = Record<string, unknown>;

function record(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function imageFrom(value: unknown) {
  const item = record(value);
  return [item.Pic500x500, item.HighPic, item.Pic, item.LowPic, item.ThumbPic]
    .map(text)
    .find(isTrustedPhoneImageUrl) ?? "";
}

export type IcecatMatch = {
  imageUrl: string;
  icecatProductId: string;
  title: string;
  brand: string;
  productCode: string;
  gtins: string[];
};

export function parseIcecatProduct(payload: unknown): IcecatMatch | null {
  const data = record(record(payload).data);
  const general = record(data.GeneralInfo);
  const gallery = Array.isArray(data.Gallery) ? data.Gallery : [];
  const mainGallery = gallery.find(item => {
    const entry = record(item);
    return text(entry.IsMain).toUpperCase() === "Y" && text(entry.Type).toLowerCase() === "productimage";
  });
  const imageUrl = imageFrom(mainGallery) || imageFrom(data.Image) || gallery.map(imageFrom).find(Boolean) || "";
  if (!imageUrl) return null;
  const brand = text(record(general.Brand).Brand) || text(general.Brand);
  const rawGtins = general.GTIN;
  const gtins = (Array.isArray(rawGtins) ? rawGtins : [rawGtins]).map(value => text(record(value).Value) || text(value)).filter(Boolean);
  return {
    imageUrl,
    icecatProductId: String(general.IcecatId ?? record(payload).icecat_id ?? ""),
    title: text(record(general.Title).Value) || text(general.Title) || text(general.ProductName),
    brand,
    productCode: text(general.BrandPartCode) || text(general.ProductCode),
    gtins,
  };
}
