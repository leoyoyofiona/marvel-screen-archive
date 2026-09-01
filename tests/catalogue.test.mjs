import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  qualifiedWatchLink,
  validateComment,
} from "../lib/community-validation.mjs";
const data = JSON.parse(
  await readFile(new URL("../data/catalogue.json", import.meta.url), "utf8"),
);
const referenceChecklist = JSON.parse(
  await readFile(
    new URL("../data/reference-checklist.json", import.meta.url),
    "utf8",
  ),
);
const sourceIndexAudit = JSON.parse(
  await readFile(
    new URL("../data/source-index-audit.json", import.meta.url),
    "utf8",
  ),
);
const relationshipPayload = JSON.parse(
  await readFile(
    new URL("../public/data/relationships.json", import.meta.url),
    "utf8",
  ),
);
const soundtrackLinks = JSON.parse(
  await readFile(
    new URL("../public/data/soundtracks.json", import.meta.url),
    "utf8",
  ),
);
const officialIndex = JSON.parse(
  await readFile(
    new URL("../data/official-index.json", import.meta.url),
    "utf8",
  ),
);
const officialEpisodesText = await readFile(
  new URL("../data/official-episodes.json", import.meta.url),
  "utf8",
);
const officialEpisodes = JSON.parse(officialEpisodesText);
test("stable unique work IDs and referential integrity", () => {
  const ids = new Set(data.works.map((w) => w.id));
  assert.equal(ids.size, data.works.length);
  for (const p of data.people)
    for (const id of p.workIds) assert.ok(ids.has(id));
  for (const c of data.characters)
    for (const id of c.works) assert.ok(ids.has(id));
});
test("all 56 user reference-list items resolve without inflating season counts", () => {
  const workIds = new Set(data.works.map((work) => work.id));
  const items = referenceChecklist.groups.flatMap((group) => group.items);
  assert.equal(items.length, 56);
  assert.deepEqual(
    items.map((item) => item.order),
    Array.from({ length: 56 }, (_, index) => index + 1),
  );
  for (const item of items) {
    assert.ok(workIds.has(item.workId), `missing reference work ${item.workId}`);
  }
  assert.equal(
    items.filter((item) => item.workId === "loki-2021-series").length,
    2,
  );
  assert.equal(
    items.filter((item) => item.workId === "i-am-groot-2022-animated-series")
      .length,
    2,
  );
});
test("fresh primary index snapshot matches the imported candidate inventory", () => {
  assert.equal(sourceIndexAudit.freshCandidateCount, 319);
  assert.equal(sourceIndexAudit.baselineCandidateCount, 319);
  assert.equal(sourceIndexAudit.freshOnlyCount, 0);
  assert.equal(sourceIndexAudit.removedCount, 0);
  assert.equal(
    data.works.length,
    sourceIndexAudit.freshCandidateCount + data.audit.officialDigitalSeriesCount + 5,
  );
});
test("every work has a Chinese archive title while preserving its source title", () => {
  assert.equal(data.audit.untranslated, 0);
  for (const work of data.works) {
    assert.ok(work.title.trim(), `missing Chinese archive title for ${work.id}`);
    assert.ok(work.titleEn.trim(), `missing source title for ${work.id}`);
    assert.equal(work.translated, true, `untranslated work ${work.id}`);
  }
});
test("reviewed official work hubs are available without becoming film links", () => {
  const officialHub = /^https:\/\/(?:www\.)?(?:marvel\.com\/(?:movies|tv-shows)\/|sonypictures\.com\/movies\/)|^https:\/\/marvel\.disney\.co\.jp\/movie\//;
  const worksWithHub = data.works.filter((work) =>
    work.sources.some(
      (source) =>
        source.verification === "editor-reviewed" && officialHub.test(source.url),
    ),
  );
  assert.ok(worksWithHub.length >= 50);
  assert.ok(worksWithHub.every((work) => work.watchLinks.length === 0));
});
test("every current Marvel official index entry maps to a catalogue record", () => {
  const officialEntries = [
    ...(officialIndex.movies ?? []),
    ...(officialIndex.tvSeasons ?? []),
    ...(officialIndex.digitalSeries ?? []),
    ...(officialIndex.podcasts ?? []),
  ];
  const mapped = officialEntries.filter((entry) =>
    data.works.some(
      (work) =>
        work.sources.some((source) => source.url.endsWith(entry.href)) ||
        work.seasons.some((season) => season.url.endsWith(entry.href)),
    ),
  );
  assert.equal(mapped.length, officialEntries.length);
});
test("offline shell stays same-origin and never caches live APIs", async () => {
  const serviceWorker = await readFile(
    new URL("../public/sw.js", import.meta.url),
    "utf8",
  );
  const manifest = JSON.parse(
    await readFile(
      new URL("../public/manifest.webmanifest", import.meta.url),
      "utf8",
    ),
  );
  assert.match(serviceWorker, /url\.origin !== self\.location\.origin/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/api\/"\)/);
  assert.match(serviceWorker, /url\.pathname\.startsWith\("\/data\/"\)/);
  assert.doesNotMatch(serviceWorker, /youtube|bilibili|marvel\.com|google/i);
  assert.equal(manifest.start_url, "/");
  assert.ok(manifest.icons.every((icon) => icon.src.startsWith("/")));
});
test("relationship graph payload is complete but strips work-detail fields", () => {
  assert.equal(relationshipPayload.works.length, data.works.length);
  assert.equal(relationshipPayload.people.length, data.people.length);
  assert.equal(relationshipPayload.characters.length, data.characters.length);
  assert.deepEqual(
    Object.keys(relationshipPayload.works[0]).sort(),
    ["id", "title", "year"],
  );
  assert.ok(
    relationshipPayload.people.every(
      (person) => person.portrait?.startsWith("/media/people/"),
    ),
  );
});
test("soundtrack hall only exposes reviewed official music pages", () => {
  assert.equal(soundtrackLinks.length, 12);
  assert.ok(
    soundtrackLinks.every(
      (item) =>
        /^https:\/\/music\.apple\.com\//.test(item.url) &&
        item.provider.includes("Apple Music") &&
        item.checkedAt === "2026-09-01",
    ),
  );
});
test("distinct universes never gain an MCU phase from a shared year", () => {
  for (const id of [
    "venom-2018-film",
    "spider-man-into-the-spider-verse-2018-animated-film",
    "x-men-2000-film",
  ]) {
    const w = data.works.find((w) => w.id === id);
    assert.ok(w);
    assert.notEqual(w.universe, "MCU");
    assert.equal(w.phase, null);
  }
});
test("future titles cannot be marked as already released", () => {
  assert.equal(
    data.works.find((w) => w.id === "avengers-doomsday-2026-film").status,
    "announced",
  );
  assert.equal(
    data.works.find((w) => w.id === "visionquest-2026-series").status,
    "announced",
  );
  assert.ok(data.works.some((w) => w.id === "avengers-secret-wars-2027-film"));
});
test("archival serial and unreleased 1994 film keep honest formats", () => {
  assert.equal(
    data.works.find((w) => w.id === "captain-america-1944-short").kind,
    "serial",
  );
  assert.equal(
    data.works.find((w) => w.id === "the-fantastic-four-1994-film").status,
    "unreleased",
  );
});
test("official Marvel indexes add digital series, podcasts and observed episode totals", () => {
  assert.equal(data.audit.officialDigitalSeriesCount, 41);
  assert.equal(data.audit.officialDigitalEpisodeTotal, 1890);
  assert.ok(
    data.works.some(
      (w) =>
        w.id === "official-marvel-live-digital-series" &&
        w.facts["Official indexed episodes"] === "359",
    ),
  );
  assert.ok(
    data.works.some(
      (w) =>
        w.id === "official-the-official-marvel-podcast-podcast" &&
        w.kind === "podcast",
    ),
  );
});
test("official digital episodes are indexed as unique source pages without expiring streams", () => {
  assert.equal(officialEpisodes.series.length, 23);
  assert.equal(
    officialEpisodes.series.reduce(
      (total, series) => total + series.observedTotal,
      0,
    ),
    1881,
  );
  assert.equal(
    officialEpisodes.series.filter(
      (series) => series.expectedTotal === series.observedTotal,
    ).length,
    17,
  );
  for (const series of officialEpisodes.series) {
    assert.equal(series.observedTotal, series.episodes.length);
    assert.equal(
      new Set(series.episodes.map((episode) => episode.detailURL)).size,
      series.episodes.length,
    );
    assert.ok(
      series.episodes.every(
        (episode) =>
          episode.title &&
          episode.detailURL.startsWith("https://www.marvel.com/"),
      ),
    );
  }
  assert.doesNotMatch(
    officialEpisodesText,
    /fastly_token|manifest\.prod\.boltdns|brightcovecdn/i,
  );
  assert.equal(data.audit.officialDigitalEpisodeUniquePages, 1881);
  assert.equal(data.audit.officialDigitalEpisodeExactSeries, 17);
  assert.equal(data.audit.officialDigitalEpisodeMismatchSeries, 6);
});
test("official artwork and season hierarchy are linked to the correct records", () => {
  assert.ok(data.audit.officialArtworkCount >= 130);
  const loki = data.works.find((w) => w.id === "loki-2021-series");
  assert.deepEqual(loki.seasons.map((season) => season.label).sort(), [
    "Loki | Season 1",
    "Loki | Season 2",
  ]);
  assert.ok(
    loki.seasons.every((season) =>
      season.image?.startsWith("/media/official/"),
    ),
  );
  const whatIf = data.works.find(
    (w) => w.id === "what-if-2021-animated-series",
  );
  assert.equal(whatIf.seasons.length, 3);
  assert.ok(whatIf.seasons.every((season) => season.image));
});
test("every work has a local poster asset with an explicit provenance label", () => {
  assert.equal(data.audit.posterCount, data.works.length);
  assert.equal(
    data.audit.officialArtworkCount + data.audit.archiveDesignPosterCount,
    data.works.length,
  );
  assert.ok(
    data.works.every(
      (work) =>
        work.poster?.startsWith("/media/") &&
        work.posterCredit &&
        (work.poster?.startsWith("/media/official/") ||
          work.posterCredit.includes("非官方素材")),
    ),
  );
});
test("same-name works never inherit artwork or seasons from another era or format", () => {
  const noOfficialArtwork = [
    "spider-man-1967-animated-series",
    "spider-man-1977-film",
    "spider-man-1978-series",
    "spider-man-1981-animated-series",
    "blade-1998-film",
    "black-panther-2010-animated-series",
    "the-punisher-1989-film",
    "the-punisher-2004-film",
    "daredevil-2003-film",
    "agent-carter-2013-short",
  ];
  for (const id of noOfficialArtwork) {
    const work = data.works.find((candidate) => candidate.id === id);
    assert.ok(work, id);
    assert.ok(work.poster?.startsWith("/media/archive-posters/"), id);
    assert.match(work.posterCredit ?? "", /非官方素材/);
    assert.equal(work.seasons.length, 0, id);
  }
  const spiderMan2002 = data.works.find(
    (work) => work.id === "spider-man-2002-film",
  );
  assert.ok(spiderMan2002.poster?.startsWith("/media/official/"));
  assert.equal(spiderMan2002.seasons.length, 0);
  const futureBlade = data.works.find(
    (work) => work.id === "blade-marvel-studios-undated-film",
  );
  assert.equal(futureBlade.year, null);
  assert.equal(futureBlade.status, "announced");
  assert.ok(futureBlade.poster?.startsWith("/media/official/"));
  assert.match(futureBlade.summary, /Mahershala Ali/);
});
test("every indexed person and curated character has a visible local avatar", () => {
  assert.equal(data.audit.personPortraitCount, data.people.length);
  assert.ok(data.audit.personRealPortraitCount >= 300);
  assert.ok(
    data.people.every((person) =>
      person.portrait?.startsWith("/media/people/"),
    ),
  );
  assert.ok(
    data.people
      .filter((person) => person.portraitKind === "wikimedia-commons")
      .every(
        (person) =>
          person.portraitSource?.startsWith("https://commons.wikimedia.org/") &&
          person.portraitCredit,
      ),
  );
  assert.ok(
    data.characters.every((character) =>
      character.portrait?.startsWith("/media/characters/"),
    ),
  );
});
test("the mainland default route can render every archive image without an external asset host", () => {
  for (const work of data.works) {
    for (const asset of [work.poster, work.backdrop].filter(Boolean))
      assert.ok(asset.startsWith("/"), `${work.id}: ${asset}`);
    for (const season of work.seasons)
      if (season.image)
        assert.ok(season.image.startsWith("/"), `${work.id}: ${season.image}`);
  }
  assert.ok(data.people.every((person) => person.portrait.startsWith("/")));
  assert.ok(
    data.characters.every((character) => character.portrait.startsWith("/")),
  );
});
test("undated officially listed projects stay undated and announced", () => {
  const blackPanther3 = data.works.find(
    (w) => w.id === "black-panther-3-undated-film",
  );
  assert.equal(blackPanther3.year, null);
  assert.equal(blackPanther3.status, "announced");
});
test("no unreviewed media silently becomes verified playback", () => {
  for (const w of data.works) {
    assert.ok(w.sources.length);
    for (const m of w.media) assert.notEqual(m.status, "candidate");
    for (const link of w.watchLinks)
      assert.ok(qualifiedWatchLink(link, new Date("2026-08-31T12:00:00Z")));
  }
});
test("film gate requires every assurance and expires after 30 days", () => {
  const base = {
    url: "https://official.example/movie",
    resolution: "1080p",
    free: true,
    requiresLogin: false,
    requiresSubscription: false,
    hasForcedAds: false,
    complete: true,
    legalSource: true,
    regionUnrestricted: true,
    browserVerified: true,
    lastVerifiedAt: "2026-08-31T00:00:00Z",
  };
  const now = new Date("2026-08-31T12:00:00Z");
  assert.ok(qualifiedWatchLink(base, now));
  for (const key of [
    "free",
    "complete",
    "legalSource",
    "regionUnrestricted",
    "browserVerified",
  ])
    assert.equal(qualifiedWatchLink({ ...base, [key]: false }, now), false);
  for (const key of ["requiresLogin", "requiresSubscription", "hasForcedAds"])
    assert.equal(qualifiedWatchLink({ ...base, [key]: true }, now), false);
  assert.equal(
    qualifiedWatchLink({ ...base, resolution: "unknown" }, now),
    false,
  );
  assert.equal(
    qualifiedWatchLink({ ...base, lastVerifiedAt: "2026-07-01" }, now),
    false,
  );
  assert.equal(
    qualifiedWatchLink({ ...base, url: "javascript:alert(1)" }, now),
    false,
  );
});
test("comment validation: limits, no external links or executable markup", () => {
  assert.deepEqual(
    validateComment({
      name: "影迷",
      body: "第一次在电影院看到钢铁侠，还记得。",
    }),
    { name: "影迷", body: "第一次在电影院看到钢铁侠，还记得。" },
  );
  assert.ok(validateComment({ name: "a", body: "a" }).error);
  assert.ok(validateComment({ name: "a", body: "https://spam.example" }).error);
  assert.ok(
    validateComment({ name: "a", body: "<script>alert(1)</script>" }).error,
  );
  assert.ok(
    validateComment({ name: "a", body: "这条留言", website: "bot.example" })
      .error,
  );
});
