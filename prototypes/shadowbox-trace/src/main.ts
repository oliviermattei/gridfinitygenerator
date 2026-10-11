// PROTOTYPE JETABLE (#36) : la page. Photo -> coins -> redressement -> objets -> contour et cotes
// par chaque méthode, l'une après l'autre et sans clic : ce que ferait l'application finale. Tout
// tourne dans ce fil (pas de Web Worker : c'est jetable). La liste des origines contactées prouve
// l'absence de tiers.
import Module from "manifold-3d";
import type { ManifoldToplevel } from "manifold-3d";
import { detectClassical, detectSheet, forget, guessSheet, maskToPolygons, rectify, refineEdge, seedsOf, sheetRatio, SHEETS, toPx, type Cv, type Point, type Rectified, type Segmentation, type SheetSize } from "./pipeline";
import { measure, outlineOf, type Measure } from "./pocket";
import type { Device, Dtype } from "./runtime";
import { loadSaliency, segmentSaliency, unloadSaliency, type SaliencyKey } from "./saliency";
import { loadSam, segmentSam, unloadSam } from "./sam";

const $ = <T extends HTMLElement = HTMLInputElement>(id: string) => document.getElementById(id) as T;
const fr = (value: number, digits = 2) => value.toFixed(digits).replace(".", ",");
const signed = (value: number) => `${value < 0 ? "−" : "+"}${fr(Math.abs(value))}`;
/** Laisse la page se redessiner avant un calcul qui bloque le fil. */
const paint = () => new Promise((resolve) => setTimeout(resolve, 0));

type Method = "classical" | "sam" | "sam-refined" | SaliencyKey;
const METHODS: Method[] = ["classical", "sam", "sam-refined", "isnet", "birefnet"];
const COLORS = ["#00c853", "#ff3d71", "#2979ff", "#ffab00", "#aa00ff", "#00bcd4", "#ff6d00", "#c6ff00"];
/** Au-delà, la photo est du bruit plutôt que des outils, et SlimSAM y passerait des minutes. */
const MAX_OBJECTS = 30;

/** Un objet tracé : contour et rectangle des cotes en mm, dans le repère de l'image redressée. */
interface Traced {
  rings: Point[][];
  measure: Measure;
  threshold: number;
}

const state = {
  cv: null as Cv,
  wasm: null as ManifoldToplevel | null,
  photo: null as Cv,
  photoName: "",
  corners: null as Point[] | null,
  rectified: null as Rectified | null,
  message: "",
};

function showState() {
  const r = state.rectified;
  $("state").textContent = [
    state.message,
    `photo     : ${state.photo ? `${state.photoName}, ${state.photo.cols} × ${state.photo.rows} px` : "—"}`,
    `coins     : ${state.corners ? state.corners.map(([x, y]) => `(${x.toFixed(1)}, ${y.toFixed(1)})`).join(" ") : "—"}`,
    `redressée : ${r ? `${r.mat.cols} × ${r.mat.rows} px à ${r.pxPerMm} px/mm, feuille ${r.widthMm} × ${r.heightMm} mm` : "—"}`,
    `WebGPU    : ${"gpu" in navigator ? "disponible" : "absent (repli WASM)"} ; isolé (threads WASM) : ${crossOriginIsolated}`,
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
  const missing = new Error("opencv.js introuvable : lancer `pnpm assets`");
  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "/vendor/opencv.js";
    script.onload = () => resolve();
    script.onerror = () => reject(missing);
    document.head.append(script);
  });
  let cv = (window as unknown as { cv: Cv }).cv;
  // Fichier absent : Vite répond 200 avec index.html, donc `onerror` ne se déclenche pas.
  if (!cv) throw missing;
  if (cv instanceof Promise) cv = await cv;
  if (!cv.Mat) await new Promise((resolve) => (cv.onRuntimeInitialized = resolve));
  return { cv };
}

// --- Réglages ------------------------------------------------------------------------------------

