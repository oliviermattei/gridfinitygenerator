// PROTOTYPE JETABLE (#36) : SlimSAM-77 dans le navigateur (transformers.js, WebGPU ou WASM).
// SAM travaille à 1024 px et sort un masque de 256 px : en deux passes, la première sur toute la
// feuille trouve l'objet, la seconde sur une fenêtre recadrée autour de lui gagne la résolution.
import { AutoProcessor, RawImage, SamModel, type Processor, type PreTrainedModel, type Tensor } from "@huggingface/transformers";
import { toPx, type Cv, type Point, type Rectified, type Segmentation } from "./pipeline";
import { crop, type Device, type Dtype } from "./runtime";

const MODEL = "Xenova/slimsam-77-uniform";

export interface Sam {
  model: PreTrainedModel;
  processor: Processor;
  dtype: Dtype;
  device: Device;
  loadMs: number;
}

let loaded: Sam | null = null;

export async function loadSam(dtype: Dtype, device: Device): Promise<Sam> {
  if (loaded && loaded.dtype === dtype && loaded.device === device) return loaded;
  const started = performance.now();
  const model = await SamModel.from_pretrained(MODEL, { dtype, device });
  const processor = await AutoProcessor.from_pretrained(MODEL);
  loaded = { model, processor, dtype, device, loadMs: performance.now() - started };
  return loaded;
}

/** Retire le modèle de la mémoire : le prochain `loadSam` repart de zéro. */
export async function unloadSam() {
  const { model } = loaded ?? {};
  loaded = null;
  await model?.dispose();
}

type Box = [number, number, number, number];
interface Outputs {
  pred_masks: Tensor;
  iou_scores: Tensor;
}

/** Rang, parmi les 3 masques du clic `i`, de celui au meilleur score IoU. */
function bestOf(scores: Float32Array, i: number): number {
  const three = scores.subarray(3 * i, 3 * i + 3);
  return 3 * i + three.indexOf(Math.max(...three));
}

/**
 * Boîte [x, y, largeur, hauteur] du meilleur masque de chaque objet (autant de points par objet),
 * en px de la fenêtre, lue sur les masques bruts de 256 px : l'encodeur ne passe qu'une fois, quel
 * que soit le nombre d'objets.
 */
async function locate(sam: Sam, rgb: Uint8ClampedArray, width: number, height: number, clicks: Point[][]): Promise<(Box | null)[]> {
  const image = new RawImage(rgb, width, height, 3);
  const inputs = await sam.processor(image, { input_points: clicks, input_labels: clicks.map((points) => points.map(() => 1)) });
  const outputs = (await sam.model(inputs)) as Outputs;
  const side = outputs.pred_masks.dims.at(-1)!;
  const padded: number = inputs.pixel_values.dims.at(-1);
  const [reshapedHeight, reshapedWidth]: [number, number] = inputs.reshaped_input_sizes[0];
  // Le masque brut couvre l'image redimensionnée puis complétée à `padded` px : on ignore le complément.
  const [cols, rows] = [Math.ceil((reshapedWidth * side) / padded), Math.ceil((reshapedHeight * side) / padded)];
  const cell = (padded / side) * (width / reshapedWidth);
  const logits = outputs.pred_masks.data as Float32Array;
  const scores = outputs.iou_scores.data as Float32Array;
  return clicks.map((_, i) => {
    const base = bestOf(scores, i) * side * side;
    let [x0, y0, x1, y1] = [Infinity, Infinity, -1, -1];
    for (let v = 0; v < rows; v++)
      for (let u = 0; u < cols; u++)
        if (logits[base + v * side + u] > 0) [x0, y0, x1, y1] = [Math.min(x0, u), Math.min(y0, v), Math.max(x1, u), Math.max(y1, v)];
    console.log(`[sam] passe 1, amorce ${i + 1} : scores ${[...scores.subarray(3 * i, 3 * i + 3)].map((v) => v.toFixed(3)).join(" / ")}, boîte ${x1 < 0 ? "vide" : `${x1 + 1 - x0} × ${y1 + 1 - y0}`} (masque brut)`);
    return x1 < 0 ? null : [x0 * cell, y0 * cell, (x1 + 1 - x0) * cell, (y1 + 1 - y0) * cell];
  });
}

