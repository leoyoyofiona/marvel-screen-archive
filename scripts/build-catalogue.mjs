import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  names,
  phases,
  televisionMcu,
  curated,
  peopleZh,
  characters,
} from "../data/editorial.mjs";
const root = path.resolve(import.meta.dirname, "..");
const read = async (name, fallback) => {
  try {
    return JSON.parse(await readFile(path.join(root, "data", name), "utf8"));
  } catch {
    return fallback;
  }
};
const candidates = await read("catalogue-candidates.json", []),
  enriched = await read("enrichment.json", {}),
  assets = await read("primary-assets.json", []),
  media = await read("media-reviewed.json", []),
  officialIndex = await read("official-index.json", {
    movies: [],
    tvSeasons: [],
    digitalSeries: [],
    podcasts: [],
    audit: {},
  }),
  officialEpisodes = await read("official-episodes.json", { series: [] }),
  officialArtwork = await read("official-poster-ledger.json", { items: [] }),
  personArtwork = await read("person-portrait-ledger.json", { items: [] });
const personArtById = new Map(
  personArtwork.items
    .filter((item) => item.publish)
    .map((item) => [item.personId, item]),
);

const slug = (value) =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const normalizedTitle = (value) =>
  value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/marvel('?s|’s)?\s*/g, "")
    .replace(/\|\s*season\s*\d+/g, "")
    .replace(/[^a-z0-9]/g, "");
const officialAliases = new Map([
  [normalizedTitle("X-Men: Dark Phoenix"), normalizedTitle("Dark Phoenix")],
  [normalizedTitle("Marvel's Avengers"), normalizedTitle("Avengers Assemble")],
  [
    normalizedTitle("Marvel Rising"),
    normalizedTitle("Marvel Rising: Initiation"),
  ],
]);
const comparableTitle = (value) =>
  officialAliases.get(normalizedTitle(value)) ?? normalizedTitle(value);
const officialSource = (url, section) => ({
  url,
  workUrl: null,
  section,
  retrievedAt: officialIndex.collectedAt,
});
const cleanFacts = (facts = {}) =>
  Object.fromEntries(
    Object.entries(facts)
      .map(([key, value]) => {
        if (typeof value !== "string") return [key, value];
        if (!value.includes(".mw-parser-output")) return [key, value.trim()];
        const cleaned = value.split("}").at(-1)?.trim();
        return [key, cleaned || null];
      })
      .filter(([, value]) => value !== null && value !== ""),
  );

const officialPrimaryExtras = [
  {
    id: "black-panther-3-undated-film",
    titleEn: "Black Panther 3",
    year: null,
    yearText: "待定",
    kind: "film",
    status: "announced",
    sourceFamily: "core",
    summary:
      "Marvel 官方电影索引已列出该项目；片名、档期与剧情仍以未来正式公告为准。",
    rowFacts: {},
    verification: "official-index",
    sources: [
      officialSource(
        "https://www.marvel.com/movies/black-panther-3",
        "Marvel official movies index",
      ),
    ],
  },
  {
    id: "blade-marvel-studios-undated-film",
    titleEn: "Blade (Marvel Studios)",
    year: null,
    yearText: "待定",
    kind: "film",
    status: "announced",
    sourceFamily: "core",
    summary:
      "Marvel 官方项目页列出 Mahershala Ali；当前档期和剧情信息保持待定，不与 1998 年电影混档。",
    rowFacts: {},
    verification: "official-index",
    sources: [
      officialSource(
        "https://www.marvel.com/movies/blade",
        "Marvel official movie page",
      ),
    ],
  },
  {
    id: "stan-lee-2023-documentary",
    titleEn: "Stan Lee",
    year: 2023,
    yearText: "2023",
    kind: "documentary",
    status: "released",
    sourceFamily: "core",
    summary: "围绕斯坦·李生平与创作历程的官方纪录片档案。",
    rowFacts: {},
    verification: "official-index",
    sources: [
      officialSource(
        "https://www.marvel.com/tv-shows/stan-lee-documentary/1",
        "Marvel official television index",
      ),
    ],
  },
  {
    id: "marvel-s-behind-the-mask-2021-documentary",
    titleEn: "Marvel's Behind the Mask",
    year: 2021,
    yearText: "2021",
    kind: "documentary",
    status: "released",
    sourceFamily: "core",
    summary: "从身份、创作与文化表达角度回望漫威面具英雄的官方纪录片档案。",
    rowFacts: {},
    verification: "official-index",
    sources: [
      officialSource(
        "https://www.marvel.com/tv-shows/marvel-s-behind-the-mask/1",
        "Marvel official television index",
      ),
    ],
  },
];

const digitalYearOverrides = {
  "Countdown to Avengers: Doomsday Official Podcast": 2026,
  "Daredevil: Born Again Official Podcast": 2026,
  "Marvel's Squirrel Girl: The Unbeatable Radio Show": 2022,
  "Marvel's Storyboards": 2020,
  "Wakanda Forever: The Official Black Panther Podcast": 2022,
  "The Official Marvel Podcast": 2024,
  "Wolverine: The Long Night": 2018,
};
const officialDigitalWorks = [
  ...officialIndex.digitalSeries,
  ...officialIndex.podcasts,
].map((item) => {
  const isPodcast =
      officialIndex.podcasts.includes(item) ||
      /podcast|radio show|wolverine: the long night/i.test(item.title),
    year = item.firstPublished
      ? Number(item.firstPublished.slice(0, 4))
      : (digitalYearOverrides[item.title] ?? null),
    kind = isPodcast ? "podcast" : "digital-series",
    episodeEntry = officialEpisodes.series.find(
      (series) => series.seriesUrl === item.url,
    );
  return {
    id: `official-${slug(item.title)}-${kind}`,
    titleEn: item.title,
    year,
    yearText: year ? String(year) : "待核验",
    kind,
    status: item.firstPublished ? "released" : "release-unverified",
    sourceFamily: "official-digital",
    summary:
      item.description ||
      "Marvel 官方数字节目索引中的系列档案；首发年份与单集列表仍在复核。",
    rowFacts: {
      "Official indexed episodes": item.total ? String(item.total) : "待核验",
      ...(episodeEntry
        ? {
            "Official unique episode pages observed": String(
              episodeEntry.observedTotal,
            ),
          }
        : {}),
    },
    verification: "official-index",
    sources: [
      officialSource(
        item.url,
        isPodcast
          ? "Marvel official podcast index"
          : "Marvel official digital series index",
      ),
    ],
  };
});
const extra = {
  id: "avengers-secret-wars-2027-film",
  titleEn: "Avengers: Secret Wars",
  year: 2027,
  yearText: "2027",
  kind: "film",
  status: "announced",
  sourceFamily: "core",
  sources: [
    {
      url: "https://www.marvel.com/movies/avengers-secret-wars",
      retrievedAt: "2026-08-31T00:00:00Z",
      section: "Officially announced follow-up",
    },
  ],
};
const candidateTitles = new Set(
  candidates.map((item) => comparableTitle(item.titleEn)),
);
const additions = [...officialPrimaryExtras, ...officialDigitalWorks].filter(
  (item) =>
    item.id === "blade-marvel-studios-undated-film" ||
    !candidateTitles.has(comparableTitle(item.titleEn)),
);
const items = [
  ...candidates,
  ...additions,
  ...(candidates.some((w) => w.id === extra.id) ? [] : [extra]),
];
const manualOfficialWorkIds = new Map([
  ["https://www.marvel.com/movies/blade", "blade-marvel-studios-undated-film"],
  ["https://www.marvel.com/movies/spider-man", "spider-man-2002-film"],
  [
    "https://www.marvel.com/movies/x-men-dark-phoenix",
    "dark-phoenix-2019-film",
  ],
  [
    "https://www.marvel.com/tv-shows/marvel-s-inhumans/1",
    "inhumans-2017-series",
  ],
  [
    "https://www.marvel.com/tv-shows/animation/marvel-s-spider-man/2",
    "marvel-s-spider-man-2017-animated-series",
  ],
]);
const compatibleOfficialArtwork = (art, work) => {
  if (art.kind === "movie")
    return work.kind === "film" || work.kind === "animated-film";
  if (art.kind === "tv-season")
    // Marvel's TV index does not consistently place animated titles under an
    // /animation/ path (for example Hit-Monkey and M.O.D.O.K.). Keep both
    // television branches eligible and let the unique title match below
    // disambiguate duplicate live-action/animated titles.
    return [
      "series",
      "special",
      "documentary",
      "animated-series",
      "animated-film",
      "short",
    ].includes(work.kind);
  if (art.kind === "digital-series") return work.kind === "digital-series";
  if (art.kind === "podcast") return work.kind === "podcast";
  return false;
};
const officialWorkIdBySource = new Map(
  officialArtwork.items.map((art) => {
    const manual = manualOfficialWorkIds.get(art.sourcePage);
    if (manual) return [art.sourcePage, manual];
    const matches = items.filter(
      (work) =>
        compatibleOfficialArtwork(art, work) &&
        comparableTitle(art.title) === comparableTitle(work.titleEn),
    );
    return [art.sourcePage, matches.length === 1 ? matches[0].id : null];
  }),
);
const escapeXml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
const posterKindLabels = {
  film: "FEATURE FILM",
  series: "LIVE ACTION SERIES",
  "animated-film": "ANIMATED FEATURE",
  "animated-series": "ANIMATED SERIES",
  short: "SHORT / SPECIAL",
  special: "SPECIAL PRESENTATION",
  serial: "SERIAL",
  documentary: "DOCUMENTARY",
  "digital-series": "DIGITAL SERIES",
  podcast: "PODCAST",
};
const primaryPosterWorkIds = new Set(
  assets
    .filter((asset) => asset.kind === "poster" && asset.publish)
    .map((asset) => asset.workId),
);
const officialPosterWorkIds = new Set(
  [...officialWorkIdBySource.values()].filter(Boolean),
);
const archivePosterDir = path.join(root, "public", "media", "archive-posters");
await mkdir(archivePosterDir, { recursive: true });
const archivePosterById = new Map();
for (const item of items) {
  if (primaryPosterWorkIds.has(item.id) || officialPosterWorkIds.has(item.id))
    continue;
  const hue = [...item.id].reduce(
    (total, character) => (total * 31 + character.charCodeAt(0)) % 360,
    0,
  );
  const title = names[item.titleEn] ?? item.titleEn;
  const year = item.year ?? "TBA";
  const fileName = `${slug(item.id)}.svg`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1200" role="img" aria-labelledby="title description">
  <title id="title">${escapeXml(title)} · 档案设计海报</title>
  <desc id="description">Marvel Screen Archive 的原创档案设计海报，非官方素材。</desc>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 58% 9%)"/><stop offset="0.58" stop-color="hsl(${(hue + 42) % 360} 70% 22%)"/><stop offset="1" stop-color="hsl(${(hue + 180) % 360} 76% 8%)"/></linearGradient>
    <radialGradient id="glow"><stop stop-color="hsl(${(hue + 28) % 360} 92% 70%)" stop-opacity=".72"/><stop offset="1" stop-color="hsl(${hue} 80% 10%)" stop-opacity="0"/></radialGradient>
    <filter id="blur"><feGaussianBlur stdDeviation="34"/></filter>
    <pattern id="grain" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r=".7" fill="#fff" opacity=".12"/><circle cx="5" cy="6" r=".5" fill="#fff" opacity=".08"/></pattern>
  </defs>
  <rect width="800" height="1200" fill="url(#bg)"/>
  <circle cx="575" cy="340" r="300" fill="url(#glow)" filter="url(#blur)"/>
  <path d="M-80 880 C150 600 380 560 880 170" fill="none" stroke="#fff" stroke-opacity=".2" stroke-width="2"/>
  <path d="M-120 960 C170 640 440 630 920 240" fill="none" stroke="#fff" stroke-opacity=".1" stroke-width="1"/>
  <circle cx="620" cy="330" r="170" fill="none" stroke="#fff" stroke-opacity=".16" stroke-width="2"/>
  <circle cx="620" cy="330" r="230" fill="none" stroke="#fff" stroke-opacity=".09"/>
  <path d="M0 0h800v1200H0z" fill="url(#grain)"/>
  <rect x="54" y="54" width="692" height="1092" fill="none" stroke="#fff" stroke-opacity=".28"/>
  <text x="80" y="108" fill="#fff" font-size="22" letter-spacing="5" font-family="Arial, sans-serif">MARVEL SCREEN ARCHIVE</text>
  <text x="80" y="150" fill="#fff" opacity=".66" font-size="14" letter-spacing="3" font-family="Arial, sans-serif">ARCHIVE EDITION / ${escapeXml(posterKindLabels[item.kind] ?? "SCREEN WORK")}</text>
  <text x="80" y="790" fill="#fff" opacity=".84" font-size="28" letter-spacing="4" font-family="Arial, sans-serif">${escapeXml(year)}</text>
  <text x="80" y="865" fill="#fff" font-size="62" font-weight="700" font-family="Arial, PingFang SC, sans-serif">${escapeXml(title)}</text>
  <text x="80" y="920" fill="#fff" opacity=".8" font-size="22" letter-spacing="2" font-family="Arial, sans-serif">${escapeXml(item.titleEn)}</text>
  <line x1="80" y1="975" x2="720" y2="975" stroke="#fff" stroke-opacity=".4"/>
  <text x="80" y="1028" fill="#fff" opacity=".86" font-size="18" letter-spacing="3" font-family="Arial, PingFang SC, sans-serif">档案设计海报 · 非官方素材</text>
  <text x="80" y="1080" fill="#fff" opacity=".52" font-size="14" letter-spacing="2" font-family="Arial, sans-serif">IDENTIFICATION ARTWORK / NOT AN OFFICIAL POSTER</text>
</svg>
`;
  await writeFile(path.join(archivePosterDir, fileName), svg);
  archivePosterById.set(item.id, `/media/archive-posters/${fileName}`);
}
const people = new Map();
function group(w) {
  if (w.sourceFamily === "official-digital")
    return w.kind === "podcast" ? "漫威官方播客" : "漫威官方数字节目";
  if (phases.some((p) => p.includes(w.id))) return "MCU";
  if (televisionMcu.includes(w.titleEn)) return "MCU";
  if (
    ["What If...?", "Marvel Zombies", "Eyes of Wakanda", "I Am Groot"].includes(
      w.titleEn,
    )
  )
    return "MCU 动画／分支";
  if (w.sourceFamily === "imprint") return "旗下出版品牌";
  if (w.sourceFamily === "collaboration") return "历史合作／关联";
  if (/Spider-Verse|Spider Within/.test(w.titleEn)) return "蜘蛛侠动画宇宙";
  if (/^(Venom|Morbius|Madame Web|Kraven the Hunter)/.test(w.titleEn))
    return "索尼相关宇宙";
  if (
    w.kind === "film" &&
    /^(X-Men|X2$|The Wolverine|Logan$|Deadpool|Dark Phoenix|The New Mutants)/.test(
      w.titleEn,
    )
  )
    return "X战警电影系列";
  if (
    w.kind === "film" &&
    /^Spider-Man/.test(w.titleEn) &&
    w.year >= 2002 &&
    w.year <= 2007
  )
    return "蜘蛛侠 · 雷米系列";
  if (w.kind === "film" && /^The Amazing Spider-Man/.test(w.titleEn))
    return "超凡蜘蛛侠系列";
  if (w.kind === "documentary") return "纪录／幕后";
  if (w.kind.includes("animated")) return "其他动画世界";
  return "其他真人世界";
}
const works = items
  .map((w) => {
    const e = enriched[w.sources[0]?.workUrl?.split("#")[0]] ?? {},
      c = curated[w.id] ?? {};
    const workPeople = [];
    for (const p of e.people ?? []) {
      if (
        ![
          "Starring",
          "Directed by",
          "Voices of",
          "Created by",
          "Developed by",
        ].includes(p.department)
      )
        continue;
      const id =
        "p-" + createHash("sha256").update(p.url).digest("hex").slice(0, 12);
      let person = people.get(id);
      if (!person) {
        const portrait = personArtById.get(id);
        person = {
          id,
          name: peopleZh[p.name] ?? p.name,
          nameEn: p.name,
          departments: [],
          workIds: [],
          source: p.url,
          portrait: portrait?.portrait ?? null,
          portraitKind: portrait?.kind ?? null,
          portraitCredit:
            portrait?.kind === "wikimedia-commons"
              ? `${portrait.author} · ${portrait.license}`
              : portrait
                ? "本地生成的姓名身份头像，不是真人照片"
                : null,
          portraitSource: portrait?.sourcePage ?? null,
          portraitLicenseUrl: portrait?.licenseUrl ?? null,
        };
        people.set(id, person);
      }
      const department =
        p.department === "Directed by"
          ? "director"
          : p.department === "Starring" || p.department === "Voices of"
            ? "actor"
            : "creator";
      if (!person.departments.includes(department))
        person.departments.push(department);
      if (!person.workIds.includes(w.id)) person.workIds.push(w.id);
      if (!workPeople.includes(id)) workPeople.push(id);
    }
    const poster = assets.find(
        (a) => a.workId === w.id && a.kind === "poster" && a.publish,
      ),
      backdrop = assets.find(
        (a) => a.workId === w.id && a.kind === "backdrop" && a.publish,
      ),
      officialArt = officialArtwork.items
        .filter(
          (item) =>
            item.publish &&
            officialWorkIdBySource.get(item.sourcePage) === w.id,
        )
        .sort((a, b) => {
          const aFirst = /\/1$/.test(a.sourcePage) ? 0 : 1,
            bFirst = /\/1$/.test(b.sourcePage) ? 0 : 1;
          return aFirst - bFirst;
        })[0];
    const sources = w.sources.map((s) => ({
      title: s.workUrl ? "片目索引 · Wikipedia" : "官方项目资料",
      url: s.workUrl ?? s.url,
      checkedAt: s.retrievedAt?.slice(0, 10) ?? null,
      verification: "retrieved",
    }));
    if (c.primary)
      sources.unshift({
        title: "官方作品／公告资料",
        url: c.primary,
        checkedAt: "2026-08-31",
        verification: "editor-reviewed",
      });
    const official = e.officialSources?.find(
      (s) => s.title === "Official website",
    );
    if (official && !sources.some((s) => s.url === official.url))
      sources.push({
        title: "官方页面 · 链接待复核",
        url: official.url,
        checkedAt: null,
        verification: "candidate",
      });
    if (
      officialArt &&
      !sources.some((source) => source.url === officialArt.sourcePage)
    )
      sources.unshift({
        title: "Marvel 官方作品页面",
        url: officialArt.sourcePage,
        checkedAt: officialArt.checkedAt,
        verification: "editor-reviewed",
      });
    const primary = Boolean(c.primary || w.verification === "official-index");
    const officialSeasons = officialIndex.tvSeasons
      .filter((season) => {
        const sourcePage = new URL(season.href, "https://www.marvel.com").href;
        return officialWorkIdBySource.get(sourcePage) === w.id;
      })
      .map((season) => ({
        label: season.title,
        url: new URL(season.href, "https://www.marvel.com").href,
        image:
          officialArtwork.items.find(
            (art) => art.publish && art.sourcePage.endsWith(season.href),
          )?.local ?? null,
      }));
    const importedSeasons =
      w.kind.includes("series") || w.kind === "documentary"
        ? (e.seasonLinks ?? [])
            .filter((s) => {
              const seasonStem = decodeURIComponent(
                new URL(s.url).pathname.split("/").pop() ?? "",
              )
                .replace(/_\(season_\d+\).*$/i, "")
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "");
              return (
                seasonStem === w.titleEn.toLowerCase().replace(/[^a-z0-9]/g, "")
              );
            })
            .map((season) => ({ ...season, image: null }))
        : [];
    return {
      id: w.id,
      title: names[w.titleEn] ?? w.titleEn,
      titleEn: w.titleEn,
      translated: Boolean(names[w.titleEn]),
      year: w.year,
      yearText: w.yearText,
      kind: c.kind ?? w.kind,
      status: c.status ?? w.status,
      date: c.date ?? null,
      universe: group(w),
      phase:
        phases.findIndex((p) => p.includes(w.id)) >= 0
          ? phases.findIndex((p) => p.includes(w.id)) + 1
          : null,
      summary:
        c.summary ??
        w.summary ??
        "这份档案保留作品年份、媒介类型与演职员索引。剧情简介和重要事件仍在逐条整理；未经核验的内容不会补写成事实。",
      highlights: c.highlights ?? [],
      poster:
        poster?.local ?? officialArt?.local ?? archivePosterById.get(w.id) ?? null,
      backdrop: backdrop?.local ?? null,
      posterCredit:
        poster?.credit ??
        (officialArt
          ? `Marvel 官方宣传图 · © Marvel/Disney · 低分辨率资料识别用途 · 来源 ${officialArt.sourcePage}`
          : archivePosterById.has(w.id)
            ? "档案设计海报 · 非官方素材 · 由本项目原创生成"
            : null),
      verification: primary ? "primary-partial" : "catalogue-only",
      sourceFamily: w.sourceFamily,
      edition: w.sources.some((s) => s.section?.includes("Episodes as films"))
        ? "电视剧集的电影发行版本，与剧集主档案分别标注"
        : null,
      facts: cleanFacts({ ...(w.rowFacts ?? {}), ...(e.facts ?? {}) }),
      people: workPeople,
      characters: characters
        .filter((c) => c.works.includes(w.id))
        .map((c) => c.id),
      seasons: [...officialSeasons, ...importedSeasons].filter(
        (season, index, all) =>
          all.findIndex((other) => other.url === season.url) === index,
      ),
      sources,
      media: media.filter((m) => m.workId === w.id && m.status !== "candidate"),
      watchLinks: [],
    };
  })
  .sort(
    (a, b) =>
      (a.year ?? 9999) - (b.year ?? 9999) || a.titleEn.localeCompare(b.titleEn),
  );
const output = {
  cutoff: "2026-08-31",
  generatedAt: new Date().toISOString(),
  works,
  people: [...people.values()],
  characters: characters.map((c) => ({
    ...c,
    portrait: `/media/characters/${c.id}.svg`,
  })),
  audit: {
    candidateCount: works.length,
    primaryReviewed: works.filter((w) => w.verification === "primary-partial")
      .length,
    posterCount: works.filter((w) => w.poster).length,
    officialArtworkCount: works.filter((w) =>
      w.poster?.startsWith("/media/official/"),
    ).length,
    archiveDesignPosterCount: works.filter((w) =>
      w.poster?.startsWith("/media/archive-posters/"),
    ).length,
    officialDigitalSeriesCount: officialDigitalWorks.length,
    officialDigitalEpisodeTotal:
      officialIndex.audit?.officialDigitalEpisodeTotalObserved ?? 0,
    officialDigitalEpisodeUniquePages: officialEpisodes.series.reduce(
      (total, series) => total + series.observedTotal,
      0,
    ),
    officialDigitalEpisodeExactSeries: officialEpisodes.series.filter(
      (series) => series.expectedTotal === series.observedTotal,
    ).length,
    officialDigitalEpisodeMismatchSeries: officialEpisodes.series.filter(
      (series) => series.expectedTotal !== series.observedTotal,
    ).length,
    personPortraitCount: [...people.values()].filter(
      (person) => person.portrait,
    ).length,
    personRealPortraitCount: [...people.values()].filter(
      (person) => person.portraitKind === "wikimedia-commons",
    ).length,
    watchLinkCount: 0,
    untranslated: works.filter((w) => !w.translated).length,
    gaps: [
      "电影与电视主目录已和 Marvel 官方索引交叉核对；历史授权、合作及品牌改编仍需继续逐条核验",
      "23 个有公开单集列表的 Marvel 官方数字系列已索引 1,881 个唯一详情页；其中 17 个系列与页面标称总数一致，6 个系列保留计数差异待核。无公开单集列表的节目与播客仍只有系列级档案",
      "角色出场为人工整理的首批关系，尚未覆盖全部角色与客串",
      "全部 1,315 位索引人物均有头像节点，其中 348 张为带许可来源的 Wikimedia Commons 真人照片，其余使用明确标注的本地姓名身份头像；227 条历史／动画记录使用原创档案设计海报，真实海报与经典剧照仍需逐条核验",
      "音乐、对白、访谈和大陆／海外两条线路的实际播放核验尚未完成；当前不提供未经验证的播放链接",
    ],
  },
};
await mkdir(path.join(root, "public/data"), { recursive: true });
await writeFile(
  path.join(root, "data/catalogue.json"),
  JSON.stringify(output, null, 2) + "\n",
);
console.log({ works: works.length, people: people.size, ...output.audit });
