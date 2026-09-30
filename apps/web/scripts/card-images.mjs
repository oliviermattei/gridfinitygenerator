// Renders the fixed images of the index cards (ADR 0020) from the real engine and preview:
// each generator is opened with a share link, its panels hidden, and the framed model is
// captured. Run against a production server: `pnpm build && pnpm start -p 3217`, then
// `pnpm card-images` (BASE_URL overrides http://localhost:3217).
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3217";
const OUT = fileURLToPath(new URL("../public/previews/", import.meta.url));

/** The share link of each card: a model that reads well at a glance. */
const CARDS = {
  baseplate: "/en/baseplate?v=1&mode=cells&cx=4&cy=3",
  bin: "/en/bin?v=1&x=2&y=2&h=4&dx=2&dy=2&sc=1&lt=1",
};

// Desktop layout: the model is framed between the settings panel (left, 16 + 380 + 16 px)
// and the statistics (right, 16 + 272 + 16 px), below the top bar (72 px) and above 16 px.
// This viewport leaves a framing area of exactly 480 × 360 px, 960 × 720 at 2×.
const VIEWPORT = { width: 412 + 480 + 304, height: 72 + 360 + 16 };
const CLIP = { x: 412, y: 72, width: 480, height: 360 };

const which = process.argv.slice(2);
const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
try {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  for (const [id, link] of Object.entries(CARDS)) {
    if (which.length > 0 && !which.includes(id)) continue;
    await page.goto(BASE_URL + link);
    // The final mesh: the volume of the statistics is measured on it.
    await page.getByText(/cm³/).first().waitFor({ timeout: 60_000 });
    await page.addStyleTag({ content: "main > :not(:first-child) { visibility: hidden !important; }" });
    // Let the framing animation settle.
    await page.waitForTimeout(2_500);
    await page.screenshot({ path: `${OUT}${id}.jpg`, type: "jpeg", quality: 86, clip: CLIP });
    console.log(`${id}.jpg`);
  }
} finally {
  await browser.close();
}
