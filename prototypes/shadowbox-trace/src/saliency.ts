// PROTOTYPE JETABLE (#36) : modèles de saillance (BiRefNet Lite, IS-Net) dans le navigateur.
// Ils détourent « ce qui ressort » d'une image, sans clic ni amorce : contrairement à SlimSAM, ils
// trouvent les objets seuls. Entrée de 1024 × 1024 px, étirée : une passe sur la feuille trouve et
// détoure les objets. La seconde passe (fenêtre autour de chacun, comme pour SAM) est en option : sur
// la photo de synthèse elle dessert IS-Net, qui n'y garde qu'une partie des outils longs.
import { pipeline, RawImage } from "@huggingface/transformers";
import { componentAt, interiorPoint, toPx, type Cv, type Rectified, type Segmentation } from "./pipeline";
import { crop, type Device, type Dtype } from "./runtime";

export const SALIENCY = {
  birefnet: "onnx-community/BiRefNet_lite-ONNX",
  isnet: "onnx-community/ISNet-ONNX",
};
export type SaliencyKey = keyof typeof SALIENCY;

// BiRefNet Lite ne tourne pas dans le navigateur avec onnxruntime-web 1.31.0-dev (essayé sur un PC
// à GPU Intel Xe, Chrome) :
// - WebGPU : son décodeur découpe l'image en pavés par des `Split` de 16 ou 32 sorties et la recolle
//   par des `Concat` de 16 à 1024 entrées ; un shader à 1 entrée et 16 sorties dépasse les 16 tampons
//   permis (« Too many storage buffers in shader »), et cet échec casse aussi les modèles lancés
//   ensuite sur WebGPU. Renvoyer ces nœuds (noms lus dans le graphe ONNX) au CPU lève cette erreur…
// - … mais la mémoire WASM de 4 Go déborde alors (`std::bad_alloc`), comme en WASM seul, avec ou sans
//   arène mémoire, page isolée ou non. L'entrée est fixée à 1024 × 1024 : on ne peut pas la réduire.
const numbered = (name: string, numbers: number[]) => numbers.map((n) => `/decoder/${name}${n ? `_${n}` : ""}`);
const WIDE_NODES = [...numbered("Split", Array.from({ length: 50 }, (_, n) => n)), ...numbered("Concat", [0, 7, 14, 21])];
const SESSION: Record<SaliencyKey, Record<Device, object>> = {
  birefnet: { webgpu: { executionProviders: [{ name: "webgpu", forceCpuNodeNames: WIDE_NODES }] }, wasm: {} },
  isnet: { webgpu: {}, wasm: {} },
};

export interface Saliency {
  /** Rend l'image avec le masque dans son canal alpha. */
  segmenter: ((image: RawImage) => Promise<RawImage>) & { dispose: () => Promise<unknown> };
  dtype: Dtype;
  device: Device;
  loadMs: number;
}

const loaded = new Map<SaliencyKey, Saliency>();

/** Retire ces modèles de la mémoire : le prochain `loadSaliency` repart de zéro. */
export async function unloadSaliency() {
  for (const [key, { segmenter }] of loaded) {
    loaded.delete(key);
    await segmenter.dispose();
  }
}

export async function loadSaliency(key: SaliencyKey, dtype: Dtype, device: Device): Promise<Saliency> {
  const hit = loaded.get(key);
  if (hit && hit.dtype === dtype && hit.device === device) return hit;
  // Un seul de ces modèles en mémoire à la fois : le tas WASM est limité à 4 Go, et un modèle qui l'a
  // rempli (`std::bad_alloc`) fait échouer le suivant.
  await unloadSaliency();
  const started = performance.now();
  // « background-removal » et non « image-segmentation » : ce dernier cherche aussi un tokenizer que ces dépôts n'ont pas.
  const segmenter = (await pipeline("background-removal", SALIENCY[key], { dtype, device, session_options: SESSION[key][device] })) as unknown as Saliency["segmenter"];
  const saliency = { segmenter, dtype, device, loadMs: performance.now() - started };
  loaded.set(key, saliency);
  return saliency;
}

/** Masque (CV_8U, 255 sur ce qui ressort) d'une fenêtre de l'image redressée, à la taille de la fenêtre. */
async function salient(cv: Cv, saliency: Saliency, r: Rectified, window: number[], threshold: number): Promise<Cv> {
  const { rgb, width, height } = crop(cv, r, window);
  const cut = await saliency.segmenter(new RawImage(rgb, width, height, 3));
  const binary = new cv.Mat(height, width, cv.CV_8U);
  const out: Uint8Array = binary.data;
  for (let i = 0; i < out.length; i++) out[i] = cut.data[4 * i + 3] >= threshold ? 255 : 0;
  return binary;
}

