/** Drives the human-first flow through the real UI. Run after `python seed.py`. */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const dir = "../screenshots/flow";
mkdirSync(dir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

const open = async (name) => {
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await page.waitForTimeout(600);
};
const press = async (name) => {
  await page.getByRole("button", { name, exact: true }).click();
  await page.waitForTimeout(900);
};
const stage = async (label) => {
  console.log("  " + label);
  await page.screenshot({ path: `${dir}/${label.replace(/[^a-z0-9]+/gi, "-")}.png` });
};

await page.goto("http://localhost:3000/leads", { waitUntil: "networkidle" });
await page.waitForTimeout(900);

// 1. Owner opens the waiting lead and takes it.
await open("Nathan Cole");
await stage("1 nathan awaiting decision");
await press("I’ll take it");
await stage("2 nathan claimed");

// 2. Logs what was discussed.
await page.getByPlaceholder("What did you discuss?").fill(
  "Called Nathan. Both PMs have already resigned — November is real. Wants pipeline live before he rehires.",
);
await press("Save note");
await stage("3 note saved");

// 3. A week of the engine passes. The claimed lead must not be touched.
for (let i = 0; i < 3; i++) await press("Advance day");
await stage("4 after three advances still claimed");

// 4. Hand back to the AI.
await press("Hand back to AI");
await stage("5 handed back to ai");

// 5. Verify against the API, not the pixels.
const res = await page.request.get("http://127.0.0.1:8000/api/leads/13");
const { lead, touches } = await res.json();
const kinds = touches.map((t) => t.kind);
console.log("\n  Nathan status:", lead.status);
console.log("  timeline:", kinds.join(" → "));

const notes = touches.filter((t) => t.kind === "note").length;
const followUps = touches.filter((t) => t.kind.startsWith("follow_up")).length;
console.log(`  notes=${notes} follow_ups=${followUps} claim_token=${lead.claim_token}`);

const fail = [];
if (lead.status !== "contacted") fail.push(`expected contacted, got ${lead.status}`);
if (notes !== 1) fail.push(`expected 1 note, got ${notes}`);
if (followUps !== 0) fail.push(`AI messaged a claimed lead: ${followUps} follow-ups`);
if (lead.claim_token !== null) fail.push("claim token was not burned");

console.log(errors.length ? "\nCONSOLE ERRORS:\n  " + errors.join("\n  ") : "\nno console errors");
console.log(fail.length ? "FAIL:\n  " + fail.join("\n  ") : "PASS — flow behaved correctly");
await browser.close();
if (fail.length || errors.length) process.exit(1);
