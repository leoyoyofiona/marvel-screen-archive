/** Promote only contact-sheet-reviewed armor candidates into the site index. */
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const review = JSON.parse(
  await readFile(path.join(root, "data/mcu-armor-review.json"), "utf8"),
).filter((entry) => entry.status === "candidate-review");
const destination = path.join(root, "public/media/armor/mcu");
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });

const eraFor = (mark) => {
  const roman = mark.replace("Mark ", "");
  if (["I", "II", "III"].includes(roman)) return { time: "2008", origin: "《钢铁侠》· 初代战甲迭代" };
  if (["IV", "V"].includes(roman)) return { time: "2010", origin: "《钢铁侠2》· 反应堆升级期" };
  if (roman === "VII") return { time: "2012", origin: "《复仇者联盟》· 纽约之战" };
  if (["XLIII", "XLIV", "XLV"].includes(roman)) return { time: "2015", origin: "《复仇者联盟2》· 奥创纪元" };
  if (roman === "XLVI") return { time: "2016", origin: "《美国队长3》· 机场之战时期" };
  if (roman === "XLVII") return { time: "2017", origin: "《蜘蛛侠：英雄归来》· 远程模块" };
  if (["L", "LXXX", "LXXXV"].includes(roman)) return { time: "2018—2019", origin: "《复仇者联盟3—4》· 纳米时代" };
  return { time: "2013", origin: "《钢铁侠3》· House Party Protocol 型号" };
};

const published = [];
for (const entry of review) {
  const sourceFile = path.join(root, "public", entry.file);
  const fileName = path.basename(entry.file);
  await cp(sourceFile, path.join(destination, fileName));
  const era = eraFor(entry.mark);
  published.push({
    name: entry.mark,
    photo: `/media/armor/mcu/${fileName}`,
    source: entry.sourcePage,
    sourceImage: entry.sourceImage,
    credit: entry.credit,
    visualStatus: "visual-reviewed-front-full-body",
    ...era,
  });
}
await writeFile(
  path.join(root, "data/mcu-armor.json"),
  `${JSON.stringify(published, null, 2)}\n`,
);
console.log(JSON.stringify({ published: published.length }, null, 2));