export interface SaliencyOptions {
  /** Niveau du masque (1 à 255) à partir duquel un pixel est l'objet. */
  threshold: number;
  minAreaMm2: number;
  /** Seconde passe sur une fenêtre autour de chaque objet, élargie de `padMm`. */
  twoPasses: boolean;
  padMm: number;
}

/**
 * Tous les objets de la feuille, sans amorce. Passe 1 sur la feuille seule (sans la table, sinon
 * c'est la feuille qui ressort) : chaque composante d'au moins `minAreaMm2` est un objet. Passe 2 :
 * le modèle revoit une fenêtre autour de chacun, et on garde la composante qui couvre son cœur.
 * `onObject` est appelé avant chaque fenêtre et arrête tout s'il renvoie false.
 */
export async function segmentSaliency(
  cv: Cv,
  saliency: Saliency,
  r: Rectified,
  options: SaliencyOptions,
  onObject: (index: number, count: number) => boolean = () => true,
): Promise<{ segmentations: Segmentation[]; timing: { firstMs: number; secondMs: number } }> {
  let started = performance.now();
  const [x0, y0] = toPx(r, [1, 1]).map(Math.round);
  const [x1, y1] = toPx(r, [r.widthMm - 1, r.heightMm - 1]).map(Math.round);
  const sheet = await salient(cv, saliency, r, [x0, y0, x1 - x0, y1 - y0], options.threshold);
  const labels = new cv.Mat();
  const stats = new cv.Mat();
  const centroids = new cv.Mat();
  cv.connectedComponentsWithStats(sheet, labels, stats, centroids, 8, cv.CV_32S);
  const rough: Segmentation[] = [];
  for (let label = 1; label < stats.rows; label++) {
    const [x, y, w, h, area] = [0, 1, 2, 3, 4].map((k) => stats.data32S[label * stats.cols + k]);
    if (area < options.minAreaMm2 * r.pxPerMm ** 2) continue;
    // Une marge d'un pixel : le contour d'un masque qui touche le bord de sa fenêtre serait tronqué.
    const mask = new cv.Mat(h + 2, w + 2, cv.CV_8U, new cv.Scalar(0));
    for (let v = 0; v < h; v++) for (let u = 0; u < w; u++) if (labels.data32S[(y + v) * labels.cols + x + u] === label) mask.data[(v + 1) * (w + 2) + u + 1] = 255;
    rough.push({ mask, offset: [x0 + x - 1, y0 + y - 1], threshold: options.threshold, paper: [0, 0, 0] });
  }
  [sheet, labels, stats, centroids].forEach((m) => m.delete());
  const firstMs = performance.now() - started;
  if (!options.twoPasses) return { segmentations: rough, timing: { firstMs, secondMs: 0 } };

  started = performance.now();
  const pad = Math.round(options.padMm * r.pxPerMm);
  const segmentations: Segmentation[] = [];
  for (const [i, object] of rough.entries()) {
    if (!onObject(i, rough.length)) break;
    const [ox, oy] = object.offset;
    const [cx, cy] = interiorPoint(cv, object.mask);
    // Fenêtre carrée tant que la feuille le permet : le modèle étire son entrée en 1024 × 1024, et une
    // fenêtre très allongée déformerait l'objet.
    const side = Math.max(object.mask.cols, object.mask.rows) + 2 * pad;
    const [w, h] = [Math.min(side, x1 - x0), Math.min(side, y1 - y0)];
    const x = Math.min(Math.max(x0, Math.round(ox + object.mask.cols / 2 - w / 2)), x1 - w);
    const y = Math.min(Math.max(y0, Math.round(oy + object.mask.rows / 2 - h / 2)), y1 - h);
    const fine = await salient(cv, saliency, r, [x, y, w, h], options.threshold);
    const mask = componentAt(cv, fine, [ox + cx - x, oy + cy - y], r.pxPerMm);
    fine.delete();
    if (mask) segmentations.push({ mask, offset: [x, y], threshold: options.threshold, paper: [0, 0, 0] });
  }
  rough.forEach((object) => object.mask.delete());
  return { segmentations, timing: { firstMs, secondMs: performance.now() - started } };
}
