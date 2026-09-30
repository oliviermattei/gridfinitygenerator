---
status: accepted
---

# Un index des générateurs à `/{lang}`, qui remplace le « `/` sans contenu »

Le site n'avait qu'un générateur, et l'ADR 0007 faisait de `/` une page vide qui mène directement à `/{lang}/baseplate`. Avec le générateur de bins, le site devient un ensemble d'outils : il lui faut une page d'entrée qui les présente. On garde le choix de la langue sur `/`, et on met l'**index** à `/{lang}`.

## Décision

- **`/{lang}` est l'index** (`/fr`, `/en`), généré au build comme les générateurs. Les générateurs restent à `/{lang}/baseplate` et vont à `/{lang}/bin` : un slug unique dans les deux langues, comme `baseplate`.
- **`/` choisit toujours la langue** comme le dit l'ADR 0007 (choix mémorisé, sinon langue du navigateur, sinon anglais), mais mène à `/{lang}`. **Exception** : si l'adresse porte une query string ou une ancre, c'est un ancien lien de partage de baseplate ; `/` mène alors à `/{lang}/baseplate` en les gardant. Aucun lien déjà partagé ne casse.
- **Contenu**, inspiré de la page d'accueil d'extrabold.tools, dans la direction « Studio » (`packages/ui`) plutôt qu'avec leur style : un titre et une phrase d'accroche, une grille de cartes (image, pastille « Gridfinity », titre, une ligne ; toute la carte est le lien), un rappel discret du don, un pied de page (licence MIT, code source). Pas de recherche, de vidéos, de MCP ni de comptes.
- **Image des cartes** : une image fixe rendue par notre propre moteur, pas un aperçu 3D vivant : légère sur mobile, et c'est le vrai rendu de l'outil.
- **Générateur à venir** : une carte grisée « bientôt », non cliquable. Seul le générateur de bins est annoncé ainsi ; on n'annonce rien qui ne soit pas spécifié.

## Considered Options

- **Index à `/`, sans langue dans l'adresse** : casse la règle « la langue d'une page est celle de son adresse » (ADR 0007). Écarté.
- **Pas d'index, un menu entre générateurs** : le site n'aurait pas de page à partager ni à référencer comme ensemble d'outils. Écarté.
- **Pas de carte tant qu'un outil n'est pas sorti**, comme extrabold : avec une seule carte, l'index n'est qu'un détour. Écarté.

## Consequences

- Le point « `/` est une page statique sans contenu » de l'ADR 0007 est remplacé ; le reste de l'ADR 0007 (langue dans l'adresse, choix mémorisé sans cookie, unités) tient.
- Un nouveau générateur ajoute une carte et une image à l'index.
