import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, ".."),
  catalogue = JSON.parse(
    await readFile(path.join(root, "data/catalogue.json"), "utf8"),
  ),
  output = path.join(root, "public/media/people"),
  fallbackOutput = path.join(output, "fallback"),
  characterOutput = path.join(root, "public/media/characters"),
  cacheOutput = path.join(root, "research-cache/portrait-api"),
  checkedAt = catalogue.cutoff;

await mkdir(output, { recursive: true });
await mkdir(fallbackOutput, { recursive: true });
await mkdir(characterOutput, { recursive: true });
await mkdir(cacheOutput, { recursive: true });
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const wikiTitle = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "en.wikipedia.org") return null;
    return decodeURIComponent(
      parsed.pathname.replace(/^\/wiki\//, ""),
    ).replaceAll("_", " ");
  } catch {
    return null;
  }
};
const normalize = (value) =>
  value.normalize("NFKC").replaceAll("_", " ").trim().toLowerCase();
const stripHtml = (value = "") =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
const xml = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const initials = (name) => {
  const words = name
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  return (
    words.length > 1 ? words[0][0] + words.at(-1)[0] : words[0]?.slice(0, 2)
  )
    .toUpperCase()
    .slice(0, 2);
};
const fallbackSvg = (person) => {
  const hue = Number.parseInt(person.id.slice(-4), 16) % 48;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 400" role="img" aria-label="${xml(person.name)} identity portrait">
  <defs>
    <radialGradient id="g" cx="50%" cy="30%" r="80%"><stop stop-color="hsl(${340 + hue} 52% 34%)"/><stop offset="1" stop-color="#090d15"/></radialGradient>
    <pattern id="p" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 18 18 0" stroke="#fff" stroke-opacity=".035"/></pattern>
  </defs>
  <rect width="320" height="400" fill="url(#g)"/><rect width="320" height="400" fill="url(#p)"/>
  <circle cx="160" cy="155" r="82" fill="none" stroke="#fff" stroke-opacity=".13"/>
  <text x="160" y="183" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="76" font-weight="700">${xml(initials(person.nameEn || person.name))}</text>
  <path d="M48 300h224" stroke="#ef334c" stroke-width="3"/>
  <text x="160" y="334" text-anchor="middle" fill="#f1f3f8" font-family="Arial,sans-serif" font-size="17" letter-spacing="2">${xml((person.nameEn || person.name).slice(0, 28))}</text>
  <text x="160" y="363" text-anchor="middle" fill="#9da8b9" font-family="Arial,sans-serif" font-size="11" letter-spacing="3">SCREEN ARCHIVE</text>
</svg>`;
};

for (const person of catalogue.people)
  await writeFile(
    path.join(fallbackOutput, `${person.id}.svg`),
    fallbackSvg(person),
  );
for (const character of catalogue.characters)
  await writeFile(
    path.join(characterOutput, `${character.id}.svg`),
    fallbackSvg({
      id: character.id,
      name: `${character.name} · ${character.alias}`,
      nameEn: character.alias,
    }),
  );
if (process.argv.includes("--fallback-only")) {
  console.log({
    peopleIdentityPortraits: catalogue.people.length,
    characterIdentityPortraits: catalogue.characters.length,
  });
  process.exit(0);
}

async function api(host, params) {
  const url = new URL(`https://${host}/w/api.php`);
  for (const [key, value] of Object.entries({
    action: "query",
    format: "json",
    formatversion: "2",
    origin: "*",
    ...params,
  }))
    url.searchParams.set(key, value);
  const cacheFile = path.join(
    cacheOutput,
    createHash("sha256").update(url.href).digest("hex") + ".json",
  );
  try {
    return JSON.parse(await readFile(cacheFile, "utf8"));
  } catch {}
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "LEOYOYOFIONA Marvel fan archive portrait verifier (leooelcn@gmail.com)",
      },
    });
    if (response.status === 429 || response.status === 503) {
      await delay(Math.min(4000 * 2 ** attempt, 16000));
      continue;
    }
    if (!response.ok) throw new Error(`${host} HTTP ${response.status}`);
    const data = await response.json();
    if (data.error) throw new Error(`${host}: ${data.error.info}`);
    await writeFile(cacheFile, JSON.stringify(data));
    await delay(900);
    return data;
  }
  throw new Error(`${host} rate limit persisted after bounded retries`);
}

const titleToPage = new Map();
for (let index = 0; index < catalogue.people.length; index += 20) {
  const chunk = catalogue.people.slice(index, index + 20),
    titles = chunk.map((person) => wikiTitle(person.source)).filter(Boolean);
  let data;
  try {
    data = await api("en.wikipedia.org", {
      prop: "pageimages",
      piprop: "thumbnail|name",
      pithumbsize: "320",
      redirects: "1",
      titles: titles.join("|"),
    });
  } catch (error) {
    console.warn(`portrait index batch skipped: ${error.message}`);
    for (const title of titles) titleToPage.set(normalize(title), null);
    continue;
  }
  const aliases = new Map();
  for (const item of [
    ...(data.query?.normalized ?? []),
    ...(data.query?.redirects ?? []),
  ])
    aliases.set(normalize(item.from), item.to);
  const pages = new Map(
    (data.query?.pages ?? []).map((page) => [normalize(page.title), page]),
  );
  for (const title of titles) {
    let resolved = title;
    for (let n = 0; n < 3 && aliases.has(normalize(resolved)); n += 1)
      resolved = aliases.get(normalize(resolved));
    titleToPage.set(normalize(title), pages.get(normalize(resolved)) ?? null);
  }
  console.log(
    `portrait index ${Math.min(index + 20, catalogue.people.length)}/${catalogue.people.length}`,
  );
}

