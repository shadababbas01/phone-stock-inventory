export type DeviceProfile = {
  brand: string;
  model: string;
  colours: string[];
  ramGb: number[];
  storageGb: number[];
};

export const deviceProfiles: DeviceProfile[] = [
  { brand: "Samsung", model: "Galaxy S26 Ultra", colours: ["Titanium Black", "Titanium Silver", "Titanium Blue", "Titanium Grey"], ramGb: [12, 16], storageGb: [256, 512, 1024] },
  { brand: "Samsung", model: "Galaxy S26+", colours: ["Navy", "Silver Shadow", "Icy Blue", "Mint"], ramGb: [12], storageGb: [256, 512] },
  { brand: "Samsung", model: "Galaxy S26", colours: ["Navy", "Silver Shadow", "Icy Blue", "Mint"], ramGb: [8, 12], storageGb: [128, 256, 512] },
  { brand: "Samsung", model: "Galaxy S25 Ultra", colours: ["Titanium Black", "Titanium Grey", "Titanium Silverblue", "Titanium Whitesilver"], ramGb: [12], storageGb: [256, 512, 1024] },
  { brand: "Samsung", model: "Galaxy S25+", colours: ["Navy", "Silver Shadow", "Icy Blue", "Mint"], ramGb: [12], storageGb: [256, 512] },
  { brand: "Samsung", model: "Galaxy S25", colours: ["Navy", "Silver Shadow", "Icy Blue", "Mint"], ramGb: [12], storageGb: [128, 256, 512] },
  { brand: "Samsung", model: "Galaxy A56 5G", colours: ["Awesome Graphite", "Awesome Lightgray", "Awesome Olive", "Awesome Pink"], ramGb: [8, 12], storageGb: [128, 256] },
  { brand: "Samsung", model: "Galaxy A36 5G", colours: ["Awesome Black", "Awesome White", "Awesome Lime", "Awesome Lavender"], ramGb: [8, 12], storageGb: [128, 256] },
  { brand: "Apple", model: "iPhone 17 Pro Max", colours: ["Silver", "Deep Blue", "Cosmic Orange"], ramGb: [12], storageGb: [256, 512, 1024, 2048] },
  { brand: "Apple", model: "iPhone 17 Pro", colours: ["Silver", "Deep Blue", "Cosmic Orange"], ramGb: [12], storageGb: [256, 512, 1024] },
  { brand: "Apple", model: "iPhone 17", colours: ["Black", "White", "Mist Blue", "Sage", "Lavender"], ramGb: [8], storageGb: [256, 512] },
  { brand: "Apple", model: "iPhone 16 Pro Max", colours: ["Black Titanium", "White Titanium", "Natural Titanium", "Desert Titanium"], ramGb: [8], storageGb: [256, 512, 1024] },
  { brand: "Apple", model: "iPhone 16", colours: ["Black", "White", "Pink", "Teal", "Ultramarine"], ramGb: [8], storageGb: [128, 256, 512] },
  { brand: "Google", model: "Pixel 10 Pro XL", colours: ["Moonstone", "Jade", "Porcelain", "Obsidian"], ramGb: [16], storageGb: [256, 512, 1024] },
  { brand: "Google", model: "Pixel 10 Pro", colours: ["Moonstone", "Jade", "Porcelain", "Obsidian"], ramGb: [16], storageGb: [128, 256, 512, 1024] },
  { brand: "Google", model: "Pixel 10", colours: ["Indigo", "Frost", "Lemongrass", "Obsidian"], ramGb: [12], storageGb: [128, 256] },
  { brand: "OnePlus", model: "OnePlus 15", colours: ["Infinite Black", "Sand Storm", "Ultra Violet"], ramGb: [12, 16], storageGb: [256, 512] },
  { brand: "OnePlus", model: "OnePlus 13", colours: ["Black Eclipse", "Midnight Ocean", "Arctic Dawn"], ramGb: [12, 16, 24], storageGb: [256, 512, 1024] },
  { brand: "OnePlus", model: "OnePlus Nord 5", colours: ["Marble Sands", "Dry Ice", "Phantom Grey"], ramGb: [8, 12], storageGb: [128, 256] },
  { brand: "Nothing", model: "Phone (3)", colours: ["Black", "White"], ramGb: [12, 16], storageGb: [256, 512] },
  { brand: "Nothing", model: "Phone (3a) Pro", colours: ["Black", "Grey"], ramGb: [8, 12], storageGb: [128, 256] },
  { brand: "Motorola", model: "Edge 60 Pro", colours: ["Pantone Shadow", "Pantone Dazzling Blue", "Pantone Sparkling Grape"], ramGb: [8, 12], storageGb: [256, 512] },
  { brand: "Motorola", model: "Razr 60 Ultra", colours: ["Pantone Scarab", "Pantone Rio Red", "Pantone Mountain Trail"], ramGb: [16], storageGb: [512] },
  { brand: "Xiaomi", model: "Xiaomi 15 Ultra", colours: ["Black", "White", "Silver Chrome"], ramGb: [16], storageGb: [512] },
  { brand: "Redmi", model: "Redmi Note 15 Pro+ 5G", colours: ["Black", "Blue", "Silver"], ramGb: [8, 12], storageGb: [256, 512] },
  { brand: "Poco", model: "Poco F7 Ultra", colours: ["Black", "Yellow"], ramGb: [12, 16], storageGb: [256, 512] },
  { brand: "Vivo", model: "Vivo X200 Pro", colours: ["Cosmos Black", "Titanium Grey"], ramGb: [16], storageGb: [512] },
  { brand: "Oppo", model: "Oppo Find X8 Pro", colours: ["Space Black", "Pearl White"], ramGb: [16], storageGb: [512] },
  { brand: "Realme", model: "Realme GT 7 Pro", colours: ["Mars Orange", "Galaxy Grey"], ramGb: [12, 16], storageGb: [256, 512] },
  { brand: "iQOO", model: "iQOO 13", colours: ["Legend", "Nardo Grey"], ramGb: [12, 16], storageGb: [256, 512] },
  { brand: "Honor", model: "Honor Magic7 Pro", colours: ["Lunar Shadow Grey", "Breeze Blue", "Black"], ramGb: [12], storageGb: [512] },
  { brand: "Infinix", model: "Infinix GT 30 Pro", colours: ["Dark Flare", "Blade White", "Shadow Ash"], ramGb: [8, 12], storageGb: [256, 512] },
  { brand: "Tecno", model: "Camon 40 Premier 5G", colours: ["Emerald Lake Green", "Galaxy Black"], ramGb: [12], storageGb: [256] },
  { brand: "Nokia", model: "Nokia G42 5G", colours: ["So Grey", "So Purple", "So Pink"], ramGb: [6, 8], storageGb: [128, 256] }
];

