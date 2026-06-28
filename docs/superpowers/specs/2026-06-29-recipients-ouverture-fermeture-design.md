# Animation ouvre / remplit / referme des récipients (sidebar)

Date : 2026-06-29
Statut : design validé, prêt pour plan d'implémentation

## Contexte

La sidebar (`HUD`) affiche 3 récipients qui se remplissent au fil du tri :

- **Jaune** : bac à roulettes gris avec un **couvercle jaune** (bande nette en haut).
- **Noir** : sac au **col torsadé** pincé en haut (le « nœud » = la zone resserrée du sommet).
- **Orange** : sac fermé par un **nœud type ruban/boucle** en haut.

Chaque récipient est un élément **HTML/CSS** (`BinGauge`), pas du Pixi. Le remplissage
actuel : un `div` masqué en hauteur révèle l'image « pleine » par-dessus l'image « vide »
(fermée), calé sur des paliers (pointillés). Les déchets volent depuis la grille Pixi vers
la position HUD du bac via `flyTileToBin` (GSAP), puis `setEtages` monte la jauge d'un cran.

On veut ajouter, **à chaque palier**, un cycle visuel : le récipient **s'ouvre**, se
**remplit** (comme aujourd'hui), puis se **referme**.

## Contrainte déterminante

On ne dispose que de l'**image fermée** de chaque récipient — pas d'image ouverte ni de
frames intermédiaires. Le vrai frame-par-frame dessiné est donc impossible. On **génère le
mouvement par code** (transforms CSS/GSAP) à partir de l'unique image fermée.

## Approche retenue : A — procédural

Animation par transforms à partir de l'image fermée, **derrière une abstraction
`RecipientAnimator`** à l'API neutre (`open()` / `close()`). Si plus tard des frames
dessinées (approche B) ou un rig Rive/Lottie (approche C) deviennent disponibles, on les
branche sans toucher à la logique de jeu.

Approches écartées :
- **B (frames générées)** : meilleure fidélité mais demande de la production d'art absente
  aujourd'hui.
- **C (rig Rive/Lottie)** : rendu pro mais nouvelle dépendance + travail de rigging.

## Principe visuel

Chaque récipient conserve son PNG fermé. On superpose :

1. Un **calque « coiffe »** : un fenêtrage (background-position + clip en hauteur) sur la
   zone du haut du **même PNG** — la bande du couvercle (jaune) ou la zone du nœud (sacs).
2. Une **« bouche » sombre** révélée derrière la coiffe pendant l'ouverture (ellipse /
   rectangle assombri qui grandit), pour donner l'illusion de l'intérieur ouvert.

Mouvements par couleur :

- **Jaune (couvercle)** : la coiffe pivote vers l'arrière autour d'une **charnière**
  (transform-origin = arête arrière de la coiffe), rotation ~ -100°. La bouche grise
  apparaît dessous.
- **Noir / Orange (nœud)** : la coiffe se **fend en 2 pans** (gauche/droite) qui s'écartent
  (~ ±25°) avec un léger soulèvement ; la bouche sombre grandit derrière. Lecture « le nœud
  se desserre / s'ouvre ».

La fermeture = lecture inverse de l'ouverture.

### Géométrie par couleur

Une table de constantes tunables (sur le modèle de `GEO` / `DASH_FRAC` déjà présents dans
`BinGauge`), par catégorie de récipient :

- fraction de hauteur occupée par la coiffe (depuis le haut),
- point de charnière (jaune) ou axe de fente (sacs),
- angle(s) d'ouverture,
- taille / forme de la bouche.

Valeurs de départ posées « à l'œil », à affiner visuellement. Même structure pour les
niveaux 1/2/3 ; les fractions ne diffèrent que si les PNG diffèrent, sinon une seule table
par couleur.

## Abstraction `RecipientAnimator`

Une instance par bac, **composée dans `BinGauge`** (qui possède déjà le DOM). API minimale :

- `open(): gsap.core.Timeline`
- `close(): gsap.core.Timeline`
- une **file interne par bac** : les cycles d'un même bac se sérialisent — jamais de
  chevauchement, même si un nouveau palier arrive avant la fin de la fermeture en cours.

L'API ne dépend pas du « comment » (procédural) : c'est le point de découplage qui rend les
approches B/C branchables ultérieurement.

### Restructuration DOM de `BinGauge`

`BinGauge` expose aujourd'hui `__vide` (fond fermé, intérieur blanc opaque) et `__fill`
(hauteur clippée) contenant `__pleine` (le remplissage coloré révélé du bas). On ajoute :

- la **bouche** sombre (sous la coiffe, au-dessus du fond),
- le(s) calque(s) **coiffe** (au-dessus de tout, animés).

Le remplissage croît du bas ; la coiffe/le nœud sont en haut → pas de conflit visuel majeur
avec la jauge existante.

## Orchestration (cycle par palier)

Cadence retenue : **un cycle complet ouvre → remplit → referme à chaque palier**, joués à
la suite (via la file).

Dans `GameScreen.handleSwap`, pour chaque combo non-spécial visant un bac `cat` :

1. `open(cat)` (~0,25 s)
2. le déchet vole et atterrit **pendant** que le récipient est ouvert (`flyTileToBin`)
3. bump de la jauge (`setEtages`, inchangé)
4. court maintien (~0,15 s) puis `close(cat)` (~0,25 s)

Règles de parallélisme :

- combos vers des **bacs différents** → en parallèle,
- combos vers le **même bac** → en file (sérialisés).

La condition de victoire (`allBinsFull`) reste évaluée comme aujourd'hui, juste après le
bump de jauge (étape 3). Elle ne doit pas attendre la fin des animations de fermeture.

## Config

Durées ajoutées / réutilisées dans `src/app/animation-config.ts` :

- `openDur` (~0,25 s), `holdDur` (~0,15 s), `closeDur` (~0,25 s).
- L'entrée `binOpen` déjà présente (mais inutilisée) est réutilisée/renommée pour ce
  cycle.

## Tests

- **Géométrie (pur, sans DOM)** : le calcul charnière/angles → transforms par couleur est
  testable en isolant les constantes et la fonction qui en dérive les transforms.
- **Orchestration / file (`RecipientAnimator`)** : sérialisation des cycles d'un même bac,
  parallélisme entre bacs différents — testable avec des timelines GSAP mockées, sans rendu.

## Hors périmètre (YAGNI)

- Pas de production de frames dessinées ni de rig vectoriel (approches B/C) à ce stade.
- Pas de refonte du système de jauge/paliers existant : on s'y greffe.
- Pas d'animation différente par niveau au-delà des fractions de géométrie si les PNG
  diffèrent.
