import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const items = JSON.parse(await readFile(path.join(root, "data/fandom-poster-review.json"), "utf8"))
  .filter((item) => item.status === "candidate-review");
const tileW = 220, tileH = 300, cols = 5, rows = Math.ceil(items.length / cols);
const overlays = [];
for (let index = 0; index < items.length; index += 1) {
  const item = items[index], left = (index % cols) * tileW, top = Math.floor(index / cols) * tileH;
  const poster = await sharp(path.join(root, "public", item.file)).resize({ width: tileW - 18, height: tileH - 54, fit: "contain", background: "#e5ebf2" }).flatten({ background: "#e5ebf2" }).png().toBuffer();
  const label = `<svg width="${tileW}" height="50" xmlns="http://www.w3.org/2000/svg"><rect width="${tileW}" height="50" fill="#fff"/><text x="10" y="21" font-family="Arial" font-size="12" font-weight="700" fill="#172133">${item.title.replace(/[&<>]/g, "")}</text><text x="10" y="39" font-family="Arial" font-size="8" fill="#64748b">${item.pageTitle.replace(/[&<>]/g, "")}</text></svg>`;
  overlays.push({ input: poster, left: left + 9, top: top + 4 }, { input: Buffer.from(label), left, top: top + tileH - 50 });
}
const out = "/tmp/marvel-fandom-poster-review.png";
await sharp({ create: { width: tileW * cols, height: tileH * rows, channels: 4, background: "#d4dde7" } }).composite(overlays).png().toFile(out);
console.log(out);