export const commonBrands = [...new Set(deviceProfiles.map(device => device.brand))].sort();

function includesQuery(value: string, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  const lower = value.toLowerCase();
  const simplified = lower.replace(/galaxy|iphone|phone|vivo|oppo|realme|poco|redmi|xiaomi|oneplus|motorola|google/gi, "").trim();
  if (normalized.length <= 2) {
    return lower.startsWith(normalized) || simplified.split(/\s+/).some(token => token.startsWith(normalized));
  }
  return lower.includes(normalized) || simplified.includes(normalized);
}

export function localSuggestions(brand = "", query = "", model = "") {
  const selectedBrand = commonBrands.find(item => item.toLowerCase() === brand.trim().toLowerCase());
  const brandMatches = commonBrands.filter(item => includesQuery(item, brand)).slice(0, 12);
  const brandDevices = selectedBrand ? deviceProfiles.filter(device => device.brand === selectedBrand) : [];
  const modelMatches = brandDevices.filter(device => includesQuery(device.model, query || model)).slice(0, 20);
  const exact = brandDevices.find(device => device.model.toLowerCase() === model.trim().toLowerCase());

  return {
    brands: brandMatches.length ? brandMatches : commonBrands,
    models: modelMatches.map(device => device.model),
    colours: exact?.colours ?? [],
    ramGb: exact?.ramGb ?? [],
    storageGb: exact?.storageGb ?? [],
    exactMatch: Boolean(exact)
  };
}
