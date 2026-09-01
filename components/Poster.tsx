"use client";
import type { CSSProperties } from "react";
import { Film, ArrowUpRight, Bookmark } from "lucide-react";
import Link from "next/link";
import type { WorkPreview } from "@/lib/catalogue-types";
import { kindLabels } from "@/lib/catalogue-types";

function posterHue(id: string) {
  let value = 0;
  for (const character of id)
    value = (value * 31 + character.charCodeAt(0)) % 360;
  return value;
}

export function Poster({
  work,
  decorative = false,
  comment,
}: {
  work: WorkPreview;
  decorative?: boolean;
  comment?: { name: string; body: string };
}) {
  const archiveStyle = {
    "--poster-hue": posterHue(work.id),
  } as CSSProperties;
  return (
    <div
      className={"poster-frame " + (!work.poster ? "no-art" : "")}
      style={work.poster ? undefined : archiveStyle}
    >
      {work.poster ? (
        <img
          src={work.poster}
          alt={decorative ? "" : work.title + "海报"}
          loading="lazy"
          width="400"
          height="600"
        />
      ) : (
        <div
          className="archive-frame"
          aria-label={
            decorative ? undefined : work.title + "，非官方档案设计海报"
          }
        >
          <span className="film-perforation" />
          <span className="archive-nebula" />
          <span className="archive-orbit" />
          <span className="archive-silhouette" />
          <span className="archive-signal" />
          <span className="frame-year">{work.year ?? "TBA"}</span>
          <Film size={30} />
          <strong>{work.title}</strong>
          <span className="pending-art">档案设计海报 · 非官方素材</span>
          <span className="frame-code">MARVEL SCREEN ARCHIVE</span>
        </div>
      )}
      <div className="poster-shine" />
      <span className="poster-kind">{kindLabels[work.kind]}</span>
      {comment && (
        <div
          className="poster-comment-ticker"
          role="note"
          aria-label={`影迷留言：${comment.name}：${comment.body}`}
        >
          <div>
            <span>影迷 · {comment.name}</span>
            <strong>{comment.body}</strong>
          </div>
        </div>
      )}
      <div className="poster-hover">
        <span>{work.universe}</span>
        <strong>
          进入作品空间 <ArrowUpRight size={18} />
        </strong>
      </div>
    </div>
  );
}
export function WorkCard({
  work,
  saved,
  onSave,
  comment,
}: {
  work: WorkPreview;
  saved: boolean;
  onSave: (id: string) => void;
  comment?: { name: string; body: string };
}) {
  return (
    <article className="work-card">
      <Link
        href={"/works/" + work.id}
        aria-label={"查看《" + work.title + "》"}
      >
        <Poster work={work} comment={comment} />
      </Link>
      <div className="work-card-title">
        <Link href={"/works/" + work.id}>
          <h3>{work.title}</h3>
        </Link>
        <button
          className={"save-button " + (saved ? "saved" : "")}
          aria-label={(saved ? "取消收藏" : "收藏") + work.title}
          aria-pressed={saved}
          onClick={() => onSave(work.id)}
        >
          <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <p>
        {work.year ?? "待定"} <span>·</span> {work.universe}
      </p>
      <small className="watch-status">暂无满足条件的免费观看链接</small>
    </article>
  );
}
