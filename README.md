# Gridfinity Generator

Site web gratuit et open source (MIT) d'outils Gridfinity. Premier générateur : des baseplates imprimables en 3D, à la mesure d'un tiroir. Tout est calculé dans le navigateur, sans serveur.

## Organisation

Monorepo pnpm + Turborepo (voir `docs/adr/0003-monorepo-moteur-separe.md`) :

- `packages/geometry` : moteur de géométrie, TypeScript pur sur manifold-3d, sans React ;
- `packages/viewer` : aperçu 3D ;
- `packages/ui` : design system (jetons, accent unique, typo Outfit) ;
- `apps/web` : application Next.js (App Router), routes `/fr/baseplate` et `/en/baseplate` ; `/` redirige vers la langue choisie ou celle du navigateur (ADR 0007).

Les dossiers `prototypes/*` sont du code jetable, hors du workspace.

## Commandes

Node 22 et pnpm 10 sont requis.

```sh
pnpm install
pnpm dev          # application sur http://localhost:3000/fr/baseplate
pnpm typecheck
pnpm lint
pnpm build
pnpm test         # Vitest puis Playwright (sur le build de production)
```

`pnpm test` télécharge au besoin le navigateur Chromium de Playwright. Sous Linux, ses dépendances système s'installent avec `pnpm --filter @repo/web exec playwright install --with-deps chromium`.

Les objectifs de performance de la spec (aperçu < 100 ms, finale < 1 s en 10 × 10 et < 3 s en 20 × 20) se mesurent en local, sur une machine au repos : `pnpm --filter @repo/geometry test:perf`. La CI ne vérifie que des seuils larges.

## Déploiement

Vercel et Umami : voir `docs/deploiement.md`.

## Licence

MIT, voir `LICENSE`. Attributions : `ATTRIBUTIONS.md`.
