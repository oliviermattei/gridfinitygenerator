# Attributions

Ce projet est un code original, publié sous licence MIT (voir `LICENSE`). Il reprend les cotes du système Gridfinity et s'appuie sur les travaux suivants, sous licence MIT, dont les notices sont reproduites ci-dessous, à une exception près : la géométrie du type CLICKbase, sous licence CC BY-NC-SA (voir plus bas).

« Gridfinity » est employé ici comme nom descriptif de compatibilité.

## Gridfinity, de Zack Freedman

- Auteur : Zack Freedman (Voidstar Lab LLC).
- Vidéo d'origine : « Gridfinity: Your Ultimate Modular Workshop is FREE! », https://www.youtube.com/watch?v=ra_9zU-mnl8
- Passage sous licence MIT annoncé par l'auteur le 24/04/2023 : « All of my Gridfinity stuff is now MIT licensed, so go nuts! », https://x.com/zackfreedman/status/1650629770156326912

```
MIT License

Copyright (c) 2023 Zachary Freedman and Voidstar Lab LLC
```

## gridfinity-rebuilt-openscad, de Kenneth Hodson (kennetek)

- Dépôt : https://github.com/kennetek/gridfinity-rebuilt-openscad
- Repris : les cotes du profil de baseplate, dont le muret vertical de 0,35 mm sous le profil (voir `docs/adr/0002-profil-poche-4-60mm.md`).

```
MIT License

Copyright (c) 2023 Kenneth Hodson
```

## CLICKbase Refined, de ZeroCtrl, et CLICKbase, de John Hall (CC BY-NC-SA 4.0)

- CLICKbase Refined : https://www.printables.com/model/1487592 (ZeroCtrl), dérivé de CLICKbase : https://www.printables.com/model/982173 (John Hall), lui-même inspiré de Clickfinity (NoWarrenty) et des ClickPlates (jerrymk).
- Repris : la géométrie des lamelles du type de baseplate CLICKbase (lamelle de 0,8 mm, saignée de 0,5 mm, deux par côté, ergot cintré de 0,5 mm, toile imprimée en place), relevée sur les STL publics de Refined (`packages/geometry/src/clickbase.ts`, `prototypes/clickbase/`). Aucun fichier de ces modèles n'est dans le dépôt.
- Licence : Creative Commons Attribution – Pas d'utilisation commerciale – Partage dans les mêmes conditions 4.0 (https://creativecommons.org/licenses/by-nc-sa/4.0/). Elle n'est pas compatible avec la licence MIT de ce projet : les baseplates CLICKbase générées sont à considérer comme dérivées d'une œuvre CC BY-NC-SA, **pas d'usage commercial**. La question est ouverte (autorisation des auteurs, ou retenue maison) : voir `docs/adr/0015-clickbase-d-apres-refined-licences.md`.

## Notice de la licence MIT (commune aux deux projets)

```
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
