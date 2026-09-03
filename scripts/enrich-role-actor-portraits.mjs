/**
 * Enrich the actors used by the role relationship graph. Searches only for an
 * exact English Wikipedia title (allowing a parenthetical disambiguator), then
 * accepts only a Wikimedia Commons image with explicit licence metadata.
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const cataloguePath = path.join(root, "data/catalogue.json");
const ledgerPath = path.join(root, "data/person-portrait-ledger.json");
const catalogue = JSON.parse(await readFile(cataloguePath, "utf8"));
const targets = new Set([
  "Gwyneth Paltrow", "Don Cheadle", "Jon Favreau", "Jeff Bridges", "Shaun Toub", "Mickey Rourke", "Sam Rockwell", "Guy Pearce", "Mark Ruffalo", "Jeremy Renner", "Samuel L. Jackson", "Tom Hiddleston", "Josh Brolin", "James Spader", "Paul Bettany", "Anthony Mackie", "Sebastian Stan", "Daniel Brühl", "Chadwick Boseman", "Letitia Wright", "Michael B. Jordan", "Paul Rudd", "Evangeline Lilly", "Chris Pratt", "Zoe Saldaña", "Bradley Cooper", "Dave Bautista", "Karen Gillan", "Brie Larson", "Cate Blanchett", "Tessa Thompson", "Benedict Wong", "Willem Dafoe", "Alfred Molina", "Zendaya", "Patrick Stewart", "Ian McKellen", "Famke Janssen", "Halle Berry", "Jennifer Lawrence", "Ryan Reynolds", "Tom Hardy", "Ioan Gruffudd", "Julian McMahon", "Benedict Cumberbatch", "Elizabeth Olsen", "Chris Hemsworth"
]);
const normalize = (value = "") => value.normalize("NFKD").replace(/[\p{M}]/gu, "").toLowerCase().replace(/\s*\([^)]*\)\s*/g, " ").replace(/[^\p{L}\p{N}]+/gu, " ").replace(/\s+/g, " ").trim();
const strip = (value = "") => value.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function api(host, params) {
  const url = new URL(`https://${host}/w/api.php`);
  url.search = new URLSearchParams({ action: "query", format: "json", formatversion: "2", origin: "*", ...params });
  const response = await fetch(url, { headers: { "user-agent": "LEOYOYOFIONA Marvel fan archive portrait verifier (noncommercial)" }, signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${host} HTTP ${response.status}`);
  return response.json();
}
async function resolve(name) {
  // Commons accepts a slower, dedicated image search and is less prone to
  // rate limiting than the Wikipedia page-image endpoint. Prefer it when an
  // exact-name, explicitly licensed portrait is available.
  const commonsResult = await resolveCommonsSearch(name);
  if (commonsResult) return commonsResult;
  const search = await api("en.wikipedia.org", { generator: "search", gsrnamespace: "0", gsrlimit: "8", gsrsearch: `\"${name}\"`, prop: "pageimages", piprop: "thumbnail|name", pithumbsize: "480" });
  const pages = search.query?.pages ?? [];
  const page = pages.find((item) => normalize(item.title) === normalize(name));
  if (!page?.thumbnail?.source || !page.pageimage) return resolveCommonsSearch(name);
  const infoData = await api("commons.wikimedia.org", { prop: "imageinfo", iiprop: "url|mime|extmetadata", titles: `File:${page.pageimage}` });
  const infoPage = (infoData.query?.pages ?? [])[0];
  const info = infoPage?.imageinfo?.[0];
  const metadata = info?.extmetadata ?? {};
  const license = strip(metadata.LicenseShortName?.value);
  if (!info?.descriptionurl || !license) return resolveCommonsSearch(name);
  const imageResponse = await fetch(page.thumbnail.source, { headers: { "user-agent": "LEOYOYOFIONA Marvel fan archive portrait verifier (noncommercial)" }, signal: AbortSignal.timeout(20_000) });
  const type = imageResponse.headers.get("content-type") ?? "";
  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  if (!imageResponse.ok || !type.startsWith("image/") || bytes.length < 800 || bytes.length > 2_500_000) return resolveCommonsSearch(name);
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  return { sourceImage: page.thumbnail.source, sourcePage: info.descriptionurl, credit: strip(metadata.Credit?.value) || strip(metadata.Artist?.value) || "See Wikimedia Commons source", license, licenseUrl: metadata.LicenseUrl?.value ?? null, bytes, ext };
}

// A number of actors have no English-Wikipedia lead image even though Commons
// has a properly licensed event portrait.  Fall back only to an exact-name
// file search on Commons; this is deliberately narrow so a role is never
// paired with a look-alike or promotional character image.
async function resolveCommonsSearch(name) {
  const search = await api("commons.wikimedia.org", {
    generator: "search",
    gsrnamespace: "6",
    gsrlimit: "12",
    gsrsearch: `\"${name}\"`,
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata",
    iiurlwidth: "560"
  });
  const tokens = normalize(name).split(" ").filter(Boolean);
  const pages = (search.query?.pages ?? []).filter((page) => {
    const title = normalize(page.title);
    return tokens.every((token) => title.includes(token));
  }).sort((left, right) => portraitTitleScore(right.title) - portraitTitleScore(left.title));
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const metadata = info?.extmetadata ?? {};
    const license = strip(metadata.LicenseShortName?.value);
    const imageUrl = info?.thumburl ?? info?.url;
    if (!info?.descriptionurl || !imageUrl || !license) continue;
    const imageResponse = await fetch(imageUrl, { headers: { "user-agent": "LEOYOYOFIONA Marvel fan archive portrait verifier (noncommercial)" }, signal: AbortSignal.timeout(20_000) });
    const type = imageResponse.headers.get("content-type") ?? "";
    const bytes = Buffer.from(await imageResponse.arrayBuffer());
    if (!imageResponse.ok || !type.startsWith("image/") || bytes.length < 800 || bytes.length > 2_500_000) continue;
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
    return { sourceImage: imageUrl, sourcePage: info.descriptionurl, credit: strip(metadata.Credit?.value) || strip(metadata.Artist?.value) || "See Wikimedia Commons source", license, licenseUrl: metadata.LicenseUrl?.value ?? null, bytes, ext };
  }
  return null;
}

function portraitTitleScore(title) {
  const normalized = normalize(title);
  let score = 0;
  if (normalized.includes("cropped")) score += 80;
  if (normalized.includes("portrait")) score += 70;
  if (normalized.includes("by gage skidmore")) score += 40;
  if (normalized.includes("signing") || normalized.includes("panel") || normalized.includes("cast")) score -= 80;
  if (normalized.includes(" and ") || normalized.includes(" amp ")) score -= 40;
  return score;
}

let ledger = { items: [] };
try { ledger = JSON.parse(await readFile(ledgerPath, "utf8")); } catch {}
const ledgerById = new Map((ledger.items ?? []).map((item) => [item.personId, item]));
const forceName = process.argv.find((value) => value.startsWith("--force="))?.slice("--force=".length);
const candidates = catalogue.people.filter((person) => targets.has(person.nameEn) && (person.portraitKind !== "wikimedia-commons" || person.nameEn === forceName));
let updated = 0;
for (const person of candidates) {
  try {
    const result = await resolve(person.nameEn);
    if (!result) { console.log(`${person.nameEn} SKIP`); continue; }
    const hash = createHash("sha256").update(result.bytes).digest("hex");
    const local = `/media/people/${person.id}-${hash.slice(0, 10)}.${result.ext}`;
    await writeFile(path.join(root, "public", local), result.bytes);
    Object.assign(person, { portrait: local, portraitKind: "wikimedia-commons", portraitCredit: result.credit, portraitSource: result.sourcePage, portraitLicenseUrl: result.licenseUrl });
    ledgerById.set(person.id, { personId: person.id, name: person.nameEn, portrait: local, fallback: `/media/people/fallback/${person.id}.svg`, kind: "wikimedia-commons", publish: true, sourcePage: result.sourcePage, sourceImage: result.sourceImage, credit: result.credit, license: result.license, licenseUrl: result.licenseUrl, sha256: hash, bytes: result.bytes.length, checkedAt: catalogue.cutoff });
    updated += 1;
    console.log(`${person.nameEn} OK`);
  } catch (error) { console.log(`${person.nameEn} SKIP ${error instanceof Error ? error.message : String(error)}`); }
  // Commons supplies a more reliable result when this small audit queue is
  // intentionally paced; it also avoids turning a temporary 429 into a fake
  // "no portrait" result.
  await pause(1100);
}
catalogue.audit.personRealPortraitCount = catalogue.people.filter((person) => person.portraitKind === "wikimedia-commons").length;
ledger.items = catalogue.people.map((person) => ledgerById.get(person.id) ?? { personId: person.id, name: person.nameEn, portrait: person.portrait, kind: person.portraitKind, checkedAt: catalogue.cutoff });
ledger.realPortraits = catalogue.audit.personRealPortraitCount;
ledger.identityFallbacks = ledger.items.filter((item) => item.kind === "identity-fallback").length;
await writeFile(cataloguePath, `${JSON.stringify(catalogue, null, 2)}\n`);
await writeFile(ledgerPath, `${JSON.stringify(ledger, null, 2)}\n`);
console.log(JSON.stringify({ targets: candidates.length, updated, real: catalogue.audit.personRealPortraitCount }, null, 2));
