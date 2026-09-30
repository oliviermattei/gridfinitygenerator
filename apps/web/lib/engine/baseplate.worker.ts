// Runs the geometry engine (and its manifold-3d WASM) off the main thread.
import { generateBaseplate, generateTestKit, loadEngine, printClips, printPieces, serialize3mf, serializeStl, zipFiles } from "@repo/geometry";
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
    } else if (request.type === "volumes") {
      const volumes: number[] = [];
      let triangles = 0;
      for (const settings of request.settings) {
        const { stats, mesh } = await generateBaseplate(settings, "final", { buildPlate: request.buildPlate });
        volumes.push(stats.volume as number);
        triangles = Math.max(triangles, mesh.indices.length / 3);
      }
      reply({ id: request.id, type: "volumes", volumes, triangles });
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
      } else {
        const pieces = printPieces(generated);
        // The clips, as many as the cuts take, beside the pieces.
        const clips = printClips(generated, pieces);
        const count = String(baseplate.stats.clips);
        if (request.format === "3mf") {
          // One 3MF, one named object per piece, laid out apart from each other, and one for the clips.
          const objects = pieces.map((pieceMesh, index) => ({
            mesh: pieceMesh,
            name: request.pieceName.replace("{n}", String(baseplate.pieces[index]?.number ?? index + 1)),
          }));
          if (clips) objects.push({ mesh: clips, name: request.clipName.replace("{n}", count) });
          bytes = serialize3mf(objects, { name, shareLink: request.link });
        } else {
          // STL has no named objects: a zip of one file per piece, and one for the clips.
          const files = pieces.map(
            (pieceMesh, index) => [`${name}-piece-${baseplate.pieces[index]?.number ?? index + 1}.stl`, serializeStl(pieceMesh)] as [string, Uint8Array],
          );
          if (clips) files.push([`${name}-clip-x${count}.stl`, serializeStl(clips)]);
          bytes = zipFiles(files);
          extension = "zip";
        }
      }
      const serializeMs = performance.now() - start;
      const triangles = mesh.indices.length / 3;
      reply({ id: request.id, type: "export", bytes, name, extension, baseplate, triangles, serializeMs }, [bytes.buffer]);
    }
  } catch (error) {
    reply({ id: request.id, type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
