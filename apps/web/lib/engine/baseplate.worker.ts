// Runs the geometry engine (and its manifold-3d WASM) off the main thread.
import { generateBaseplate, generateTestKit, loadEngine, serialize3mf, serializeStl } from "@repo/geometry";
import { exportName } from "../export-file";
import type { EngineRequest, EngineResponse, EngineWarmUp } from "./protocol";

// The app compiles against the DOM lib: describe the few worker globals used here.
interface WorkerScope {
  postMessage(message: EngineResponse, transfer: Transferable[]): void;
  onmessage: ((event: MessageEvent<EngineRequest | EngineWarmUp>) => void) | null;
}

const scope = self as unknown as WorkerScope;

function reply(response: EngineResponse, transfer: Transferable[] = []) {
  scope.postMessage(response, transfer);
}

scope.onmessage = async ({ data: request }: MessageEvent<EngineRequest | EngineWarmUp>) => {
  if (request.type === "warm-up") {
    // A failure here resurfaces, with its reason, on the first real request.
    await loadEngine().catch(() => undefined);
    return;
  }
  try {
    if (request.type === "generate") {
      const baseplate = await generateBaseplate(request.settings, request.quality);
      const { positions, indices } = baseplate.mesh;
      reply({ id: request.id, type: "baseplate", baseplate }, [positions.buffer, indices.buffer]);
    } else {
      // Always the final quality: the exported mesh is the one the statistics measure.
      const generate = request.piece === "test-kit" ? generateTestKit : generateBaseplate;
      const { mesh, ...baseplate } = await generate(request.settings, "final");
      const name = exportName(request.piece, baseplate, request.settings);
      const start = performance.now();
      const bytes = request.format === "3mf" ? serialize3mf(mesh, { name, shareLink: request.link }) : serializeStl(mesh);
      const serializeMs = performance.now() - start;
      const triangles = mesh.indices.length / 3;
      reply({ id: request.id, type: "export", bytes, name, baseplate, triangles, serializeMs }, [bytes.buffer]);
    }
  } catch (error) {
    reply({ id: request.id, type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
