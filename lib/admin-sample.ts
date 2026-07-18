import { sampleInventory } from "@/lib/catalog";

const privatePrices = [
  { purchasePrice: 68100, minimumSellingPrice: 71500 },
  { purchasePrice: 64200, minimumSellingPrice: 67500 },
  { purchasePrice: 19800, minimumSellingPrice: 21500 },
  { purchasePrice: 28600, minimumSellingPrice: 30500 },
  { purchasePrice: 21800, minimumSellingPrice: 23500 },
  { purchasePrice: 42300, minimumSellingPrice: 44900 },
];

export const sampleAdminInventory = sampleInventory.map((phone, index) => ({ ...phone, ...privatePrices[index] }));
