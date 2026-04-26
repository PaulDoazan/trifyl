# Trifyl — Spec de conception

**Date** : 2026-04-26
**Auteur** : brainstormé entre Paul Doazan et Claude
**Statut** : v1, prêt pour plan d'implémentation

---

## 1. Vue d'ensemble

Trifyl est un jeu éducatif de tri des déchets pour borne interactive. Le joueur enchaîne des Match-3 sur une grille de déchets ; chaque match envoie les tuiles dans le bon récipient (bac jaune / sac noir / sac orange) ou déclenche un message pédagogique pour les déchets dangereux (déchèterie). La partie continue jusqu'à ce que la grille n'offre plus de combinaisons possibles ; le score final est affiché.

**Public** : tout-venant (lieu public, école, médiathèque, mairie, événement de sensibilisation).
**Objectif** : sensibilisation aux règles de tri français via une mécanique de jeu plaisante et accessible.

Le projet est en français exclusivement (UI + contenus pédagogiques) pour la v1.

---

## 2. Stack technique

| Couche | Choix |
|---|---|
| Langage | TypeScript (strict) |
| Rendu animé (canvas) | PixiJS v8 |
| Animations (DOM + Pixi) | GSAP |
| Build | Vite |
| Tests unitaires | Vitest |
| Style DOM | CSS vanilla (variables CSS pour le thème) |

Aucune dépendance React/Vue/Svelte. L'app est un single-page TypeScript pur, monté à la main.

---

## 3. Format & contraintes

- **Résolution fixe** : 1920×1080. L'app n'est ni responsive ni redimensionnable. Si l'écran de la borne est différent, on ajustera via une transformation CSS (`scale`) pour préserver le ratio, mais cela sort du périmètre v1.
- **Orientation** : paysage uniquement.
- **Input** : tactile (borne). Le test en dev se fera à la souris (un clic = un tap).
- **Audio** : aucun (cf. Q12).
- **Connectivité** : aucune. L'app fonctionne 100% offline, aucune analytics, aucune télémétrie.
- **Langue** : français uniquement.

---

## 4. Architecture de rendu

### Layered Hybrid

Trois couches superposées :

```
┌─────────────────────────────────────────────────────────┐
│  HUD (DOM, z-index 2)                                   │
│  Score, Niveau, libellés bacs, boutons (Home/Quitter/   │
│  Voir résultat), texte des overlays, écrans accueil/    │
│  screensaver/fin                                        │
├─────────────────────────────────────────────────────────┤
│  Game canvas Pixi (z-index 1, full 1920×1080)           │
│  → Grille + tuiles (zone droite)                        │
│  → 3 bacs animés (zone menu gauche)                     │
│  → Animations vol tuile → bac, cascades, effet piège    │
├─────────────────────────────────────────────────────────┤
│  Background (DOM, z-index 0)                            │
│  Couleurs/dégradés du menu, panneaux décoratifs         │
└─────────────────────────────────────────────────────────┘
```

### Répartition des responsabilités

| Element | Couche |
|---|---|
| Grille de jeu, tuiles, animations de match/chute | Pixi |
| 3 récipients animés (ouverture/fermeture frame par frame) | Pixi |
| Tuile qui vole de la grille vers son bac | Pixi |
| Effet "tourbillon" sur match piège (déchèterie) | Pixi |
| Score, libellés, niveau (texte) | DOM |
| Boutons (Home, Quitter, Rejouer, Voir résultat) | DOM |
| Texte des overlays (haut + bas) | DOM |
| Écrans accueil / screensaver / fin (layouts) | DOM |
| Vidéo de fin | DOM (`<video>`) |
| Question d'accueil + 3 boutons niveau | DOM |

### Pointer events

- Le canvas Pixi a `pointer-events: auto` **uniquement sur la zone de la grille**. Ailleurs (zone menu, zones bacs), `pointer-events: none` — les bacs sont décoratifs animés, pas cliqués par le joueur.
- Les boutons DOM gardent leur clic naturel par-dessus le canvas.

### Animations

- GSAP est utilisé pour les deux mondes : tweens sur `transform/opacity` côté DOM, tweens sur `x/y/scale/alpha` côté Pixi `DisplayObject`.
- Les animations bloquantes (cascade en cours, vol vers bac) **mettent en pause les inputs** : le joueur ne peut pas swap pendant une animation. Cela évite les états incohérents.

