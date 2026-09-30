// Runs the geometry engine (and its manifold-3d WASM) off the main thread.
import {
  generateBaseplate,
  generateClip,
  generateTestKit,
  loadEngine,
  printClips,
  printPieces,
  printStacks,
  serialize3mf,
  serializeStl,
  stackPlanOf,
  stackRuleOf,
  zipFiles,
  type TriangleMesh,
} from "@repo/geometry";
import { clipExportName, exportName } from "../export-file";
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
      const clipsVolumes: number[] = [];
      let triangles = 0;
      for (const { settings, bare } of request.comparisons) {
        const { stats, mesh } = await generateBaseplate(settings, "final", { buildPlate: request.buildPlate, margin: !bare });
        volumes.push(stats.volume as number);
        clipsVolumes.push(stats.clipsVolume as number);
        triangles = Math.max(triangles, mesh.indices.length / 3);
      }
      reply({ id: request.id, type: "volumes", volumes, clipsVolumes, triangles });
    } else if (request.piece === "clip") {
      // A single clip, always an STL: the one the export of a cut baseplate holds.
      const start = performance.now();
      const clip = await generateClip(request.settings);
      const bytes = serializeStl(clip);
      const serializeMs = performance.now() - start;
      const name = clipExportName(request.settings);
      reply({ id: request.id, type: "export", bytes, name, extension: "stl", baseplate: null, triangles: clip.indices.length / 3, serializeMs, stacks: 0 }, [bytes.buffer]);
    } else {
      // Always the final quality: the exported mesh is the one the statistics measure.
      const generated =
        request.piece === "test-kit"
          ? await generateTestKit(request.settings, "final")
          : await generateBaseplate(request.settings, "final", { buildPlate: request.buildPlate });
      const { mesh, ...baseplate } = generated;
      // Stacked (#28) when asked and when the baseplate allows it: several pieces, a margin
      // held upside down, a type that prints upside down.
      const stacked = request.piece === "baseplate" && request.stack !== null && stackRuleOf(request.settings, baseplate.layout).blockers.length === 0;
      const name = exportName(request.piece, baseplate, request.settings, stacked);
      const start = performance.now();
      let bytes: Uint8Array;
      let extension: FileExtension = request.format;
      let stacks = 0;
      if (baseplate.pieces.length <= 1) {
        bytes = request.format === "3mf" ? serialize3mf(mesh, { name, shareLink: request.link }) : serializeStl(mesh);
      } else {
        // The pieces, each its own object, or the stacks, each an object of a shell per piece.
        let parts: { mesh: TriangleMesh; name: string; file: string }[];
        if (stacked && request.stack) {
          const plan = stackPlanOf(baseplate.layout, baseplate.stats.dimensions.height, request.settings.layerHeight);
          const printed = await printStacks(generated, plan, { ...request.stack, layerHeight: request.settings.layerHeight, lineWidth: request.settings.lineWidth });
          stacks = printed.length;
          parts = printed.map(({ mesh: stackMesh, pieces }, index) => ({
            mesh: stackMesh,
            name: request.stackName.replace("{n}", String(index + 1)).replace("{pieces}", pieces.join(", ")),
            file: `${name}-${index + 1}.stl`,
          }));
        } else {
          parts = printPieces(generated).map((pieceMesh, index) => {
            const number = String(baseplate.pieces[index]?.number ?? index + 1);
            return { mesh: pieceMesh, name: request.pieceName.replace("{n}", number), file: `${name}-piece-${number}.stl` };
          });
        }
        // The clips, as many as the cuts take, beside the pieces (never stacked).
        const clips = printClips(generated, parts.map((part) => part.mesh));
        const count = String(baseplate.stats.clips);
        if (request.format === "3mf") {
          // One 3MF, one named object per piece (or stack), laid out apart from each other, and one for the clips.
          const objects = parts.map(({ mesh: partMesh, name: partName }) => ({ mesh: partMesh, name: partName }));
          if (clips) objects.push({ mesh: clips, name: request.clipName.replace("{n}", count) });
          bytes = serialize3mf(objects, { name, shareLink: request.link });
        } else {
          // STL has no named objects: a zip of one file per piece (or stack), and one for the clips.
          const files = parts.map(({ mesh: partMesh, file }) => [file, serializeStl(partMesh)] as [string, Uint8Array]);
          if (clips) files.push([`${name}-clip-x${count}.stl`, serializeStl(clips)]);
          bytes = zipFiles(files);
          extension = "zip";
        }
      }
      const serializeMs = performance.now() - start;
      const triangles = mesh.indices.length / 3;
      reply({ id: request.id, type: "export", bytes, name, extension, baseplate, triangles, serializeMs, stacks }, [bytes.buffer]);
    }
  } catch (error) {
    reply({ id: request.id, type: "error", message: error instanceof Error ? error.message : String(error) });
  }
};
