import type { WasteMeta, WasteType } from './waste';

export const ALL_WASTE_TYPES: readonly WasteType[] = [
  'plastic_bottle', 'can', 'cardboard', 'milk_carton',
  'dirty_yogurt_pot', 'tissue', 'broken_toy',
  'apple', 'coffee_grounds', 'egg_shell',
  'battery', 'lightbulb', 'medication',
];

export const WASTE_META: Record<WasteType, WasteMeta> = {
  plastic_bottle:   { type: 'plastic_bottle',   bin: 'yellow', label: 'Bouteille plastique', asset: 'tile/plastic_bottle' },
  can:              { type: 'can',              bin: 'yellow', label: 'Canette',             asset: 'tile/can' },
  cardboard:        { type: 'cardboard',        bin: 'yellow', label: 'Carton',              asset: 'tile/cardboard' },
  milk_carton:      { type: 'milk_carton',      bin: 'yellow', label: 'Brique de lait',      asset: 'tile/milk_carton' },

  dirty_yogurt_pot: { type: 'dirty_yogurt_pot', bin: 'black',  label: 'Pot de yaourt sale',  asset: 'tile/dirty_yogurt_pot' },
  tissue:           { type: 'tissue',           bin: 'black',  label: 'Mouchoir',            asset: 'tile/tissue' },
  broken_toy:       { type: 'broken_toy',       bin: 'black',  label: 'Jouet cassé',         asset: 'tile/broken_toy' },

  apple:            { type: 'apple',            bin: 'orange', label: 'Pomme',               asset: 'tile/apple' },
  coffee_grounds:   { type: 'coffee_grounds',   bin: 'orange', label: 'Marc de café',        asset: 'tile/coffee_grounds' },
  egg_shell:        { type: 'egg_shell',        bin: 'orange', label: "Coquille d'œuf",      asset: 'tile/egg_shell' },

  battery: {
    type: 'battery', bin: 'hazardous', label: 'Pile',
    asset: 'tile/battery',
    educationalText: "Les piles sont des déchets dangereux : elles contiennent des métaux lourds. À déposer en déchèterie ou dans un point de collecte dédié, jamais dans les bacs ménagers.",
  },
  lightbulb: {
    type: 'lightbulb', bin: 'hazardous', label: 'Ampoule',
    asset: 'tile/lightbulb',
    educationalText: "Les ampoules basse consommation et LED contiennent des composants à recycler. À déposer en déchèterie ou dans un point de collecte en magasin.",
  },
  medication: {
    type: 'medication', bin: 'hazardous', label: 'Médicament',
    asset: 'tile/medication',
    educationalText: "Les médicaments périmés ou non utilisés se rapportent en pharmacie (Cyclamed), jamais dans les ordures ménagères ni les toilettes.",
  },
};
