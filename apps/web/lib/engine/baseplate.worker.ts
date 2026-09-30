// Runs the geometry engine (and its manifold-3d WASM) off the main thread.
import { generateBaseplate, generateTestKit, loadEngine, printPieces, serialize3mf, serializeStl, zipFiles } from "@repo/geometry";
import { exportName } from "../export-file";
import type { EngineRequest, EngineResponse, EngineWarmUp, FileExtension } from "./protocol";

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
      const baseplate = await generateBaseplate(request.settings, request.quality, { buildPlate: request.buildPlate });
      const { positions, indices } = baseplate.mesh;
      reply({ id: request.id, type: "baseplate", baseplate }, [positions.buffer, indices.buffer]);
    } else {
      // Always the final quality: the exported mesh is the one the statistics measure.
      const generated =
        request.piece === "test-kit"
          ? await generateTestKit(request.settings, "final")
          : await generateBaseplate(request.settings, "final", { buildPlate: request.buildPlate });
      const { mesh, ...baseplate } = generated;
      const name = exportName(request.piece, baseplate, request.settings);
      const start = performance.now();
      let bytes: Uint8Array;
      let extension: FileExtension = request.format;
      if (baseplate.pieces.length <= 1) {
        bytes = request.format === "3mf" ? serialize3mf(mesh, { name, shareLink: request.link }) : serializeStl(mesh);
      } else if (request.format === "3mf") {
        // One 3MF, one named object per piece, laid out apart from each other.
        const objects = printPieces(generated).map((pieceMesh, index) => ({
          mesh: pieceMesh,
          name: request.pieceName.replace("{n}", String(baseplate.pieces[index]?.number ?? index + 1)),
        }));
        bytes = serialize3mf(objects, { name, shareLink: request.link });
      } else {
        // STL has no named objects: a zip of one file per piece.
        const files = printPieces(generated).map(
          (pieceMesh, index) => [`${name}-piece-${baseplate.pieces[index]?.number ?? index + 1}.stl`, serializeStl(pieceMesh)] as [string, Uint8Array],
        );
        bytes = zipFiles(files);
        extension = "zip";
      }
      const serializeMs = performance.now() - start;
      const triangles = mesh.indices.length / 3;
      reply({ id: request.id, type: "export", bytes, name, extension, baseplate, triangles, serializeMs }, [bytes.buffer]);
    }
  } catch (error) {
    reply({ id: request.id, type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
