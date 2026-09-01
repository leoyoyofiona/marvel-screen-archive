export type WorkKind =
  | "film"
  | "series"
  | "animated-film"
  | "animated-series"
  | "short"
  | "special"
  | "serial"
  | "documentary"
  | "digital-series"
  | "podcast";
export type Source = {
  title: string;
  url: string;
  checkedAt: string | null;
  verification: "retrieved" | "candidate" | "editor-reviewed";
};
export type Media = {
  id: string;
  title: string;
  kind: "trailer" | "clip" | "music" | "dialogue" | "interview";
  region: "mainland" | "overseas";
  provider: string;
  url: string;
  embedUrl?: string;
  status: "candidate" | "source-verified" | "playback-verified";
  checkedAt: string | null;
  source: string;
};
export type Work = {
  id: string;
  title: string;
  titleEn: string;
  translated: boolean;
  year: number | null;
  yearText: string;
  kind: WorkKind;
  status: string;
  date: string | null;
  universe: string;
  phase: number | null;
  summary: string;
  highlights: string[];
  poster: string | null;
  backdrop: string | null;
  posterCredit: string | null;
  verification: string;
  sourceFamily: string;
  edition: string | null;
  facts: Record<string, string>;
  people: string[];
  characters: string[];
  seasons: { label: string; url: string; image?: string | null }[];
  sources: Source[];
  media: Media[];
  watchLinks: WatchLink[];
};
export type WorkPreview = Pick<
  Work,
  | "id"
  | "title"
  | "titleEn"
  | "translated"
  | "year"
  | "yearText"
  | "kind"
  | "status"
  | "universe"
  | "phase"
  | "poster"
  | "backdrop"
>;
export type WatchLink = {
  url: string;
  provider: string;
  resolution: "720p" | "1080p" | "4K";
  free: true;
  requiresLogin: false;
  requiresSubscription: false;
  hasForcedAds: false;
  complete: true;
  legalSource: true;
  regionUnrestricted: true;
  browserVerified: true;
  lastVerifiedAt: string;
};
export type OfficialEpisode = {
  videoId: string | null;
  title: string;
  description?: string | null;
  detailURL: string;
  published?: string | null;
  created?: string | null;
  durationMs?: number | null;
  durationText?: string | null;
  season?: number | null;
  episode?: number | null;
  poster?: string | null;
  posterWidth?: number | null;
  posterHeight?: number | null;
  thumbnail?: string | null;
  thumbnailAlt?: string | null;
};
export type OfficialEpisodeSeries = {
  seriesTitle: string;
  seriesUrl: string;
  expectedTotal: number;
  observedTotal: number;
  header: string | null;
  episodes: OfficialEpisode[];
};
export type Person = {
  id: string;
  name: string;
  nameEn: string;
  departments: string[];
  workIds: string[];
  source: string;
  portrait: string | null;
  portraitKind?: "wikimedia-commons" | "identity-fallback" | null;
  portraitCredit?: string | null;
  portraitSource?: string | null;
  portraitLicenseUrl?: string | null;
};
export type Character = {
  id: string;
  name: string;
  alias: string;
  actor: string;
  works: string[];
  portrait: string | null;
};
export type Catalogue = {
  cutoff: string;
  generatedAt: string;
  works: Work[];
  people: Person[];
  characters: Character[];
  audit: {
    candidateCount: number;
    primaryReviewed: number;
    posterCount: number;
    watchLinkCount: number;
    untranslated: number;
    officialArtworkCount: number;
    officialDigitalSeriesCount: number;
    officialDigitalEpisodeTotal: number;
    officialDigitalEpisodeUniquePages: number;
    officialDigitalEpisodeExactSeries: number;
    officialDigitalEpisodeMismatchSeries: number;
    personPortraitCount: number;
    personRealPortraitCount: number;
    gaps: string[];
  };
};
export type ArchiveCatalogue = Pick<Catalogue, "cutoff" | "audit"> & {
  works: WorkPreview[];
};
export const kindLabels: Record<WorkKind, string> = {
  film: "真人电影",
  series: "真人剧集",
  "animated-film": "动画电影",
  "animated-series": "动画剧集",
  short: "短片",
  special: "特别节目",
  serial: "连续短片",
  documentary: "纪录／幕后",
  "digital-series": "官方数字节目",
  podcast: "官方播客／广播剧",
};
export const statusLabels: Record<string, string> = {
  released: "已推出",
  announced: "后续项目",
  "release-unverified": "发行状态待核",
  unreleased: "未正式发行",
};
