// PROTOTYPE JETABLE (#36) : dépose sous public/ tout ce que la page charge, pour qu'elle ne
// contacte aucun tiers (ni huggingface.co, ni jsDelivr) : OpenCV.js, SlimSAM-77, runtime WASM d'ORT.
// Lancer une fois : pnpm assets
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const root = new URL("../public/", import.meta.url).pathname;

async function download(url, to) {
  if (existsSync(to)) return console.log(`déjà là  ${to}`);
  mkdirSync(dirname(to), { recursive: true });
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  writeFileSync(to, Buffer.from(await response.arrayBuffer()));
  console.log(`${(statSync(to).size / 1e6).toFixed(1).padStart(5)} Mo  ${to}`);
}

await download("https://docs.opencv.org/4.13.0/opencv.js", join(root, "vendor/opencv.js"));
// Le banc le charge sous Node avec require : script CommonJS dans un paquet "type": "module".
writeFileSync(join(root, "vendor/package.json"), '{ "type": "commonjs" }\n');

const MODEL = "Xenova/slimsam-77-uniform";
const REVISION = "5850ab4"; // sha lu dans la note de recherche (H1)
const files = [
  "config.json",
  "preprocessor_config.json",
  ...["vision_encoder", "prompt_encoder_mask_decoder"].flatMap((name) => ["", "_fp16", "_quantized"].map((suffix) => `onnx/${name}${suffix}.onnx`)),
];
for (const file of files) {
  await download(`https://huggingface.co/${MODEL}/resolve/${REVISION}/${file}`, join(root, "models", MODEL, file));
}

// Le runtime WASM qu'attend transformers.js est celui de sa propre dépendance onnxruntime-web.
const require = createRequire(createRequire(import.meta.url).resolve("@huggingface/transformers"));
const ortDist = dirname(require.resolve("onnxruntime-web"));
mkdirSync(join(root, "vendor/ort"), { recursive: true });
for (const file of readdirSync(ortDist).filter((name) => name.startsWith("ort-wasm-simd-threaded"))) {
  copyFileSync(join(ortDist, file), join(root, "vendor/ort", file));
}
console.log(`runtime ORT copié depuis ${ortDist}`);
