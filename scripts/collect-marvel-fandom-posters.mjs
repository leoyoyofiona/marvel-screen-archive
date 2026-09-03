/**
 * Locate poster candidates for archive-design covers without guessing titles.
 * A result is collected only when a Marvel Database page title exactly matches
 * the catalogue's English title after normalisation. Publication is a separate
 * visual-review step.
 */
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const cataloguePath = path.join(root, "data/catalogue.json");
const catalogue = JSON.parse(await readFile(cataloguePath, "utf8"));
const output = path.join(root, "public/media/fandom-poster-review");
const ledgerPath = path.join(root, "data/fandom-poster-review.json");
const api = "https://marvel.fandom.com/api.php";
const reject = /logo|wordmark|title.?card|screen.?cap|banner|header|icon|avatar/i;
const normalize = (value = "") => value
  .toLowerCase()
  .normalize("NFKD")
  .replace(/[\p{M}]/gu, "")
  .replace(/\b(the|a|an)\b/g, "")
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .replace(/\s+/g, " ")
  .trim();
const filenameFrom = (url) => decodeURIComponent(url.split("/").at(-3) ?? "");
const extensionFor = (contentType, url) => {
  if (contentType.includes("webp")) return "webp";
  if (contentType.includes("png")) return "png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return "jpg";
  return /\.png(?:$|\?)/i.test(url) ? "png" : "jpg";
};
const run = async (url) => {
  const response = await fetch(url, { headers: { "user-agent": "LEOYOYOFIONA Marvel fan archive (noncommercial reference)" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response;
};
async function candidateFor(work) {
  const query = new URLSearchParams({ action: "query", format: "json", list: "search", srnamespace: "0", srlimit: "10", srsearch: `\"${work.titleEn}\"` });
  const search = await (await run(`${api}?${query}`)).json();
  const matches = (search.query?.search ?? []).filter((page) => normalize(page.title) === normalize(work.titleEn));
  if (!matches.length) return { workId: work.id, title: work.title, titleEn: work.titleEn, status: "rejected", reason: "no-exact-marvel-database-title" };
  const title = matches[0].title;
  const pageQuery = new URLSearchParams({ action: "query", format: "json", prop: "pageimages", piprop: "original", titles: title });
  const pageData = await (await run(`${api}?${pageQuery}`)).json();
  const page = Object.values(pageData.query?.pages ?? {})[0];
  const sourceImage = page?.original?.source;
  const imageName = sourceImage ? filenameFrom(sourceImage) : "";
  if (!sourceImage || reject.test(imageName)) return { workId: work.id, title: work.title, titleEn: work.titleEn, status: "rejected", reason: "no-or-generic-page-image", pageTitle: title, imageName, sourceImage };
  const imageResponse = await run(sourceImage);
  const type = imageResponse.headers.get("content-type") ?? "";
  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  if (!type.startsWith("image/") || bytes.length < 10_000) return { workId: work.id, title: work.title, titleEn: work.titleEn, status: "rejected", reason: "invalid-image-response", pageTitle: title, imageName, sourceImage, bytes: bytes.length, contentType: type };
  const filename = `${work.id}.${extensionFor(type, sourceImage)}`;
  await writeFile(path.join(output, filename), bytes);
  return { workId: work.id, title: work.title, titleEn: work.titleEn, status: "candidate-review", file: `/media/fandom-poster-review/${filename}`, pageTitle: title, imageName, sourceImage, sourcePage: `https://marvel.fandom.com/wiki/${encodeURIComponent(title.replaceAll(" ", "_"))}`, bytes: bytes.length, retrievedAt: new Date().toISOString().slice(0, 10), credit: "Marvel Database public reference image · rights belong to respective holders" };
}

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
const rows = catalogue.works.filter((work) => work.poster?.startsWith("/media/archive-posters/"));
const items = [];
let cursor = 0;
async function worker() {
  while (cursor < rows.length) {
    const work = rows[cursor++];
    try { items.push(await candidateFor(work)); }
    catch (error) { items.push({ workId: work.id, title: work.title, titleEn: work.titleEn, status: "rejected", reason: error instanceof Error ? error.message : String(error) }); }
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
await writeFile(ledgerPath, `${JSON.stringify(items.sort((a, b) => a.workId.localeCompare(b.workId)), null, 2)}\n`);
console.log(JSON.stringify({ total: rows.length, candidates: items.filter((item) => item.status === "candidate-review").length, rejected: items.filter((item) => item.status === "rejected").length }, null, 2));
