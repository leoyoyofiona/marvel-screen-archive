import { catalogue } from "@/lib/catalogue";
import Archive from "@/components/Archive";
import type { ArchiveCatalogue } from "@/lib/catalogue-types";

const archiveData: ArchiveCatalogue = {
  cutoff: catalogue.cutoff,
  audit: catalogue.audit,
  works: catalogue.works.map((work) => ({
    id: work.id,
    title: work.title,
    titleEn: work.titleEn,
    translated: work.translated,
    year: work.year,
    yearText: work.yearText,
    kind: work.kind,
    status: work.status,
    universe: work.universe,
    phase: work.phase,
    poster: work.poster,
    backdrop: work.backdrop,
  })),
};
export default function Home() {
  return <Archive data={archiveData} />;
}
