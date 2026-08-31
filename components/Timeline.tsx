"use client";
import { useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import type { Work } from "@/lib/catalogue-types";
import { Poster } from "./Poster";
export default function Timeline({ works }: { works: Work[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; scroll: number } | null>(null);
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
        按作品首发年份浏览。悬停或聚焦节点查看档案；横向拖动、滚动或点击箭头，手机上向下浏览。
      </p>
      <div
        className="timeline-rail"
        ref={rail}
        tabIndex={0}
        aria-label="年份时间线"
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
            <div className="year-node" key={year}>
              <div className="time-preview">
                <Poster work={example} decorative />
                <span>{group.length} 项档案</span>
              </div>
              <Link
                className="year-dot"
                href={"/works/" + example.id}
                aria-label={year + "年，查看" + example.title}
              >
                <span />
              </Link>
              <strong className="year-number">{year}</strong>
              <Link className="year-name" href={"/works/" + example.id}>
                {example.title}
                <ArrowUpRight size={13} />
              </Link>
              <span className="year-count">
                {group.length} 项 ·{" "}
                {year > 2026 ? "已公布项目" : "作品首发年份"}
              </span>
            </div>
          );
        })}
      </div>
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
