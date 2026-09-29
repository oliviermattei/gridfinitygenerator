"""PROTOTYPE JETABLE : contrôle des exports (fermeture, cotes, profil) avec trimesh."""
import glob, json, sys
import numpy as np
import trimesh
from shapely.geometry import Point

folder = sys.argv[1] if len(sys.argv) > 1 else "out"

def inset(z):  # profil ADR 0002 (z depuis le bas du profil)
    if z <= 0.35: return 2.85
    if z <= 1.05: return 2.85 - (z - 0.35)
    if z <= 2.85: return 2.15
    return 2.15 - (z - 2.85)

rows = []
for path in sorted(glob.glob(f"{folder}/*.stl")) + sorted(glob.glob(f"{folder}/*.3mf")):
    m = trimesh.load(path, force="mesh")
    n = int(path.split("-")[-2].split("x")[0])
    mag = path.endswith(("-mag.stl", "-mag.3mf"))
    mb = 2.8 if mag else 0.0
    ext = m.bounds[1] - m.bounds[0]
    row = {
        "file": path.split("/")[-1],
        "tri": len(m.faces),
        "watertight": bool(m.is_watertight),
        "winding_ok": bool(m.is_winding_consistent),
        "volume": round(float(m.volume), 1),
        "bbox": [round(float(x), 3) for x in ext],
        "bbox_ok": bool(np.allclose(ext, [42 * n, 42 * n, 4.6 + mb], atol=1e-3)),
    }
    # ouverture de poche de la cellule (-(n-1)*21, ...) à plusieurs hauteurs du profil
    c = -(n - 1) * 21.0
    errs = []
    for zp in (0.1, 0.7, 2.0, 4.5):
        sec = m.section(plane_origin=[0, 0, mb + zp], plane_normal=[0, 0, 1])
        if sec is None:
            errs.append(None); continue
        planar, T = sec.to_2D()
        # to_2D peut translater : on repasse en coordonnées monde via la matrice
        best = None
        for poly in planar.polygons_full:
            for hole in poly.interiors:
                pts = np.column_stack([np.array(hole.coords), np.zeros(len(hole.coords)), np.ones(len(hole.coords))])
                w = (T @ pts.T).T[:, :2]
                if w[:, 0].min() < c < w[:, 0].max() and w[:, 1].min() < c < w[:, 1].max():
                    width = w[:, 0].max() - w[:, 0].min()
                    if best is None or width < best: best = width
        exp = 42 - 2 * inset(zp)
        errs.append(None if best is None else round(best - exp, 3))
    row["pocket_width_err_mm@z0.1/0.7/2.0/4.5"] = errs
    if mag:
        sec = m.section(plane_origin=[0, 0, mb - 1.0], plane_normal=[0, 0, 1])
        planar, T = sec.to_2D()
        target = np.array([c + 13, c + 13])
        dia = None
        for poly in planar.polygons_full:
            for hole in poly.interiors:
                pts = np.column_stack([np.array(hole.coords), np.zeros(len(hole.coords)), np.ones(len(hole.coords))])
                w = (T @ pts.T).T[:, :2]
                ctr = w.mean(axis=0)
                if np.linalg.norm(ctr - target) < 0.5:
                    dia = round(float(w[:, 0].max() - w[:, 0].min()), 3)
        row["magnet_hole_dia@z=mb-1"] = dia
    rows.append(row)
    print(json.dumps(row, ensure_ascii=False))

json.dump(rows, open(f"{folder}/validation.json", "w"), indent=1, ensure_ascii=False)
