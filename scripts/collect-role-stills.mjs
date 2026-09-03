/**
 * Gather role-image candidates for the relationship graph.  These are never
 * published directly: each source is pinned to an MCU screen-role page and is
 * subsequently checked in a contact sheet before it can be copied into the
 * visible role-stills folder.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "public/media/role-review");
const ledgerPath = path.join(root, "data/role-still-review.json");
const roles = [
  ["pepper-potts", "Pepper Potts"], ["james-rhodes", "James Rhodes"], ["happy-hogan", "Happy Hogan"], ["obadiah-stane", "Obadiah Stane"], ["yinsen", "Ho Yinsen"], ["whiplash", "Ivan Vanko"], ["justin-hammer", "Justin Hammer"], ["aldrich-killian", "Aldrich Killian"], ["bruce-banner", "Bruce Banner"], ["clint-barton", "Clint Barton"], ["nick-fury", "Nick Fury"], ["loki-character", "Loki"], ["thanos-character", "Thanos"], ["ultron-character", "Ultron"], ["vision-character", "Vision"], ["sam-wilson", "Sam Wilson"], ["bucky-barnes", "James Barnes"], ["baron-zemo", "Helmut Zemo"], ["tchalla", "T'Challa"], ["shuri", "Shuri"], ["erik-killmonger", "Erik Killmonger"], ["scott-lang", "Scott Lang"], ["hope-van-dyne", "Hope van Dyne"], ["peter-quill", "Peter Quill"], ["gamora", "Gamora"], ["rocket", "Rocket Raccoon"], ["drax", "Drax"], ["nebula", "Nebula"], ["carol-danvers", "Carol Danvers"], ["hela", "Hela"], ["valkyrie", "Valkyrie"], ["wong", "Wong"], ["norman-osborn", "Norman Osborn"], ["otto-octavius", "Otto Octavius"], ["mj-watson", "Michelle Jones"], ["charles-xavier", "Charles Xavier"], ["erik-lehnsherr", "Erik Lehnsherr"], ["jean-grey", "Jean Grey"], ["storm", "Ororo Munroe"], ["mystique", "Raven Darkhölme"], ["wade-wilson", "Wade Wilson"], ["eddie-brock", "Eddie Brock"], ["reed-richards", "Reed Richards"], ["victor-von-doom", "Victor von Doom"],
];
// Page titles are specified only when Fandom's ordinary name search favours a
// comics counterpart. These source pages identify the on-screen continuity
// before their thumbnails ever reach the visual-review folder.
const screenPageTitles = {
  "pepper-potts": "Virginia Potts (Earth-199999)",
  "happy-hogan": "Harold Hogan (Earth-199999)",
  whiplash: "Ivan Vanko (Whiplash) (Earth-199999)",
  "clint-barton": "Clinton Barton (Earth-199999)",
  "nick-fury": "Nicholas Fury (Earth-199999)",
  "ultron-character": "Ultron (Earth-199999)",
  "sam-wilson": "Samuel Wilson (Earth-199999)",
  "erik-killmonger": "N'Jadaka (Earth-199999)",
  valkyrie: "Brunnhilde (Earth-199999)",
  "charles-xavier": "Charles Xavier (Earth-10005)",
  "erik-lehnsherr": "Erik Lehnsherr (Earth-10005)",
  storm: "Ororo Munroe (Earth-10005)",
  mystique: "Raven Darkhölme (Earth-10005)",
  "eddie-brock": "Eddie Brock (Earth-TRN688)",
  "reed-richards": "Reed Richards (Earth-121698)",
  "victor-von-doom": "Victor von Doom (Earth-121698)",
};

const normalize = (value = "") => value.normalize("NFKD").replace(/[\p{M}]/gu, "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
await mkdir(outDir, { recursive: true });
let ledger = { items: [] };
try { ledger = JSON.parse(await readFile(ledgerPath, "utf8")); } catch {}
const previous = new Map((ledger.items ?? []).map((item) => [item.id, item]));

for (const [id, name] of roles) {
  if (previous.get(id)?.file && !screenPageTitles[id]) continue;
  const url = new URL("https://marvel.fandom.com/api.php");
  const preferredTitle = screenPageTitles[id];
  url.search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", ...(preferredTitle ? { titles: preferredTitle } : { generator: "search", gsrnamespace: "0", gsrlimit: "16", gsrsearch: `\"${name}\"` }), prop: "pageimages|info", piprop: "thumbnail|name", pithumbsize: "720", inprop: "url", origin: "*" });
  try {
    const response = await fetch(url, { headers: { "user-agent": "LEOYOYOFIONA Marvel fan archive role visual audit" }, signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    const target = (data.query?.pages ?? [])
      .filter((page) => (preferredTitle || normalize(page.title).includes(normalize(name))) && page.thumbnail?.source)
      .sort((left, right) => rolePageScore(right.title) - rolePageScore(left.title))[0];
    if (!target?.thumbnail?.source) throw new Error("no screen-role image");
    const image = await fetch(target.thumbnail.source, { headers: { "user-agent": "LEOYOYOFIONA Marvel fan archive role visual audit" }, signal: AbortSignal.timeout(20_000) });
    const bytes = Buffer.from(await image.arrayBuffer());
    const type = image.headers.get("content-type") ?? "";
    if (!image.ok || !type.startsWith("image/") || bytes.length < 1200) throw new Error("invalid image response");
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    const file = `${id}.${ext}`;
    await writeFile(path.join(outDir, file), bytes);
    previous.set(id, { id, name, file: `/media/role-review/${file}`, title: target.title, sourcePage: target.fullurl, sourceImage: target.thumbnail.source, bytes: bytes.length, status: "candidate-needs-visual-review" });
    console.log(`${id} OK ${target.title}`);
  } catch (error) {
    previous.set(id, { id, name, status: "no-candidate", error: error instanceof Error ? error.message : String(error) });
    console.log(`${id} SKIP`);
  }
  await delay(250);
}
await writeFile(ledgerPath, `${JSON.stringify({ checkedAt: new Date().toISOString().slice(0, 10), items: roles.map(([id]) => previous.get(id)) }, null, 2)}\n`);

function rolePageScore(title) {
  const normalized = normalize(title);
  let score = 0;
  if (normalized.includes("earth 199999")) score += 100;
  if (normalized.includes("earth 10005")) score += 90;
  if (normalized.includes("from")) score += 20;
  if (normalized.includes("gallery")) score -= 10;
  if (normalized.includes("earth 616")) score -= 100;
  return score;
}
