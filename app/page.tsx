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
    hasMainlandMedia: work.media.some(
      (media) =>
        media.region === "mainland" && media.status === "playback-verified",
    ),
    hasOverseasMedia: work.media.some(
      (media) =>
        media.region === "overseas" && media.status === "playback-verified",
    ),
    mainlandMediaCount: work.media.filter(
      (media) =>
        media.region === "mainland" && media.status === "playback-verified",
    ).length,
    overseasMediaCount: work.media.filter(
      (media) =>
        media.region === "overseas" && media.status === "playback-verified",
    ).length,
  })),
};
export default function Home() {
  return <Archive data={archiveData} />;
}
