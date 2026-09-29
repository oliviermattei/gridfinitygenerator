---
status: accepted
---

# 3MF compressé par un deflate guidé, écrit dans le moteur

Le 3MF d'une baseplate 20 × 20 en qualité finale (531 872 triangles) contient environ 36 Mo de XML. La spec demande de l'exporter en moins de 1 s. On a mesuré trois façons de le compresser :

- **fflate** (deflate en JavaScript, niveau 1) : environ 1,5 s dans le worker de Chrome et 0,8 s sous Node. Fichier de 5,5 Mo.
- **`CompressionStream`**, le deflate natif du navigateur : environ 1,6 s dans le worker de Chrome. Son niveau est fixé à 6 et ne se règle pas. Fichier de 4,7 Mo.
- **Sans compression** : environ 0,2 s, mais un fichier de 36 Mo, plus gros que le STL (26,6 Mo).

On écrit donc notre propre encodeur deflate (`packages/geometry/src/deflate.ts`), guidé par le rédacteur du modèle. Ce rédacteur sait où son XML se répète : les parties fixes de chaque élément, un indice de sommet ou une coordonnée écrits peu avant. Il les envoie directement comme copies, sans aucune recherche de correspondances. Les blocs utilisent des codes de Huffman dynamiques. Le XML n'est jamais construit, ni en chaîne ni en tampon. Résultat en 20 × 20 : 0,6 à 0,7 s dans le worker de Chrome, et 0,3 s sous Node quand la machine n'est pas encore bridée. Fichier de 6,8 Mo, relu par zlib.

## Consequences

- Le moteur ne dépend d'aucune bibliothèque de compression, et l'export reste synchrone et déterministe.
- Le fichier est environ 45 % plus gros qu'avec zlib niveau 6. C'est le prix de la vitesse.
- Toute nouvelle forme d'élément XML doit déclarer ses parties fixes comme copies, sinon elle passe en littéraux (juste, mais moins compressé).
- L'encodeur est validé à travers l'interface publique : chaque 3MF des tests est décompressé par zlib, qui vérifie aussi les CRC-32.
- On pourra revenir à une bibliothèque si elle devient assez rapide : `serialize3mf` ne change pas pour l'appelant.
