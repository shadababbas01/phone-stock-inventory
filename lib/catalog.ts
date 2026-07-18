export type PhoneVariant = {
  id: number;
  brand: string;
  model: string;
  slug: string;
  ramGb: number;
  storageGb: number;
  colour: string;
  colourHex: string;
  condition: string;
  networkType: string;
  mrp: number;
  sellingPrice: number;
  availableStock: number;
  reservedStock: number;
  reorderLevel: number;
  imageUrl: string;
  updatedAt: string;
  sku?: string;
  purchasePrice?: number;
  minimumSellingPrice?: number;
};

export const sampleInventory: PhoneVariant[] = [
  { id: 1, brand: "Samsung", model: "Galaxy S25", slug: "samsung-galaxy-s25-12-256-navy", ramGb: 12, storageGb: 256, colour: "Navy", colourHex: "#263c67", condition: "New", networkType: "5G", mrp: 80999, sellingPrice: 74999, availableStock: 6, reservedStock: 0, reorderLevel: 2, imageUrl: "/phones/phone-navy.webp", updatedAt: "Today", sku: "SAM-S25-12-256-NV" },
  { id: 2, brand: "Apple", model: "iPhone 16", slug: "apple-iphone-16-8-128-ultramarine", ramGb: 8, storageGb: 128, colour: "Ultramarine", colourHex: "#4466d8", condition: "New", networkType: "5G", mrp: 79900, sellingPrice: 69900, availableStock: 4, reservedStock: 1, reorderLevel: 2, imageUrl: "/phones/phone-blue.webp", updatedAt: "Today", sku: "APL-IP16-8-128-UM" },
  { id: 3, brand: "Motorola", model: "Edge 60 Fusion", slug: "motorola-edge-60-fusion-8-256-silver", ramGb: 8, storageGb: 256, colour: "Slipstream", colourHex: "#a9c4d4", condition: "New", networkType: "5G", mrp: 25999, sellingPrice: 22999, availableStock: 9, reservedStock: 0, reorderLevel: 3, imageUrl: "/phones/phone-silver.webp", updatedAt: "Today", sku: "MOT-E60F-8-256-SS" },
  { id: 4, brand: "OnePlus", model: "Nord 5", slug: "oneplus-nord-5-12-256-blue", ramGb: 12, storageGb: 256, colour: "Phantom Blue", colourHex: "#5b84ba", condition: "New", networkType: "5G", mrp: 34999, sellingPrice: 31999, availableStock: 3, reservedStock: 0, reorderLevel: 2, imageUrl: "/phones/phone-blue.webp", updatedAt: "Today", sku: "ONE-N5-12-256-PB" },
  { id: 5, brand: "Nothing", model: "Phone (3a)", slug: "nothing-phone-3a-8-128-white", ramGb: 8, storageGb: 128, colour: "White", colourHex: "#e8e5df", condition: "New", networkType: "5G", mrp: 26999, sellingPrice: 24999, availableStock: 2, reservedStock: 0, reorderLevel: 2, imageUrl: "/phones/phone-silver.webp", updatedAt: "Yesterday", sku: "NTH-3A-8-128-WH" },
  { id: 6, brand: "Google", model: "Pixel 9a", slug: "google-pixel-9a-8-256-navy", ramGb: 8, storageGb: 256, colour: "Iris", colourHex: "#626e9a", condition: "New", networkType: "5G", mrp: 49999, sellingPrice: 46999, availableStock: 0, reservedStock: 0, reorderLevel: 2, imageUrl: "/phones/phone-navy.webp", updatedAt: "Yesterday", sku: "GOO-P9A-8-256-IR" },
];

export const money = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
