import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const cataloguePath = path.join(root, "data/catalogue.json");
const catalogue = JSON.parse(await readFile(cataloguePath, "utf8"));
const items = JSON.parse(await readFile(path.join(root, "data/fandom-poster-review.json"), "utf8"));
// These five were visually rejected from the contact sheet: their page image
// was comics art, a title logo, or an unrelated still instead of this work's
// screen poster/key art.
const visualRejects = new Set([
  "baymax-2022-animated-series",
  "black-panther-2010-animated-series",
  "night-man-1997-series",
  "silver-surfer-1998-animated-series",
  "the-daily-bugle-2019-series",
  "x-men-the-animated-series-1992-animated-series",
]);
const approved = items.filter((item) => item.status === "candidate-review" && !visualRejects.has(item.workId));
const output = path.join(root, "public/media/fandom-posters");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const item of approved) {
  const filename = path.basename(item.file);
  await cp(path.join(root, "public", item.file), path.join(output, filename));
  const work = catalogue.works.find((entry) => entry.id === item.workId);
  if (!work) continue;
  work.poster = `/media/fandom-posters/${filename}`;
  work.posterCredit = `${item.credit} · 来源 ${item.sourcePage}`;
  work.posterSource = item.sourcePage;
  work.posterVisualStatus = "visual-reviewed-title-matched";
}
catalogue.audit.fandomArtworkCount = approved.length;
catalogue.audit.archiveDesignPosterCount = catalogue.works.filter((work) => work.poster?.startsWith("/media/archive-posters/")).length;
catalogue.audit.wikipediaArtworkCount = catalogue.works.filter((work) => work.poster?.startsWith("/media/wikipedia-posters/")).length;
catalogue.audit.officialArtworkCount = catalogue.works.filter((work) => work.poster?.startsWith("/media/official/")).length;
catalogue.audit.gaps = (catalogue.audit.gaps ?? []).map((gap) =>
  gap.includes("条记录仍使用原创档案设计海报")
    ? `全部 1,315 位索引人物均有头像节点，其中 ${catalogue.audit.personRealPortraitCount} 张为带许可来源的 Wikimedia Commons 真人照片；${catalogue.audit.archiveDesignPosterCount} 条记录仍使用原创档案设计海报，真实海报与经典剧照需继续逐条核验`
    : gap,
);
await writeFile(cataloguePath, `${JSON.stringify(catalogue, null, 2)}\n`);
await writeFile(path.join(root, "data/fandom-poster-approved.json"), `${JSON.stringify(approved, null, 2)}\n`);
console.log(JSON.stringify({ approved: approved.length, rejected: visualRejects.size }, null, 2));
