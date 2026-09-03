/**
 * Build a review ledger for Iron Man armor artwork.
 *
 * The source is the MCU Wiki page for each Mark. This deliberately rejects
 * pages whose main image is identified as a toy, cosplay, convention shot or
 * statue. The resulting JSON is a candidate ledger: it is not marked as
 * licensed artwork and must be visually checked before publication.
 *
 * Run: node scripts/collect-mcu-armor.mjs
 */
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "public/media/armor/mcu-review");
const ledgerPath = path.join(root, "data/mcu-armor-review.json");
const api = "https://marvelcinematicuniverse.fandom.com/api.php";
const marks = [
  "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI", "XXII", "XXIII", "XXIV", "XXV", "XXVI", "XXVII", "XXVIII", "XXIX", "XXX", "XXXI", "XXXII", "XXXIII", "XXXIV", "XXXV", "XXXVI", "XXXVII", "XXXVIII", "XXXIX", "XL", "XLI", "XLII", "XLIII", "XLIV", "XLV", "XLVI", "XLVII", "XLVIII", "XLIX", "L", "LXXX", "LXXXV",
];
const rejectName = /hot[ _-]?toys|cosplay|steampunk|convention|comic[ _-]?con|expo|statue|figure|model[ _-]?kit/i;
const extensionFor = (url, type) => {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".png") || type?.includes("png")) return "png";
  if (clean.endsWith(".webp") || type?.includes("webp")) return "webp";
  return "jpg";
};
const slug = (mark) => mark.toLowerCase().replaceAll(" ", "-");

await rm(outDir, { recursive: true, force: true });
await mkdir(outDir, { recursive: true });
const entries = [];
for (const mark of marks) {
  const title = `Iron Man Armor: Mark ${mark}`;
  const query = new URLSearchParams({
    action: "query",
    format: "json",
    prop: "pageimages|imageinfo",
    piprop: "original",
    titles: title,
  });
  const response = await fetch(`${api}?${query}`);
  if (!response.ok) {
    entries.push({ mark: `Mark ${mark}`, title, status: "rejected", reason: `api-${response.status}` });
    continue;
  }
  const payload = await response.json();
  const page = Object.values(payload?.query?.pages ?? {})[0];
  const imageUrl = page?.original?.source;
  // Fandom originals use .../images/hash/File_Name.png/revision/latest?... .
  // The filename is therefore three path segments from the end, not `revision`.
  const imageName = imageUrl ? decodeURIComponent(imageUrl.split("/").at(-3) ?? "") : "";
  if (!imageUrl) {
    entries.push({ mark: `Mark ${mark}`, title, status: "rejected", reason: "no-main-image" });
    continue;
  }
  if (rejectName.test(imageName)) {
    entries.push({ mark: `Mark ${mark}`, title, status: "rejected", reason: "non-film-or-non-armor-image-name", imageName, sourceImage: imageUrl });
    continue;
  }
  const imageResponse = await fetch(imageUrl);
  const contentType = imageResponse.headers.get("content-type") ?? "";
  const contentLength = Number(imageResponse.headers.get("content-length") ?? "0");
  if (!imageResponse.ok || !contentType.startsWith("image/") || (contentLength && contentLength < 6_000)) {
    entries.push({ mark: `Mark ${mark}`, title, status: "rejected", reason: "image-download-invalid", imageName, sourceImage: imageUrl, contentType, contentLength });
    continue;
  }
  const ext = extensionFor(imageUrl, contentType);
  const fileName = `${slug(mark)}.${ext}`;
  await writeFile(path.join(outDir, fileName), Buffer.from(await imageResponse.arrayBuffer()));
  entries.push({
    mark: `Mark ${mark}`,
    title,
    status: "candidate-review",
    imageName,
    file: `/media/armor/mcu-review/${fileName}`,
    sourcePage: `https://marvelcinematicuniverse.fandom.com/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`,
    sourceImage: imageUrl,
    credit: "MCU Wiki public reference image · rights belong to respective holders",
    retrievedAt: new Date().toISOString().slice(0, 10),
  });
}
await writeFile(ledgerPath, `${JSON.stringify(entries, null, 2)}\n`);
console.log(JSON.stringify({ candidates: entries.filter((entry) => entry.status === "candidate-review").length, rejected: entries.filter((entry) => entry.status === "rejected").length, ledgerPath }, null, 2));
