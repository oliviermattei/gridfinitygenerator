// PROTOTYPE JETABLE (#36) : SlimSAM-77 dans le navigateur (transformers.js, WebGPU ou WASM).
// Poids et runtime servis par notre origine : aucune requête vers huggingface.co ni jsDelivr.
// SAM travaille à 1024 px et sort un masque de 256 px : en deux passes, la première sur toute la
// feuille trouve l'objet, la seconde sur une fenêtre recadrée autour de lui gagne la résolution.
import { AutoProcessor, env, RawImage, SamModel, type Processor, type PreTrainedModel, type Tensor } from "@huggingface/transformers";
import { toPx, type Cv, type Point, type Rectified, type Segmentation } from "./pipeline";

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = "/models/";
// Même variante que celle que transformers.js irait chercher sur jsDelivr, mais chez nous.
const onnx = env.backends.onnx as { wasm: { wasmPaths: unknown } };
onnx.wasm.wasmPaths = { mjs: "/vendor/ort/ort-wasm-simd-threaded.asyncify.mjs", wasm: "/vendor/ort/ort-wasm-simd-threaded.asyncify.wasm" };

const MODEL = "Xenova/slimsam-77-uniform";
export type Dtype = "q8" | "fp16" | "fp32";
export type Device = "webgpu" | "wasm";

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

/** Masque SAM (meilleur des 3 par score IoU) d'une fenêtre RGB, pour un clic dans la fenêtre. */
async function predict(sam: Sam, rgb: Uint8ClampedArray, width: number, height: number, click: Point): Promise<Uint8Array> {
  let t = performance.now();
  const step = (label: string) => {
    console.log(`[sam] ${label} ${Math.round(performance.now() - t)} ms (${width} × ${height})`);
    t = performance.now();
  };
  const image = new RawImage(rgb, width, height, 3);
  const inputs = await sam.processor(image, { input_points: [[[click[0], click[1]]]], input_labels: [[1]] });
  step("préparation");
  const outputs = (await sam.model(inputs)) as { pred_masks: Tensor; iou_scores: Tensor };
  step("encodeur + décodeur");
  const [masks] = (await (sam.processor as unknown as { post_process_masks: (...args: unknown[]) => Promise<Tensor[]> }).post_process_masks(
    outputs.pred_masks,
    inputs.original_sizes,
    inputs.reshaped_input_sizes,
  )) as Tensor[];
  step("masques");
  const scores = outputs.iou_scores.data as Float32Array;
  const best = scores.indexOf(Math.max(...scores));
  const size = width * height;
  return (masks.data as Uint8Array).slice(best * size, (best + 1) * size);
}

/** Fenêtre de l'image redressée en RGB, réduite si besoin à `maxSide` px de grand côté. */
function crop(cv: Cv, r: Rectified, [x, y, w, h]: number[], maxSide = Infinity): { rgb: Uint8ClampedArray; width: number; height: number; scale: number } {
  const roi = r.mat.roi(new cv.Rect(x, y, w, h));
  const rgb = new cv.Mat();
  cv.cvtColor(roi, rgb, cv.COLOR_RGBA2RGB);
  const scale = Math.min(1, maxSide / Math.max(w, h));
  if (scale < 1) cv.resize(rgb, rgb, new cv.Size(Math.round(w * scale), Math.round(h * scale)), 0, 0, cv.INTER_AREA);
  const out = { rgb: new Uint8ClampedArray(rgb.data), width: rgb.cols, height: rgb.rows, scale };
  roi.delete();
  rgb.delete();
  return out;
}

function bounds(mask: Uint8Array, width: number): [number, number, number, number] | null {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -1, -1];
  for (let i = 0; i < mask.length; i++)
    if (mask[i]) {
      const [x, y] = [i % width, Math.floor(i / width)];
      [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    }
  return x1 < 0 ? null : [x0, y0, x1 - x0 + 1, y1 - y0 + 1];
}

export interface SamTiming {
  firstMs: number;
  secondMs: number;
}

/** Deux passes SAM : feuille entière (trouver l'objet), puis fenêtre recadrée autour de lui (précision). */
export async function segmentSam(cv: Cv, sam: Sam, r: Rectified, clickMm: Point): Promise<{ segmentation: Segmentation | null; timing: SamTiming }> {
  const [cx, cy] = toPx(r, clickMm);
  const sheet = [0, 0, r.mat.cols, r.mat.rows];
  let started = performance.now();
  const whole = crop(cv, r, sheet, 1024);
  const rough = await predict(sam, whole.rgb, whole.width, whole.height, [cx * whole.scale, cy * whole.scale]);
  const firstMs = performance.now() - started;
  const box = bounds(rough, whole.width);
  if (!box) return { segmentation: null, timing: { firstMs, secondMs: 0 } };
  const pad = 5 * r.pxPerMm;
  const x = Math.max(0, Math.floor(box[0] / whole.scale - pad));
  const y = Math.max(0, Math.floor(box[1] / whole.scale - pad));
  const w = Math.min(r.mat.cols, Math.ceil((box[0] + box[2]) / whole.scale + pad)) - x;
  const h = Math.min(r.mat.rows, Math.ceil((box[1] + box[3]) / whole.scale + pad)) - y;
  started = performance.now();
  const window = crop(cv, r, [x, y, w, h]);
  const fine = await predict(sam, window.rgb, window.width, window.height, [cx - x, cy - y]);
  const secondMs = performance.now() - started;
  const mask = new cv.Mat(h, w, cv.CV_8U);
  const out: Uint8Array = mask.data;
  for (let i = 0; i < out.length; i++) out[i] = fine[i] ? 255 : 0;
  return { segmentation: { mask, offset: [x, y], threshold: 0, paper: [0, 0, 0] }, timing: { firstMs, secondMs } };
}
