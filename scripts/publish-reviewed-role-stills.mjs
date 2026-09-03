/** Copy only visually reviewed on-screen role images into the visible archive. */
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const review = JSON.parse(await readFile(path.join(root, "data/role-still-review.json"), "utf8"));
const outDir = path.join(root, "public/media/role-stills");
const target = {};
await mkdir(outDir, { recursive: true });

// Every entry in this set was inspected in the generated contact sheet: it
// shows the named screen role, not a generic actor photo or a comics avatar.
const approved = new Set([
  "pepper-potts", "james-rhodes", "happy-hogan", "obadiah-stane", "yinsen",
  "justin-hammer", "aldrich-killian", "bruce-banner", "clint-barton", "nick-fury",
  "loki-character", "thanos-character", "ultron-character", "vision-character",
  "sam-wilson", "baron-zemo", "tchalla", "shuri", "erik-killmonger", "scott-lang",
  "hope-van-dyne", "peter-quill", "gamora", "rocket", "drax", "nebula",
  "carol-danvers", "hela", "valkyrie", "wong", "norman-osborn", "mj-watson",
  "charles-xavier", "erik-lehnsherr", "jean-grey", "storm", "mystique",
  "wade-wilson", "reed-richards", "victor-von-doom",
]);
for (const item of review.items ?? []) {
  if (!approved.has(item.id) || !item.file) continue;
  const filename = path.basename(item.file);
  await cp(path.join(root, "public", item.file), path.join(outDir, filename));
  target[item.id] = {
    portrait: `/media/role-stills/${filename}`,
    sourcePage: item.sourcePage,
    sourceImage: item.sourceImage,
    title: item.title,
    status: "visual-reviewed-screen-role",
  };
}
await writeFile(path.join(root, "data/role-portraits.json"), `${JSON.stringify({ checkedAt: review.checkedAt, items: target }, null, 2)}\n`);
console.log(JSON.stringify({ published: Object.keys(target).length }, null, 2));
