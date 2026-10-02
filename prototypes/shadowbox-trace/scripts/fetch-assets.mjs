// PROTOTYPE JETABLE (#36) : dépose sous public/ tout ce que la page charge, pour qu'elle ne
// contacte aucun tiers (ni huggingface.co, ni jsDelivr) : OpenCV.js, SlimSAM-77, runtime WASM d'ORT.
// Lancer une fois : pnpm assets
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath, pas .pathname : sous Windows ce dernier donne "/E:/…", que join change en "E:\E:\…".
const root = fileURLToPath(new URL("../public/", import.meta.url));

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

const variants = (names, suffixes) => names.flatMap((name) => suffixes.map((suffix) => `onnx/${name}${suffix}.onnx`));
// Révisions épinglées : sha lus sur huggingface.co (SlimSAM : note de recherche, H1).
const MODELS = [
  { model: "Xenova/slimsam-77-uniform", revision: "5850ab4", onnx: variants(["vision_encoder", "prompt_encoder_mask_decoder"], ["", "_fp16", "_quantized"]) },
  { model: "onnx-community/BiRefNet_lite-ONNX", revision: "de15b22ba131738a16dff04aab8bdf8dc32e3ac1", onnx: variants(["model"], ["", "_fp16"]) },
  // Étiqueté AGPL-3.0 sur huggingface.co : bon pour ce banc, à trancher avant tout usage dans le site (MIT).
  { model: "onnx-community/ISNet-ONNX", revision: "3fe6e3db3e32c69aadde61fe388ddb1a0574440c", onnx: variants(["model"], ["", "_fp16", "_quantized"]) },
];
for (const { model, revision, onnx } of MODELS) {
  for (const file of ["config.json", "preprocessor_config.json", ...onnx]) {
    await download(`https://huggingface.co/${model}/resolve/${revision}/${file}`, join(root, "models", model, file));
  }
}

// Le runtime WASM qu'attend transformers.js est celui de sa propre dépendance onnxruntime-web.
const require = createRequire(createRequire(import.meta.url).resolve("@huggingface/transformers"));
const ortDist = dirname(require.resolve("onnxruntime-web"));
mkdirSync(join(root, "vendor/ort"), { recursive: true });
for (const file of readdirSync(ortDist).filter((name) => name.startsWith("ort-wasm-simd-threaded"))) {
  copyFileSync(join(ortDist, file), join(root, "vendor/ort", file));
}
console.log(`runtime ORT copié depuis ${ortDist}`);