const filenames = [
  ...new Set(
    [...titleToPage.values()].map((page) => page?.pageimage).filter(Boolean),
  ),
];
const imageInfo = new Map();
for (let index = 0; index < filenames.length; index += 50) {
  const chunk = filenames.slice(index, index + 50),
    data = await api("commons.wikimedia.org", {
      prop: "imageinfo",
      iiprop: "url|mime|size|extmetadata",
      titles: chunk.map((name) => `File:${name}`).join("|"),
    }).catch((error) => {
      console.warn(`portrait rights batch skipped: ${error.message}`);
      return { query: { pages: [] } };
    });
  for (const page of data.query?.pages ?? []) {
    const info = page.imageinfo?.[0];
    if (!page.missing && info)
      imageInfo.set(normalize(page.title.replace(/^File:/i, "")), {
        ...info,
        fileTitle: page.title,
      });
  }
  console.log(
    `portrait rights ${Math.min(index + 50, filenames.length)}/${filenames.length}`,
  );
}

function imageType(buffer, contentType) {
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return "jpg";
  if (buffer.subarray(1, 4).toString("ascii") === "PNG") return "png";
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "webp";
  if (
    contentType.includes("svg") &&
    buffer.subarray(0, 300).toString().includes("<svg")
  )
    return "svg";
  return null;
}

async function collect(person) {
  const fallbackName = `${person.id}.svg`,
    fallbackLocal = `/media/people/fallback/${fallbackName}`;
  await writeFile(path.join(fallbackOutput, fallbackName), fallbackSvg(person));
  const title = wikiTitle(person.source),
    page = title ? titleToPage.get(normalize(title)) : null,
    rights = page?.pageimage ? imageInfo.get(normalize(page.pageimage)) : null,
    metadata = rights?.extmetadata ?? {},
    licenseName = stripHtml(metadata.LicenseShortName?.value),
    licenseUrl = metadata.LicenseUrl?.value ?? null;
  if (!page?.thumbnail?.source || !rights || !licenseName)
    return {
      personId: person.id,
      name: person.nameEn,
      portrait: fallbackLocal,
      kind: "identity-fallback",
      publish: true,
      checkedAt,
      note: "No Wikimedia Commons portrait with explicit license metadata was matched.",
    };
  try {
    const url = new URL(page.thumbnail.source);
    if (url.protocol !== "https:" || url.hostname !== "upload.wikimedia.org")
      throw new Error("unexpected image host");
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "LEOYOYOFIONA Marvel fan archive portrait verifier (leooelcn@gmail.com)",
      },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer()),
      extension = imageType(buffer, response.headers.get("content-type") ?? "");
    if (!extension || buffer.length < 800 || buffer.length > 2_500_000)
      throw new Error("image signature or size rejected");
    const sha256 = createHash("sha256").update(buffer).digest("hex"),
      filename = `${person.id}-${sha256.slice(0, 10)}.${extension}`;
    await writeFile(path.join(output, filename), buffer);
    return {
      personId: person.id,
      name: person.nameEn,
      portrait: `/media/people/${filename}`,
      fallback: fallbackLocal,
      kind: "wikimedia-commons",
      publish: true,
      sourcePage: rights.descriptionurl,
      sourceImage: page.thumbnail.source,
      author: stripHtml(metadata.Artist?.value) || "See source page",
      credit: stripHtml(metadata.Credit?.value) || null,
      license: licenseName,
      licenseUrl,
      sha256,
      bytes: buffer.length,
      checkedAt,
    };
  } catch (error) {
    return {
      personId: person.id,
      name: person.nameEn,
      portrait: fallbackLocal,
      kind: "identity-fallback",
      publish: true,
      checkedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const items = [];
for (let index = 0; index < catalogue.people.length; index += 4) {
  items.push(
    ...(await Promise.all(
      catalogue.people.slice(index, index + 4).map(collect),
    )),
  );
  if (index % 80 === 0)
    console.log(
      `portrait files ${Math.min(index + 4, catalogue.people.length)}/${catalogue.people.length}`,
    );
  await delay(300);
}

await writeFile(
  path.join(root, "data/person-portrait-ledger.json"),
  JSON.stringify(
    {
      checkedAt,
      total: items.length,
      realPortraits: items.filter((item) => item.kind === "wikimedia-commons")
        .length,
      identityFallbacks: items.filter(
        (item) => item.kind === "identity-fallback",
      ).length,
      policy:
        "Wikimedia Commons images require explicit license metadata; unmatched people receive a locally generated identity portrait, never an unlicensed photo.",
      items,
    },
    null,
    2,
  ) + "\n",
);

console.log({
  total: items.length,
  realPortraits: items.filter((item) => item.kind === "wikimedia-commons")
    .length,
  identityFallbacks: items.filter((item) => item.kind === "identity-fallback")
    .length,
});
