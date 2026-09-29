# Déploiement : Vercel et mesure d'audience Umami

Marche à suivre des deux étapes humaines de la v1 : la mise en ligne sur Vercel (#15) et l'activation d'Umami (#17). Le dépôt est déjà prêt : il n'y a rien à modifier dans le code.

## Ce que le dépôt fournit

- L'application Next.js est dans `apps/web`. C'est le seul dossier à déployer ; elle consomme les paquets `packages/*` sous forme de sources TypeScript.
- `apps/web/vercel.json` fixe le framework (Next.js) et `apps/web/package.json` fixe la version de Node (`22.x`).
- `pnpm build` à la racine construit l'application telle que Vercel la construit.
- Umami est branché dans `apps/web/components/analytics.tsx`. Le script n'est rendu que si la variable `NEXT_PUBLIC_UMAMI_WEBSITE_ID` est définie au moment du build. Sans elle, aucune requête ne part vers Umami (vérifié par `apps/web/e2e/analytics.spec.ts`).

## 1. Brancher le projet sur Vercel (#15)

1. Sur vercel.com, **Add New… → Project**, puis importer le dépôt GitHub `oliviermattei/gridfinitygenerator` (autoriser l'application GitHub de Vercel sur ce dépôt si elle ne l'est pas encore).
2. Dans l'écran de configuration :
   - **Root Directory** : cliquer sur **Edit** et choisir `apps/web`.
   - **Framework Preset** : Next.js (détecté automatiquement).
   - **Build and Output Settings** : laisser les valeurs par défaut. Vercel repère pnpm grâce au `pnpm-lock.yaml` de la racine et installe tout le monorepo.
   - **Environment Variables** : rien pour l'instant (Umami vient à l'étape 2).
3. **Deploy**.
4. Dans **Settings → Build and Deployment**, vérifier :
   - que l'option **Include files outside the root directory in the Build Step** est activée (c'est le défaut) : l'application en a besoin pour lire `packages/*` ;
   - que **Node.js Version** vaut 22.x.
5. Dans **Settings → Git**, vérifier que la branche de production est `main`. Chaque push sur `main` redéploie la production ; chaque PR reçoit un déploiement de prévisualisation.
6. Contrôler que `https://<domaine>/fr/baseplate` répond et que `https://<domaine>/` y redirige.
7. Noter l'URL de production en commentaire de #15.

## 2. Activer Umami (#17)

Umami ne dépose aucun cookie : pas besoin de bandeau de consentement.

1. Créer un compte sur Umami Cloud (https://cloud.umami.is, offre gratuite), ou utiliser une instance Umami auto-hébergée.
2. **Settings → Websites → Add website** : un nom, et le domaine de production noté à l'étape 1.
3. Ouvrir le site créé et copier son **Website ID** (un UUID).
4. Sur Vercel, **Settings → Environment Variables** :
   - `NEXT_PUBLIC_UMAMI_WEBSITE_ID` = le Website ID, pour l'environnement **Production** uniquement (les déploiements de prévisualisation ne faussent ainsi pas les chiffres) ;
   - seulement pour une instance auto-hébergée : `NEXT_PUBLIC_UMAMI_SCRIPT_URL` = l'adresse de son `script.js`. Par défaut, le script d'Umami Cloud est utilisé (`https://cloud.umami.is/script.js`).
5. **Redéployer** la production (**Deployments → … → Redeploy**). Les variables `NEXT_PUBLIC_*` sont figées au moment du build : sans redéploiement, rien ne change.
6. Vérifier dans le navigateur, sur `/fr/baseplate` :
   - le code source contient un `<script … data-website-id="…">` ;
   - l'onglet Réseau montre le chargement de `script.js` puis un envoi vers `/api/send` ;
   - l'onglet Application → Cookies est vide pour le domaine ;
   - la visite apparaît dans le tableau de bord Umami (vue temps réel).

## Tester Umami en local

Copier `apps/web/.env.example` vers `apps/web/.env.local`, renseigner l'identifiant, puis lancer `pnpm build` et `pnpm --filter @repo/web start`. Supprimer la variable pour revenir à l'état sans mesure d'audience.
