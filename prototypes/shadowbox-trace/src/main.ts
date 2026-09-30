// PROTOTYPE JETABLE (#36) : la page. Photo -> coins -> redressement -> clic -> contour -> mesures ->
// gabarit STL. Tout tourne dans ce fil (pas de Web Worker : c'est jetable). L'état complet est
// affiché après chaque action, et la liste des origines contactées prouve l'absence de tiers.
import Module from "manifold-3d";
import type { CrossSection, ManifoldToplevel } from "manifold-3d";
import { detectSheet, maskToPolygons, rectify, refineEdge, segmentClassical, SHEETS, toMm, toPx, type Cv, type Point, type Rectified, type Segmentation } from "./pipeline";
import { measure, outlineOf, pocketBlock, toStl, type Measure } from "./pocket";
import { loadSam, segmentSam, type Device, type Dtype } from "./sam";

const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;
const fr = (value: number, digits = 2) => value.toFixed(digits).replace(".", ",");

interface Row {
  method: string;
  conditions: string;
  found: Measure;
  caliper: [number, number] | null;
  parallaxMm: number;
  ms: number;
}

const state = {
  cv: null as Cv,
  wasm: null as ManifoldToplevel | null,
  photo: null as Cv,
  photoName: "",
  corners: null as Point[] | null,
  rectified: null as Rectified | null,
  click: null as Point | null,
  polygons: null as Point[][] | null,
  outline: null as CrossSection | null,
  measure: null as Measure | null,
  parallaxMm: 0,
  method: "",
  timing: "",
  message: "",
  log: [] as Row[],
};

function showState() {
  const r = state.rectified;
  const m = state.measure;
  $("state").textContent = [
    state.message,
    `photo       : ${state.photo ? `${state.photoName}, ${state.photo.cols} × ${state.photo.rows} px` : "—"}`,
    `coins       : ${state.corners ? state.corners.map(([x, y]) => `(${x.toFixed(1)}, ${y.toFixed(1)})`).join(" ") : "—"}`,
    `redressée   : ${r ? `${r.mat.cols} × ${r.mat.rows} px à ${r.pxPerMm} px/mm, feuille ${r.widthMm} × ${r.heightMm} mm, centre optique (${fr(r.opticalCenterMm[0], 1)}, ${fr(r.opticalCenterMm[1], 1)}) mm` : "—"}`,
    `clic        : ${state.click ? `(${fr(state.click[0], 1)}, ${fr(state.click[1], 1)}) mm` : "—"}`,
    `méthode     : ${state.method || "—"} ${state.timing}`,
    `contour     : ${state.polygons ? `${state.polygons.length} anneau(x), ${state.polygons.reduce((s, p) => s + p.length, 0)} sommets` : "—"}`,
    `cotes       : ${m ? `L ${fr(m.length)} × l ${fr(m.width)} mm, aire ${fr(m.area, 0)} mm²` : "—"}`,
    `parallaxe   : ${m ? `jusqu'à +${fr(state.parallaxMm)} mm au bord le plus éloigné du centre optique (h = ${$("height").value} mm, d = ${$("distance").value} mm)` : "—"}`,
    `WebGPU      : ${"gpu" in navigator ? "disponible" : "absent (repli WASM)"} ; isolé (threads WASM) : ${crossOriginIsolated}`,
  ].join("\n");
  showNetwork();
}

function showNetwork() {
  const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  const byOrigin = new Map<string, { count: number; bytes: number }>();
  for (const e of [{ name: location.href, encodedBodySize: 0 } as PerformanceResourceTiming, ...entries]) {
    const origin = new URL(e.name, location.href).origin;
    const entry = byOrigin.get(origin) ?? { count: 0, bytes: 0 };
    entry.count++;
    entry.bytes += e.encodedBodySize || 0;
    byOrigin.set(origin, entry);
  }
  const foreign = [...byOrigin.keys()].filter((o) => o !== location.origin && !o.startsWith("blob:") && o !== "null");
  $("network").innerHTML =
    [...byOrigin].map(([origin, { count, bytes }]) => `${origin} : ${count} requêtes, ${fr(bytes / 1e6, 1)} Mo`).join("\n") +
    `\n<span class="${foreign.length ? "warn" : "ok"}">${foreign.length ? `Tiers contactés : ${foreign.join(", ")}` : "Aucun tiers contacté."}</span>`;
}

