# Trifyl

Jeu Match-3 éducatif sur le tri des déchets, conçu pour borne tactile fixe 1920×1080.

## Stack

TypeScript strict + PixiJS v8 + GSAP + Vite + Vitest.

## Démarrage

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # tests unitaires (logique pure)
npm run build    # bundle de production dans dist/
```

## Documentation de conception

Voir [`docs/superpowers/specs/2026-04-26-trifyl-game-design.md`](docs/superpowers/specs/2026-04-26-trifyl-game-design.md) pour la spec complète et [`docs/superpowers/plans/2026-04-28-trifyl-implementation.md`](docs/superpowers/plans/2026-04-28-trifyl-implementation.md) pour le plan d'implémentation.

## Architecture

- `src/game/` — logique pure (testée), 0 dépendance Pixi/DOM
- `src/render/` — Pixi (grille, bacs, animations)
- `src/ui/` — DOM (HUD, overlays, écrans)
- `src/input/` — drag + tap + idle
- `src/app/` — orchestration top-level
- `src/assets/` — interface AssetProvider + placeholders

## Test manuel (checklist v1)

- [ ] Welcome → Niveau 1 → grille 5×5 visible.
- [ ] Drag valide ⇒ vol vers bac + score.
- [ ] Drag invalide ⇒ swap + undo.
- [ ] Tap-tap deux cases adjacentes ⇒ swap.
- [ ] Cascade ⇒ multiplicateur appliqué (visible dans le compteur).
- [ ] Match piège (pile en niveau 1) ⇒ tourbillon + overlay éducatif 4-5s.
- [ ] Plus de combinaisons ⇒ overlay "Plus de combinaisons possibles" + bouton Voir le résultat.
- [ ] Bouton "Quitter le jeu" ⇒ écran média de fin.
- [ ] Bouton "Accueil" ⇒ retour direct au welcome.
- [ ] 60s d'inactivité ⇒ screensaver, retour à l'écran d'origine au tap.
- [ ] Niveaux 2 (10×10) et 3 (15×15) bootent correctement.
