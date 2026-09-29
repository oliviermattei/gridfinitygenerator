// Runs the geometry engine (and its manifold-3d WASM) off the main thread.
import { generateBaseplate, serializeStl } from "@repo/geometry";
import type { EngineRequest, EngineResponse } from "./protocol";

// The app compiles against the DOM lib: describe the few worker globals used here.
interface WorkerScope {
  postMessage(message: EngineResponse, transfer: Transferable[]): void;
  onmessage: ((event: MessageEvent<EngineRequest>) => void) | null;
}

const scope = self as unknown as WorkerScope;

function reply(response: EngineResponse, transfer: Transferable[] = []) {
  scope.postMessage(response, transfer);
}

scope.onmessage = async ({ data: request }: MessageEvent<EngineRequest>) => {
  try {
    if (request.type === "generate") {
      const baseplate = await generateBaseplate(request.settings, request.quality);
      const { positions, indices } = baseplate.mesh;
      reply({ id: request.id, type: "baseplate", baseplate }, [positions.buffer, indices.buffer]);
    } else {
      const { mesh, ...baseplate } = await generateBaseplate(request.settings, "final");
      const bytes = serializeStl(mesh);
      reply({ id: request.id, type: "stl", bytes, baseplate }, [bytes.buffer]);
    }
  } catch (error) {
    reply({ id: request.id, type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