/** Enveloppé : le module Emscripten a un `then`, le renvoyer tel quel d'une fonction async boucle sans fin. */
async function loadOpenCv(): Promise<{ cv: Cv }> {
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/vendor/opencv.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("opencv.js introuvable : lancer `pnpm assets`"));
    document.head.append(script);
  });
  let cv = (window as unknown as { cv: Cv }).cv;
  if (cv instanceof Promise) cv = await cv;
  if (!cv.Mat) await new Promise((resolve) => (cv.onRuntimeInitialized = resolve));
  return { cv };
}

// --- 1. Photo et coins -------------------------------------------------------------------------

const photoCanvas = $<HTMLCanvasElement>("photo");
const rectifiedCanvas = $<HTMLCanvasElement>("rectified");

function drawPhoto() {
  if (!state.photo) return;
  state.cv.imshow(photoCanvas, state.photo);
  const ctx = photoCanvas.getContext("2d")!;
  const scale = photoCanvas.width / photoCanvas.getBoundingClientRect().width || 1;
  if (!state.corners) return;
  ctx.strokeStyle = "#1a7f37";
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  state.corners.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = "#1a7f37";
  for (const [x, y] of state.corners) ctx.fillRect(x - 6 * scale, y - 6 * scale, 12 * scale, 12 * scale);
}

$("file").addEventListener("change", async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  state.photo?.delete();
  state.photo = state.cv.matFromImageData(ctx.getImageData(0, 0, bitmap.width, bitmap.height));
  state.photoName = file.name;
  const started = performance.now();
  state.corners = detectSheet(state.cv, state.photo);
  state.message = state.corners ? `Coins détectés en ${fr(performance.now() - started, 0)} ms.` : "Feuille non trouvée : placer les 4 coins à la main.";
  state.corners ??= [[100, 100], [bitmap.width - 100, 100], [bitmap.width - 100, bitmap.height - 100], [100, bitmap.height - 100]];
  drawPhoto();
  doRectify();
});

let dragging = -1;
const photoPoint = (event: PointerEvent): Point => {
  const box = photoCanvas.getBoundingClientRect();
  const scale = photoCanvas.width / box.width;
  return [(event.clientX - box.left) * scale, (event.clientY - box.top) * scale];
};
photoCanvas.addEventListener("pointerdown", (event) => {
  if (!state.corners) return;
  const [x, y] = photoPoint(event);
  const scale = photoCanvas.width / photoCanvas.getBoundingClientRect().width;
  dragging = state.corners.findIndex(([cx, cy]) => Math.hypot(cx - x, cy - y) < 25 * scale);
  if (dragging >= 0) photoCanvas.setPointerCapture(event.pointerId);
});
photoCanvas.addEventListener("pointermove", (event) => {
  if (dragging < 0 || !state.corners) return;
  state.corners[dragging] = photoPoint(event);
  drawPhoto();
});
photoCanvas.addEventListener("pointerup", () => {
  if (dragging >= 0) doRectify();
  dragging = -1;
});

// --- 2. Redressement ---------------------------------------------------------------------------

function sheetSize() {
  const key = $<HTMLSelectElement>("sheet").value;
  if (key !== "custom") return SHEETS[key];
  const [a, b] = [Number($("sheetW").value), Number($("sheetH").value)];
  return { width: Math.min(a, b), height: Math.max(a, b) };
}
$("sheet").addEventListener("change", () => {
  const s = sheetSize();
  $("sheetW").value = String(s.width);
  $("sheetH").value = String(s.height);
  doRectify();
});
$("rectify").addEventListener("click", () => doRectify());

