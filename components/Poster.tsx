"use client";
import * as React from "react";
import type { CSSProperties } from "react";
import { Film, ArrowUpRight, ArrowRight, Bookmark } from "lucide-react";
import Link from "next/link";
import type { PublicWorkPreview, WorkPreview } from "@/lib/catalogue-types";
import { kindLabels, statusLabels } from "@/lib/catalogue-types";

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
  const [failedImageKey, setFailedImageKey] = React.useState<string | null>(null);
  const imageKey = `${work.id}:${work.poster ?? ""}`;
  const showImage = Boolean(work.poster) && failedImageKey !== imageKey;
  const archiveStyle = {
    "--poster-hue": posterHue(work.id),
  } as CSSProperties;
  return (
    <div
      className={"poster-frame " + (!showImage ? "no-art" : "")}
      style={showImage ? undefined : archiveStyle}
    >
      {showImage ? (
        <img
          src={work.poster ?? ""}
          alt={decorative ? "" : work.title + "海报"}
          loading={decorative ? "eager" : "lazy"}
          width="400"
          height="600"
          onError={() => setFailedImageKey(imageKey)}
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
  work: PublicWorkPreview;
  saved: boolean;
  onSave: (id: string) => void;
  comment?: { name: string; body: string };
}) {
  const [flipped, setFlipped] = React.useState(false);
  const facts = work.facts ?? {};
  const summary = work.summary || "这部作品的档案摘要正在继续整理。";
  const detailRows = [
    ["首发", work.date || work.yearText || "待核验"],
    ["导演", facts["Directed by"]?.replace(/ · $/, "") || "资料待核验"],
    ["主演", facts.Starring?.replace(/ · $/, "") || `${work.peopleCount ?? 0} 位索引人物`],
    ["票房", facts["Box office"] || "未录入可靠票房记录"],
  ] as const;
  function toggle(event?: React.MouseEvent | React.KeyboardEvent) {
    if (event && "key" in event && event.key !== "Enter" && event.key !== " ") return;
    if (event) event.preventDefault();
    setFlipped((value) => !value);
  }
  return (
    <article
      className={`work-card${flipped ? " is-flipped" : ""}`}
      tabIndex={0}
      role="button"
      aria-label={`${flipped ? "返回海报" : "翻看"}《${work.title}》`}
      onClick={toggle}
      onKeyDown={toggle}
    >
      <div className="work-card-flipper">
        <div className="work-card-face work-card-front" aria-hidden={flipped}>
          <Poster work={work} comment={comment} />
          <div className="work-card-title">
            <h3>{work.title}</h3>
            <button
              className={"save-button " + (saved ? "saved" : "")}
              aria-label={(saved ? "取消收藏" : "收藏") + work.title}
              aria-pressed={saved}
              onClick={(event) => {
                event.stopPropagation();
                onSave(work.id);
              }}
            >
              <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
            </button>
          </div>
          <p>
            {work.year ?? "待定"} <span>·</span> {work.universe}
          </p>
          <small className="watch-status">点击卡片翻看档案详情</small>
        </div>
        <div className="work-card-face work-card-back" aria-hidden={!flipped}>
          <div className="work-card-back-heading">
            <span className="eyebrow">WORK FILE / 作品档案</span>
            <strong>{work.title}</strong>
            <small>{kindLabels[work.kind]} · {statusLabels[work.status] ?? work.status}</small>
          </div>
          <p className="work-card-summary">{summary}</p>
          <dl className="work-card-facts">
            {detailRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
          </dl>
          <div className="work-card-back-actions">
            <Link href={`/works/${work.id}`} onClick={(event) => event.stopPropagation()}>
              打开完整档案 <ArrowRight size={14} />
            </Link>
            <Link href={`/works/${work.id}#audiovisual-space`} onClick={(event) => event.stopPropagation()}>
              进入影视厅 <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
