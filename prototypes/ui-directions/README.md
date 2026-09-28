# PROTOTYPE JETABLE : 3 directions visuelles du générateur de baseplates

> Question posée : **à quoi doit ressembler l'écran du générateur de baseplates v1 ?**
> Trois directions radicalement différentes sur une seule route, qu'on choisit avec `?variant=A|B|C`.
> Ce code ne sera pas repris tel quel : il vit sur la branche `prototype/ui-directions` et ne doit pas être mergé dans `main`.

## Lancer

```bash
cd prototypes/ui-directions
pnpm install
pnpm dev            # http://localhost:3100/?variant=A  (ou B, C)
```

- Barre jaune en bas : **‹ ›** ou les flèches ← → du clavier pour changer de direction. L'URL garde la variante.
- Pastille jaune `{ } état` en bas à gauche : l'état courant des réglages et la mise en page calculée, en JSON.
- Les réglages sont conservés d'une direction à l'autre, ce qui permet de comparer le même état.
- Mobile : ouvrir les DevTools en 390 px, ou utiliser le réseau local affiché par `pnpm dev`.

Stack : Next.js 16 (App Router), Tailwind v4, **Base UI** (`@base-ui/react` 1.8 : Tabs, Switch, Slider, NumberField, ToggleGroup, Collapsible, Accordion, Menu, Popover, Drawer), react-three-fiber pour l'aperçu, lucide pour les petites icônes utilitaires. Toutes les illustrations des boutons (profils de poche, aimant, vis, alignement, tiroir, cellules, logo) sont à nous, en SVG inline : `components/illustrations.tsx`.

## Ce qui est commun aux trois directions

