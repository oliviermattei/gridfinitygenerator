Bench 2026-09-28T22:38:58.736Z — Node v22.17.0, Apple M1 Pro (8 cœurs), darwin, durée 2707 s

| moteur | qualité | variante | aimants | grille | génération (médiane) | runs | triangles | STL | 3MF | RSS max | manifold ? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| manifold | final | naive | non | 2×2 | 54 ms | 7 | 1 596 | 1.0 ms / 78 Ko | 4.7 ms / 14 Ko | 73 Mo | oui |
| manifold | final | naive | non | 5×5 | 417 ms | 7 | 9 240 | 0.8 ms / 451 Ko | 29 ms / 82 Ko | 93 Mo | oui |
| manifold | final | naive | non | 10×10 | 2.54 s | 3 | 36 540 | 3.1 ms / 1784 Ko | 117 ms / 323 Ko | 167 Mo | oui |
| manifold | final | naive | non | 20×20 | 33.44 s | 1 | 145 740 | 55 ms / 7116 Ko | 1.28 s / 1288 Ko | 265 Mo |  |
| manifold | final | naive | oui | 2×2 | 118 ms | 7 | 5 884 | 3.7 ms / 287 Ko | 21 ms / 51 Ko | 84 Mo | oui |
| manifold | final | naive | oui | 5×5 | 1.24 s | 3 | 36 040 | 3.8 ms / 1760 Ko | 294 ms / 319 Ko | 163 Mo | oui |
| manifold | final | naive | oui | 10×10 | 7.41 s | 1 | 143 740 | 16 ms / 7019 Ko | 537 ms / 1289 Ko | 268 Mo | oui |
| manifold | final | naive | oui | 20×20 | 76.93 s | 1 | 574 540 | 48 ms / 28054 Ko | 2.06 s / 5200 Ko | 822 Mo |  |
| manifold | final | seq | non | 2×2 | 24 ms | 7 | 1 596 | 0.9 ms / 78 Ko | 5.2 ms / 14 Ko | 73 Mo | oui |
| manifold | final | seq | non | 5×5 | 168 ms | 7 | 9 240 | 0.6 ms / 451 Ko | 29 ms / 83 Ko | 95 Mo | oui |
| manifold | final | seq | non | 10×10 | 1.52 s | 3 | 36 540 | 2.9 ms / 1784 Ko | 111 ms / 328 Ko | 159 Mo | oui |
| manifold | final | seq | non | 20×20 | 18.87 s | 1 | 145 740 | 16 ms / 7116 Ko | 553 ms / 1302 Ko | 269 Mo |  |
| manifold | final | seq | oui | 2×2 | 39 ms | 7 | 5 884 | 1.4 ms / 287 Ko | 17 ms / 52 Ko | 84 Mo | oui |
| manifold | final | seq | oui | 5×5 | 384 ms | 7 | 36 040 | 2.9 ms / 1760 Ko | 109 ms / 322 Ko | 156 Mo | oui |
| manifold | final | seq | oui | 10×10 | 4.48 s | 3 | 143 740 | 16 ms / 7019 Ko | 539 ms / 1301 Ko | 285 Mo | oui |
| manifold | final | seq | oui | 20×20 | 65.04 s | 1 | 574 540 | 51 ms / 28054 Ko | 2.10 s / 5229 Ko | 796 Mo |  |
| manifold | final | seqLazy | non | 2×2 | 20 ms | 7 | 1 596 | 0.9 ms / 78 Ko | 5.1 ms / 14 Ko | 72 Mo | oui |
| manifold | final | seqLazy | non | 5×5 | 56 ms | 7 | 9 240 | 0.6 ms / 451 Ko | 29 ms / 83 Ko | 94 Mo | oui |
| manifold | final | seqLazy | non | 10×10 | 188 ms | 7 | 36 542 | 2.8 ms / 1784 Ko | 111 ms / 332 Ko | 162 Mo | oui |
| manifold | final | seqLazy | non | 20×20 | 842 ms | 7 | 145 742 | 17 ms / 7116 Ko | 552 ms / 1321 Ko | 456 Mo |  |
| manifold | final | seqLazy | oui | 2×2 | 35 ms | 7 | 5 884 | 1.7 ms / 287 Ko | 23 ms / 52 Ko | 85 Mo | oui |
| manifold | final | seqLazy | oui | 5×5 | 121 ms | 7 | 36 040 | 3.2 ms / 1760 Ko | 131 ms / 322 Ko | 160 Mo | oui |
| manifold | final | seqLazy | oui | 10×10 | 470 ms | 7 | 143 740 | 14 ms / 7019 Ko | 644 ms / 1301 Ko | 386 Mo | oui |
| manifold | final | seqLazy | oui | 20×20 | 1.95 s | 3 | 574 540 | 72 ms / 28054 Ko | 2.74 s / 5233 Ko | 1205 Mo |  |
| manifold | final | batchUnion | non | 2×2 | 25 ms | 7 | 1 596 | 1.7 ms / 78 Ko | 14 ms / 14 Ko | 74 Mo | oui |
| manifold | final | batchUnion | non | 5×5 | 72 ms | 7 | 9 240 | 1.8 ms / 451 Ko | 35 ms / 83 Ko | 92 Mo | oui |
| manifold | final | batchUnion | non | 10×10 | 260 ms | 7 | 36 542 | 5.7 ms / 1784 Ko | 171 ms / 332 Ko | 170 Mo | oui |
| manifold | final | batchUnion | non | 20×20 | 826 ms | 3 | 145 742 | 12 ms / 7116 Ko | 495 ms / 1321 Ko | 457 Mo |  |
| manifold | final | batchUnion | oui | 2×2 | 33 ms | 7 | 5 884 | 1.5 ms / 287 Ko | 18 ms / 52 Ko | 86 Mo | oui |
| manifold | final | batchUnion | oui | 5×5 | 106 ms | 7 | 36 040 | 3.0 ms / 1760 Ko | 111 ms / 322 Ko | 160 Mo | oui |
| manifold | final | batchUnion | oui | 10×10 | 367 ms | 7 | 143 740 | 11 ms / 7019 Ko | 452 ms / 1301 Ko | 440 Mo | oui |
| manifold | final | batchUnion | oui | 20×20 | 1.43 s | 3 | 574 540 | 45 ms / 28054 Ko | 2.19 s / 5233 Ko | 1205 Mo |  |
| manifold | final | batch | non | 2×2 | 20 ms | 7 | 1 596 | 1.0 ms / 78 Ko | 5.8 ms / 14 Ko | 74 Mo | oui |
| manifold | final | batch | non | 5×5 | 56 ms | 7 | 9 240 | 0.7 ms / 451 Ko | 27 ms / 83 Ko | 89 Mo | oui |
| manifold | final | batch | non | 10×10 | 187 ms | 7 | 36 542 | 3.0 ms / 1784 Ko | 112 ms / 332 Ko | 158 Mo | oui |
| manifold | final | batch | non | 20×20 | 748 ms | 7 | 145 742 | 18 ms / 7116 Ko | 513 ms / 1321 Ko | 455 Mo |  |
| manifold | final | batch | oui | 2×2 | 34 ms | 7 | 5 884 | 2.2 ms / 287 Ko | 18 ms / 52 Ko | 83 Mo | oui |
| manifold | final | batch | oui | 5×5 | 116 ms | 7 | 36 040 | 2.6 ms / 1760 Ko | 113 ms / 322 Ko | 160 Mo | oui |
| manifold | final | batch | oui | 10×10 | 371 ms | 7 | 143 740 | 12 ms / 7019 Ko | 455 ms / 1301 Ko | 440 Mo | oui |
| manifold | final | batch | oui | 20×20 | 1.45 s | 3 | 574 540 | 46 ms / 28054 Ko | 2.14 s / 5233 Ko | 1205 Mo |  |
| manifold | final | batchLoft | non | 2×2 | 9.6 ms | 7 | 1 600 | 1.6 ms / 78 Ko | 9.2 ms / 14 Ko | 72 Mo | oui |
| manifold | final | batchLoft | non | 5×5 | 46 ms | 7 | 9 244 | 1.2 ms / 451 Ko | 33 ms / 83 Ko | 87 Mo | oui |
| manifold | final | batchLoft | non | 10×10 | 176 ms | 7 | 36 554 | 4.8 ms / 1785 Ko | 127 ms / 331 Ko | 162 Mo | oui |
| manifold | final | batchLoft | non | 20×20 | 850 ms | 7 | 145 762 | 39 ms / 7117 Ko | 771 ms / 1323 Ko | 446 Mo |  |
| manifold | final | batchLoft | oui | 2×2 | 26 ms | 7 | 5 884 | 1.4 ms / 287 Ko | 24 ms / 52 Ko | 82 Mo | oui |
| manifold | final | batchLoft | oui | 5×5 | 123 ms | 7 | 36 040 | 6.3 ms / 1760 Ko | 141 ms / 321 Ko | 167 Mo | oui |
| manifold | final | batchLoft | oui | 10×10 | 503 ms | 7 | 143 740 | 17 ms / 7019 Ko | 622 ms / 1299 Ko | 439 Mo | oui |
| manifold | final | batchLoft | oui | 20×20 | 1.94 s | 3 | 574 540 | 156 ms / 28054 Ko | 2.97 s / 5237 Ko | 1202 Mo |  |
| manifold | final | bricks | non | 2×2 | 16 ms | 7 | 1 606 | 1.1 ms / 79 Ko | 4.9 ms / 14 Ko | 71 Mo | oui |
| manifold | final | bricks | non | 5×5 | 92 ms | 7 | 9 304 | 1.2 ms / 454 Ko | 33 ms / 83 Ko | 93 Mo | oui |
| manifold | final | bricks | non | 10×10 | 391 ms | 7 | 36 774 | 3.1 ms / 1796 Ko | 113 ms / 330 Ko | 161 Mo | oui |
| manifold | final | bricks | non | 20×20 | 1.69 s | 3 | 146 616 | 16 ms / 7159 Ko | 511 ms / 1322 Ko | 437 Mo |  |
| manifold | final | bricks | oui | 2×2 | 33 ms | 7 | 5 884 | 2.2 ms / 287 Ko | 20 ms / 52 Ko | 86 Mo | oui |
| manifold | final | bricks | oui | 5×5 | 171 ms | 7 | 36 040 | 3.1 ms / 1760 Ko | 119 ms / 321 Ko | 163 Mo | oui |
| manifold | final | bricks | oui | 10×10 | 838 ms | 7 | 143 740 | 39 ms / 7019 Ko | 529 ms / 1300 Ko | 434 Mo | oui |
| manifold | final | bricks | oui | 20×20 | 3.91 s | 3 | 574 540 | 68 ms / 28054 Ko | 2.38 s / 5237 Ko | 811 Mo |  |
| manifold | final | direct | non | 2×2 | 3.9 ms | 7 | 1 596 | 1.1 ms / 78 Ko | 6.4 ms / 14 Ko | 65 Mo | oui |
| manifold | final | direct | non | 5×5 | 20 ms | 7 | 9 240 | 1.3 ms / 451 Ko | 36 ms / 82 Ko | 82 Mo | oui |
| manifold | final | direct | non | 10×10 | 65 ms | 7 | 36 540 | 2.2 ms / 1784 Ko | 111 ms / 328 Ko | 140 Mo | oui |
| manifold | final | direct | non | 20×20 | 263 ms | 7 | 145 740 | 11 ms / 7116 Ko | 491 ms / 1328 Ko | 390 Mo |  |
| manifold | final | direct | oui | 2×2 | 37 ms | 7 | 6 024 | 1.2 ms / 294 Ko | 19 ms / 52 Ko | 88 Mo | oui |
| manifold | final | direct | oui | 5×5 | 239 ms | 7 | 36 612 | 3.2 ms / 1788 Ko | 123 ms / 325 Ko | 181 Mo | oui |
| manifold | final | direct | oui | 10×10 | 1.09 s | 3 | 145 772 | 16 ms / 7118 Ko | 462 ms / 1313 Ko | 467 Mo | oui |
| manifold | final | direct | oui | 20×20 | 4.89 s | 3 | 584 816 | 48 ms / 28556 Ko | 2.16 s / 5317 Ko | 908 Mo |  |
| manifold | final | brickMesh | non | 2×2 | 13 ms | 7 | 1 616 | 1.0 ms / 79 Ko | 5.3 ms / 14 Ko | 71 Mo | oui |
| manifold | final | brickMesh | non | 5×5 | 13 ms | 7 | 9 368 | 0.7 ms / 458 Ko | 27 ms / 77 Ko | 86 Mo | oui |
| manifold | final | brickMesh | non | 10×10 | 14 ms | 7 | 37 008 | 2.7 ms / 1807 Ko | 104 ms / 302 Ko | 135 Mo | oui |
| manifold | final | brickMesh | non | 20×20 | 26 ms | 7 | 147 488 | 9.8 ms / 7202 Ko | 410 ms / 1204 Ko | 338 Mo |  |
| manifold | final | brickMesh | oui | 2×2 | 26 ms | 7 | 5 904 | 1.5 ms / 288 Ko | 17 ms / 51 Ko | 83 Mo | oui |
| manifold | final | brickMesh | oui | 5×5 | 27 ms | 7 | 36 168 | 2.4 ms / 1766 Ko | 97 ms / 308 Ko | 138 Mo | oui |
| manifold | final | brickMesh | oui | 10×10 | 35 ms | 7 | 144 208 | 9.5 ms / 7041 Ko | 398 ms / 1236 Ko | 336 Mo | oui |
| manifold | final | brickMesh | oui | 20×20 | 40 ms | 7 | 576 288 | 39 ms / 28139 Ko | 1.76 s / 4957 Ko | 797 Mo |  |
| manifold | preview | batch | non | 2×2 | 6.7 ms | 9 | 540 |  |  | 69 Mo | oui |
| manifold | preview | batch | non | 5×5 | 20 ms | 9 | 3 144 |  |  | 71 Mo | oui |
| manifold | preview | batch | non | 10×10 | 63 ms | 9 | 12 444 |  |  | 79 Mo | oui |
| manifold | preview | batch | non | 20×20 | 247 ms | 9 | 49 644 |  |  | 109 Mo |  |
| manifold | preview | batch | oui | 2×2 | 11 ms | 9 | 1 756 |  |  | 73 Mo | oui |
| manifold | preview | batch | oui | 5×5 | 35 ms | 9 | 10 744 |  |  | 79 Mo | oui |
| manifold | preview | batch | oui | 10×10 | 124 ms | 9 | 42 844 |  |  | 102 Mo | oui |
| manifold | preview | batch | oui | 20×20 | 480 ms | 9 | 171 244 |  |  | 208 Mo |  |
| manifold | preview | batchLoft | non | 2×2 | 3.8 ms | 9 | 544 |  |  | 67 Mo | oui |
| manifold | preview | batchLoft | non | 5×5 | 15 ms | 9 | 3 160 |  |  | 70 Mo | oui |
| manifold | preview | batchLoft | non | 10×10 | 55 ms | 9 | 12 484 |  |  | 76 Mo | oui |
| manifold | preview | batchLoft | non | 20×20 | 219 ms | 9 | 49 724 |  |  | 106 Mo |  |
| manifold | preview | batchLoft | oui | 2×2 | 7.5 ms | 9 | 1 756 |  |  | 68 Mo | oui |
| manifold | preview | batchLoft | oui | 5×5 | 30 ms | 9 | 10 744 |  |  | 75 Mo | oui |
| manifold | preview | batchLoft | oui | 10×10 | 111 ms | 9 | 42 844 |  |  | 101 Mo | oui |
| manifold | preview | batchLoft | oui | 20×20 | 449 ms | 9 | 171 244 |  |  | 201 Mo |  |
| manifold | preview | brickMesh | non | 2×2 | 5.1 ms | 9 | 560 |  |  | 67 Mo | oui |
| manifold | preview | brickMesh | non | 5×5 | 5.6 ms | 9 | 3 272 |  |  | 67 Mo | oui |
| manifold | preview | brickMesh | non | 10×10 | 6.6 ms | 9 | 12 912 |  |  | 68 Mo | oui |
| manifold | preview | brickMesh | non | 20×20 | 9.6 ms | 9 | 51 392 |  |  | 72 Mo |  |
| manifold | preview | brickMesh | oui | 2×2 | 14 ms | 9 | 1 776 |  |  | 68 Mo | oui |
| manifold | preview | brickMesh | oui | 5×5 | 12 ms | 9 | 10 872 |  |  | 69 Mo | oui |
| manifold | preview | brickMesh | oui | 10×10 | 17 ms | 9 | 43 312 |  |  | 74 Mo | oui |
| manifold | preview | brickMesh | oui | 20×20 | 13 ms | 9 | 172 992 |  |  | 80 Mo |  |
| manifold | preview | instanced | non | 2×2 | 4.9 ms | 9 | 576 |  |  | 67 Mo |  |
| manifold | preview | instanced | non | 5×5 | 4.9 ms | 9 | 3 432 |  |  | 67 Mo |  |
| manifold | preview | instanced | non | 10×10 | 6.1 ms | 9 | 13 632 |  |  | 67 Mo |  |
| manifold | preview | instanced | non | 20×20 | 5.1 ms | 9 | 54 432 |  |  | 66 Mo |  |
| manifold | preview | instanced | oui | 2×2 | 11 ms | 9 | 1 792 |  |  | 68 Mo |  |
| manifold | preview | instanced | oui | 5×5 | 9.7 ms | 9 | 11 032 |  |  | 68 Mo |  |
| manifold | preview | instanced | oui | 10×10 | 12 ms | 9 | 44 032 |  |  | 68 Mo |  |
| manifold | preview | instanced | oui | 20×20 | 15 ms | 9 | 176 032 |  |  | 68 Mo |  |
| jscad | final | naive | non | 2×2 | 263 ms | 7 | 1 700 | 32 ms / 91 Ko | 217 ms / 33 Ko | 126 Mo | **non** |
| jscad | final | naive | non | 5×5 | 1.47 s | 3 | 9 392 | 41 ms / 486 Ko | 185 ms / 173 Ko | 392 Mo | **non** |
| jscad | final | naive | non | 10×10 | 22.70 s | 1 | 36 452 | 204 ms / 1855 Ko | 2.28 s / 665 Ko | 1058 Mo | **non** |
| jscad | final | naive | non | 20×20 | sauté (> 10 s à 10x10) | | | | | | |
| jscad | final | naive | oui | 2×2 | 299 ms | 7 | 6 912 | 52 ms / 409 Ko | 219 ms / 144 Ko | 205 Mo | **non** |
| jscad | final | naive | oui | 5×5 | 6.88 s | 1 | 42 156 | 848 ms / 2481 Ko | 5.09 s / 889 Ko | 563 Mo | **non** |
| jscad | final | naive | oui | 10×10 | 94.38 s | 1 | 167 776 | 19.43 s / 9858 Ko | 86.43 s / 3607 Ko | 1490 Mo | **non** |
| jscad | final | naive | oui | 20×20 | sauté (> 10 s à 10x10) | | | | | | |
| jscad | final | seq | non | 2×2 | 96 ms | 7 | 1 700 | 11 ms / 91 Ko | 72 ms / 33 Ko | 124 Mo | **non** |
| jscad | final | seq | non | 5×5 | 2.55 s | 3 | 9 392 | 39 ms / 486 Ko | 220 ms / 173 Ko | 317 Mo | **non** |
| jscad | final | seq | non | 10×10 | 22.21 s | 1 | 36 452 | 148 ms / 1855 Ko | 1.74 s / 665 Ko | 1036 Mo | **non** |
| jscad | final | seq | non | 20×20 | sauté (> 10 s à 10x10) | | | | | | |
| jscad | final | seq | oui | 2×2 | 119 ms | 7 | 6 912 | 41 ms / 409 Ko | 154 ms / 144 Ko | 221 Mo | **non** |
| jscad | final | seq | oui | 5×5 | 3.16 s | 3 | 42 156 | 508 ms / 2481 Ko | 3.11 s / 889 Ko | 604 Mo | **non** |
| jscad | final | seq | oui | 10×10 | 65.97 s | 1 | 167 776 | 7.74 s / 9858 Ko | 43.33 s / 3607 Ko | 2075 Mo | **non** |
| jscad | final | seq | oui | 20×20 | sauté (> 10 s à 10x10) | | | | | | |
| jscad | final | batchUnion | non | 2×2 | 37 ms | 7 | 1 700 | 7.1 ms / 91 Ko | 32 ms / 34 Ko | 133 Mo | **non** |
| jscad | final | batchUnion | non | 5×5 | 281 ms | 7 | 9 392 | 36 ms / 486 Ko | 175 ms / 175 Ko | 258 Mo | **non** |
| jscad | final | batchUnion | non | 10×10 | 1.56 s | 3 | 36 452 | 150 ms / 1855 Ko | 1.66 s / 680 Ko | 703 Mo | **non** |
| jscad | final | batchUnion | non | 20×20 | 9.52 s | 1 | 143 976 | 736 ms / 7259 Ko | 20.56 s / 2760 Ko | 2092 Mo |  |
| jscad | final | batchUnion | oui | 2×2 | 88 ms | 7 | 6 912 | 41 ms / 409 Ko | 152 ms / 144 Ko | 219 Mo | **non** |
| jscad | final | batchUnion | oui | 5×5 | 800 ms | 7 | 42 161 | 511 ms / 2481 Ko | 3.56 s / 888 Ko | 575 Mo | **non** |
| jscad | final | batchUnion | oui | 10×10 | 5.48 s | 1 | 167 782 | 17.40 s / 9859 Ko | 84.53 s / 3605 Ko | 1412 Mo | **non** |
| jscad | final | batchUnion | oui | 20×20 | **ETIMEDOUT** | | | | | | |
| jscad | final | batch | non | 2×2 | 33 ms | 7 | 1 700 | 7.8 ms / 91 Ko | 31 ms / 34 Ko | 129 Mo | **non** |
| jscad | final | batch | non | 5×5 | 154 ms | 7 | 9 392 | 38 ms / 486 Ko | 182 ms / 176 Ko | 233 Mo | **non** |
| jscad | final | batch | non | 10×10 | 491 ms | 7 | 36 452 | 137 ms / 1855 Ko | 1.64 s / 680 Ko | 628 Mo | **non** |
| jscad | final | batch | non | 20×20 | 2.15 s | 3 | 143 974 | 665 ms / 7259 Ko | 17.65 s / 2755 Ko | 1573 Mo |  |
| jscad | final | batch | oui | 2×2 | 74 ms | 7 | 6 912 | 41 ms / 409 Ko | 154 ms / 144 Ko | 212 Mo | **non** |
| jscad | final | batch | oui | 5×5 | 322 ms | 7 | 42 157 | 488 ms / 2481 Ko | 3.11 s / 888 Ko | 629 Mo | **non** |
| jscad | final | batch | oui | 10×10 | 848 ms | 7 | 167 776 | 7.08 s / 9858 Ko | 36.18 s / 3604 Ko | 1794 Mo | **non** |
| jscad | final | batch | oui | 20×20 | **ETIMEDOUT** | | | | | | |
| jscad | final | batchLoft | non | 2×2 | 61 ms | 7 | 1 700 | 28 ms / 91 Ko | 79 ms / 33 Ko | 140 Mo | **non** |
| jscad | final | batchLoft | non | 5×5 | 418 ms | 7 | 9 392 | 73 ms / 486 Ko | 377 ms / 174 Ko | 254 Mo | **non** |
| jscad | final | batchLoft | non | 10×10 | 682 ms | 7 | 36 452 | 145 ms / 1855 Ko | 1.74 s / 676 Ko | 637 Mo | **non** |
| jscad | final | batchLoft | non | 20×20 | 7.84 s | 1 | 143 976 | 874 ms / 7259 Ko | 22.00 s / 2748 Ko | 1604 Mo |  |
| jscad | final | batchLoft | oui | 2×2 | 73 ms | 7 | 6 912 | 40 ms / 409 Ko | 155 ms / 144 Ko | 222 Mo | **non** |
| jscad | final | batchLoft | oui | 5×5 | 312 ms | 7 | 42 156 | 491 ms / 2481 Ko | 3.69 s / 892 Ko | 501 Mo | **non** |
| jscad | final | batchLoft | oui | 10×10 | 1.30 s | 3 | 167 776 | 11.58 s / 9858 Ko | 39.73 s / 3619 Ko | 1897 Mo | **non** |
| jscad | final | batchLoft | oui | 20×20 | **ETIMEDOUT** | | | | | | |
| jscad | final | bricks | non | 2×2 | 50 ms | 7 | 1 700 | 7.9 ms / 91 Ko | 31 ms / 34 Ko | 132 Mo | **non** |
| jscad | final | bricks | non | 5×5 | 442 ms | 7 | 9 392 | 39 ms / 486 Ko | 184 ms / 175 Ko | 266 Mo | **non** |
| jscad | final | bricks | non | 10×10 | 2.71 s | 3 | 36 452 | 151 ms / 1855 Ko | 1.74 s / 678 Ko | 753 Mo | **non** |
| jscad | final | bricks | non | 20×20 | 15.37 s | 1 | 143 972 | 709 ms / 7259 Ko | 21.61 s / 2741 Ko | 1974 Mo |  |
| jscad | final | bricks | oui | 2×2 | 138 ms | 7 | 6 912 | 41 ms / 409 Ko | 155 ms / 145 Ko | 201 Mo | **non** |
| jscad | final | bricks | oui | 5×5 | 1.19 s | 3 | 42 156 | 483 ms / 2481 Ko | 3.08 s / 894 Ko | 720 Mo | **non** |
| jscad | final | bricks | oui | 10×10 | 7.16 s | 1 | 167 776 | 8.22 s / 9858 Ko | 44.55 s / 3623 Ko | 1756 Mo | **non** |
| jscad | final | bricks | oui | 20×20 | **ETIMEDOUT** | | | | | | |
| jscad | final | brickMesh | non | 2×2 | 43 ms | 7 | 1 864 | 1.1 ms / 91 Ko | 9.2 ms / 16 Ko | 109 Mo | **non** |
| jscad | final | brickMesh | non | 5×5 | 48 ms | 7 | 10 960 | 1.1 ms / 535 Ko | 78 ms / 91 Ko | 114 Mo | **non** |
| jscad | final | brickMesh | non | 10×10 | 78 ms | 7 | 43 400 | 3.4 ms / 2119 Ko | 157 ms / 357 Ko | 157 Mo | **non** |
| jscad | final | brickMesh | non | 20×20 | 61 ms | 7 | 173 080 | 16 ms / 8451 Ko | 763 ms / 1421 Ko | 376 Mo |  |
| jscad | final | brickMesh | oui | 2×2 | 136 ms | 7 | 7 020 | 1.5 ms / 343 Ko | 23 ms / 62 Ko | 143 Mo | **non** |
| jscad | final | brickMesh | oui | 5×5 | 180 ms | 7 | 43 164 | 3.5 ms / 2108 Ko | 176 ms / 375 Ko | 169 Mo | **non** |
| jscad | final | brickMesh | oui | 10×10 | 235 ms | 7 | 172 204 | 12 ms / 8408 Ko | 771 ms / 1511 Ko | 336 Mo | **non** |
| jscad | final | brickMesh | oui | 20×20 | 237 ms | 7 | 688 284 | 99 ms / 33608 Ko | 3.79 s / 6072 Ko | 943 Mo |  |
| jscad | preview | batch | non | 2×2 | 14 ms | 9 | 548 |  |  | 102 Mo | **non** |
| jscad | preview | batch | non | 5×5 | 70 ms | 9 | 3 056 |  |  | 123 Mo | **non** |
| jscad | preview | batch | non | 10×10 | 333 ms | 9 | 11 876 |  |  | 168 Mo | **non** |
| jscad | preview | batch | non | 20×20 | 1.47 s | 3 | 46 916 |  |  | 294 Mo |  |
| jscad | preview | batch | oui | 2×2 | 45 ms | 9 | 1 968 |  |  | 110 Mo | **non** |
| jscad | preview | batch | oui | 5×5 | 139 ms | 9 | 11 940 |  |  | 131 Mo | **non** |
| jscad | preview | batch | oui | 10×10 | 535 ms | 9 | 47 440 |  |  | 190 Mo | **non** |
| jscad | preview | batch | oui | 20×20 | 1.17 s | 3 | 189 240 |  |  | 409 Mo |  |
| jscad | preview | batchLoft | non | 2×2 | 15 ms | 9 | 548 |  |  | 104 Mo | **non** |
| jscad | preview | batchLoft | non | 5×5 | 79 ms | 9 | 3 056 |  |  | 121 Mo | **non** |
| jscad | preview | batchLoft | non | 10×10 | 375 ms | 9 | 11 876 |  |  | 171 Mo | **non** |
| jscad | preview | batchLoft | non | 20×20 | 1.69 s | 3 | 46 916 |  |  | 309 Mo |  |
| jscad | preview | batchLoft | oui | 2×2 | 34 ms | 9 | 1 968 |  |  | 112 Mo | **non** |
| jscad | preview | batchLoft | oui | 5×5 | 113 ms | 9 | 11 940 |  |  | 130 Mo | **non** |
| jscad | preview | batchLoft | oui | 10×10 | 405 ms | 9 | 47 440 |  |  | 196 Mo | **non** |
| jscad | preview | batchLoft | oui | 20×20 | 1.82 s | 3 | 189 240 |  |  | 411 Mo |  |
| jscad | preview | brickMesh | non | 2×2 | 14 ms | 9 | 616 |  |  | 89 Mo | **non** |
| jscad | preview | brickMesh | non | 5×5 | 12 ms | 9 | 3 664 |  |  | 90 Mo | **non** |
| jscad | preview | brickMesh | non | 10×10 | 22 ms | 9 | 14 504 |  |  | 90 Mo | **non** |
| jscad | preview | brickMesh | non | 20×20 | 33 ms | 9 | 57 784 |  |  | 91 Mo |  |
| jscad | preview | brickMesh | oui | 2×2 | 42 ms | 9 | 2 028 |  |  | 105 Mo | **non** |
| jscad | preview | brickMesh | oui | 5×5 | 28 ms | 9 | 12 468 |  |  | 107 Mo | **non** |
| jscad | preview | brickMesh | oui | 10×10 | 70 ms | 9 | 49 708 |  |  | 109 Mo | **non** |
| jscad | preview | brickMesh | oui | 20×20 | 44 ms | 9 | 198 588 |  |  | 113 Mo |  |