---

## 5. Modèle de données

### Types principaux

```ts
// Catégorie de bac de destination
type BinKind = 'yellow' | 'black' | 'orange' | 'hazardous';
// hazardous = "déchèterie" : pas de bac visible, déclenche overlay info

// Type de déchet (placeholder, à enrichir)
type WasteType =
  // recyclables → bac jaune
  | 'plastic_bottle' | 'can' | 'cardboard' | 'milk_carton'
  // résiduels → sac noir
  | 'dirty_yogurt_pot' | 'tissue' | 'broken_toy'
  // biodéchets → sac orange
  | 'apple' | 'coffee_grounds' | 'egg_shell'
  // dangereux → déchèterie
  | 'battery' | 'lightbulb' | 'medication';

interface WasteMeta {
  type: WasteType;
  bin: BinKind;
  label: string;          // ex. "Bouteille plastique"
  educationalText?: string; // requis ssi bin === 'hazardous'
  asset: string;          // clé dans AssetProvider
}

// État pur de la grille (testable sans Pixi)
type Cell = WasteType | null; // null = case vide en cours de remplissage

interface GameState {
  level: 1 | 2 | 3;
  grid: Cell[][];        // [row][col], origin top-left
  rows: number;
  cols: number;
  score: number;
  isAnimating: boolean;
  isOver: boolean;       // true quand plus aucune combinaison possible
}
```

### Configuration des niveaux

```ts
interface LevelConfig {
  level: 1 | 2 | 3;
  size: 5 | 10 | 15;     // grille carrée
  wasteTypes: WasteType[]; // sous-ensemble du WasteType
  trapTypes: WasteType[]; // sous-ensemble inclus dans wasteTypes
}

const LEVEL_1: LevelConfig = {
  level: 1, size: 5,
  wasteTypes: ['plastic_bottle', 'apple', 'tissue', 'battery'],
  trapTypes: ['battery'],
};

const LEVEL_2: LevelConfig = {
  level: 2, size: 10,
  wasteTypes: [
    'plastic_bottle', 'can', 'cardboard',
    'apple', 'coffee_grounds',
    'tissue', 'dirty_yogurt_pot',
    'battery',
  ],
  trapTypes: ['battery'],
};

const LEVEL_3: LevelConfig = {
  level: 3, size: 15,
  wasteTypes: [
    'plastic_bottle', 'can', 'cardboard', 'milk_carton',
    'apple', 'coffee_grounds', 'egg_shell',
    'tissue', 'dirty_yogurt_pot', 'broken_toy',
    'battery', 'lightbulb', 'medication',
  ],
  trapTypes: ['battery', 'lightbulb', 'medication'],
};
```

Le mapping exact de chaque déchet vers son bac est défini dans `waste-data.ts`. La liste finale des items est susceptible de changer en fonction des assets fournis ; ce qui compte côté code est la stabilité du `WasteType` et de son `BinKind`.

---

## 6. Game loop & mécaniques

### Mécanique de match

