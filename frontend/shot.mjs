import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

// Screenshots land in <repo>/screenshots so they can be browsed, not buried in a temp dir.
const dir = process.argv[2] ?? "../screenshots";
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

const shot = (name) => page.screenshot({ path: `${dir}/${name}.png` });
const click = async (name) => {
  await page.getByRole("button", { name }).click();
  await page.waitForTimeout(500);
};

await page.goto("http://localhost:3000/leads", { waitUntil: "networkidle" });
await page.waitForTimeout(1000);
await shot("a-contact-info");

// A lead waiting on a human decision — the new banner.
await page.getByRole("button", { name: /Nathan Cole/ }).click();
await page.waitForTimeout(700);
await shot("b-new-awaiting-decision");

// The human-owned lead: notes composer, close-out actions.
await page.getByRole("button", { name: /Rebecca Lang/ }).click();
await page.waitForTimeout(700);
await shot("c-claimed-sequence");

// Her timeline: owner_alert, event, note all render.
await click("Activity");
await shot("d-claimed-activity");

// The lead who replied. Each lead opens on the tab its own state calls for — a replied
// lead lands on Contact info — so ask for Sequence explicitly: the stopped-reason panel
// is the whole point of this shot.
await page.getByRole("button", { name: /Sarah Kowalski/ }).click();
await page.waitForTimeout(600);
await click("Sequence");
await shot("e-replied");

// The SOP.
await page.goto("http://localhost:3000/playbook", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await shot("f-playbook");
await page.evaluate(() => window.scrollTo(0, 1400));
await page.waitForTimeout(400);
await shot("g-playbook-rules");

console.log(errors.length ? "CONSOLE ERRORS:\n  " + errors.join("\n  ") : "no console errors");
await browser.close();
