import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const entries = JSON.parse(
  await readFile(path.join(root, "data/mcu-armor-review.json"), "utf8"),
).filter((entry) => entry.status === "candidate-review");
const tileW = 210;
const tileH = 292;
const cols = 5;
const rows = Math.ceil(entries.length / cols);
const width = tileW * cols;
const height = tileH * rows;
const overlays = [];
for (let index = 0; index < entries.length; index += 1) {
  const entry = entries[index];
  const left = (index % cols) * tileW;
  const top = Math.floor(index / cols) * tileH;
  const source = path.join(root, "public", entry.file);
  const armor = await sharp(source)
    .resize({ width: tileW - 24, height: tileH - 48, fit: "contain", background: "#e9edf2" })
    .flatten({ background: "#e9edf2" })
    .png()
    .toBuffer();
  const label = `<svg width="${tileW}" height="42" xmlns="http://www.w3.org/2000/svg"><rect width="${tileW}" height="42" fill="#ffffff"/><text x="12" y="25" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#172133">${entry.mark}</text><text x="12" y="38" font-family="Arial, sans-serif" font-size="8" fill="#64748b">MCU WIKI REFERENCE · REVIEW</text></svg>`;
  overlays.push({ input: armor, left: left + 12, top: top + 4 });
  overlays.push({ input: Buffer.from(label), left, top: top + tileH - 42 });
}
const out = "/tmp/mcu-armor-review-contact-sheet.png";
await sharp({ create: { width, height, channels: 4, background: "#dce3eb" } })
  .composite(overlays)
  .png()
  .toFile(out);
console.log(out);
