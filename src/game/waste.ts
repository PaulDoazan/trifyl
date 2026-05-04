export type BinKind = 'yellow' | 'black' | 'orange' | 'hazardous';

export type WasteType =
  | 'plastic_bottle' | 'can' | 'cardboard' | 'milk_carton'
  | 'dirty_yogurt_pot' | 'tissue' | 'broken_toy'
  | 'apple' | 'coffee_grounds' | 'egg_shell'
  | 'battery' | 'lightbulb' | 'medication';

export interface WasteMeta {
  type: WasteType;
  bin: BinKind;
  label: string;
  educationalText?: string;
  asset: string;
}