- **Match-3 classique** : le joueur swap deux cases adjacentes (haut/bas/gauche/droite). Si le swap crée au moins une ligne ou colonne de 3+ tuiles identiques, le swap est validé. Sinon, le swap est animé puis annulé (retour visuel "rebond").
- **Inputs supportés** :
  - Drag-and-drop : doigt posé, glissé vers une case adjacente, relâché. Si le déplacement dépasse un seuil (ex. 30% de la largeur d'une tuile) dans une direction, le swap est tenté.
  - Tap-tap : tap sur tuile A → A est mise en surbrillance ; tap sur tuile B adjacente → swap tenté. Tap sur une tuile non-adjacente → on désélectionne A et on sélectionne B.
- Les deux modes coexistent : le moteur d'input distingue un drag d'un tap au moment du `pointerup`.

### Résolution d'un match

Quand un swap valide est confirmé :
1. Les tuiles matchées sont retirées de la grille (`Cell = null`).
2. Pour les tuiles à bac (jaune/noir/orange) : animation **vol vers le bac correspondant** dans le menu. À l'arrivée, le bac s'ouvre (animation frame par frame), absorbe la tuile, se referme.
3. Pour les tuiles piège (déchèterie) : animation **tourbillon sur place**, la tuile se dissout. **L'overlay éducatif du bas s'affiche** avec le texte associé (ex. "Les piles sont des déchets dangereux..."), reste 4-5 secondes puis disparaît.
4. **Gravité** : les tuiles au-dessus tombent pour combler les vides.
5. **Refill** : de nouvelles tuiles aléatoires apparaissent en haut pour remplir la grille.
6. **Cascade** : si la chute crée de nouveaux matches, on enchaîne (étape 1 à nouveau). Le compteur de cascade est incrémenté à chaque itération et applique un multiplicateur de score.
7. Une fois la grille stable, on **détecte si un swap valide existe encore** (cf. `findValidMoves`). Si non, la partie est terminée.

### Fin de partie

- Détection : aucun swap possible dans l'état stable.
- Affichage : **overlay "Plus de combinaisons possibles"** (DOM, en haut de la zone grille) avec :
  - Texte "Plus de combinaisons possibles"
  - Score final
  - Bouton "Voir le résultat"
- Action sur le bouton : transition vers l'**écran Média de fin**.

### État de jeu invariants

- `isAnimating === true` : tout input grille est ignoré.
- Un swap qui ne crée aucun match : animation de swap → animation d'undo. Pas de pénalité de score.
- L'algorithme de génération de la grille initiale garantit :
  - **Aucun match présent au démarrage** (sinon la grille se résout toute seule sans intervention du joueur)
  - **Au moins un swap valide existe** (sinon la partie est immédiatement perdue)
- Si après cascade aucun swap valide n'existe alors que la grille est pleine, la partie se termine. Pas de shuffle automatique en v1.

---

## 7. Système de score

### Formule

| Évènement | Points de base |
|---|---|
| Match de 3 | 30 |
| Match de 4 | 60 |
| Match de 5 | 100 |
| Match de 6+ | 150 |

### Modificateurs

- **Tuile piège** (battery / lightbulb / medication) dans le match : score du match × 2.
- **Cascade** : le N-ième match d'une chaîne de cascade reçoit un multiplicateur ×N (1er match ×1, 2e ×2, 3e ×3...). Plafond à ×5 pour éviter les explosions de score irréalistes.
- Les modificateurs se cumulent (ex. cascade ×3 + match piège : score × 6).

### Affichage

Le score est affiché en permanence dans la zone "Infos" du menu (en haut). Il s'incrémente avec une petite animation GSAP (count-up) à chaque résolution de match.

---

## 8. Écrans & flow utilisateur

### Vue d'ensemble du flow

```
[Screensaver] ←─┐
   │ tap        │ 60s d'inactivité (sur tout écran sauf elle-même)
   ▼            │ Au tap : retour à l'écran d'origine (état préservé)
[Accueil] ────┐
   │ tap niveau│
   ▼          │
[Jeu (L1/L2/L3)]
   │ grille bloquée → bouton "Voir le résultat"
   │ ou bouton "Quitter le jeu" du menu
   ▼
[Média de fin]
   │ bouton "Rejouer" → Accueil
   │ bouton "Home" → Accueil
   ▼
[Accueil]
```

### 8.1. Écran d'accueil

- Layout : centré, 1920×1080.
- Question principale : **"Es-tu un serial trieur ?"** (typographie large).
- Trois boutons en colonne ou en ligne (à affiner visuellement) :
  - "Niveau 1 — Facile"
  - "Niveau 2 — Intermédiaire"
  - "Niveau 3 — Expert"
- Visuel d'ambiance : à définir (illustration de bacs, déchets qui dansent, etc.) — en placeholder, formes Pixi simples.

### 8.2. Écran de jeu

```
┌─── 528 ────┬───────── 1392 ─────────────┐
│  ┌─────┐   │                             │
│  │INFOS│   │   ┌────────────────────┐    │
│  │Score│   │   │                    │    │
│  └─────┘   │   │   GRILLE           │    │
│  Niveau 02 │   │                    │    │
│  ┌──────┐  │   │                    │    │
│  │ Jaune│  │   │                    │    │
│  └──────┘  │   └────────────────────┘    │
│  ┌──────┐  │                             │
│  │ Noir │  │  ┌──────── overlay du ─┐    │
│  └──────┘  │  │ haut (si bloqué)    │    │
│  ┌──────┐  │  └─────────────────────┘    │
│  │Orange│  │                             │
│  └──────┘  │  ┌──────── overlay du ─┐    │
│            │  │ bas (info pédago)   │    │
│ ┌──┐ ┌──┐  │  └─────────────────────┘    │
│ │Hm│ │Qt│  │                             │
│ └──┘ └──┘  │                             │
└────────────┴─────────────────────────────┘
```

**Menu gauche (528×1080)** :
- Zone Infos (haut) : `Score : 1240`
- Niveau actuel : `Niveau 02`
- Trois récipients en colonne (Pixi animés) avec leur libellé DOM à côté
- Footer : boutons "Accueil" et "Quitter le jeu"

**Zone de jeu (1392×1080)** :
- Grille centrée verticalement et horizontalement, marges respirantes (~80px)
- Taille de tuile dérivée du niveau :
  - 5×5 sur ~880×880 dispo → tuiles de ~170px
  - 10×10 → tuiles de ~85px
  - 15×15 → tuiles de ~58px
- Overlays (DOM) positionnés en `position: absolute` dans la zone de jeu :
  - **Overlay haut** : visible uniquement quand la grille est bloquée. Fond semi-opaque, message + bouton "Voir le résultat".
  - **Overlay bas** : visible uniquement pendant 4-5s après un match piège. Plus large que celui du haut. Fond plus opaque pour bonne lisibilité.

**Bouton "Quitter le jeu"** : confirmation modale ? Non en v1, action directe → Média de fin (avec score actuel).
**Bouton "Accueil"** : retour direct à l'accueil sans confirmation, score perdu.

### 8.3. Écran de veille (screensaver)

- Déclenchement automatique : 60s d'inactivité (timeout réinitialisé sur n'importe quel pointer event).
- Contenu : animation Pixi maison, ex. "déchets qui tombent en boucle et se trient automatiquement dans les 3 bacs". Pas d'asset externe en v1.
- **Au tap, retour à l'écran d'origine, état préservé** :
  - Si on était sur l'accueil → retour à l'accueil
  - Si on était en plein jeu → retour à la grille en l'état (score, position des tuiles, niveau)
  - Si on était sur Média de fin → retour à Média de fin
