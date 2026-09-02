import { access, readFile } from "node:fs/promises";
import { qualifiedWatchLink } from "../lib/community-validation.mjs";
const d = JSON.parse(
  await readFile(new URL("../data/catalogue.json", import.meta.url), "utf8"),
);
const ids = new Set(d.works.map((w) => w.id)),
  people = new Set(d.people.map((p) => p.id)),
  errors = [];
if (ids.size !== d.works.length) errors.push("Duplicate work IDs");
for (const w of d.works) {
  if (!w.sources.length) errors.push(w.id + ": missing source");
  if (!w.title || !w.titleEn) errors.push(w.id + ": missing title");
  if (!w.poster) errors.push(w.id + ": missing poster");
  else if (w.poster.startsWith("/")) {
    try {
      await access(new URL("../public" + w.poster, import.meta.url));
    } catch {
      errors.push(w.id + ": poster file missing");
    }
  }
  if (!w.media.every((m) => m.status !== "candidate"))
    errors.push(w.id + ": unpublished media candidate leaked");
  for (const m of w.media) {
    if (m.url.startsWith("/media/")) {
      try {
        await access(new URL("../public" + m.url, import.meta.url));
      } catch {
        errors.push(w.id + ": media file missing: " + m.url);
      }
    }
  }
  if (!w.people.every((id) => people.has(id)))
    errors.push(w.id + ": dangling person");
  if (w.phase && !["MCU"].includes(w.universe))
    errors.push(w.id + ": non-MCU phase");
  if (
    Object.values(w.facts).some((value) =>
      /mw-parser-output|<script|<style/.test(value),
    )
  )
    errors.push(w.id + ": stylesheet contaminated a fact");
  if (
    w.watchLinks.some(
      (link) => !qualifiedWatchLink(link, new Date(d.cutoff + "T23:59:59Z")),
    )
  )
    errors.push(w.id + ": disallowed watch link");
}
for (const p of d.people)
  if (!p.workIds.every((id) => ids.has(id)))
    errors.push(p.id + ": dangling work");
for (const c of d.characters)
  if (!c.works.every((id) => ids.has(id)))
    errors.push(c.id + ": dangling character appearance");
const fakeMotionPosterMedia = d.works.flatMap((w) =>
  w.media.filter(
    (m) =>
      m.region === "mainland" &&
      m.status === "playback-verified" &&
      m.url.startsWith("/media/mainland-motion-posters/"),
  ),
);
if (fakeMotionPosterMedia.length)
  errors.push(
    `fake motion-poster media must not be published as playback: ${fakeMotionPosterMedia.length}`,
  );
const mainlandPlaybackCount = d.works.reduce(
  (total, w) =>
    total +
    w.media.filter(
      (m) => m.region === "mainland" && m.status === "playback-verified",
    ).length,
  0,
);
const playbackTargetStatus =
  mainlandPlaybackCount >= 100 ? "reached" : "below-target-after-live-audit";
console.log(
  JSON.stringify(
    {
      structuralValidation: errors.length ? "FAIL" : "PASS",
      records: d.works.length,
      people: d.people.length,
      errors,
      mainlandPlaybackCount,
      mainlandPlaybackTarget: 100,
      playbackTargetStatus,
      editorialCompletion: false,
      openGaps: d.audit.gaps,
    },
    null,
    2,
  ),
);
if (errors.length) process.exitCode = 1;
