import { load } from "cheerio";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const root = path.resolve(import.meta.dirname, ".."),
  cache = path.join(root, "research-cache/pages");
await mkdir(cache, { recursive: true });
const candidates = JSON.parse(
  await readFile(path.join(root, "data/catalogue-candidates.json"), "utf8"),
);
let previous = {};
try {
  previous = JSON.parse(
    await readFile(path.join(root, "data/enrichment.json"), "utf8"),
  );
} catch {}
const clean = (t) =>
  t
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
let done = 0,
  failures = 0;
const urls = [
  ...new Set(
    candidates.map((x) => x.sources[0].workUrl?.split("#")[0]).filter(Boolean),
  ),
];
async function enrich(url) {
  if (previous[url]?.retrievedAt && previous[url]?.parserVersion === 2) return;
  try {
    const hash = createHash("sha256").update(url).digest("hex");
    let html;
    try {
      html = await readFile(path.join(cache, hash + ".html"), "utf8");
    } catch {
      const r = await fetch(url, { signal: AbortSignal.timeout(25000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      html = await r.text();
      await writeFile(path.join(cache, hash + ".html"), html);
    }
    const $ = load(html),
      box = $("table.infobox").first();
    const facts = {},
      people = [];
    box.find("tr").each((_, tr) => {
      const key = clean($(tr).children("th").text());
      const td = $(tr).children("td");
      if (!key || !td.length) return;
      const factCell = td.clone();
      factCell.find("style,script,sup.reference").remove();
      factCell.find("li").append(" · ");
      factCell.find("br").replaceWith(" · ");
      facts[key] = clean(factCell.text()).replace(/ · $/, "");
      if (
        /^(Directed by|Starring|Created by|Developed by|Composer|Composer\(s\)|Music by|Voices of|Showrunner)$/.test(
          key,
        )
      ) {
        td.find("a").each((__, a) => {
          const name = clean($(a).text()),
            href = $(a).attr("href");
          if (
            !name ||
            !href ||
            !href.includes("/wiki/") ||
            /File:|#cite|Help:/.test(href)
          )
            return;
          people.push({ name, department: key, url: new URL(href, url).href });
        });
      }
    });
    const img = box.find("img").first();
    let imageUrl = img.attr("src");
    if (imageUrl) imageUrl = new URL(imageUrl, url).href;
    const imageLink = img.closest("a").attr("href");
    const zh =
      $('link[hreflang="zh"]').attr("href") ||
      $('a[hreflang="zh"]').attr("href") ||
      null;
    const official = $("a.external")
      .toArray()
      .map((a) => ({ title: clean($(a).text()), url: $(a).attr("href") }))
      .filter(
        (x) =>
          x.url &&
          /^https:\/\/(?:www\.)?(?:marvel\.com|sonypictures\.com|disneyplus\.com|thewaltdisneycompany\.com|20thcenturystudios\.com|press\.disneyplus\.com)\//.test(
            x.url,
          ),
      );
    const seasonLinks = $("a")
      .toArray()
      .filter(
        (a) =>
          /season \d+$/i.test($(a).attr("title") ?? "") ||
          /\(season_\d+\)/.test($(a).attr("href") ?? ""),
      )
      .map((a) => ({
        label: clean($(a).text()),
        url: new URL($(a).attr("href"), url).href,
      }));
    const dates = box
      .find(".bday,.dtstart")
      .map((_, x) => $(x).text())
      .get()
      .filter((x) => /^\d{4}-\d{2}-\d{2}$/.test(x));
    previous[url] = {
      url,
      parserVersion: 2,
      retrievedAt: new Date().toISOString(),
      pageSha256: createHash("sha256").update(html).digest("hex"),
      facts,
      people,
      zh,
      dates,
      seasonLinks: [...new Map(seasonLinks.map((x) => [x.url, x])).values()],
      officialSources: [...new Map(official.map((x) => [x.url, x])).values()],
      artworkCandidate: imageUrl
        ? {
            url: imageUrl,
            description: img.attr("alt") ?? "",
            filePage: imageLink ? new URL(imageLink, url).href : null,
            rights: "unreviewed",
            publish: false,
          }
        : null,
    };
    done++;
  } catch (e) {
    failures++;
    previous[url] = {
      url,
      error: String(e),
      attemptedAt: new Date().toISOString(),
    };
  }
  if ((done + failures) % 15 === 0) {
    await writeFile(
      path.join(root, "data/enrichment.json"),
      JSON.stringify(previous, null, 2) + "\n",
    );
    console.log(`enriched ${done}, failed ${failures}`);
  }
}
for (let offset = 0; offset < urls.length; offset += 4)
  await Promise.all(urls.slice(offset, offset + 4).map(enrich));
await writeFile(
  path.join(root, "data/enrichment.json"),
  JSON.stringify(previous, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    total: urls.length,
    processed: done,
    failures,
    notice:
      "Extracted facts are secondary evidence. Artwork remains unpublished until rights review; external primary links are candidates, not verified merely by extraction.",
  }),
);