- Le timer d'inactivité repart à 0 dès le retour.

### 8.4. Écran Média de fin

- Vidéo en lecture (asset à fournir plus tard ; placeholder = écran avec message "Vidéo de sensibilisation" + animation simple).
- Boutons toujours visibles **en bas à droite** :
  - "Rejouer" → écran d'accueil
  - "Home" → écran d'accueil
- Note : "Rejouer" et "Home" mènent au même endroit en v1 ; on garde les deux pour cohérence avec la spec utilisateur. À fusionner ou différencier en v2 selon retour terrain.

---

## 9. Animations clés

| Évènement | Animation |
|---|---|
| Swap valide | Tuiles glissent l'une sur l'autre (~150ms, ease-out) |
| Swap invalide | Glissent puis reviennent (~300ms total, retour ease-in) |
| Match : tuile à bac | Vol parabolique vers le bac correspondant + scale-down (~400ms) |
| Bac qui reçoit | Animation frame par frame (ouvrir → absorber → fermer, ~500ms) |
| Match piège | Tourbillon sur place (rotation + scale-down + fade) (~500ms) |
| Cascade : chute | Tuiles tombent avec ease-bounce (~250ms par cellule de chute) |
| Refill | Nouvelles tuiles entrent par le haut, ease-out (~300ms) |
| Score count-up | Incrément animé sur ~400ms |
| Apparition overlay | Slide-in + fade (~250ms) |
| Disparition overlay (auto) | Fade-out (~200ms) |
| Transition d'écran | Cross-fade (~300ms) |
| Screensaver fade-in | Fade-in lent (~600ms) après 60s d'inactivité |

Toutes les durées sont des points de départ, à ajuster lors de l'intégration. Centralisées dans `src/app/animation-config.ts` pour tweak global.

---