/** Masque SAM (meilleur des 3 par score IoU) d'une fenêtre RGB, pour les points d'un objet dans la fenêtre. */
async function predict(sam: Sam, rgb: Uint8ClampedArray, width: number, height: number, clicks: Point[]): Promise<Uint8Array> {
  const image = new RawImage(rgb, width, height, 3);
  const inputs = await sam.processor(image, { input_points: [clicks], input_labels: [clicks.map(() => 1)] });
  const outputs = (await sam.model(inputs)) as Outputs;
  const [masks] = (await (sam.processor as unknown as { post_process_masks: (...args: unknown[]) => Promise<Tensor[]> }).post_process_masks(
    outputs.pred_masks,
    inputs.original_sizes,
    inputs.reshaped_input_sizes,
  )) as Tensor[];
  const best = bestOf(outputs.iou_scores.data as Float32Array, 0);
  const size = width * height;
  const areas = [0, 1, 2].map((k) => (masks.data as Uint8Array).subarray(k * size, (k + 1) * size).reduce((s, v) => s + v, 0));
  console.log(`[sam] passe 2 (${width} × ${height}) scores ${[...(outputs.iou_scores.data as Float32Array)].map((v) => v.toFixed(3)).join(" / ")}, parts de la fenêtre ${areas.map((a) => (a / size).toFixed(3)).join(" / ")}, gardé ${best}`);
  return (masks.data as Uint8Array).slice(best * size, (best + 1) * size);
}

export interface SamTiming {
  firstMs: number;
  secondMs: number;
}

/**
 * Deux passes SAM, sans clic : les amorces (des points dans chaque objet, en mm) remplacent le clic.
 * Passe 1 sur la feuille entière, une fois pour tous les objets (trouver chacun) ; passe 2 sur une
 * fenêtre recadrée autour de chacun (son masque de passe 1 et ses amorces), élargie de `padMm`
 * (précision). `onObject` est appelé avant chaque fenêtre et arrête tout s'il renvoie false.
 */
export async function segmentSam(
  cv: Cv,
  sam: Sam,
  r: Rectified,
  seedsMm: Point[][],
  padMm = 5,
  onObject: (index: number) => boolean = () => true,
): Promise<{ segmentations: (Segmentation | null)[]; timing: SamTiming }> {
  const seeds = seedsMm.map((points) => points.map((point) => toPx(r, point)));
  // Le décodeur veut autant de points par objet : on répète le premier pour compléter.
  const most = Math.max(...seeds.map((points) => points.length));
  let started = performance.now();
  const whole = crop(cv, r, [0, 0, r.mat.cols, r.mat.rows], 1024);
  const clicks = seeds.map((points) => Array.from({ length: most }, (_, k) => points[k] ?? points[0]).map(([x, y]) => [x * whole.scale, y * whole.scale] as Point));
  const boxes = await locate(sam, whole.rgb, whole.width, whole.height, clicks);
  const firstMs = performance.now() - started;
  started = performance.now();
  const pad = padMm * r.pxPerMm;
  const segmentations: (Segmentation | null)[] = [];
  for (const [i, box] of boxes.entries()) {
    if (!onObject(i)) break;
    if (!box) {
      segmentations.push(null);
      continue;
    }
    const xs = [box[0] / whole.scale, (box[0] + box[2]) / whole.scale, ...seeds[i].map((p) => p[0])];
    const ys = [box[1] / whole.scale, (box[1] + box[3]) / whole.scale, ...seeds[i].map((p) => p[1])];
    const x = Math.max(0, Math.floor(Math.min(...xs) - pad));
    const y = Math.max(0, Math.floor(Math.min(...ys) - pad));
    const w = Math.min(r.mat.cols, Math.ceil(Math.max(...xs) + pad)) - x;
    const h = Math.min(r.mat.rows, Math.ceil(Math.max(...ys) + pad)) - y;
    const window = crop(cv, r, [x, y, w, h]);
    const fine = await predict(sam, window.rgb, window.width, window.height, seeds[i].map(([sx, sy]) => [sx - x, sy - y]));
    const mask = new cv.Mat(h, w, cv.CV_8U);
    const out: Uint8Array = mask.data;
    for (let k = 0; k < out.length; k++) out[k] = fine[k] ? 255 : 0;
    segmentations.push({ mask, offset: [x, y], threshold: 0, paper: [0, 0, 0] });
  }
  return { segmentations, timing: { firstMs, secondMs: performance.now() - started } };
}
