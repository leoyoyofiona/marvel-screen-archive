import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, ".."),
  index = JSON.parse(
    await readFile(path.join(root, "data/official-index.json"), "utf8"),
  ),
  output = path.join(root, "public/media/official"),
  checkedAt = index.cutoff;

await mkdir(output, { recursive: true });

const groups = [
  ["movie", index.movies],
  ["tv-season", index.tvSeasons],
  ["digital-series", index.digitalSeries],
  ["podcast", index.podcasts],
];

const entries = groups.flatMap(([kind, items]) =>
  items
    .filter((item) => item.image)
    .map((item) => ({
      kind,
      title: item.title,
      sourcePage:
        item.url ??
        new URL(item.href, "https://www.marvel.com").href,
      sourceImage: item.image,
    })),
);

function imageType(buffer, contentType) {
  if (
    contentType.includes("webp") &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  )
    return "webp";
  if (
    contentType.includes("jpeg") &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8
  )
    return "jpg";
  if (
    contentType.includes("png") &&
    buffer.subarray(1, 4).toString("ascii") === "PNG"
  )
    return "png";
  return null;
}

async function collect(item) {
  const url = new URL(item.sourceImage);
  if (url.protocol !== "https:" || url.hostname !== "cdn.marvel.com")
    return { ...item, publish: false, error: "unexpected image host" };
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "LEOYOYOFIONA fan archive asset verifier" },
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 1000 || buffer.length > 3_000_000)
      throw new Error("unexpected file size " + buffer.length);
    const extension = imageType(
      buffer,
      response.headers.get("content-type") ?? "",
    );
    if (!extension) throw new Error("image signature mismatch");
    const sha256 = createHash("sha256").update(buffer).digest("hex"),
      stem = path
        .basename(url.pathname)
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-z0-9_-]+/gi, "-")
        .slice(0, 90),
      filename = `${stem}-${sha256.slice(0, 10)}.${extension}`,
      destination = path.join(output, filename);
    await writeFile(destination, buffer);
    return {
      ...item,
      local: "/media/official/" + filename,
      bytes: buffer.length,
      sha256,
      checkedAt,
      rightsHolder: "Marvel/Disney or the credited producing distributor",
      license: "copyrighted promotional artwork; not an open license",
      usage:
        "Low-resolution identification image on a noncommercial editorial fan archive; source and takedown contact are displayed.",
      publish: true,
    };
  } catch (error) {
    return {
      ...item,
      checkedAt,
      publish: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

const ledger = [];
for (let i = 0; i < entries.length; i += 8) {
  ledger.push(...(await Promise.all(entries.slice(i, i + 8).map(collect))));
  console.log(`official artwork ${Math.min(i + 8, entries.length)}/${entries.length}`);
}

await writeFile(
  path.join(root, "data/official-poster-ledger.json"),
  JSON.stringify(
    {
      checkedAt,
      count: ledger.length,
      published: ledger.filter((item) => item.publish).length,
      failed: ledger.filter((item) => !item.publish).length,
      items: ledger,
    },
    null,
    2,
  ) + "\n",
);

console.log({
  collected: ledger.length,
  published: ledger.filter((item) => item.publish).length,
  failed: ledger.filter((item) => !item.publish).length,
});
