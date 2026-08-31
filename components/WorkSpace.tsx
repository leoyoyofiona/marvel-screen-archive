"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Film,
  Heart,
  ExternalLink,
  UserRound,
  ImageIcon,
  Music2,
  Clapperboard,
  FileText,
  ShieldCheck,
} from "lucide-react";
import type {
  OfficialEpisodeSeries,
  Person,
  Work,
} from "@/lib/catalogue-types";
import { kindLabels, statusLabels } from "@/lib/catalogue-types";
import { Header, Disclaimer, Footer } from "./Chrome";
import { Poster } from "./Poster";
import { Comments } from "./Community";
import { EpisodeArchive } from "./EpisodeArchive";
export default function WorkSpace({
  work,
  people,
  related,
  episodeSeries,
}: {
  work: Work;
  people: Person[];
  related: Work[];
  episodeSeries: OfficialEpisodeSeries | null;
}) {
  const [region, setRegion] = useState<"mainland" | "overseas">("mainland"),
    [tab, setTab] = useState("trailer"),
    [active, setActive] = useState(""),
    [liked, setLiked] = useState(false),
    [likes, setLikes] = useState<number | null>(null),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setRegion(
          localStorage.getItem("marvel-region") === "overseas"
            ? "overseas"
            : "mainland",
        );
      } catch {}
    });
    const controller = new AbortController();
    fetch("/api/engagement?workId=" + encodeURIComponent(work.id), {
      signal: controller.signal,
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) {
          setLikes(d.likes);
          setLiked(d.liked);
        }
      })
      .catch(() => {});
    return () => {
      cancelAnimationFrame(frame);
      controller.abort();
    };
  }, [work.id]);
  const changeRegion = (r: "mainland" | "overseas") => {
    setRegion(r);
    setActive("");
    try {
      localStorage.setItem("marvel-region", r);
    } catch {}
  };
  const media = work.media.filter(
    (m) =>
      m.region === region && m.kind === tab && m.status === "playback-verified",
  );
  const current = media.find((m) => m.id === active);
  async function like() {
    if (pending) return;
    setPending(true);
    try {
      const r = await fetch("/api/engagement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "like",
          workId: work.id,
          liked: !liked,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error ?? "暂时无法保存");
      setLiked(d.liked);
      setLikes(d.likes);
      setMessage(d.liked ? "已记录你对这部作品的喜欢。" : "已取消点赞。");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "连接失败，请稍后再试。");
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <Header region={region} onRegion={changeRegion} detail />
      <main id="main" className="work-main">
        <div className="work-backdrop" aria-hidden="true">
          {work.backdrop && <img src={work.backdrop} alt="" />}
        </div>
        <div className="container">
          <div className="work-breadcrumb">
            <Link href="/#archive" className="back-link">
              <ArrowLeft size={17} />
              返回作品档案
            </Link>
            <span>
              {work.universe} <i>/</i> {work.year ?? "待定"}
            </span>
          </div>
          <div className="work-space-heading">
            <div>
              <span className="eyebrow">
                THE SCREEN ROOM /{" "}
                {work.id.split("-").slice(-2).join(" ").toUpperCase()}
              </span>
              <h1>{work.title}</h1>
              <p>{work.titleEn}</p>
            </div>
            <button
              className={"button " + (liked ? "selected" : "")}
              disabled={pending}
              onClick={like}
              aria-pressed={liked}
            >
              <Heart size={18} fill={liked ? "currentColor" : "none"} />
              {liked ? "已喜欢" : "喜欢这部作品"} <span>{likes ?? "—"}</span>
            </button>
          </div>
          <div className="work-cinema">
            <div className="work-poster">
              <Poster work={work} />
              <p>{work.posterCredit ?? "正式海报正在核验；此处不是剧照。"}</p>
            </div>
            <div className="cinema-panel">
              <div className="cinema-screen">
                {current?.embedUrl ? (
                  <iframe
                    key={current.id + region}
                    title={current.title}
                    src={current.embedUrl}
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : (
                  <div className="player-empty">
                    <Film size={38} />
                    <span>
                      {region === "mainland" ? "中国大陆" : "海外"}视听线路
                    </span>
                    <h2>
                      {tab === "stills"
                        ? "剧照资料正在整理"
                        : "等待经过核验的播放来源"}
                    </h2>
                    <p>
                      没有合适来源时保留作品资料，不加载不明播放器。
                      <br />
                      官方预告、歌曲与短片将与完整正片分别标注。
                    </p>
                  </div>
                )}
              </div>
              <div className="media-tabs" role="tablist" aria-label="作品媒体">
                <button
                  role="tab"
                  aria-selected={tab === "trailer"}
                  onClick={() => {
                    setTab("trailer");
                    setActive("");
                  }}
                >
                  <Clapperboard size={16} />
                  预告与短片
                </button>
                <button
                  role="tab"
                  aria-selected={tab === "stills"}
                  onClick={() => {
                    setTab("stills");
                    setActive("");
                  }}
                >
                  <ImageIcon size={16} />
                  经典剧照
                </button>
                <button
                  role="tab"
                  aria-selected={tab === "music"}
                  onClick={() => {
                    setTab("music");
                    setActive("");
                  }}
                >
                  <Music2 size={16} />
                  音乐与插曲
                </button>
                <button
                  role="tab"
                  aria-selected={tab === "dialogue"}
                  onClick={() => {
                    setTab("dialogue");
                    setActive("");
                  }}
                >
                  <FileText size={16} />
                  原声对白
                </button>
              </div>
              <div role="tabpanel" className="media-panel">
                {media.length ? (
                  media.map((m) => (
                    <button
                      className="button compact"
                      key={m.id}
                      onClick={() => setActive(m.id)}
                    >
                      {m.title} · {m.provider}
                    </button>
                  ))
                ) : (
                  <p>
                    本分类暂未有完成实际播放核验的内容。切换地区不会把预告当成完整影片。
                  </p>
                )}
              </div>
              <div className="full-watch">
                <ShieldCheck size={18} />
                <div>
                  <strong>完整影片观看入口</strong>
                  <p>暂无满足条件的免费观看链接</p>
                </div>
                <span>合法 · 完整 · 高清 · 无强制广告</span>
              </div>
            </div>
          </div>
          <div className="work-details-grid">
            <section className="work-overview">
              <span className="eyebrow">ABOUT THE WORK</span>
              <h2>关于这部作品</h2>
              <p className="work-summary">{work.summary}</p>
              <div className="work-tags">
                <span>{kindLabels[work.kind]}</span>
                <span>{statusLabels[work.status] ?? work.status}</span>
                <span>{work.universe}</span>
                {work.phase && <span>MCU 电影第 {work.phase} 阶段</span>}
              </div>
              {work.edition && (
                <p className="editorial-warning">版本说明：{work.edition}</p>
              )}
              <dl className="work-facts">
                <div>
                  <dt>首发年份</dt>
                  <dd>{work.yearText || "待核验"}</dd>
                </div>
                <div>
                  <dt>官方日期记录</dt>
                  <dd>{work.date ?? "未录入精确日期"}</dd>
                </div>
                {[
                  ["Running time", "片长"],
                  ["No. of seasons", "已记录季数"],
                  ["No. of episodes", "已记录集数"],
                  ["Official indexed episodes", "官方索引集数"],
                  ["Official unique episode pages observed", "唯一官方单集页"],
                  ["Original language", "原始语言"],
                  ["Country of origin", "制作国家"],
                ].map(([k, label]) =>
                  work.facts[k] ? (
                    <div key={k}>
                      <dt>{label}</dt>
                      <dd>{work.facts[k]}</dd>
                    </div>
                  ) : null,
                )}
              </dl>
              <p className="muted tiny">
                年份、季数与演职员来源可在下方核对；部分官方信息核实不等于整个档案全部核验。
              </p>
              {work.highlights.length > 0 && (
                <>
                  <h3>重要记录</h3>
                  <ul className="work-events">
                    {work.highlights.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                </>
              )}
              {work.seasons.length > 0 && (
                <details open>
                  <summary>季与发行版本参考（{work.seasons.length}）</summary>
                  <p className="tiny muted">
                    以下为资料链接，不是免费观看入口；完整季级资料仍在核对。
                  </p>
                  <div className="season-grid" id="seasons">
                    {work.seasons.map((s) => (
                      <a
                        className="season-card"
                        key={s.url}
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="season-art">
                          {s.image ? (
                            <img src={s.image} alt={`${s.label} 官方宣传图`} />
                          ) : (
                            <Film size={20} aria-hidden="true" />
                          )}
                        </span>
                        <span>
                          {s.label || "季资料"}
                          <small>资料页，不是观看入口</small>
                        </span>
                        <ExternalLink size={12} />
                      </a>
                    ))}
                  </div>
                </details>
              )}
            </section>
            <aside className="work-credits">
              <span className="eyebrow">THE PEOPLE BEHIND IT</span>
              <h2>演员与创作者</h2>
              <div className="credits-list">
                {people.slice(0, 15).map((p) => (
                  <Link href={"/?person=" + p.id + "#relationships"} key={p.id}>
                    <div
                      className="avatar-fallback"
                      title={p.portraitCredit ?? undefined}
                    >
                      {p.portrait ? (
                        <img src={p.portrait} alt="" loading="lazy" />
                      ) : (
                        <UserRound size={19} />
                      )}
                    </div>
                    <div>
                      <strong>{p.name}</strong>
                      <small>
                        {p.departments.includes("director")
                          ? "导演"
                          : "演员／创作者"}{" "}
                        ·{" "}
                        {p.portraitKind === "identity-fallback"
                          ? "姓名身份头像"
                          : p.portrait
                            ? "开放许可照片"
                            : "头像待核"}
                      </small>
                    </div>
                    <ArrowUpRight size={14} />
                  </Link>
                ))}
              </div>
              {people.length > 15 && (
                <details>
                  <summary>其余 {people.length - 15} 位索引人物</summary>
                  {people.slice(15).map((p) => (
                    <Link
                      className="season-source"
                      key={p.id}
                      href={"/?person=" + p.id + "#relationships"}
                    >
                      {p.name}
                      <ArrowUpRight size={12} />
                    </Link>
                  ))}
                </details>
              )}
              {!people.length && (
                <p className="muted">演职员名单尚待补充核验。</p>
              )}
            </aside>
          </div>
          {episodeSeries && <EpisodeArchive series={episodeSeries} />}
          <section className="work-sources">
            <div>
              <span className="eyebrow">EVIDENCE / NOT WATCH LINKS</span>
              <h2>资料来源</h2>
              <p>
                这些链接用于核验片目信息，不承诺免费、无广告或可播放完整影片。
              </p>
            </div>
            <div>
              {work.sources.map((s, i) => (
                <a
                  href={s.url}
                  key={s.url + i}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div>
                    <strong>{s.title}</strong>
                    <small>
                      {s.checkedAt
                        ? "资料查阅日期 " + s.checkedAt
                        : "链接待复核"}{" "}
                      · {new URL(s.url).hostname}
                    </small>
                  </div>
                  <ExternalLink size={16} />
                </a>
              ))}
            </div>
          </section>
          <section className="section work-comments">
            <span className="eyebrow">YOUR MEMORY OF THIS STORY</span>
            <h2>这部作品，留给你什么？</h2>
            <Comments workId={work.id} />
          </section>
          <section className="section">
            <div className="section-heading">
              <h2>继续探索同一世界</h2>
              <Link href="/#archive">
                返回全部作品 <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="poster-grid related-grid">
              {related.map((w) => (
                <Link href={"/works/" + w.id} key={w.id}>
                  <Poster work={w} />
                  <h3>{w.title}</h3>
                  <p className="muted tiny">{w.year}</p>
                </Link>
              ))}
            </div>
          </section>
          <Disclaimer />
        </div>
      </main>
      <Footer />
      {message && (
        <div role="status" className="toast">
          {message}
          <button aria-label="关闭提示" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
    </>
  );
}
