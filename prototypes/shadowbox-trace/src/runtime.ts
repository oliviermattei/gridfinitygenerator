// PROTOTYPE JETABLE (#36) : ce que partagent les modèles (SlimSAM, BiRefNet, IS-Net) dans le navigateur.
// Poids et runtime servis par notre origine : aucune requête vers huggingface.co ni jsDelivr.
import { env } from "@huggingface/transformers";
import type { Cv, Rectified } from "./pipeline";

env.allowRemoteModels = false;
env.allowLocalModels = true;
env.localModelPath = "/models/";
// Même variante que celle que transformers.js irait chercher sur jsDelivr, mais chez nous.
const onnx = env.backends.onnx as { wasm: { wasmPaths: unknown } };
onnx.wasm.wasmPaths = { mjs: "/vendor/ort/ort-wasm-simd-threaded.asyncify.mjs", wasm: "/vendor/ort/ort-wasm-simd-threaded.asyncify.wasm" };

export type Dtype = "q8" | "fp16" | "fp32";
export type Device = "webgpu" | "wasm";

/** Fenêtre de l'image redressée en RGB, réduite si besoin à `maxSide` px de grand côté. */
export function crop(cv: Cv, r: Rectified, [x, y, w, h]: number[], maxSide = Infinity): { rgb: Uint8ClampedArray; width: number; height: number; scale: number } {
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
