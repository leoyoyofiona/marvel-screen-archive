import { load } from "cheerio";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const root = path.resolve(import.meta.dirname, "..");
await mkdir(path.join(root, "public/media"), { recursive: true });
await mkdir(path.join(root, "research-cache/primary"), { recursive: true });
const entries = [
  [
    "spider-man-brand-new-day-2026-film",
    "https://www.sonypictures.com/movies/spidermanbrandnewday",
  ],
  [
    "spider-man-into-the-spider-verse-2018-animated-film",
    "https://www.sonypictures.com/movies/spidermanintothespiderverse",
  ],
  [
    "spider-man-homecoming-2017-film",
    "https://www.sonypictures.com/movies/spidermanhomecoming",
  ],
  [
    "spider-man-far-from-home-2019-film",
    "https://www.sonypictures.com/movies/spidermanfarfromhome",
  ],
  [
    "spider-man-no-way-home-2021-film",
    "https://www.sonypictures.com/movies/spidermannowayhome",
  ],
  ["iron-man-2008-film", "https://marvel.disney.co.jp/movie/ironman"],
];
const ledger = [];
for (const [workId, url] of entries) {
  try {
    const file = path.join(root, "research-cache/primary", workId + ".html");
    let html;
    try {
      html = await readFile(file, "utf8");
    } catch {
      const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (!r.ok) throw Error("HTTP " + r.status);
      html = await r.text();
      await writeFile(file, html);
    }
    const $ = load(html);
    const candidates = [];
    if (url.includes("sonypictures")) {
      const img = $('img[src*="title-key-art"]').first();
      if (img.length)
        candidates.push({
          kind: "poster",
          url: new URL(img.attr("src"), url).href,
        });
      const picture = $("picture")
        .filter((_, el) => $(el).find('img[src*="banner-images"]').length)
        .first();
      const srcset = picture.find("source").first().attr("srcset");
      const banner =
        srcset?.split(",")[0]?.trim().split(" ")[0] ||
        $('img[src*="banner-images"]').first().attr("src");
      if (banner)
        candidates.push({ kind: "backdrop", url: new URL(banner, url).href });
    } else {
      console.log(
        "Primary image candidates",
        workId,
        $("img")
          .toArray()
          .map((el) => ({
            src: $(el).attr("src"),
            data: $(el).attr("data-src"),
            alt: $(el).attr("alt"),
          }))
          .slice(-20),
      );
    }
    for (const asset of candidates) {
      const assetUrl = new URL(asset.url);
      assetUrl.searchParams.delete("utm_source");
      const r = await fetch(assetUrl, { signal: AbortSignal.timeout(25000) });
      if (!r.ok || !r.headers.get("content-type")?.startsWith("image/"))
        throw Error("Invalid image " + r.status);
      const ext = r.headers.get("content-type")?.includes("png")
        ? "png"
        : "jpg";
      const bytes = Buffer.from(await r.arrayBuffer());
      const local = "/media/" + workId + "-" + asset.kind + "." + ext;
      await writeFile(path.join(root, "public", local), bytes);
      ledger.push({
        workId,
        kind: asset.kind,
        local,
        sourcePage: url,
        sourceUrl: assetUrl.href,
        retrievedAt: new Date().toISOString(),
        sha256: createHash("sha256").update(bytes).digest("hex"),
        bytes: bytes.length,
        credit: "© Sony Pictures / Marvel. All rights reserved.",
        basis:
          "Official public promotional artwork, used in a noncommercial work-identification/review context. This is attribution and provenance, NOT an open license or proof of republication permission.",
        publicationReview: "pending",
        publish: false,
      });
    }
    console.log(workId, candidates.length);
  } catch (e) {
    console.error(workId, String(e));
  }
}
await writeFile(
  path.join(root, "data/primary-assets.json"),
  JSON.stringify(ledger, null, 2) + "\n",
);
