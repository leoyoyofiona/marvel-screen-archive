"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Disc3, ExternalLink, FileCheck2, Film, Music2, Play } from "lucide-react";
import Link from "next/link";
import type { PublicWorkPreview } from "@/lib/catalogue-types";
import { Poster } from "./Poster";

type Soundtrack = {
  id: string;
  title: string;
  workTitle: string;
  year: number;
  provider: string;
  url: string;
  note: string;
  checkedAt: string;
};

export default function SoundtrackHall({
  region,
  works,
}: {
  region: "mainland" | "overseas";
  works: PublicWorkPreview[];
}) {
  const section = useRef<HTMLElement>(null);
  const [items, setItems] = useState<Soundtrack[] | null>(null);
  const [error, setError] = useState(false);
  const load = useCallback(() => {
    setError(false);
    fetch("/data/soundtracks.json")
      .then((response) => {
        if (!response.ok) throw new Error("SOUNDTRACKS_UNAVAILABLE");
        return response.json();
      })
      .then((data: Soundtrack[]) => {
        if (!Array.isArray(data)) throw new Error("SOUNDTRACKS_INVALID");
        setItems(data);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    const node = section.current;
    if (!node) return;
    if (!("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(load);
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        load();
      },
      { rootMargin: "500px 0px", threshold: 0.01 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [load]);

  const available = region === "overseas" ? (items ?? []) : [];
  const playableWorks = works.filter((work) =>
    region === "mainland" ? work.hasMainlandMedia : work.hasOverseasMedia,
  );
  const playableMediaCount = works.reduce(
    (total, work) =>
      total +
      (region === "mainland"
        ? work.mainlandMediaCount ?? 0
        : work.overseasMediaCount ?? 0),
    0,
  );

  return (
    <section
      ref={section}
      id="listening"
      className="section listening-section"
      aria-busy={!items && !error}
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">05 / THE SOUND OF STORIES</span>
          <h2>
            视听厅<span>有些旋律，一响起就是一段回忆</span>
          </h2>
        </div>
        <Disc3 size={30} className="silver" />
      </div>
      <div className="audiovisual-queue">
        <div className="audiovisual-queue-heading">
          <div>
            <span className="eyebrow">AUDIOVISUAL QUEUE / 放映列表</span>
            <h3>点一张海报，直接进入作品视听界面</h3>
          </div>
          <span className="queue-region">
            {region === "mainland" ? "中国大陆线路" : "海外线路"} ·{" "}
            {playableMediaCount} 条视频素材 · 覆盖 {playableWorks.length} 部作品
          </span>
        </div>
        {playableWorks.length > 0 ? (
          <div className="audiovisual-queue-grid">
            {playableWorks.map((work) => (
              <Link
                href={"/works/" + work.id + "#audiovisual-space"}
                className="audiovisual-queue-card"
                key={work.id}
              >
                <div className="audiovisual-queue-poster">
                  <Poster work={work} decorative />
                  <span className="audiovisual-play">
                    <Play size={14} fill="currentColor" />
                  </span>
                </div>
                <strong>{work.title}</strong>
                <small>
                  {work.year ?? "待定"} · 真实预告／宣传片／片段 · 点击播放
                </small>
              </Link>
            ))}
          </div>
        ) : (
          <div className="audiovisual-queue-empty">
            <Film size={18} />
            <span>
              当前线路还没有完成播放核验的作品；作品档案仍可进入，但不会加载不明播放器。
            </span>
          </div>
        )}
        <p className="audiovisual-queue-note">
          这里只列出当前地区已经完成播放器核验的真实视频素材所覆盖的作品；动态海报只用于视觉展示，不会伪装成视频入口。同一部作品可能有多条预告、宣传片、片段或花絮；切换右上角地区后，列表会随线路即时更新。
        </p>
      </div>
      <div className="listening-shell">
        <div className="record-art" aria-hidden="true">
          <div />
          <span>
            ORIGINAL
            <br />
            SOUNDTRACKS
          </span>
        </div>
        <div className="soundtrack-content">
          <span className="tag">
            {region === "mainland" ? "中国大陆线路" : "海外线路"}
          </span>
          <h3>先从官方原声页，听见故事的另一面。</h3>
          {region === "mainland" ? (
            <p>
              当前没有完成中国大陆浏览器播放核验的官方音乐来源，因此不显示外部播放器或版权不明链接。大陆线路仍可正常浏览作品资料、关系图与留言功能。
            </p>
          ) : error ? (
            <>
              <p>官方音乐索引暂时无法载入；作品资料仍可正常浏览。</p>
              <button className="button compact" onClick={load}>
                重新载入官方音乐
              </button>
            </>
          ) : !items ? (
            <p>正在载入经过编辑核对的官方原声入口…</p>
          ) : (
            <>
              <p>
                下面是发行方在 Apple Music
                的官方专辑或歌单页。它们用于试听与继续探索，不是本站托管音频；具体试听时长、地区和账号规则以平台页面为准。
              </p>
              <div className="soundtrack-grid">
                {available.map((item) => (
                  <a
                    className="soundtrack-card"
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={item.id}
                  >
                    <Music2 size={17} />
                    <span>
                      <strong>{item.title}</strong>
                      <small>
                        {item.workTitle} · {item.year} · {item.provider}
                      </small>
                    </span>
                    <ExternalLink size={14} />
                  </a>
                ))}
              </div>
              <small className="soundtrack-note">
                <FileCheck2 size={14} />
                链接核对至 {items.at(-1)?.checkedAt ?? "2026-09-01"}
                ；不包含完整电影、对白或下载资源。
              </small>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
