---
status: proposed
---

# Langue dans l'adresse, choix mémorisé sans cookie, pouces au centième

Le générateur existe en français et en anglais, aux adresses `/fr/baseplate` et `/en/baseplate` (#14). À la première visite de `/`, on redirige selon la langue du navigateur. Ensuite, le choix fait dans le menu l'emporte. Il faut donc mémoriser ce choix quelque part où la redirection de `/` peut le lire.

## Décision

- **La langue d'une page est celle de son adresse.** Les deux pages sont générées au build (`generateStaticParams`), et `<html lang>` suit le segment `[lang]`. Un lien partagé porte donc sa langue dans son chemin.
- **Le choix du menu est une préférence locale**, dans `localStorage` (clé `preferences`, champ `language`), comme les unités, la buse, le plateau et la couleur de l'aperçu. Il vaut `null` tant que l'utilisateur n'a rien choisi. Ouvrir `/en/baseplate` par un lien ne change pas ce choix.
- *(Remplacé par l'ADR 0017 : `/` mène désormais à l'index `/{lang}`, sauf pour un lien de partage.)* **`/` est une page statique sans contenu** (`app/route.ts`). Un script placé dans le `<head>` s'exécute avant tout affichage. Il lit le choix mémorisé ; à défaut, il prend la première langue du navigateur (`navigator.languages`) que le site parle ; à défaut, l'anglais. Puis il fait `location.replace` vers `/{lang}/baseplate`, en gardant la query string et l'ancre.
- **Changer de langue dans le menu** enregistre le choix, puis navigue côté client (`router.replace`), sans rechargement. Les réglages à l'écran restent en mémoire, et un lien partagé encore présent dans l'adresse suit dans l'autre langue, où il reste lu. La page est remontée : le worker du moteur redémarre et recalcule la baseplate.

## Unités

- **Préférence locale** `unit` : `mm` (par défaut) ou `in`. Seules les cotes du tiroir et des marges la suivent : leur saisie, la ligne « 9 × 6 cellules, marge … » et la marge du cadre de statistiques. Les autres longueurs restent en mm : dimensions de la baseplate, vis, plateau, taille de cellule, avertissements d'impression. Les réglages, le lien de partage et le moteur restent en mm.
- **Pouces au centième** (0,01 in = 0,254 mm) à l'affichage et à la saisie. Une longueur saisie en pouces est enregistrée en mm **au dixième, arrondie au pair** en cas d'égalité, en arithmétique entière (`apps/web/lib/units.ts`). Le dixième de millimètre est plus fin que le centième de pouce : tout centième de pouce saisi se relit donc à l'identique. 15,75 in = 400,05 mm donne exactement `w=400` dans le lien.
- Les boutons −/+ et les flèches avancent de 0,1 in (1 mm en millimètres).

## Saisie des nombres

Les nombres sont affichés selon la langue (virgule décimale en français, point en anglais). Dans les champs, la virgule et le point sont acceptés dans les deux langues, et les champs n'affichent pas de séparateur de milliers. En anglais, « 1,000 » saisi vaut donc 1, et non 1000 : les cotes du générateur ne dépassent pas 1000 mm (39,37 in), et une virgule décimale est bien plus probable qu'un séparateur de milliers.

## Considered Options

- **Cookie de langue lu par un proxy Next** qui redirige `/` côté serveur (le cookie, sinon `Accept-Language`). Aucun aller-retour de plus, mais il faut un cookie. C'est un cookie fonctionnel, sans consentement à demander, mais le site ne pose aucun cookie aujourd'hui (la mesure d'audience non plus), et `/` deviendrait dynamique. Écarté.
- **Proxy sans cookie** sur `Accept-Language`, puis correction côté client selon le choix mémorisé. Cela fait une double redirection visible pour qui a choisi une autre langue que celle de son navigateur. Écarté.
- **Aucune mémorisation**, la langue du navigateur à chaque visite de `/`. C'est contraire au ticket. Écarté.

## Consequences

- `/` coûte un aller-retour de plus : une page d'environ 1 Ko, servie depuis le CDN, sans rien afficher. La redirection se fait avant l'affichage.
- Sans JavaScript, `/` mène à `/en/baseplate` par un `<meta http-equiv="refresh">`. Le générateur demande de toute façon JavaScript.
- Si le stockage du navigateur est bloqué, le choix ne survit pas à la page : `/` suit alors la langue du navigateur.
- Les unités ne figurent pas dans le lien de partage : c'est une préférence de chaque navigateur (spec v1). Le destinataire lit les cotes dans son unité.
- Ajouter une langue : l'ajouter à `LOCALES` (`apps/web/lib/i18n.ts`) et écrire son texte dans `apps/web/lib/strings.ts`. Le typage et un test Vitest (`apps/web/test/strings.test.ts`) échouent si une clé manque.