/**
 * Cotes de la feuille : le format choisi, les cotes mesurées, ou en « auto » le format dont le rapport
 * de côtés est le plus proche de la feuille trouvée sur la photo. `note` dit ce qui a été reconnu.
 */
function sheetSize(): { size: SheetSize; note: string } {
  const key = $<HTMLSelectElement>("sheet").value;
  if (key === "custom") {
    const [a, b] = [Number($("sheetW").value), Number($("sheetH").value)];
    return { size: { width: Math.min(a, b), height: Math.max(a, b) }, note: "" };
  }
  if (key !== "auto" || !state.corners || !state.photo) return { size: SHEETS[key] ?? SHEETS.A4, note: "" };
  const { ratio, trusted } = sheetRatio(state.corners, state.photo.cols, state.photo.rows);
  const guess = guessSheet(ratio);
  const sure = trusted && Math.abs(guess.error) < 0.03;
  const doubt = " : INCERTAIN (photo trop penchée ou autre format), choisir le format à gauche";
  return { size: guess.sheet, note: ` Feuille ${guess.name} reconnue (rapport des côtés ${fr(ratio, 3)})${sure ? "" : doubt}.` };
}

function settings() {
  const number = (id: string) => Number($(id).value);
  const manual = $("threshold").value;
  /** Moteur et poids d'un modèle : repli WASM sans WebGPU ; « auto » = fp16 en WebGPU, fp32 en WASM. */
  const engine = (deviceId: string, dtypeId: string) => {
    let device = $<HTMLSelectElement>(deviceId).value as Device;
    if (device === "webgpu" && !("gpu" in navigator)) device = "wasm";
    // fp16 sur CPU (WASM) bloque plus de 10 min : fp32 y est plus rapide que le quantifié.
    const chosen = $<HTMLSelectElement>(dtypeId).value;
    return { device, dtype: (chosen === "auto" ? (device === "webgpu" ? "fp16" : "fp32") : chosen) as Dtype };
  };
  const saliency = (key: SaliencyKey) => ({
    on: $(`${key}On`).checked,
    ...engine(`${key}Device`, `${key}Dtype`),
    threshold: number(`${key}Threshold`),
    twoPasses: $(`${key}Two`).checked,
    padMm: number(`${key}Pad`),
  });
  return {
    classical: { threshold: manual ? Number(manual) : null, openMm: number("open"), closeMm: number("close"), minAreaMm2: number("minArea") },
    samOn: $("samOn").checked,
    refinedOn: $("refinedOn").checked,
    ...engine("device", "dtype"),
    seedCount: Math.max(1, Math.round(number("seedCount"))),
    padMm: number("pad"),
    bandMm: number("band"),
    birefnet: saliency("birefnet"),
    isnet: saliency("isnet"),
    toleranceMm: number("tolerance"),
    minHoleMm2: number("minHole"),
  };
}
type Settings = ReturnType<typeof settings>;

// --- Photo et coins ------------------------------------------------------------------------------

const photoCanvas = $<HTMLCanvasElement>("photo");

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
  request("rectify");
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
  if (dragging >= 0) request("rectify");
  dragging = -1;
});

// --- Panneau d'une méthode -------------------------------------------------------------------------

const panel = (method: Method) => ({
  status: $(method).querySelector<HTMLElement>(".status")!,
  canvas: $(method).querySelector("canvas")!,
  table: $(method).querySelector("table")!,
});

function setStatus(methods: Method[], text: string, warn = false) {
  for (const method of methods) {
    const { status } = panel(method);
    status.textContent = text;
    status.classList.toggle("warn", warn);
  }
}

