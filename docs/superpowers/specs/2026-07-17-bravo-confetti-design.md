# Effet « Bravo » + paillettes en fin de niveau — Design

_Date : 2026-07-17_

## Objectif

Afficher une célébration à la fin de chaque niveau : un bandeau « Bravo » et une
animation de paillettes (confettis image). Le code de confettis provient du projet
`vaujany-app` (React + `tsparticles-confetti`) et doit être **transcrit en TypeScript
pur** pour s'intégrer à Trifyl (plain TS + Vite + PixiJS + GSAP, sans React).

## Contexte existant

- Fin de niveau gérée par `App.onLevelComplete(level)` :
  - niveaux 1 & 2 → overlay « Niveau terminé ! » (`LevelCompleteOverlay`) ;
  - niveau 3 → `goMedia()` directement (écran média de récompense).
- `LevelCompleteOverlay` : carte texte + boutons texte « Continuer » / « Quitter la partie ».
- Assets résolus via `import.meta.glob('./files/**/*.png', { query: '?url' })`
  dans `FileAssetProvider` (pas de dossier `public/`).

## Sources vaujany-app (à transcrire)

- `Confettis.jsx` — composant React : crée un canvas, `confetti.create(canvas,{resize:true})`,
  puis au signal `fired` tire **2 salves** (origines `x:0.1` et `x:0.9`, `y:0.2`) avec
  paramètres mis à l'échelle `innerWidth/1920` (`spread`, `ticks`, `gravity`, `decay`,
  `startVelocity`, `particleCount:30`, `scalar`), `shapes:["image"]`, `shapeOptions`.
- `confettisShapeOptions.js` — liste de 20 images `PAILLETTES_1..20.png` (32×32) en `public/`.
- `ConfettiUtils.js` — coquille vide (constructeur qui `querySelector` un canvas). **Non transcrit** (YAGNI).

## Décisions (validées)

- **Dépendance** : ajouter `tsparticles-confetti` (rendu fidèle à la source).
- **Déclenchement** : à chaque fin de niveau **et** à la victoire finale (niveau 3).
- **Contenu** : utiliser les assets `src/assets/files/bravo/` :
  - `bravo.png` (870×246) — bandeau « BRAVO ! Tu es un SERIAL TRIEUR ! » ;
  - `bouton-continuer.png` (414×84) — bouton « Continuer » (niveau suivant) ;
  - `bouton-quitter-partie.png` (413×84) — bouton « Quitter la partie ».
- **Style d'animation** : identique à la source (2 salves, ~30 paillettes chacune).
- **Niveau 3** : bandeau Bravo + **bouton Quitter uniquement** (pas de « Continuer »)
  + paillettes. Le bouton Quitter mène à l'écran média (fin de partie) via `goMedia()`.
- **Pré-chargement** : les 20 paillettes sont pré-chargées au démarrage.

## Architecture

### 1. Assets

- Copier les 20 `PAILLETTES_*.png` de
  `vaujany-app/public/images/paillettes/` → `src/assets/files/paillettes/`.
  Ils sont alors captés par le `import.meta.glob` existant → URLs hachées par Vite.
- Assets `bravo/` déjà présents.

### 2. Dépendance

- Ajouter `tsparticles-confetti` aux `dependencies` de Trifyl.

### 3. Module `src/ui/overlays/Confetti.ts` (nouveau)

Transcription plain TS de `Confettis.jsx` + `confettisShapeOptions.js`.

- Construit un `<canvas>` plein écran : `position:fixed; inset:0; pointer-events:none;`
  z-index au-dessus de tous les overlays (ex. `z-index: 10`).
- À l'initialisation : `this.fire = await confetti.create(canvas, { resize: true })`.
- `shapeOptions` construit **dynamiquement** à partir des URLs hachées des paillettes
  (glob dédié `import.meta.glob('../../assets/files/paillettes/*.png', {query:'?url'})`
  ou méthode `AssetProvider.getPaillettesUrls()`), chaque entrée `{ src, width:32, height:32 }`.
- Méthode publique `celebrate()` : reproduit la boucle de la source — 2 salves via
  `setTimeout(..., 300*i)`, origines `x∈{0.1,0.9}`, `y:0.2`, mêmes paramètres à l'échelle
  `window.innerWidth/1920`, `particleCount:30`, `shapes:["image"]`, `shapeOptions`.
- Le canvas est monté une seule fois (dans `App`) et réutilisé.

### 4. Refonte `LevelCompleteOverlay.ts`

- Reçoit l'`AssetProvider` (pour résoudre `bravo.png` et les 2 boutons) et une
  instance `Confetti` (ou un callback `onCelebrate`).
- Rendu par images : bandeau `bravo.png`, boutons `bouton-continuer.png` /
  `bouton-quitter-partie.png` (zones cliquables = les images, mêmes callbacks
  `onContinue` / `onQuit`).
- `show(options: { showContinue: boolean })` :
  - masque le bouton « Continuer » quand `showContinue === false` (niveau 3) ;
  - anime l'apparition (GSAP, comme aujourd'hui) ;
  - déclenche les paillettes (`confetti.celebrate()`).
- `hide()` inchangé (GSAP fade-out).
- Style : ré-emploi de `.overlay--levelcomplete` (fond semi-transparent, centrage).
  Les tailles d'images sont fixées d'après leurs dimensions natives.

### 5. Câblage `App.ts`

- `onLevelComplete(level)` :
  - `level < 3` → `levelComplete.show({ showContinue: true })` ;
  - `level === 3` → `levelComplete.show({ showContinue: false })`
    (remplace l'appel direct `goMedia()`).
- Callbacks inchangés : `onContinue → continueNextLevel`, `onQuit → goMedia`.
- Le canvas `Confetti` est instancié dans `App.start()` et ajouté au `host`.

## Flux

1. Un niveau se termine → `App.onLevelComplete(level)`.
2. `LevelCompleteOverlay.show({ showContinue })` : fade-in du bandeau + boutons.
3. `Confetti.celebrate()` : 2 salves de paillettes par-dessus l'overlay.
4. L'utilisateur clique « Continuer » (→ niveau suivant) ou « Quitter » (→ écran média).
   Au niveau 3, seul « Quitter » est présent.

## Points d'attention

- **Z-index** : le canvas de paillettes doit passer au-dessus de l'overlay (décoratif,
  `pointer-events:none`, ne bloque aucun clic).
- **Chargement des images** : `tsparticles-confetti` charge les images au premier tir ;
  pour éviter tout délai à la 1re salve, **pré-charger les 20 paillettes au démarrage**
  (dans `App.start()`, ex. via `new Image().src = url` pour chaque paillette, ou un tir
  « à blanc » hors écran). Requis.
- **Mise à l'échelle** : la scène Trifyl est fixée à 1920×1080 ; conserver le facteur
  `innerWidth/1920` de la source (cohérent avec le kiosque plein écran).
- **BrightSign** : `tsparticles-confetti` ajoute une dépendance runtime au bundle
  embarqué ; à surveiller côté poids/perf, mais l'effet est ponctuel (fin de niveau).

## Hors périmètre

- Pas de son.
- Pas de refonte de l'écran média de fin.
- `ConfettiUtils.js` non transcrit.
