# Prototype jetable : interface du générateur de baseplates (direction « Studio »)

> Question posée : **à quoi doit ressembler l'écran du générateur de baseplates v1 ?**
> Code jetable, gardé comme référence : il ne sera pas repris tel quel dans l'application. Les décisions qui font foi sont dans l'issue #1 (spec v1).

## Lancer

```bash
cd prototypes/ui-directions
pnpm install
pnpm dev            # http://localhost:3100/
```

Raccourcis d'URL : `?accent=<clé>`, `&magnets`, `&screws`, `&release`, `&lang=en`. La pastille jaune `{ }` affiche l'état des réglages en JSON (hors design).

## Ce que le prototype montre

- Aperçu 3D plein écran sur fond studio (react-three-fiber) : silhouette réelle de la baseplate, plastique sous éclairage procédural, cadrage automatique dans la zone non masquée par le panneau.
- Panneau de réglages à gauche, familles en accordéon exclusif, Télécharger en bas.
- Un seul accent, terre cuite `#C4502F`, défini à un seul endroit : `BRAND_ACCENT` dans `lib/accents.ts`. Les jetons `--accent*` et la couleur du plastique en dérivent. Les autres accents comparés restent disponibles via `?accent=`.
- Typo Outfit ; contrôles Base UI (`components/kit.tsx`) ; contenu des familles dans `components/families.tsx`.

## Pas encore à jour avec la spec v1

- La famille Aimants est encore présente (les aimants sont retirés de la v1).
- Partager, Réinitialiser et Offrir un café sont dans le menu engrenage ; ils doivent passer dans la barre du haut sur desktop (le menu ne garde que les paramètres ; sur mobile, tout reste dans le menu).
- Il manque le cadre de statistiques (à droite, sous le menu) et la confirmation de Réinitialiser.