## 10. Direction visuelle (Playful Flat)

Validée en Q14.

### Palette de référence (à raffiner dans `theme.css`)

| Token | Valeur | Usage |
|---|---|---|
| `--color-bg` | `#F0FAF0` | fond zone de jeu |
| `--color-menu-from` | `#2EB872` | dégradé menu gauche (haut) |
| `--color-menu-to` | `#1A8F4F` | dégradé menu gauche (bas) |
| `--color-menu-text` | `#FFFFFF` | texte sur menu |
| `--color-bin-yellow` | `#FFD93D` | bac jaune (recyclables) |
| `--color-bin-black` | `#2C2C2C` | sac noir (résiduels) |
| `--color-bin-orange` | `#FF7847` | sac orange (biodéchets) |
| `--color-accent` | `#4D96FF` | accent bleu (éléments tertiaires) |
| `--color-success` | `#6BCB77` | feedback positif |
| `--color-warning` | `#FFA726` | overlay piège / déchèterie |

### Ressentis

- Coins arrondis (radius 8 à 16 selon élément)
- Ombres douces (drop-shadow plutôt que box-shadow dur)
- Typographie sans-serif moderne (Inter ou équivalent system-ui)
- Pas de borders épais, pas de high-contrast harsh

### Typographie

- Font principale : `Inter`, fallback `system-ui, -apple-system, sans-serif`
- Échelle :
  - Question accueil "Es-tu un serial trieur ?" : ~96px bold
  - Score : ~48px bold
  - Niveau : ~64px black
  - Boutons : ~24px semibold
  - Texte overlay éducatif : ~32px regular
  - Labels bacs : ~20px medium

---

## 11. Stratégie d'assets

- **Cible** : assets fournis plus tard (illustrations dessinées des déchets, des bacs, vidéo de fin).
- **Pendant le dev** : tout est dessiné en code via SVG inline (pour le DOM) ou `Pixi.Graphics` / sprites SVG (pour le canvas).
- **Couche d'abstraction** : `AssetProvider` (interface) avec une implémentation `PlaceholderAssetProvider` en v1. Quand les assets définitifs arrivent, on ajoute `RealAssetProvider` qui charge des PNG/sprite-sheets, sans toucher au code consommateur.
- **Vidéo de fin** : un placeholder visuel (ex. "Vidéo de sensibilisation à venir" + animation Pixi de 10s) est utilisé pendant le dev. Le `<video>` DOM est branché derrière le même point d'extension.

---

## 12. Tests

### Stratégie

- **Tests unitaires uniquement** (Vitest) sur la logique pure de `src/game/*`. Aucun mock Pixi nécessaire.
- Pas de tests visuels / E2E en v1 (overkill pour une borne, pas un produit web).
- Couverture minimale ciblée sur les fonctions critiques :
  - `createInitialGrid` : pas de match initial, au moins un swap valide
  - `findMatches` : détection lignes, colonnes, T/L (matches en croix)
  - `isValidSwap` : adjacence, et match résultant
  - `applyGravity` : règle de chute correcte
  - `applyCascade` : enchaînement de matches successifs avec multiplicateur
  - `findValidMoves` : retourne au moins un coup s'il en existe, vide sinon
  - `computeScore` : formule exacte sur des cas tabulés (3/4/5/piège/cascades)
  - `selectWasteTypeForCell` : respecte la `LevelConfig`

### Conventions

- Un fichier de test par module (`grid.test.ts` pour `grid.ts`, etc.).
- Tests rapides, déterministes (seed du PRNG injectable).
- CI : `npm test` doit tourner en <5s.

---

## 13. Structure projet

