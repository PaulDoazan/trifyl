# Trifyl — Refonte flux de jeu, mécanique poubelles & intégration assets

**Date :** 2026-06-13
**Statut :** spec validée pour implémentation
**Contexte :** borne kiosque Match-3 éducative. Cette refonte applique le lot de correctifs demandé + intègre les assets PNG fournis (`src/assets/files/`) et la maquette officielle (`BIX-TRI_BAT_D02`).

---

## 1. Objectifs

1. Supprimer la page de choix de niveau ; toute partie démarre au niveau 1.
2. Progression par **remplissage des 3 poubelles** ; fin de niveau → fenêtre « Continuer / Quitter ».
3. Supprimer le score (la progression est visualisée par les poubelles).
4. Message pédagogique : croix de fermeture **+** fermeture auto ; le message **piles** ne s'affiche qu'une fois par partie.
5. Retour à l'Accueil après **5 min** d'inactivité en partie ; suppression de l'ancien screensaver Pixi 60s.
6. Externaliser toute la config dans **`game_configs.json`**.
7. Câbler les vrais assets PNG (écrans, poubelles, déchets, pop-ups, boutons).

---

## 2. Flux d'écrans

```
[Veille]  veille.png + bouton "touchez.png"
   │ tap n'importe où
   ▼
[Accueil]  home.png (consignes + 3 poubelles) + bouton "commencer.png"
   │ Commencer
   ▼
[Niveau 1] ──(3 poubelles pleines)──► [Fenêtre "Niveau terminé"]
   │                                      ├─ Continuer ───► [Niveau 2]
   │                                      └─ Quitter ──────► [Média]
   │
[Niveau 2] ──(3 poubelles pleines)──► [Fenêtre "Niveau terminé"]
   │                                      ├─ Continuer ───► [Niveau 3]
   │                                      └─ Quitter ──────► [Média]
   │
[Niveau 3] ──(3 poubelles pleines)──► [Média] (lancement automatique, sans fenêtre)

État secondaire (n'importe quel niveau) :
  grille bloquée avant remplissage ──► overlay "Plus aucune combinaison possible" (combinaison.png)
                                          └─ Quitter ──► [Média]
```

- **Veille** : écran d'attract au démarrage de la borne (`veille.png`). Un tap → Accueil.
- **Accueil** : `home.png` (consignes + visuel 3 poubelles), bouton `commencer.png` → lance le niveau 1.
- **Média** : écran vidéo de fin existant (`EndMediaScreen`, placeholder « Vidéo de sensibilisation »). Atteint par « Quitter la partie », par « Plus aucune combinaison possible », et automatiquement en fin de niveau 3.
- La page de **choix de niveau** est supprimée.

### Inactivité
- Suppression de l'`IdleTracker` 60s → screensaver Pixi (`ScreensaverScene`, `ScreensaverScreen` retirés).
- Règle unique : **5 min d'inactivité → retour Accueil**, appliquée sur l'écran de jeu et sur le Média (partie abandonnée le cas échéant). Délai configurable (`timings.idleReturnToHomeMs`).
- L'Accueil est la cible du timer ; il n'a donc pas lui-même de timer (on y est déjà). La Veille est uniquement l'écran de démarrage (tap → Accueil), sans timer ; on n'y revient pas automatiquement.

---

## 3. Mécanique de fin de niveau — poubelles

### Catégories de déchets
Chaque déchet appartient à une catégorie :

| Catégorie | Destination | Remplit une poubelle ? | Message pédagogique |
|-----------|-------------|------------------------|---------------------|
| `yellow`  | Bac jaune (recyclables) | oui (jaune) | non |
| `black`   | Sac noir (résiduels)    | oui (noir)  | non |
| `orange`  | Sac orange (biodéchets) | oui (orange)| non |
| `piles`   | Déchèterie (dangereux)  | non         | `piles.png` (1×/partie) |
| `textile` | Bornes textile          | non         | `textile.png` (répétable) |
| `verre`   | Bornes à verre          | non         | `verre.png` (répétable) |