function doRectify() {
  if (!state.photo || !state.corners) return;
  state.rectified?.mat.delete();
  const started = performance.now();
  state.rectified = rectify(state.cv, state.photo, state.corners, sheetSize());
  state.message = `Redressée en ${fr(performance.now() - started, 0)} ms. Cliquer sur un outil.`;
  resetTrace();
  drawRectified();
  showState();
}

function resetTrace() {
  state.outline?.delete();
  [state.outline, state.polygons, state.measure, state.click] = [null, null, null, null];
}

function drawRectified() {
  const r = state.rectified;
  if (!r) return;
  state.cv.imshow(rectifiedCanvas, r.mat);
  const ctx = rectifiedCanvas.getContext("2d")!;
  const px = (p: Point) => toPx(r, p);
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#1a7f3780";
  ctx.strokeRect(...px([0, 0]), r.widthMm * r.pxPerMm, r.heightMm * r.pxPerMm);
  const [ox, oy] = px(r.opticalCenterMm);
  ctx.strokeStyle = "#b35900";
  ctx.beginPath();
  ctx.moveTo(ox - 30, oy);
  ctx.lineTo(ox + 30, oy);
  ctx.moveTo(ox, oy - 30);
  ctx.lineTo(ox, oy + 30);
  ctx.stroke();
  if (state.polygons) {
    ctx.strokeStyle = "#00e05a";
    ctx.lineWidth = 3;
    for (const ring of state.polygons) {
      ctx.beginPath();
      ring.forEach((p, i) => (i ? ctx.lineTo(...px(p)) : ctx.moveTo(...px(p))));
      ctx.closePath();
      ctx.stroke();
    }
  }
  if (state.click) {
    const [cx, cy] = px(state.click);
    ctx.fillStyle = "#e0005a";
    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, 2 * Math.PI);
    ctx.fill();
  }
}

// --- 3. Tracé ----------------------------------------------------------------------------------

rectifiedCanvas.addEventListener("click", async (event) => {
  const r = state.rectified;
  if (!r) return;
  const box = rectifiedCanvas.getBoundingClientRect();
  const scale = rectifiedCanvas.width / box.width;
  const click = toMm(r, [(event.clientX - box.left) * scale, (event.clientY - box.top) * scale]);
  resetTrace();
  state.click = click;
  const method = $<HTMLSelectElement>("method").value;
  const started = performance.now();
  let segmentation: Segmentation | null = null;
  try {
    if (method === "classical") {
      const manual = $("threshold").value;
      segmentation = segmentClassical(state.cv, r, click, { threshold: manual ? Number(manual) : null });
      state.method = `classique, seuil ${segmentation?.threshold ?? "—"}`;
      state.timing = "";
    } else {
      let device = $<HTMLSelectElement>("device").value as Device;
      if (device === "webgpu" && !("gpu" in navigator)) device = "wasm";
      state.message = "Chargement de SlimSAM (servi par cette origine)…";
      showState();
      const sam = await loadSam($<HTMLSelectElement>("dtype").value as Dtype, device);
      const { segmentation: rough, timing } = await segmentSam(state.cv, sam, r, click);
      segmentation = rough;
      if (rough && method === "sam-refined") {
        segmentation = refineEdge(state.cv, r, rough, click);
        rough.mask.delete();
      }
      state.method = `SlimSAM ${sam.dtype} sur ${sam.device}${method === "sam-refined" ? " + bord recalé" : ""}`;
      state.timing = `(chargement ${fr(sam.loadMs, 0)} ms, passe 1 ${fr(timing.firstMs, 0)} ms, passe 2 ${fr(timing.secondMs, 0)} ms)`;
    }
  } catch (error) {
    state.message = `Erreur : ${(error as Error).message}`;
    console.error(error);
  }
  if (!segmentation) {
    state.message ||= "Aucun objet sous le clic.";
    drawRectified();
    showState();
    return;
  }
  state.polygons = maskToPolygons(state.cv, r, segmentation);
  segmentation.mask.delete();
  state.outline = outlineOf(state.wasm!, state.polygons, 0.5 / r.pxPerMm);
  state.measure = measure(state.outline);
  state.parallaxMm = parallax();
  const ms = performance.now() - started;
  state.message = `Tracé en ${fr(ms, 0)} ms.`;
  lastMs = ms;
  drawRectified();
  showState();
});
let lastMs = 0;