```
trifyl/
├── src/
│   ├── main.ts                       # entry point
│   ├── app/
│   │   ├── App.ts                    # orchestration top-level
│   │   ├── ScreenManager.ts          # transitions accueil/jeu/screensaver/fin
│   │   ├── config.ts                 # constantes (tailles, délais, breakpoints)
│   │   └── animation-config.ts       # durées/easings GSAP centralisés
│   ├── game/                         # logique pure (testable, no Pixi)
│   │   ├── GameState.ts
│   │   ├── grid.ts                   # createInitialGrid, swap, set/get
│   │   ├── matching.ts               # findMatches, isValidSwap, findValidMoves
│   │   ├── cascade.ts                # applyGravity, refill, applyCascade
│   │   ├── score.ts                  # computeScore (formule + multiplicateurs)
│   │   ├── waste.ts                  # WasteType, BinKind, mapping
│   │   ├── waste-data.ts             # libellés + textes pédagogiques
│   │   ├── levels.ts                 # LEVEL_1, LEVEL_2, LEVEL_3
│   │   └── prng.ts                   # générateur seedé pour tests
│   ├── render/                       # Pixi
│   │   ├── PixiApp.ts                # init, ticker, redimensionnement
│   │   ├── GridRenderer.ts
│   │   ├── TileSprite.ts
│   │   ├── BinRenderer.ts            # 3 bacs animés frame par frame
│   │   ├── FlightAnimator.ts         # vol tuile → bac
│   │   ├── TrapEffect.ts             # tourbillon piège
│   │   └── ScreensaverScene.ts
│   ├── input/
│   │   ├── DragInput.ts
│   │   ├── TapInput.ts
│   │   └── IdleTracker.ts            # déclenche screensaver à 60s
│   ├── ui/                           # DOM
│   │   ├── HUD.ts                    # score, niveau (live)
│   │   ├── overlays/
│   │   │   ├── EduOverlay.ts         # bas, message piège
│   │   │   └── EndOverlay.ts         # haut, "plus de combinaisons" + bouton
│   │   └── screens/
│   │       ├── WelcomeScreen.ts
│   │       ├── ScreensaverScreen.ts  # wrap DOM + Pixi scene
│   │       └── EndMediaScreen.ts     # vidéo + boutons
│   ├── assets/
│   │   ├── AssetProvider.ts          # interface
│   │   ├── PlaceholderAssetProvider.ts
│   │   └── shapes.ts                 # SVG/Pixi.Graphics builders
│   └── styles/
│       ├── theme.css                 # variables CSS (palette Playful Flat)
│       ├── reset.css
│       ├── menu.css
│       ├── overlays.css
│       ├── screens.css
│       └── animations.css
├── tests/
│   ├── grid.test.ts
│   ├── matching.test.ts
│   ├── cascade.test.ts
│   ├── score.test.ts
│   ├── levels.test.ts
│   └── prng.test.ts
├── public/
│   └── (assets vides en v1)
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── README.md
└── docs/superpowers/specs/2026-04-26-trifyl-game-design.md
```

### Conventions

- TS strict : `strict: true`, `noUncheckedIndexedAccess: true`.
- ESLint + Prettier (config minimale, à confirmer dans le plan d'impl).
- Modules ES, imports relatifs courts (alias `@/` sur `src/`).
- Pas de globals : tout passe par injection (DI manuelle).

---

## 14. Hors scope (v1)

À ne **pas** implémenter en v1, à reconsidérer en v2 :

- Tuiles spéciales façon Candy Crush (rayé, emballé, bonbon coloré sur match 4/5).
- Audio (SFX et musique).
- Shuffle automatique de la grille quand bloquée.
- Multilingue (i18n).
- Persistance score (high scores, leaderboard).
- Mode sans timer / mode chrono.
- Adaptation responsive multi-résolution.
- Analytics / télémétrie d'usage.
- Mode 2 joueurs.
- Support vrai trackpad / souris (en dev seulement, pas en prod).
- Confirmation modale sur "Quitter le jeu".

---

## 15. Glossaire

| Terme | Définition |
|---|---|
| Bac jaune / Sac noir / Sac orange | Récipients de tri français pour recyclables / résiduels / biodéchets. |
| Déchèterie | Lieu de dépôt pour déchets dangereux (piles, ampoules, médicaments). Pas de bac représenté dans l'app. |
| Match | Alignement d'au moins 3 tuiles identiques sur une ligne ou une colonne. |
| Cascade | Suite de matches déclenchés par les chutes consécutives. |
| Piège (trap) | Tuile dont le déchet correspond à `bin === 'hazardous'` (déchèterie). |
| Borne | Dispositif tactile de l'app (1920×1080 fixe). |
| Layered Hybrid | Architecture où DOM et Pixi rendent côte à côte, chacun pour ce qu'il fait le mieux. |
