# Handoff : où en est le projet (2026-09-29)

Ce fichier permet de reprendre le travail sur une autre machine : la mémoire de Claude Code est locale, donc tout ce qui compte est ici ou dans le dépôt.

## À lire d'abord

- `CONTEXT.md` : glossaire (cellule, poche, muret, pied, assise, marge, pièce, plateau, tiroir…).
- `docs/adr/` : décisions difficiles à défaire (0001 Next.js, 0002 profil de poche 4,60 mm, 0003 monorepo, 0004 manifold-3d par briques, *acceptée* le 29/09).
- `docs/research/` : rétro-ingénierie d'extrabold (avec mesures réelles d'un export), spec Gridfinity, licence (MIT), ModuBOX.
- `docs/diagrams/profil-poche.svg` : comparaison des profils spec / extrabold / ModuBOX.

## Vision produit

- Site public, gratuit, open source (MIT, comme gridfinity-rebuilt). Seulement un bouton de don (Buy Me a Coffee), ce qui reste compatible avec le plan Vercel Hobby. Patreon possible plus tard avec la communauté.
- Compatible Gridfinity : n'importe quel bac s'emboîte. Nos futurs bacs s'ajustent parfaitement, sans jeu une fois posés. Tout est optimisé pour l'impression (matière, temps, cotes alignées sur la hauteur de couche et la largeur de ligne).
- Premier générateur : baseplates. Ensuite : bacs, shadowbox, étiquettes, séparateurs, puis une communauté qui publie ses créations (backend plus tard, probablement Supabase). Le moteur, l'aperçu et l'export sont mutualisés.

## Décisions de la v1 (session de grilling du 2026-09-28)

- **Périmètre** : type Normal ; taille saisie en dimensions du tiroir (mm) ou en nombre de cellules + marge ; alignement sur 9 positions ; marge pleine ; aimants et vis de taille réglable + trous d'éjection (pas de nervures de serrage) ; export 3MF (par défaut) ou STL en un seul fichier, zip seulement s'il y a plusieurs pièces ; lien de partage versionné explicitement + derniers réglages gardés dans le navigateur (un lien partagé l'emporte).
- **Géométrie** : profil hybride de 4,60 mm par défaut (muret de 0,35 mm + plat de 0,4 mm en haut), profil « ras » (extrabold, 4,25 mm) en option. Aimants aux cotes de la spec : Ø 6,5 × 2,4 mm à 13 mm du centre. Le profil est une donnée du moteur (d'autres systèmes pourront suivre, dont ModuBOX).
- **Kit de test** : baseplate 1×2 avec un profil par cellule + deux bacs 1×1. Jeu du pied des bacs : 0,25 mm par défaut, 0,1 mm en option (générateur de bacs).
- **Stack** : monorepo pnpm + Turborepo (`packages/geometry` avec manifold-3d dans un Web Worker, `packages/viewer` avec react-three-fiber, `packages/ui`, `apps/web` avec Next.js App Router). Base UI + Tailwind + design system maison. Vercel.
- **Interface** : EN + FR (URL `/en` et `/fr`, détection du navigateur, choix mémorisé) ; bascule mm / pouces ; utilisable sur mobile (réglages dans un panneau qui s'ouvre par le bas) ; profil d'impression global dans l'en-tête (buse, largeur de ligne, hauteur de couche ; 0,4 / 0,2 par défaut) ; mesure d'audience sans cookie (Umami pressenti).
- **Performance** : aperçu < 100 ms, 10×10 < 1 s, 20×20 < 3 s. Largement tenu par le prototype (briques manifold : 40 ms en 20×20 avec aimants).
- **Tests** : moteur écrit en TDD (dimensions, maillage manifold, position des trous) + tests de bout en bout Playwright.
- **Plus tard** : découpe pour le plateau d'impression, presets de tiroirs, types Tray / Skeleton, marges Half Grid / Overtile.

## Prototypes (dans `prototypes/` sur `main`)

- `prototypes/geometry-perf/` : bench manifold contre JSCAD ; verdict dans `RESULTS.md`.
- `prototypes/ui-directions/` : maquettes d'interface. v1 (commit `78d3695`) rejetée (aperçu 3D terne, contrôles, trop de couleurs).
- v2 (commit `de1a3ee`) : A « Calibre » (accent orange, Instrument Sans) et B « Studio » (accent outremer, Outfit).
- v3 : Studio retravaillée, en cours. Les branches `prototype/*` ont été fusionnées puis supprimées le 29/09 ; les prototypes évoluent directement sur `main`. Lancer le prototype d'interface : `cd prototypes/ui-directions && pnpm install && pnpm dev`, puis http://localhost:3100/ (décisions et captures dans son README).

Retour de l'utilisateur sur le design : palette sobre avec un seul accent. extrabold sert de référence de qualité, mais l'identité doit être la nôtre.

## Décisions de design (29/09/2026, prototype v3)

- Direction **Studio** retenue (aperçu plein écran sur fond studio, panneaux flottants, typo Outfit). Calibre abandonnée.
- Accent **terre cuite** `#C4502F` (l'outremer a été rejeté). Il doit rester facile à changer : une seule source (`BRAND_ACCENT` dans `lib/accents.ts` du prototype), à reprendre telle quelle dans `packages/ui`.
- Panneau de réglages **à gauche**.
- Familles de réglages en **accordéon exclusif** : en ouvrir une referme les autres.
- Menu **Préférences** (engrenage) en haut à droite : langue en liste déroulante, unités, imprimante (buse, hauteur de couche), couleur de l'aperçu, puis Partager, Réinitialiser, Offrir un café. La couleur de l'aperçu n'a pas sa place dans la mise en page principale.

## En attente

1. Confirmer la typo Outfit.
2. Reporté après le développement du moteur : surépaisseur de 2,8 mm sous le profil avec aimants, blocs d'aimant de 10,5 mm dans les coins.
3. Nom du site : « Pocketfit » est un nom provisoire, rien n'est décidé (éviter « Gridfinity » dans le nom, le statut de marque n'a pas été vérifié).

## Étape suivante

`/to-spec` (à partir de ce fichier, du glossaire et des ADR), puis `/to-tickets`, puis `/implement` ticket par ticket.