/** Parallaxe Δ = r·h/(d−h) au point du contour le plus éloigné du centre optique. */
function parallax(): number {
  const r = state.rectified;
  if (!r || !state.polygons) return 0;
  const [cx, cy] = r.opticalCenterMm;
  const far = Math.max(...state.polygons.flat().map(([x, y]) => Math.hypot(x - cx, y - cy)));
  const h = Number($("height").value);
  const d = Number($("distance").value);
  return (far * h) / (d - h);
}
for (const id of ["height", "distance"])
  $(id).addEventListener("input", () => {
    state.parallaxMm = parallax();
    showState();
  });

// --- 4. Tableau des mesures ----------------------------------------------------------------------

$("record").addEventListener("click", () => {
  if (!state.measure) return;
  const [l, w] = [Number($("caliperL").value), Number($("caliperW").value)];
  state.log.push({ method: state.method, conditions: $("conditions").value, found: state.measure, caliper: l && w ? [l, w] : null, parallaxMm: state.parallaxMm, ms: lastMs });
  renderLog();
});

function rows(): string[][] {
  return state.log.map((row, i) => [
    String(i + 1),
    row.method,
    row.conditions,
    fr(row.found.length),
    fr(row.found.width),
    row.caliper ? fr(row.caliper[0]) : "—",
    row.caliper ? fr(row.caliper[1]) : "—",
    row.caliper ? fr(row.found.length - row.caliper[0]) : "—",
    row.caliper ? fr(row.found.width - row.caliper[1]) : "—",
    `+${fr(row.parallaxMm)}`,
    `${fr(row.ms, 0)} ms`,
  ]);
}
function renderLog() {
  $("log").querySelector("tbody")!.innerHTML = rows()
    .map((cells) => `<tr>${cells.map((c) => `<td>${c.replace(/</g, "&lt;")}</td>`).join("")}</tr>`)
    .join("");
}
$("copy").addEventListener("click", async () => {
  const head = ["#", "Méthode", "Conditions", "L trouvée", "l trouvée", "L pied", "l pied", "ΔL", "Δl", "Parallaxe estimée", "Temps"];
  const md = [head, head.map(() => "---"), ...rows()].map((cells) => `| ${cells.join(" | ")} |`).join("\n");
  await navigator.clipboard.writeText(md);
  state.message = "Tableau copié.";
  showState();
});

// --- 5. Gabarit ----------------------------------------------------------------------------------

$("stl").addEventListener("click", () => {
  if (!state.outline || !state.wasm) return;
  const options = { clearance: Number($("clearance").value), wall: Number($("wall").value), depth: Number($("depth").value), floor: Number($("floor").value) };
  const plate = pocketBlock(state.wasm, state.outline, options);
  const blob = new Blob([toStl(plate)], { type: "model/stl" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `gabarit-${state.log.length + 1}-jeu-${options.clearance}.stl`;
  link.click();
  state.message = `Gabarit : ${plate.status()}, ${fr(plate.volume() / 1000, 2)} cm³.`;
  plate.delete();
  showState();
});

// --- Démarrage ---------------------------------------------------------------------------------

state.cv = (await loadOpenCv()).cv;
const wasm = await Module();
wasm.setup();
state.wasm = wasm;
state.message = "Prêt : choisir une photo d'outils posés sur une feuille.";
showState();
