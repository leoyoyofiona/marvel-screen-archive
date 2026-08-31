import { load } from "cheerio";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const cache = path.join(root, "research-cache");
await mkdir(cache, { recursive: true });
await mkdir(path.join(root, "data"), { recursive: true });
const pages = [
  [
    "films",
    "https://en.wikipedia.org/wiki/List_of_films_based_on_Marvel_Comics_publications",
  ],
  [
    "television",
    "https://en.wikipedia.org/wiki/List_of_television_series_based_on_Marvel_Comics_publications",
  ],
];
const clean = (str) =>
  str
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const digest = (str) => createHash("sha256").update(str).digest("hex");
const records = new Map();
const exclusions = [];
const inventory = [];

function expandedRows($, table) {
  const grid = [];
  $(table)
    .find("tr")
    .each((r, row) => {
      grid[r] ??= [];
      let col = 0;
      $(row)
        .children("td, th")
        .each((_, cell) => {
          while (grid[r][col]) col++;
          const value = {
            text: clean($(cell).text()),
            html: $(cell).html(),
            node: cell,
          };
          const rs = Number($(cell).attr("rowspan") || 1),
            cs = Number($(cell).attr("colspan") || 1);
          for (let i = 0; i < rs; i++)
            for (let j = 0; j < cs; j++) {
              grid[r + i] ??= [];
              grid[r + i][col + j] = value;
            }
          col += cs;
        });
    });
  return grid;
}
for (const [group, url] of pages) {
  const cachePath = path.join(cache, group + ".html");
  let html;
  try {
    html = await readFile(cachePath, "utf8");
  } catch {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${url}: ${r.status}`);
    html = await r.text();
    await writeFile(cachePath, html);
  }
  const $ = load(html);
  const sections = [];
  let stopped = false;
  $("h2,h3,h4,h5,table.wikitable").each((_, el) => {
    if (/^h[2-5]$/.test(el.tagName)) {
      const level = Number(el.tagName[1]) - 2;
      sections.length = level;
      sections[level] = clean($(el).text()).replace(/\[edit\]/g, "");
      if (
        /Reception|See also|References|External links/.test(sections[0] ?? "")
      )
        stopped = true;
      return;
    }
    if (stopped) return;
    const rows = expandedRows($, el);
    const headerIndex = rows.findIndex((r) =>
      r.some((c) => /^(Title|Series|Film)$/.test(c?.text)),
    );
    if (headerIndex < 0) return;
    const heads = rows[headerIndex].map((c) => c.text);
    const titleIndex = heads.findIndex((c) => /^(Title|Series|Film)$/.test(c));
    const yearIndex = heads.findIndex((c) =>
      /Year|Release|First aired|Original run|Original broadcast/i.test(c),
    );
    inventory.push({
      group,
      sections: [...sections],
      headings: heads,
      rows: rows.length - 1,
    });
    for (const cells of rows.slice(headerIndex + 1)) {
      const titleCell = cells[titleIndex];
      if (
        !titleCell ||
        /^(Title|Series|Film)$/.test(titleCell.text) ||
        cells.every((c) => c === titleCell)
      )
        continue;
      const title = titleCell.text.replace(/\s*[†‡]$/, "");
      if (!title || title === "TBA") continue;
      const anchor = $(titleCell.node)
        .find("a")
        .filter((__, a) => {
          const href = $(a).attr("href") ?? "";
          const parsed = new URL(href, url);
          return (
            parsed.hostname === "en.wikipedia.org" &&
            parsed.pathname.startsWith("/wiki/") &&
            !/^\/wiki\/(File|Help|Category|Template|Special):/.test(
              parsed.pathname,
            )
          );
        })
        .first();
      const href = anchor.attr("href");
      const workUrl = href ? new URL(href, url).href : null;
      const yearText =
        (yearIndex >= 0 ? cells[yearIndex]?.text : "") ||
        cells.find((c) => /^(19|20)\d{2}/.test(c?.text))?.text ||
        "";
      const year = Number(yearText.match(/(?:19|20)\d{2}/)?.[0]) || null;
      const section = sections.filter(Boolean).join(" / ");
      const source = {
        url,
        workUrl,
        section,
        retrievedAt: new Date().toISOString(),
        pageSha256: digest(html),
      };
      const status = /Unreleased|Unaired|unproduced|canceled|cancelled/i.test(
        section,
      )
        ? "unreleased"
        : year && year > 2026
          ? "announced"
          : year === 2026 || !year
            ? "release-unverified"
            : "released";
      const kind = /Unscripted|Non-fiction|Documentar/i.test(section)
        ? "documentary"
        : /Television specials|Pilots/i.test(section)
          ? "special"
          : group === "television"
            ? /Animated/i.test(section)
              ? "animated-series"
              : "series"
            : /short|Serials/i.test(section)
              ? "short"
              : /Animated/i.test(section)
                ? "animated-film"
                : "film";
      if (/Television blocks/.test(section)) {
        exclusions.push({
          title,
          reason: "电视播映时段包装，不是独立叙事作品",
          source,
        });
        continue;
      }
      const key = `${workUrl || group}|${title}|${yearText}`;
      const prior = records.get(key);
      if (prior) {
        prior.sources.push(source);
        continue;
      }
      const wikiSlug = `${title}-${year ?? "undated"}-${kind}`;
      const id =
        wikiSlug
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || digest(key).slice(0, 12);
      records.set(key, {
        id,
        titleEn: title,
        titleZh: null,
        year,
        yearText,
        kind,
        status,
        sourceFamily: /imprint|Malibu|Icon/i.test(section)
          ? "imprint"
          : /inspired by/i.test(section)
            ? "collaboration"
            : "core",
        universe: null,
        summary: null,
        rowFacts: Object.fromEntries(
          heads
            .map((h, i) => [h, cells[i]?.text ?? ""])
            .filter(([h]) => !/Note|Ref/.test(h)),
        ),
        verification: "catalogue-only",
        sources: [source],
      });
    }
  });
}
const list = [...records.values()].sort(
  (a, b) =>
    (a.year ?? 9999) - (b.year ?? 9999) || a.titleEn.localeCompare(b.titleEn),
);
const duplicateIds = new Set(
  list
    .filter(
      (item, index) =>
        list.findIndex((other) => other.id === item.id) !== index,
    )
    .map((item) => item.id),
);
for (const item of list)
  if (duplicateIds.has(item.id))
    item.id +=
      "-" +
      digest(
        [item.sources[0].workUrl, item.sources[0].section, item.yearText].join(
          "|",
        ),
      ).slice(0, 6);
await writeFile(
  path.join(root, "data/catalogue-candidates.json"),
  JSON.stringify(list, null, 2) + "\n",
);
await writeFile(
  path.join(root, "data/catalogue-import-audit.json"),
  JSON.stringify(
    {
      cutoff: "2026-08-31",
      importedAt: new Date().toISOString(),
      count: list.length,
      sourceTables: inventory,
      exclusions,
      notice:
        "Candidate inventory, not proof of full coverage or per-title verification. Facts only; text summaries are not copied.",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    {
      count: list.length,
      byKind: Object.fromEntries(
        [...new Set(list.map((x) => x.kind))].map((k) => [
          k,
          list.filter((x) => x.kind === k).length,
        ]),
      ),
      tables: inventory,
    },
    null,
    2,
  ),
);
