// Runs the bin engine (and its manifold-3d WASM) off the main thread.
import { generateBin, loadEngine, serialize3mf, serializeStl } from "@repo/geometry";
import { binExportName } from "../export-file";
import type { BinEngineRequest, BinEngineResponse } from "./bin-protocol";

// The app compiles against the DOM lib: describe the few worker globals used here.
interface WorkerScope {
  postMessage(message: BinEngineResponse, transfer: Transferable[]): void;
  onmessage: ((event: MessageEvent<BinEngineRequest | { type: "warm-up" }>) => void) | null;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = async ({ data: request }) => {
  if (request.type === "warm-up") {
    // A failure here resurfaces, with its reason, on the first real request.
    await loadEngine().catch(() => undefined);
    return;
  }
  try {
    if (request.type === "generate") {
      const bin = await generateBin(request.settings, request.quality);
      const { positions, indices } = bin.mesh;
      scope.postMessage({ id: request.id, type: "bin", bin }, [positions.buffer, indices.buffer]);
    } else {
      // Always the final quality: the exported mesh is the one the statistics measure.
      const { mesh } = await generateBin(request.settings, "final");
      const name = binExportName(request.settings);
      const bytes = request.format === "3mf" ? serialize3mf(mesh, { name, shareLink: request.link }) : serializeStl(mesh);
      scope.postMessage({ id: request.id, type: "export", bytes, name }, [bytes.buffer as ArrayBuffer]);
    }
  } catch (error) {
    scope.postMessage({ id: request.id, type: "error", message: error instanceof Error ? error.message : String(error) }, []);
  }
};
