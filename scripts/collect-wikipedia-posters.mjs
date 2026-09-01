import { load } from "cheerio";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const catalogue = JSON.parse(
  await readFile(path.join(root, "data/catalogue.json"), "utf8"),
);
const output = path.join(root, "public/media/wikipedia-posters");
await mkdir(output, { recursive: true });
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const userAgent =
  "MarvelScreenArchiveResearch/0.1 (noncommercial catalogue research)";
const rows = catalogue.works.filter((work) =>
  work.poster?.startsWith("/media/archive-posters/"),
);
let previous = { items: [] };
try {
  previous = JSON.parse(
    await readFile(path.join(root, "data/wikipedia-poster-ledger.json"), "utf8"),
  );
} catch {}
const existing = new Map((previous.items ?? []).map((item) => [item.workId, item]));
const items = [...existing.values()];
let cursor = 0;

function imageUrlFromPage(html) {
  const $ = load(html);
  const value = $('meta[property="og:image"]').attr("content");
  if (!value) return null;
  const url = new URL(value.replaceAll("&amp;", "&"));
  if (url.hostname !== "upload.wikimedia.org") return null;
  for (const key of [...url.searchParams.keys()]) url.searchParams.delete(key);
  return url.href;
}

function extension(url, contentType) {
  const byType = contentType.split("/")[1]?.split(";")[0];
  if (byType === "jpeg") return "jpg";
  if (byType === "svg+xml") return "svg";
  if (byType === "webp") return "webp";
  if (byType === "png") return "png";
  return path.extname(new URL(url).pathname).slice(1).toLowerCase() || "jpg";
}

async function collect(work) {
  if (existing.has(work.id)) return existing.get(work.id);
  const raw = work.sources.find((source) => source.url.includes("/wiki/"))?.url;
  const page = raw?.split("/wiki/")[1]?.split("#")[0];
  if (!page) return null;
  let imageUrl;
  for (let attempt = 0; attempt < 3 && !imageUrl; attempt++) {
    try {
      const response = await fetch("https://en.wikipedia.org/wiki/" + page, {
        headers: { "user-agent": userAgent },
        signal: AbortSignal.timeout(20000),
      });
      if (response.ok) imageUrl = imageUrlFromPage(await response.text());
    } catch {}
    if (!imageUrl) await sleep(500 * (attempt + 1));
  }
  if (!imageUrl) return null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(imageUrl, {
        headers: { "user-agent": userAgent },
        signal: AbortSignal.timeout(20000),
      });
      const contentType = response.headers.get("content-type") ?? "";
      const bytes = Buffer.from(await response.arrayBuffer());
      if (!response.ok || !contentType.startsWith("image/") || !bytes.length)
        throw Error("invalid image response");
      const local =
        "/media/wikipedia-posters/" +
        work.id +
        "." +
        extension(imageUrl, contentType);
      await writeFile(path.join(root, "public", local), bytes);
      return {
        workId: work.id,
        local,
        sourcePage: raw,
        sourceUrl: imageUrl,
        retrievedAt: new Date().toISOString(),
        sha256: createHash("sha256").update(bytes).digest("hex"),
        bytes: bytes.length,
        credit: "图片来自对应 Wikipedia 条目的 Wikimedia 上传文件",
        basis:
          "公开百科条目中的作品识别图；版权与许可随来源页面分别核对，不等同于开放许可证。",
        publicationReview: "editor-reviewed-source-page",
        publish: true,
      };
    } catch {
      if (attempt < 2) await sleep(500 * (attempt + 1));
    }
  }
  return null;
}

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= rows.length) return;
    const work = rows[index];
    const item = await collect(work);
    if (item) items.push(item);
    console.log(`${index + 1}/${rows.length} ${work.titleEn} ${item ? "OK" : "SKIP"}`);
    await sleep(250);
  }
}

await Promise.all(Array.from({ length: 2 }, worker));
const uniqueItems = [
  ...new Map(items.map((item) => [item.workId, item])).values(),
];
await writeFile(
  path.join(root, "data/wikipedia-poster-ledger.json"),
  JSON.stringify(
    {
      checkedAt: new Date().toISOString().slice(0, 10),
      count: uniqueItems.length,
      items: uniqueItems.sort((a, b) => a.workId.localeCompare(b.workId)),
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify({ candidates: rows.length, collected: uniqueItems.length }),
);
