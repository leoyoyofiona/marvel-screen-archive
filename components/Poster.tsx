"use client";
import { Film, ArrowUpRight, Bookmark } from "lucide-react";
import Link from "next/link";
import type { Work } from "@/lib/catalogue-types";
import { kindLabels } from "@/lib/catalogue-types";
export function Poster({
  work,
  decorative = false,
}: {
  work: Work;
  decorative?: boolean;
}) {
  return (
    <div className={"poster-frame " + (!work.poster ? "no-art" : "")}>
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
          aria-label={decorative ? undefined : work.title + "，海报待核验"}
        >
          <span className="film-perforation" />
          <span className="frame-year">{work.year ?? "TBA"}</span>
          <Film size={30} />
          <strong>{work.title}</strong>
          <span className="pending-art">海报素材核验中</span>
          <span className="frame-code">MARVEL SCREEN ARCHIVE</span>
        </div>
      )}
      <div className="poster-shine" />
      <span className="poster-kind">{kindLabels[work.kind]}</span>
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
}: {
  work: Work;
  saved: boolean;
  onSave: (id: string) => void;
}) {
  return (
    <article className="work-card">
      <Link
        href={"/works/" + work.id}
        aria-label={"查看《" + work.title + "》"}
      >
        <Poster work={work} />
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
