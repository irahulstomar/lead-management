/** Screenshots every sidebar page for a visual pass. Run after both servers are up. */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const dir = "../screenshots/pages";
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

const routes = [
  "dashboard",
  "campaigns",
  "analytics",
  "organization",
  "settings",
  "email",
  "notifications",
];

for (const r of routes) {
  await page.goto(`http://localhost:3000/${r}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${dir}/${r}.png`, fullPage: true });
  console.log("  shot", r);
}

console.log(errors.length ? "CONSOLE ERRORS:\n  " + errors.join("\n  ") : "no console errors");
await browser.close();
