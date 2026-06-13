import type { WasteCategory } from './config-loader';

export type { WasteCategory, BinCategory, SpecialCategory } from './config-loader';

// Un déchet est identifié par un id libre (clé du config).
export type WasteType = string;

export interface WasteMeta {
  type: WasteType;
  category: WasteCategory;
  asset: string;
}
