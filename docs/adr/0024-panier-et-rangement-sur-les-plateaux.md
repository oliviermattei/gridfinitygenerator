---
status: proposed
---

# Un panier de réglages, rangé sur les plateaux au téléchargement

Décisions du 2026-10-11 avec le mainteneur (grilling du panier). On veut imprimer d'un coup tout ce qu'on a conçu (baseplates, bins, clips) : un **panier** commun aux générateurs, qui se télécharge rangé sur le moins de plateaux possible. Le 3MF standard ne connaît pas les plateaux ; seul le projet Bambu les porte, et seulement avec la config de son imprimante (ADR 0023). Glossaire : Panier, Article, Catégorie, Rangement.

## Décision

- **Un article garde des réglages, pas un maillage** : le lien de partage du modèle et une quantité. Les modèles sont recalculés en qualité finale au téléchargement (et pour les totaux affichés). Le panier reste léger (stockage local, comme les préférences), suit les corrections du moteur, et un article se rouvre dans son générateur.
- **Le plateau du téléchargement décide de tout** : la taille utile actuelle (ou celle de l'imprimante Bambu, ADR 0023) sert à la découpe des baseplates comme au rangement, de même que les réglages d'impression empilée. L'article ne garde ni plateau ni pile : changer de plateau met tout le panier à jour, et un article qui ne tient plus est signalé et exclu du téléchargement.
- **Trois rangements** : **moins de plateaux** (par défaut, catégories mêlées), **par catégorie** (bins, baseplates, clips jamais sur un même plateau), **un objet par plateau**. Un objet est un exemplaire de bin, une pièce, une pile ou une baseplate entière ; **les clips de tout le panier forment un seul bloc**, qui partage un plateau en « moins de plateaux » et a le sien dans les deux autres.
- **Règles** : boîtes englobantes, quart de tour permis, 5 mm entre deux objets, pas de marge au bord (la taille utile l'est déjà), contenu de chaque plateau centré. Avec une imprimante Bambu, le coin exclu est évité comme dans l'ADR 0023, à 0,5 mm près : Bambu Studio refuse de trancher un objet qui le touche (#43).
- **Recherche du rangement** : MaxRects sous plusieurs ordres de tri donne un résultat tout de suite ; une recherche exacte l'améliore ensuite, dans le worker, jusqu'à atteindre la borne des surfaces (⌈Σ aires / aire du plateau⌉, l'optimum est alors prouvé), s'épuiser, être arrêtée, ou 60 s. La progression n'affiche que des valeurs vraies : plateaux trouvés, borne, temps écoulé. Pas de pourcentage, qui serait inventé.
- **Fichier** : avec une imprimante Bambu, un **projet Bambu** à un plateau par plateau du rangement (`serializeBambu3mf`) ; avec « Autre », un **ZIP d'un 3MF par plateau**. Dans les deux cas, en option, un ZIP d'un STL par plateau. Chaque objet garde sa place du rangement (rien n'est recentré), son nom de la page et, en description, le lien de partage de son article ; les clips du bloc font un objet par article (#43).

## Considered Options

- **Garder les maillages dans le panier** : lourd (IndexedDB), figé sur une version du moteur, impossible à mettre dans un lien. Écarté.
- **Garder le plateau de chaque baseplate à l'ajout** : des pièces découpées pour 256 mm se retrouveraient sur un plateau de 180. Écarté.
- **Plateaux sans config, lisibles par tous** : Bambu Studio les ignore (ADR 0023). **Un seul 3MF aux plateaux posés côte à côte** pour « Autre » : à séparer à la main. Écartés pour le ZIP.
- **Heuristique seule** : quelques millisecondes, souvent optimale, mais sans preuve ; le mainteneur préfère attendre quelques secondes pour un rangement meilleur ou prouvé.

## Consequences

- Les totaux du panier (masse, coût, nombre de plateaux) demandent de calculer chaque modèle une fois en qualité finale, dans le worker ; un exemplaire de plus ne coûte rien (même maillage).
- Le lien du panier (plus tard) n'est qu'une liste compressée de liens d'articles et de quantités : il hérite de la compatibilité de chaque lien versionné.
- S'appuie sur l'ADR 0023 (préférence Imprimante, `serializeBambu3mf`).
- **Une hauteur de couche par plateau (provisoire, #43, en attente de la décision du mainteneur)** : un projet Bambu n'a qu'une `layer_height`, mais chaque article a la sienne (le `lh` de son lien, 0,2 mm par défaut : aucun article n'en est sans). Le rangement ne met donc jamais deux hauteurs de couche sur un même plateau : la couche entre dans la clé du plateau (`plateKeyOf`), et les clips font un bloc par couche, car leur forme en dépend. Le projet prend la couche du plus grand nombre d'objets. Bambu Studio n'a pas de couche par plateau (ses clés de plateau sont `bed_type`, `print_sequence`, `spiral_mode`…) : chaque objet d'un plateau d'une autre couche reçoit la sienne en réglage d'objet (`layer_height` dans `Metadata/model_settings.config`). Vérifié par la CLI de Bambu Studio 2.8.2 : un plateau à 0,2 mm et un à 0,12 mm, chacun tranché à sa couche. Le commit `feat(geometry): one layer height per plate (#43)` se défait seul.
