import "server-only";
import raw from "@/data/catalogue.json";
import episodeRaw from "@/data/official-episodes.json";
import type { Catalogue, OfficialEpisodeSeries, Work } from "./catalogue-types";
export const catalogue = raw as unknown as Catalogue;
const episodeSeries = episodeRaw.series as OfficialEpisodeSeries[];
export const getWork = (id: string) => catalogue.works.find((w) => w.id === id);
export const getOfficialEpisodeSeries = (work: Work) =>
  episodeSeries.find(
    (series) =>
      series.seriesTitle === work.titleEn &&
      work.sources.some((source) => source.url === series.seriesUrl),
  ) ?? null;
