# Next.js (React) comme framework, malgré la convention Vue du workspace

Le générateur de baseplate n'est que le premier outil d'un site plus large (plusieurs pages et outils), donc on veut du SSR/SSG, et on veut surtout ne jamais être bloqué par une librairie manquante. On choisit Next.js (App Router) : c'est l'écosystème le plus large, notamment pour la 3D (react-three-fiber / drei), l'UI (shadcn/ui) et l'i18n, et il se déploie nativement sur Vercel. La géométrie tourne dans un Web Worker indépendant du framework.

## Considered Options

- **Vue 3 + Vite / Nuxt** : convention habituelle du workspace, mais écosystème 3D et composants plus restreint.
- **SvelteKit** : framework de l'outil original (extrabold), écosystème plus petit.
