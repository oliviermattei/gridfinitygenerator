// PROTOTYPE JETABLE (#36) : lance la page dans un Chrome sans écran (Playwright), seule sur la machine,
// et affiche l'état et le tableau de chaque méthode. Sert à mesurer sans rien d'autre qui tourne.
// Il faut `pnpm dev` lancé, Chrome installé, et les dépendances de apps/web (Playwright y est déjà).
//   pnpm page                                        réglages par défaut, photo de synthèse du banc
//   pnpm page '{"samOn":false,"isnetDevice":"wasm"}' réglages : identifiant du champ -> valeur
//   pnpm page '{}' capture.png                       avec une capture d'écran
//   PHOTO=ma-photo.jpg pnpm page                     une autre photo
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../../../apps/web/package.json", import.meta.url));
const { chromium } = require("@playwright/test");

const settings = JSON.parse(process.argv[2] ?? "{}");
const shot = process.argv[3];
const photo = process.env.PHOTO ?? fileURLToPath(new URL("../files/synthetique-inclinee-30.png", import.meta.url));
const METHODS = ["classical", "sam", "sam-refined", "isnet", "birefnet"];

const browser = await chromium.launch({ channel: "chrome", args: ["--enable-unsafe-webgpu", "--enable-features=WebGPU"] });
const page = await browser.newPage({ viewport: { width: 1900, height: 1000 } });
const errors = [];
page.on("console", (message) => message.type() === "error" && errors.push(message.text().slice(0, 400)));
page.on("pageerror", (error) => errors.push(error.message.slice(0, 400)));

await page.goto("http://localhost:5179");
await page.waitForFunction(() => document.getElementById("state").textContent.startsWith("Prêt"), null, { timeout: 60_000 });
const gpu = await page.evaluate(async () => {
  const adapter = await navigator.gpu?.requestAdapter();
  return adapter ? `${adapter.info.vendor} ${adapter.info.architecture}` : "aucun";
});
console.log(`GPU : ${gpu}`);
for (const [id, value] of Object.entries(settings)) {
  await page.evaluate(
    ([id, value]) => {
      const element = document.getElementById(id);
      if (element.type === "checkbox") element.checked = value;
      else element.value = value;
    },
    [id, value],
  );
}
await page.setInputFiles("#file", photo);
// Fini quand plus aucun état ne se termine par « … ».
await page.waitForFunction(
  (methods) => methods.every((id) => /[^…]$/.test(document.querySelector(`#${id} .status`).textContent)),
  METHODS,
  { timeout: 600_000, polling: 500 },
);
for (const id of METHODS) {
  console.log(`\n== ${id} : ${await page.locator(`#${id} .status`).textContent()}`);
  const table = await page.locator(`#${id} table`).innerText();
  if (table) console.log(table);
}
console.log(`\n${(await page.locator("#network").innerText()).replace(/\n/g, " | ")}`);
if (errors.length) console.log(`\nErreurs de la console :\n${[...new Set(errors)].join("\n")}`);
if (shot) await page.screenshot({ path: shot });
await browser.close();
