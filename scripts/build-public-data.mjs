import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const catalogue = JSON.parse(
  await readFile(path.join(root, "data/catalogue.json"), "utf8"),
);
const outputDirectory = path.join(root, "public/data");
await mkdir(outputDirectory, { recursive: true });

const relationships = {
  generatedAt: catalogue.generatedAt,
  works: catalogue.works.map(({ id, title, year, people }) => ({
    id,
    title,
    year,
    people,
  })),
  people: catalogue.people,
  characters: catalogue.characters,
};

await writeFile(
  path.join(outputDirectory, "relationships.json"),
  JSON.stringify(relationships) + "\n",
);

console.log(
  JSON.stringify({
    works: relationships.works.length,
    people: relationships.people.length,
    characters: relationships.characters.length,
    bytes: Buffer.byteLength(JSON.stringify(relationships)),
  }),
);
