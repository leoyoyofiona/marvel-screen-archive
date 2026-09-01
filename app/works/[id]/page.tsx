import { notFound } from "next/navigation";
import { catalogue, getOfficialEpisodeSeries, getWork } from "@/lib/catalogue";
import WorkSpace from "@/components/WorkSpace";
export const dynamicParams = false;
export function generateStaticParams() {
  return catalogue.works.map((w) => ({ id: w.id }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return { title: getWork(id)?.title ?? "作品未找到" };
}
export default async function WorkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const work = getWork(id);
  if (!work) notFound();
  return (
    <WorkSpace
      work={work}
      people={catalogue.people.filter((p) => work.people.includes(p.id))}
      characters={catalogue.characters.filter((c) => work.characters.includes(c.id))}
      related={catalogue.works
        .filter((w) => w.id !== id && w.universe === work.universe)
        .slice(0, 5)}
      episodeSeries={getOfficialEpisodeSeries(work)}
    />
  );
}
