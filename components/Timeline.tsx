"use client";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { WorkPreview } from "@/lib/catalogue-types";
import { Poster } from "./Poster";
export default function Timeline({ works }: { works: WorkPreview[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; scroll: number } | null>(null);
  const [hovered, setHovered] = useState<{ work: WorkPreview; rect: DOMRect } | null>(null);
  const [mode, setMode] = useState("all");
  const years = useMemo(
    () =>
      [
        ...new Set(
          works
            .filter((w) => mode === "all" || w.universe === "MCU")
            .map((w) => w.year)
            .filter((y): y is number => !!y),
        ),
      ].sort((a, b) => a - b),
    [works, mode],
  );
  function scroll(direction: number) {
    rail.current?.scrollBy({ left: direction * 500, behavior: "smooth" });
  }
  return (
    <section id="timeline" className="section timeline-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">01 / THROUGH THE YEARS</span>
          <h2>
            时间长廊<span>一帧一帧，走进历史</span>
          </h2>
        </div>
        <div className="timeline-actions">
          <div className="segmented">
            <button
              aria-pressed={mode === "all"}
              onClick={() => setMode("all")}
            >
              全部影视
            </button>
            <button
              aria-pressed={mode === "mcu"}
              onClick={() => setMode("mcu")}
            >
              MCU
            </button>
          </div>
          <button
            className="icon-button"
            aria-label="向前滚动时间线"
            onClick={() => scroll(-1)}
          >
            <ArrowLeft size={18} />
          </button>
          <button
            className="icon-button"
            aria-label="向后滚动时间线"
            onClick={() => scroll(1)}
          >
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
      <p className="section-description">
        按作品首发年份浏览。每个年份都展示正常海报；悬停或聚焦卡片，会弹出大图预览，移开后自动收起。
      </p>
      <div
        className="timeline-rail"
        ref={rail}
        tabIndex={0}
        aria-label="年份时间线"
        onScroll={() => setHovered(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            scroll(1);
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            scroll(-1);
          }
        }}
        onPointerDown={(e) => {
          if ((e.target as HTMLElement).closest("a,button")) return;
          drag.current = { x: e.clientX, scroll: e.currentTarget.scrollLeft };
        }}
        onPointerMove={(e) => {
          if (drag.current && e.pointerType === "mouse")
            e.currentTarget.scrollLeft =
              drag.current.scroll - (e.clientX - drag.current.x);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
      >
        {years.map((year) => {
          const group = works.filter(
            (w) => w.year === year && (mode === "all" || w.universe === "MCU"),
          );
          const example =
            group.find((w) => w.poster) ??
            group.find((w) => w.kind === "film") ??
            group[0];
          return (
            <div
              className="year-node"
              key={year}
              onMouseEnter={(event) => setHovered({ work: example, rect: event.currentTarget.getBoundingClientRect() })}
              onMouseLeave={() => setHovered(null)}
              onFocus={(event) => setHovered({ work: example, rect: event.currentTarget.getBoundingClientRect() })}
              onBlur={() => setHovered(null)}
            >
              <div className="time-preview">
                <Poster work={example} decorative />
                <span>{group.length} 项档案</span>
              </div>
              <span
                className="year-dot"
                aria-label={year + "年，查看" + example.title}
              >
                <span />
              </span>
              <strong className="year-number">{year}</strong>
              <span className="year-name">
                {example.title}
              </span>
              <span className="year-count">
                {group.length} 项 ·{" "}
                {year > 2026 ? "已公布项目" : "作品首发年份"}
              </span>
            </div>
          );
        })}
      </div>
      {hovered ? (() => {
        const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
        const viewportHeight = typeof window === "undefined" ? 900 : window.innerHeight;
        const width = Math.min(560, viewportWidth - 32);
        const height = Math.min(430, Math.max(300, viewportHeight - 32));
        const left = Math.min(Math.max(16, hovered.rect.left - 30), viewportWidth - width - 16);
        const top = hovered.rect.bottom + 14 + height < viewportHeight
          ? hovered.rect.bottom + 14
          : Math.max(16, hovered.rect.top - height - 14);
        return <div className="timeline-hover-preview" style={{ left, top, width, height }} role="status" aria-live="polite">
          <div className="timeline-hover-poster"><Poster work={hovered.work} decorative /></div>
          <div className="timeline-hover-copy"><span>{hovered.work.year ?? "待定"} · {hovered.work.universe}</span><strong>{hovered.work.title}</strong><p>{hovered.work.kind === "film" ? "电影" : "影视档案"} · 首发年份与海报预览</p></div>
        </div>;
      })() : null}
      <div className="timeline-bottom">
        <span>
          1944 — 2026 <i>/</i> 后续已公布项目单列
        </span>
        <span>
          RELEASE ORDER <span className="red">→</span>
        </span>
      </div>
    </section>
  );
}