/** Contour du masque et cotes, comme les prendrait la poche : demi-pixel compris. */
function trace(r: Rectified, segmentation: Segmentation | null, s: Settings): Traced | null {
  if (!segmentation) return null;
  const polygons = maskToPolygons(state.cv, r, segmentation, s.toleranceMm, s.minHoleMm2);
  if (!polygons.length) return null;
  const outline = outlineOf(state.wasm!, polygons, 0.5 / r.pxPerMm);
  // Le contour a y vers le haut (poche) : on le retourne pour le dessiner sur l'image.
  const flip = ([x, y]: Point): Point => [x, -y];
  const found = measure(outline);
  const traced = { rings: (outline.toPolygons() as Point[][]).map((ring) => ring.map(flip)), measure: { ...found, box: found.box.map(flip) }, threshold: segmentation.threshold };
  outline.delete();
  return traced.rings.length ? traced : null;
}

/** Dernier dessin de chaque panneau, pour le refaire à la bonne échelle quand on l'agrandit. */
const drawn = new Map<Method, [Rectified, Point[][], (Traced | null)[]]>();

/** L'image redressée, puis pour chaque objet : masque, contour, rectangle des cotes, cotes et amorces de SAM. */
function drawPanel(method: Method, r: Rectified, seeds: Point[][], objects: (Traced | null)[]) {
  drawn.set(method, [r, seeds, objects]);
  const { canvas } = panel(method);
  state.cv.imshow(canvas, r.mat);
  const ctx = canvas.getContext("2d")!;
  // Traits et textes à taille d'écran constante, que la colonne soit étroite ou l'image agrandie.
  const shown = canvas.getBoundingClientRect().width || 1000;
  const unit = canvas.width / shown;
  const px = (p: Point) => toPx(r, p);
  ctx.lineJoin = "round";
  ctx.font = `600 ${12 * unit}px system-ui, sans-serif`;
  objects.forEach((object, i) => {
    const color = COLORS[i % COLORS.length];
    if (object) {
      ctx.beginPath();
      for (const ring of object.rings) {
        ring.forEach((p, k) => (k ? ctx.lineTo(...px(p)) : ctx.moveTo(...px(p))));
        ctx.closePath();
      }
      ctx.fillStyle = `${color}66`;
      ctx.fill("evenodd");
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5 * unit;
      ctx.setLineDash([]);
      ctx.stroke();
      const box = object.measure.box.map(px);
      ctx.beginPath();
      box.forEach(([x, y], k) => (k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.lineWidth = unit;
      ctx.setLineDash([5 * unit, 4 * unit]);
      ctx.stroke();
      ctx.setLineDash([]);
      // Colonne étroite : le numéro seul, les cotes sont dans le tableau.
      const text = shown < 500 ? `${i + 1}` : `${i + 1} · ${fr(object.measure.length)} × ${fr(object.measure.width)} mm`;
      const width = ctx.measureText(text).width;
      const x = Math.min(Math.min(...box.map((p) => p[0])), canvas.width - width - 6 * unit);
      const y = Math.max(Math.min(...box.map((p) => p[1])) - 6 * unit, 16 * unit);
      ctx.fillStyle = "#000c";
      ctx.fillRect(x - 3 * unit, y - 12 * unit, width + 6 * unit, 16 * unit);
      ctx.fillStyle = "#fff";
      ctx.fillText(text, x, y);
    }
    for (const seed of seeds[i] ?? []) {
      ctx.beginPath();
      ctx.arc(...px(seed), 2.5 * unit, 0, 2 * Math.PI);
      ctx.fillStyle = object ? "#fff" : "#e0005a";
      ctx.fill();
    }
  });
}

/** Tableau des cotes ; `reference` (la classique) ajoute l'écart à chaque cote. */
function drawTable(method: Method, objects: (Traced | null)[], reference: (Traced | null)[] | null) {
  const cell = (value: number, base: number | undefined, digits = 2) => `${fr(value, digits)}${base === undefined ? "" : ` <small>(${signed(value - base)})</small>`}`;
  const head = ["#", "L (mm)", "l (mm)", "Aire (mm²)", ...(reference ? [] : ["Seuil"])];
  const rows = objects.map((object, i) => {
    const name = `<span class="swatch" style="background:${COLORS[i % COLORS.length]}"></span>${i + 1}`;
    if (!object) return `<tr><td>${name}</td><td colspan="${head.length - 1}">aucun masque</td></tr>`;
    const base = reference?.[i]?.measure;
    const cells = [name, cell(object.measure.length, base?.length), cell(object.measure.width, base?.width), fr(object.measure.area, 0), ...(reference ? [] : [String(object.threshold)])];
    return `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
  });
  panel(method).table.innerHTML = objects.length ? `<thead><tr>${head.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody>` : "";
}

for (const method of METHODS)
  panel(method).canvas.addEventListener("click", () => {
    $(method).classList.toggle("zoom");
    const last = drawn.get(method);
    if (last) drawPanel(method, ...last);
  });

// --- Calcul ----------------------------------------------------------------------------------------

function doRectify() {
  if (!state.photo || !state.corners) return;
  state.rectified?.mat.delete();
  const started = performance.now();
  const { size, note } = sheetSize();
  state.rectified = rectify(state.cv, state.photo, state.corners, size);
  state.message = `Redressée en ${fr(performance.now() - started, 0)} ms.${note}`;
  showState();
}

/**
 * Bac à sable d'une méthode : aucun modèle en mémoire, et une image redressée à elle (les mêmes
 * pixels, mais rien de ce qu'une autre méthode y a calculé : modèle du papier, objets, seuils). Elle
 * refait donc tout son travail, et ce qu'elle a calculé est oublié à la sortie.
 */
async function sandbox(r: Rectified, run: (own: Rectified) => Promise<unknown> | unknown) {
  await unloadSam();
  await unloadSaliency();
  const own = { ...r };
  try {
    await run(own);
  } finally {
    forget(own);
  }
}

/**
 * Toutes les méthodes sur l'image redressée, l'une après l'autre, chacune seule sur la machine et
 * dans son bac à sable : ses résultats et ses temps ne doivent rien à une autre. Seul l'affichage
 * compare : numéros et couleurs suivent les objets de la classique, et les tableaux donnent l'écart
 * à ses cotes.
 */
async function analyse() {
  const r = state.rectified;
  if (!r) return;
  const s = settings();
  for (const method of METHODS) {
    drawPanel(method, r, [], []);
    drawTable(method, [], null);
  }
  setStatus(METHODS, "En attente…");

  let classical: (Traced | null)[] = [];
  let hearts: Point[] = [];
  setStatus(["classical"], "Calcul…");
  await paint();
  await sandbox(r, (own) => {
    const started = performance.now();
    const found = detectClassical(state.cv, own, s.classical);
    const objects = found.slice(0, MAX_OBJECTS);
    classical = objects.map((object) => trace(own, object, s));
    const ms = performance.now() - started;
    hearts = objects.map((object) => seedsOf(state.cv, own, object)[0]);
    found.forEach((object) => object.mask.delete());
    drawPanel("classical", r, [], classical);
    drawTable("classical", classical, null);
    const count = found.length > MAX_OBJECTS ? `${MAX_OBJECTS} objets gardés sur ${found.length} : monter le seuil ou la surface minimale` : `${objects.length} objet(s)`;
    setStatus(["classical"], objects.length ? `${count}, ${fr(ms, 0)} ms.` : "Aucun objet trouvé sur la feuille.", found.length > MAX_OBJECTS || !objects.length);
  });

  for (const method of ["sam", "sam-refined"] as const) if (!wanted) await runSam(method, r, s, classical);
  // BiRefNet en dernier : son échec (mémoire) ne doit rien coûter aux autres.
  for (const key of ["isnet", "birefnet"] as const) if (!wanted) await runSaliency(key, r, s, hearts, classical);
  showNetwork();
}

/**
 * SlimSAM seul (`sam`) ou suivi du recalage du bord (`sam-refined`). SAM ne trouve pas les objets :
 * la méthode commence par sa propre détection (celle de la chaîne classique, refaite ici et comptée
 * dans son temps) pour poser ses points d'amorce, puis charge son propre modèle.
 */
async function runSam(method: "sam" | "sam-refined", r: Rectified, s: Settings, classical: (Traced | null)[]) {
  if (!(method === "sam" ? s.samOn : s.refinedOn)) return setStatus([method], "Désactivé.");
  await sandbox(r, async (own) => {
    let masks: (Segmentation | null)[] = [];
    try {
      setStatus([method], `Chargement de SlimSAM ${s.dtype} sur ${s.device}…`);
      await paint();
      const sam = await loadSam(s.dtype, s.device);
      if (wanted) return;
      setStatus([method], "Amorces : objets de la feuille…");
      await paint();
      const started = performance.now();
      const found = detectClassical(state.cv, own, s.classical);
      const seeds = found.slice(0, MAX_OBJECTS).map((object) => seedsOf(state.cv, own, object, s.seedCount));
      found.forEach((object) => object.mask.delete());
      let timing = `amorces ${fr(performance.now() - started, 0)} ms`;
      if (!seeds.length) return setStatus([method], "Aucun objet à amorcer : la détection qui précède SlimSAM n'a rien trouvé sur la feuille.", true);
      setStatus([method], "Passe 1 : feuille entière…");
      await paint();
      const result = await segmentSam(state.cv, sam, own, seeds, s.padMm, (i) => {
        setStatus([method], `Passe 2 : objet ${i + 1} sur ${seeds.length}…`);
        return !wanted;
      });
      masks = result.segmentations;
      if (wanted) return;
      timing += `, passe 1 ${fr(result.timing.firstMs, 0)} ms, passe 2 ${fr(result.timing.secondMs, 0)} ms`;
      if (method === "sam-refined") {
        setStatus([method], "Recalage du bord…");
        await paint();
        const refining = performance.now();
        const rough = masks;
        masks = rough.map((segmentation, i) => segmentation && refineEdge(state.cv, own, segmentation, seeds[i][0], s.bandMm));
        rough.forEach((segmentation) => segmentation?.mask.delete());
        timing += `, recalage ${fr(performance.now() - refining, 0)} ms`;
      }
      const traced = masks.map((segmentation) => trace(own, segmentation, s));
      const ms = performance.now() - started;
      drawPanel(method, r, seeds, traced);
      drawTable(method, traced, classical);
      setStatus([method], `${sam.dtype} sur ${sam.device} : ${timing}, total ${fr(ms, 0)} ms (chargement à part : ${fr(sam.loadMs, 0)} ms). Écarts : à la classique.`);
    } catch (error) {
      setStatus([method], `Erreur : ${(error as Error).message}`, true);
      console.error(error);
    } finally {
      masks.forEach((segmentation) => segmentation?.mask.delete());
    }
  });
}

/**
 * Pour l'affichage seulement : range les objets d'une méthode qui les trouve seule sous le numéro de
 * l'objet de la classique dont elle couvre le cœur (même couleur, écarts dans le tableau) ; ceux que
 * la classique n'a pas vus à la suite.
 */
function align(r: Rectified, segmentations: Segmentation[], hearts: Point[]): (Segmentation | null)[] {
  const left = new Set(segmentations);
  const covers = ({ mask, offset }: Segmentation, [x, y]: Point) => {
    const [u, v] = [Math.round(x) - offset[0], Math.round(y) - offset[1]];
    return u >= 0 && v >= 0 && u < mask.cols && v < mask.rows && mask.data[v * mask.cols + u] > 0;
  };
  const matched = hearts.map((heart) => {
    const hit = [...left].find((segmentation) => covers(segmentation, toPx(r, heart))) ?? null;
    if (hit) left.delete(hit);
    return hit;
  });
  return [...matched, ...left];
}

/** Un modèle de saillance : il trouve les objets seul, sans rien devoir à la classique. */
async function runSaliency(key: SaliencyKey, r: Rectified, s: Settings, hearts: Point[], classical: (Traced | null)[]) {
  const options = s[key];
  if (!options.on) return setStatus([key], "Désactivé.");
  await sandbox(r, async (own) => {
    let segmentations: Segmentation[] = [];
    try {
      setStatus([key], `Chargement du modèle ${options.dtype} sur ${options.device}…`);
      await paint();
      const saliency = await loadSaliency(key, options.dtype, options.device);
      if (wanted) return;
      setStatus([key], "Passe 1 : feuille entière…");
      await paint();
      const started = performance.now();
      const result = await segmentSaliency(state.cv, saliency, own, { ...options, minAreaMm2: s.classical.minAreaMm2 }, (i, count) => {
        setStatus([key], `Passe 2 : objet ${i + 1} sur ${count}…`);
        return !wanted;
      });
      segmentations = result.segmentations;
      if (wanted) return;
      const kept = segmentations.slice(0, MAX_OBJECTS);
      const traced = new Map(kept.map((segmentation) => [segmentation, trace(own, segmentation, s)]));
      const ms = performance.now() - started;
      const shown = align(r, kept, hearts).map((segmentation) => (segmentation ? traced.get(segmentation)! : null));
      drawPanel(key, r, [], shown);
      drawTable(key, shown, classical);
      const passes = options.twoPasses ? `passe 1 ${fr(result.timing.firstMs, 0)} ms, passe 2 ${fr(result.timing.secondMs, 0)} ms, total ${fr(ms, 0)} ms` : `une passe, total ${fr(ms, 0)} ms`;
      setStatus([key], `${segmentations.length} objet(s), ${saliency.dtype} sur ${saliency.device} : ${passes} (chargement à part : ${fr(saliency.loadMs, 0)} ms). Écarts : à la classique.`, !segmentations.length);
    } catch (error) {
      setStatus([key], `Erreur : ${(error as Error).message}`, true);
      console.error(error);
    } finally {
      segmentations.forEach((segmentation) => segmentation.mask.delete());
    }
  });
}

// Un seul calcul à la fois : une demande reçue pendant un calcul l'arrête et le relance ensuite.
let busy = false;
let wanted: "rectify" | "analyse" | null = null;
async function request(what: "rectify" | "analyse") {
  if (what === "rectify" || !wanted) wanted = what;
  if (busy) return;
  busy = true;
  try {
    while (wanted) {
      const job = wanted;
      wanted = null;
      if (job === "rectify") doRectify();
      await analyse();
    }
  } catch (error) {
    state.message = `Erreur : ${(error as Error).message}`;
    showState();
    console.error(error);
  } finally {
    busy = false;
  }
}

$("sheet").addEventListener("change", () => {
  const { size } = sheetSize();
  $("sheetW").value = String(size.width);
  $("sheetH").value = String(size.height);
});
for (const id of ["sheet", "sheetW", "sheetH"]) $(id).addEventListener("change", () => request("rectify"));
const saliencyIds = (["birefnet", "isnet"] as const).flatMap((key) => ["On", "Dtype", "Device", "Threshold", "Two", "Pad"].map((suffix) => `${key}${suffix}`));
for (const id of ["threshold", "open", "close", "minArea", "samOn", "refinedOn", "dtype", "device", "seedCount", "pad", "band", "tolerance", "minHole", ...saliencyIds]) $(id).addEventListener("change", () => request("analyse"));

// --- Démarrage ---------------------------------------------------------------------------------

$("file").disabled = true;
try {
  state.cv = (await loadOpenCv()).cv;
  const wasm = await Module();
  wasm.setup();
  state.wasm = wasm;
  $("file").disabled = false;
  state.message = "Prêt : choisir une photo d'outils posés sur une feuille.";
  showState();
} catch (error) {
  $("state").textContent = `Erreur au démarrage : ${(error as Error).message}`;
  throw error;
}
