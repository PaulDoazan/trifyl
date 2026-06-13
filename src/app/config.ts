export const STAGE_WIDTH = 1920;
export const STAGE_HEIGHT = 1080;
export const MENU_WIDTH = 528;

// Zone des CASES peintes dans les images grille_nivX.png (centres des cellules),
// mesurée sur les assets — pas la bordure pointillée extérieure, qui inclut un padding.
// Identique pour les 3 niveaux (même cadre, subdivisé en 5/8/10). La grille se cale dessus :
// tileW = width/n, tileH = height/n, centre d'une case = origin + (i + 0.5) * tile.
export const GRID_RECT = { x: 714, y: 70, width: 952, height: 944 } as const;
