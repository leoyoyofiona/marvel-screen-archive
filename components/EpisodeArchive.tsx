"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Clock3, ExternalLink, Search } from "lucide-react";
import type { OfficialEpisodeSeries } from "@/lib/catalogue-types";

const PAGE_SIZE = 12;

function durationLabel(
  durationMs?: number | null,
  durationText?: string | null,
) {
  if (durationText) return durationText;
  if (!durationMs) return null;
  const totalSeconds = Math.round(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function dateLabel(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

export function EpisodeArchive({ series }: { series: OfficialEpisodeSeries }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase();
    if (!keyword) return series.episodes;
    return series.episodes.filter((episode) =>
      `${episode.title} ${episode.description ?? ""}`
        .toLocaleLowerCase()
        .includes(keyword),
    );
  }, [query, series.episodes]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages);
  const visible = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const exact = series.expectedTotal === series.observedTotal;

  return (
    <section className="episode-archive" aria-labelledby="episode-heading">
      <div className="episode-heading-row">
        <div>
          <span className="eyebrow">OFFICIAL EPISODE INDEX</span>
          <h2 id="episode-heading">官方逐集档案</h2>
          <p className="muted">
            已索引 {series.observedTotal.toLocaleString("zh-CN")}{" "}
            个唯一官方详情页
            {exact
              ? "，与官方页面计数一致。"
              : `；官方页面标称 ${series.expectedTotal.toLocaleString("zh-CN")} 条，差异保留待核。`}
          </p>
        </div>
        <a
          className="button compact"
          href={series.seriesUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Marvel 系列页 <ExternalLink size={14} />
        </a>
      </div>
      <p className="editorial-warning">
        以下链接是 Marvel
        官方单集资料页；它们不等同于符合本站严格条件的免费完整电影入口，也不会预加载境外视频播放器。
      </p>
      <label className="episode-search">
        <Search size={17} aria-hidden="true" />
        <span className="sr-only">搜索单集标题或简介</span>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="搜索单集标题或简介"
        />
        <small>{filtered.length.toLocaleString("zh-CN")} 条</small>
      </label>
      <div className="episode-grid">
        {visible.map((episode, index) => {
          const duration = durationLabel(
            episode.durationMs,
            episode.durationText,
          );
          const published = dateLabel(episode.published);
          return (
            <a
              className="episode-card"
              href={episode.detailURL}
              target="_blank"
              rel="noopener noreferrer"
              key={episode.detailURL}
            >
              <span className="episode-number">
                {String((currentPage - 1) * PAGE_SIZE + index + 1).padStart(
                  3,
                  "0",
                )}
              </span>
              <strong>{episode.title}</strong>
              {episode.description && <p>{episode.description}</p>}
              <span className="episode-meta">
                {published && (
                  <span>
                    <CalendarDays size={13} /> {published}
                  </span>
                )}
                {duration && (
                  <span>
                    <Clock3 size={13} /> {duration}
                  </span>
                )}
                {episode.season && episode.episode && (
                  <span>
                    S{episode.season} · E{episode.episode}
                  </span>
                )}
              </span>
              <span className="episode-source">
                MARVEL.COM <ExternalLink size={12} />
              </span>
            </a>
          );
        })}
      </div>
      {filtered.length === 0 && (
        <p className="episode-empty">没有找到匹配的官方单集。</p>
      )}
      {pages > 1 && (
        <nav className="episode-pagination" aria-label="单集分页">
          <button
            className="button compact"
            disabled={currentPage === 1}
            onClick={() => setPage((value) => Math.max(1, value - 1))}
          >
            上一页
          </button>
          <span>
            {currentPage} / {pages}
          </span>
          <button
            className="button compact"
            disabled={currentPage === pages}
            onClick={() => setPage((value) => Math.min(pages, value + 1))}
          >
            下一页
          </button>
        </nav>
      )}
    </section>
  );
}