- Même contenu : en-tête (nom provisoire **Pocketfit**, mm/in, FR/EN, profil d'impression buse + hauteur de couche, Télécharger avec menu 3MF/STL, Partager, Réinitialiser, Offrir un café) ; réglages Taille (onglets « Tiroir en mm » / « Nombre de cellules » + marge), Alignement (9 positions illustrées), Profil de poche (Hybride / Ras illustrés en coupe), Aimants, Vis, Avancé.
- Libellés FR tirés du glossaire (`CONTEXT.md`) : baseplate, cellule, poche, muret, marge, tiroir. Les textes EN sont dans `lib/settings.ts`.
- **Une couleur par famille**, reprise dans l'aperçu 3D : les aimants s'affichent dans la couleur de la famille Aimants et les vis dans celle de la famille Vis. La couleur sert donc à relier un réglage à son effet, pas seulement à décorer.
- L'aperçu 3D est un décor (dalle + murets en boîtes, aimants et vis en cylindres). Il suit la taille, l'alignement, les aimants, les vis et le rayon des coins, mais ce n'est pas la vraie géométrie.

## A « Nuancier » : la référence extrabold, en plus coloré

Intention : garder ce qui marche chez extrabold (panneau latéral qui défile, toutes les familles visibles d'un coup, aperçu à droite) et remplacer le rouge unique par un nuancier. Chaque section commence par une pastille carrée de sa couleur ; ses contrôles actifs (onglet, bouton illustré, interrupteur, curseur) prennent cette couleur. C'est la direction la plus sage et la plus dense.

| Famille | Couleur |
|---|---|
| Taille | cobalt `#2459E0` |
| Alignement | violet `#7A3FE0` |
| Profil de poche | sarcelle `#0B8F83` |
| Aimants | rouge aimant `#E0264F` |
| Vis | laiton `#C7820A` |
| Avancé | ardoise `#56627A` |
| Profil d'impression | bleu buse `#0C7FB0` |

Fond gris bleuté froid `#EDF0F5` à points, panneau blanc, encre `#171C28`. Typo : **Onest**, une seule famille, chiffres tabulaires. Mobile : barre « Réglages » avec le résumé et les pastilles des familles actives, qui ouvre un panneau par le bas contenant toute la liste.

## B « Établi » : l'aperçu d'abord, une famille à la fois

Intention : un outil d'atelier. L'aperçu occupe tout l'écran, posé sur un **tapis de découpe vert** (quadrillage, règle graduée, diagonale à 45°) : c'est l'élément mémorable. À gauche, un rail d'outils colorés : on n'ouvre qu'une famille à la fois dans un panneau flottant, et l'aperçu se décale pour rester visible. Contrôles « atelier » : pas-à-pas −/+ avec gros chiffres, curseur fin en dessous, interrupteurs presque carrés. Une pastille sur le rail indique si les aimants ou les vis sont activés.

| Famille | Couleur |
|---|---|
| Taille | bleu `#3D7BFF` |
| Alignement | lilas `#9E6BFF` |
| Profil de poche | orange `#FF7A2F` |
| Aimants | rouge `#FF3B5C` |
| Vis | jaune `#F5B800` |
| Avancé | gris `#7E8A99` |
| Profil d'impression | cyan `#2DBFE0` |

Tapis `#1D4638`, panneaux papier `#FAF8F3`, encre `#14201B`, plaque couleur PLA naturel. Typo : **Archivo**, titres en largeur étendue (125 %) pour un côté catalogue d'outillage. Mobile : le rail devient une barre d'outils en bas (+ « Plus » pour unités, langue, impression, partage…) ; chaque outil ouvre sa famille dans un panneau par le bas.

## C « Blocs » : des blocs de couleur franche, faits pour le doigt

Intention : la plus colorée et la plus « produit grand public ». Chaque famille est un bloc plein de sa couleur, replié sur une ligne de résumé (« 9 × 6 cellules », « 6 × 2 mm »). Un seul bloc est ouvert à la fois ; son contenu est une carte blanche encadrée par la couleur. Une famille désactivée (aimants, vis) devient un bloc blanc : l'état se voit de loin. Sous l'aperçu, une « recette » de jetons colorés résume la baseplate, et cliquer un jeton ouvre le bloc correspondant. Contrôles gros et ronds : curseurs épais, grands chiffres, pilules.

| Famille | Couleur |
|---|---|
| Taille | bleu électrique `#3B55F6` |
| Alignement | violet `#8B3FEA` |
| Profil de poche | émeraude `#00A375` |
| Aimants | rose aimant `#FF3D7A` |
| Vis | ambre `#FFB21C` (texte foncé) |
| Avancé | aubergine nuit `#2C2940` |
| Profil d'impression | cyan `#17B3D3` |

Fond `#F3F3F6`, carte d'aperçu bleu lavande en dégradé, encre `#1D1A2E`. Typo : **Unbounded** (titres, cotes, nom en minuscules) + **Figtree** (texte). Mobile : aperçu + recette en haut, gros boutons « Réglages » et « 3MF » en bas ; le panneau par le bas contient les blocs, et toucher un jeton ouvre directement le bon bloc.

## Captures (`screenshots/`)

| Direction | Desktop 1440 px | Mobile 390 px |
|---|---|---|
| A | `A-desktop.png`, `A-desktop-aimants-vis.png` | `A-mobile.png`, `A-mobile-reglages.png` |
| B | `B-desktop.png`, `B-desktop-aimants.png` | `B-mobile.png`, `B-mobile-aimants.png` |
| C | `C-desktop.png`, `C-desktop-en-magnets.png` (EN) | `C-mobile.png`, `C-mobile-aimants.png` |

## Choix faits sans toi (à valider)

- **Base UI** : le paquet `@base-ui-components/react` a été renommé `@base-ui/react` à la v1 ; j'ai pris `@base-ui/react` 1.8.
- **Unités** : la bascule mm/in convertit le tiroir et les marges. Les aimants et les vis restent en mm, puisqu'ils se vendent en mm.
- **Marge en mode « Nombre de cellules »** : j'ai mis une marge totale en largeur et une en profondeur, répartie ensuite selon l'alignement.
- **Alignement** : « haut » = arrière du tiroir, « bas » = avant (libellés « Arrière gauche », « Avant »…). À confirmer.
- **Profil d'impression** : buse et hauteur de couche en choix rapides. La hauteur de la baseplate est affichée en nombre de couches.
- **Don** : lien générique `buymeacoffee.com`, placeholder.

## Points à trancher

1. **Quelle structure ?** A (tout visible, défilement), B (une famille à la fois, aperçu plein écran) ou C (blocs repliés avec résumé). On peut aussi mélanger, par exemple le rail de B avec les blocs de C.
2. **Quelle ambiance ?** Claire et neutre (A), atelier / tapis de découpe (B) ou colorée grand public (C).
3. **Palette par famille** : garder le lien couleur réglage → aperçu 3D (aimants et vis colorés dans la vue) ? Quelles teintes pour les deux familles les plus visibles, Aimants et Vis ?
4. **Typo** : Onest (neutre, proche d'extrabold), Archivo étendu (outillage) ou Unbounded + Figtree (ronde, affirmée).
5. **Densité des contrôles** : champ + curseur (A), pas-à-pas −/+ (B) ou gros curseurs (C). Sur mobile, B et C sont nettement plus confortables.
6. **Téléchargement** : bouton dans l'en-tête (A, B) ou gros bouton en bas de la colonne (C) ?
7. **Nom** : « Pocketfit » est un placeholder.
