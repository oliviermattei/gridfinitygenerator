# Résultats du banc (généré par `bench.test.ts`)

Photo de 4032 × 3024 px (12 MP), feuille A4 à 80 % de la largeur de face (≈ 10,9 px/mm), caméra à 50 cm, bruit σ = 3, redressement à 10 px/mm, seuil d'Otsu, Douglas-Peucker à 0,1 mm.

Le rendu de synthèse (`fillPoly`) fait déborder chaque bord de 0,046 mm : la vérité en tient compte, les écarts ne sont que ceux de la chaîne.

Écart du bord : distance entre le contour trouvé et le vrai, dans les deux sens (max / moyenne). Cotes : rectangle d'aire minimale, comme un pied à coulisse.

## De face, couleurs franches

Coins de la feuille : écart max 0,78 px. Temps : rendu 2962 ms, coins 321 ms, redressement 279 ms.

| Outil | Longueur vraie | Longueur trouvée | Écart | Largeur vraie | Largeur trouvée | Écart | Aire | Bord max | Bord moyen | Seuil | Temps |
|---|---|---|---|---|---|---|---|---|---|---|---|
| clé à œil | 145,09 | 145,12 | 0,03 | 30,08 | 30,22 | 0,13 | 0,1 % | 0,13 | 0,029 | 82 | 1084 ms |
| tournevis | 190,09 | 190,17 | 0,08 | 28,09 | 28,17 | 0,08 | 0,1 % | 0,25 | 0,035 | 76 | 591 ms |
| bloc 60 × 40 | 60,09 | 60,19 | 0,10 | 40,09 | 40,17 | 0,07 | 0,1 % | 0,15 | 0,034 | 76 | 401 ms |
| clé Allen 4 mm | 60,09 | 60,10 | 0,01 | 20,09 | 20,00 | -0,09 | 0,0 % | 0,23 | 0,008 | 99 | 136 ms |

## Inclinée de 20°

Coins de la feuille : écart max 0,59 px. Temps : rendu 2972 ms, coins 242 ms, redressement 244 ms.

| Outil | Longueur vraie | Longueur trouvée | Écart | Largeur vraie | Largeur trouvée | Écart | Aire | Bord max | Bord moyen | Seuil | Temps |
|---|---|---|---|---|---|---|---|---|---|---|---|
| clé à œil | 145,09 | 145,16 | 0,08 | 30,08 | 30,18 | 0,10 | 0,0 % | 0,16 | 0,028 | 82 | 1039 ms |
| tournevis | 190,09 | 190,21 | 0,11 | 28,09 | 28,15 | 0,06 | 0,0 % | 0,25 | 0,031 | 76 | 606 ms |
| bloc 60 × 40 | 60,09 | 60,18 | 0,09 | 40,09 | 40,10 | 0,01 | 0,0 % | 0,15 | 0,025 | 76 | 381 ms |
| clé Allen 4 mm | 60,09 | 60,07 | -0,02 | 20,09 | 20,00 | -0,09 | -1,3 % | 0,15 | 0,029 | 99 | 131 ms |

## Inclinée de 30°, tournée de 10°, flou 2 px

Coins de la feuille : écart max 0,62 px. Temps : rendu 3703 ms, coins 3560 ms, redressement 310 ms.

| Outil | Longueur vraie | Longueur trouvée | Écart | Largeur vraie | Largeur trouvée | Écart | Aire | Bord max | Bord moyen | Seuil | Temps |
|---|---|---|---|---|---|---|---|---|---|---|---|
| clé à œil | 145,09 | 145,40 | 0,31 | 30,08 | 30,14 | 0,06 | 0,1 % | 0,20 | 0,027 | 82 | 1003 ms |
| tournevis | 190,09 | 190,18 | 0,09 | 28,09 | 28,17 | 0,08 | 0,1 % | 0,24 | 0,036 | 76 | 686 ms |
| bloc 60 × 40 | 60,09 | 60,22 | 0,13 | 40,09 | 40,15 | 0,05 | 0,0 % | 0,16 | 0,037 | 76 | 394 ms |
| clé Allen 4 mm | 60,09 | 60,10 | 0,01 | 20,09 | 20,10 | 0,01 | 0,2 % | 0,23 | 0,005 | 98 | 130 ms |

## Acier sur papier blanc, éclairage en dégradé de 30 %

Coins de la feuille : écart max 0,72 px. Temps : rendu 3248 ms, coins 246 ms, redressement 299 ms.

| Outil | Longueur vraie | Longueur trouvée | Écart | Largeur vraie | Largeur trouvée | Écart | Aire | Bord max | Bord moyen | Seuil | Temps |
|---|---|---|---|---|---|---|---|---|---|---|---|
| clé à œil | 145,09 | 145,17 | 0,09 | 30,08 | 30,16 | 0,08 | -0,1 % | 0,15 | 0,030 | 27 | 1145 ms |
| tournevis | 190,09 | 190,19 | 0,09 | 28,09 | 28,18 | 0,08 | 0,0 % | 0,25 | 0,039 | 27 | 785 ms |
| bloc 60 × 40 | 60,09 | 60,23 | 0,13 | 40,09 | 40,23 | 0,14 | 0,1 % | 0,16 | 0,042 | 30 | 447 ms |
| clé Allen 4 mm | 60,09 | 60,20 | 0,11 | 20,09 | 20,11 | 0,01 | 1,1 % | 0,19 | 0,035 | 30 | 142 ms |

## Très faible contraste (gris 200 sur 236)

Coins de la feuille : écart max 0,59 px. Temps : rendu 2989 ms, coins 258 ms, redressement 274 ms.

| Outil | Longueur vraie | Longueur trouvée | Écart | Largeur vraie | Largeur trouvée | Écart | Aire | Bord max | Bord moyen | Seuil | Temps |
|---|---|---|---|---|---|---|---|---|---|---|---|
| clé à œil | 145,09 | 145,20 | 0,11 | 30,08 | 30,22 | 0,14 | 0,0 % | 0,21 | 0,034 | 15 | 1209 ms |
| tournevis | 190,09 | 190,25 | 0,16 | 28,09 | 28,24 | 0,15 | 0,0 % | 0,21 | 0,043 | 15 | 746 ms |
| bloc 60 × 40 | 60,09 | 60,25 | 0,16 | 40,09 | 40,25 | 0,16 | 0,0 % | 0,16 | 0,031 | 16 | 442 ms |
| clé Allen 4 mm | 60,09 | 60,10 | 0,01 | 20,09 | 20,20 | 0,11 | 1,1 % | 0,16 | 0,057 | 16 | 187 ms |

## Poche (manifold-3d 3.5.4)

Gabarit ajouré de la clé à œil (jeu 0,5 mm, paroi 3 mm, 2 mm d'épaisseur) : NoError, 6,064 cm³ pour 6,064 cm³ attendus (aire du rectangle moins aire de la poche décalée, fois l'épaisseur). `CrossSection` + `offset` + `extrude` + `subtract` suffisent.

