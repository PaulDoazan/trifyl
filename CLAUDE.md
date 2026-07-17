# CLAUDE.md — Trifyl

Kiosque tactile Match-3 éducatif, embarqué sur **BrightSign** (lecteur média, navigateur Chromium) et affiché sur **écran tactile iiyama**. Ce fichier regroupe les bonnes pratiques spécifiques à ce contexte.

## Bonnes pratiques BrightSign / kiosque tactile

### Désactiver le voile gris au touch (tap highlight)

**Symptôme** — sur l'écran tactile iiyama piloté par BrightSign, un léger voile gris apparaît au moindre *touch* (sur un déchet, un bouton…). Invisible en dev à la souris, visible uniquement sur écran tactile.

**Cause** — c'est le **tap highlight par défaut de Chromium** (`-webkit-tap-highlight-color`), un rectangle gris semi-transparent affiché à chaque contact tactile sur un élément interactif. Il n'était neutralisé nulle part.

**Fix** — dans le reset CSS global ([src/styles/reset.css](src/styles/reset.css)), sur `*` :

```css
* {
  -webkit-tap-highlight-color: transparent; /* supprime le voile gris au touch */
  -webkit-touch-callout: none;              /* pas de menu contextuel long-press */
  -webkit-user-select: none;                /* pas de surbrillance de sélection */
  user-select: none;
}
html, body { touch-action: manipulation; }  /* pas de flash gris lié au double-tap zoom */
```

**Règle générale** — pour tout kiosque tactile, poser ces règles dès le reset. Aucun voile/surbrillance ne doit apparaître au touch. Conserver `:focus-visible` (focus clavier uniquement, jamais déclenché au touch).

## Modules réutilisables

### Confettis / paillettes (effet célébration)

Effet de paillettes plein écran (pluie d'images) déclenché à la fin d'un niveau.
**Conçu pour être réutilisé tel quel sur d'autres projets BrightSign** (plain TS, aucune dépendance à Pixi ni à la logique de jeu).

**Fichiers du module :**
- [src/ui/overlays/confetti-config.ts](src/ui/overlays/confetti-config.ts) — logique **pure** et testée des paramètres de salve (`buildShapeOptions`, `buildBurstParams`). Facteur d'échelle `innerWidth/1920`, 2 salves, `particleCount:30`, paillettes `32×32`. Aucune dépendance → copiable partout.
- [src/ui/overlays/Confetti.ts](src/ui/overlays/Confetti.ts) — classe `Confetti` : crée un `<canvas>` plein écran, `init()` (crée l'instance + **précharge** les images), `celebrate()` (2 salves gauche/droite).
- [src/types/tsparticles-confetti.d.ts](src/types/tsparticles-confetti.d.ts) — shim de types (le paquet n'expose pas `resize` dans ses types publiés).

**Dépendance :** `tsparticles-confetti` (moteur canvas, indépendant de tout framework).

**Assets :** 20 images `PAILLETTES_*.png` (32×32) dans `src/assets/files/paillettes/`.

**Réutilisation sur un nouveau projet BrightSign :**
1. `npm install tsparticles-confetti`
2. Copier les 3 fichiers TS + le dossier `paillettes/` (ou d'autres images de forme).
3. Fournir les URLs des images au constructeur (via un `AssetProvider` ou un simple `string[]`) — sur Vite, résoudre par `import.meta.glob('...paillettes/*.png', { query: '?url' })` ; **jamais** de chemin `public/` en dur.
4. Monter une fois : `const c = new Confetti(assets); host.appendChild(c.canvas); await c.init();` puis appeler `c.celebrate()` au moment voulu.

**Points d'attention BrightSign / kiosque :**
- Le canvas est **décoratif** : `pointer-events:none` + `z-index` élevé (au-dessus des overlays) → il ne bloque aucun clic.
- **Préchargement** au démarrage (`init()`) pour éviter tout délai à la 1re salve.
- Le canvas est en `position:fixed` (viewport). Sur le kiosque plein écran 1920×1080 c'est correct ; **en dev** dans une fenêtre ≠ 1920×1080, les origines des salves (fractions de `innerWidth`) peuvent sembler décalées — sans incidence sur la cible. Si l'alignement dev importe, monter le canvas en `position:absolute` dans le conteneur de scène 1920×1080.
- Historique : transcription plain TS d'un composant React (`tsparticles-confetti` + `ConfettiContext`) — voir la spec [docs/superpowers/specs/2026-07-17-bravo-confetti-design.md](docs/superpowers/specs/2026-07-17-bravo-confetti-design.md).