- Les catégories `piles`/`textile`/`verre` **vident la grille sans remplir de poubelle** (« t'aident à vider la grille mais ne rapportent aucun point »). Elles reprennent l'effet visuel « vortex/déchèterie » actuel.
- Le modèle actuel `bin: 'hazardous'` est généralisé en `category: 'yellow' | 'black' | 'orange' | 'piles' | 'textile' | 'verre'`.

### Condition de fin de niveau
- Chaque poubelle (jaune/noire/orange) a une **capacité** définie par niveau (`binCapacity`).
- À chaque match d'une catégorie poubelle, on incrémente le compteur de la poubelle correspondante (capé à la capacité).
- **Quand les 3 poubelles atteignent leur capacité → niveau terminé.**
  - Niveaux 1 & 2 → fenêtre « Niveau terminé » (Continuer / Quitter).
  - Niveau 3 → transition automatique vers le Média.

### Visuel des poubelles (HUD gauche)
- Assets : `niv{1,2,3}_poub_{jaune,noire,orange}_vide.png` (contour + niveaux pointillés) et `poub_{jaune,noire,orange}_pleine.png` (remplie).
- Remplissage progressif : la version *pleine* est révélée de bas en haut via un masque, proportionnellement à `compteur / capacité`. À 100 %, la poubelle est pleine.
- Les 3 poubelles remplacent le bloc score de la HUD.

---

## 4. Suppression du score

- HUD : retrait du label « Score » et du compteur ; remplacé par les 3 jauges-poubelles + le label niveau.
- `EndOverlay` (« Plus aucune combinaison ») : retrait de l'affichage du score, restyle avec `combinaison.png`, croix × + bouton Quitter.
- `EndMediaScreen` : retrait de toute référence au « score final ».
- `score.ts` et `tests/score.test.ts` : module retiré (plus de scoring). `applySwap`/`GameState` ne calculent plus de score ; ils calculent à la place les incréments par poubelle.

---

## 5. Message pédagogique (overlay)

- Pop-ups assets : `piles.png`, `textile.png`, `verre.png` (icône i + croix × intégrées au visuel).
- Comportement :
  - Fermeture **auto** après `timings.eduOverlayMs` (existant `EDU_OVERLAY_MS`).
  - Fermeture **manuelle** via une zone cliquable « croix » positionnée en haut à droite de l'overlay.
  - Le message **piles** : affiché **au plus une fois par partie** (drapeau réinitialisé au démarrage d'une nouvelle partie, pas au changement de niveau). Textile & verre : réaffichables.
- Si plusieurs catégories spéciales matchent dans la même cascade, on affiche le premier message éligible (piles prioritaire si pas encore vu).

---

## 6. `game_configs.json`

Fichier unique à la racine `src/` (importé en module ; éditable sans rebuild lourd). Schéma :

```jsonc
{
  "timings": {
    "idleReturnToHomeMs": 300000,   // 5 min → retour Accueil pendant une partie
    "eduOverlayMs": 4500            // fermeture auto du message pédagogique
  },
  "levels": [
    {
      "level": 1,
      "gridSize": 5,
      "binCapacity": { "yellow": 8, "black": 8, "orange": 8 },
      "wastes": [
        { "id": "eau",        "asset": "dechets_niveau 1/eau",        "category": "yellow" },
        { "id": "journal",    "asset": "dechets_niveau 1/journal",    "category": "yellow" },
        { "id": "banane",     "asset": "dechets_niveau 1/banane",     "category": "orange" },
        { "id": "yaourt",     "asset": "dechets_niveau 1/yaourt",     "category": "black"  },
        { "id": "verre_brise","asset": "dechets_niveau 1/verre_brise","category": "verre"  }
        // … sous-ensemble choisi pour le niveau 1
      ]
    }
    // niveaux 2 et 3 …
  ]
}
```

- Les **catégories** par déchet sont éditables dans le JSON (c'est l'intérêt principal). Mapping initial dérivé des règles françaises de tri (extension des consignes : plastiques/métaux/papiers/cartons → jaune ; biodéchets → orange ; souillés/non recyclables → noir ; piles & objets à batterie → piles ; textiles → textile ; verre d'emballage → verre).
- Chaque niveau n'utilise qu'un **sous-ensemble** des déchets disponibles (le 5×5 du niveau 1 n'a pas besoin de 14 types). Le choix exact des types par niveau est défini dans le JSON.
- `educationalText` n'est plus nécessaire dans le code (les messages sont des images) ; le mapping catégorie → image pop-up est : `piles→piles.png`, `textile→textile.png`, `verre→verre.png`.

### Impact sur le code de données
- `waste.ts` : `WasteType` devient `string` (id libre), `BinKind` remplacé par `WasteCategory`.
- `waste-data.ts` : `WASTE_META` construit dynamiquement depuis `game_configs.json` au démarrage.
- `levels.ts` : `getLevelConfig` lit depuis le JSON (`gridSize`, `wastes`, `binCapacity`).
- `initial-grid.ts`, `matching.ts`, `cascade.ts` : déjà génériques sur les types ; adaptés pour des ids string. Pas de changement de logique Match-3.

---

## 7. Intégration assets

- Nouveau `FileAssetProvider implements AssetProvider`, charge les PNG via Pixi `Assets.load`, en utilisant les chemins du JSON. Remplace `PlaceholderAssetProvider` en runtime (placeholder conservé pour les tests).
- Interface `AssetProvider` étendue : textures déchets par id, textures poubelles vide(par niveau)/pleine, textures écrans (`veille`, `home`), grilles (`grille_niv*`), boutons (`commencer`, `quitter`, `home`, `touchez`), pop-ups.
- Écrans `WelcomeScreen` → renommé/retravaillé en **`HomeScreen`** (Accueil avec `home.png` + bouton commencer) ; ajout **`VeilleScreen`** (`veille.png` + bouton touchez). `EndMediaScreen` conservé.
- Grille : fond `grille_niv{n}.png` derrière les tuiles.

---

## 8. Composants — responsabilités

| Composant | Rôle |
|-----------|------|
| `VeilleScreen` | Attract ; tap → Accueil |
| `HomeScreen` | Consignes + bouton Commencer → niveau 1 |
| `GameScreen` | Orchestre une partie multi-niveaux : grille, poubelles, overlays, fin de niveau |
| `LevelCompleteOverlay` | Fenêtre « Niveau terminé » (Continuer / Quitter) — niveaux 1 & 2 |
| `EndOverlay` | « Plus aucune combinaison » (croix + Quitter) |
| `EduOverlay` | Message pédagogique image (croix + auto-close) |
| `BinGauge` (ex-BinRenderer HUD) | Jauge de remplissage d'une poubelle |
| `IdleTracker` | 1 timer ; 5 min en partie → callback retour Accueil |
| `GameConfig` (loader) | Charge/valide `game_configs.json`, expose timings + niveaux |
| `FileAssetProvider` | Charge les PNG |

`App` orchestre : Veille → Accueil → GameScreen, gère idle et navigation vers Média.

---

## 9. Tests

- `tests/levels.test.ts` : chargement config JSON (gridSize, binCapacity, wastes valides).
- Nouveau `tests/bin-fill.test.ts` : incrément des poubelles, détection « 3 pleines » = niveau terminé, catégories spéciales n'incrémentent pas.
- `tests/matching|cascade|grid|initial-grid` : adaptés aux ids string, logique inchangée.
- `tests/score.test.ts` : supprimé.
- `tests/waste-data.test.ts` : adapté (mapping catégories depuis JSON).

---

## 10. Hors périmètre

- Vidéo réelle de fin (asset à fournir ; placeholder conservé).
- Refonte des animations bas-niveau (`animation-config.ts` reste tel quel).
- Effets sonores.
