"use client";
import { useEffect, useRef, useState } from "react";
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
  Character,
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
  characters,
  related,
  episodeSeries,
}: {
  work: Work;
  people: Person[];
  characters: Character[];
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
  const regionTouched = useRef(false);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        if (regionTouched.current) return;
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
    regionTouched.current = true;
    setRegion(r);
    setActive("");
    setMessage(
      r === "mainland"
        ? "已切换到中国大陆播放线路，播放器将优先加载大陆可访问来源。"
        : "已切换到海外播放线路，播放器将优先加载海外来源。",
    );
    try {
      localStorage.setItem("marvel-region", r);
    } catch {}
  };
  const regionalMedia = work.media.filter(
    (m) => m.region === region && m.status === "playback-verified",
  );
  const media = regionalMedia.filter(
    (m) =>
      m.kind === tab,
  );
  const displayMedia = media.length ? media : regionalMedia;
  // Like the reference Zhou site, the first reviewed item is playable immediately;
  // selecting a media card only changes the active item.
  const current =
    media.find((m) => m.id === active) ?? media[0] ?? regionalMedia[0];
  const directorPeople = people.filter((p) =>
    p.departments.includes("director"),
  );
  const introHighlights = work.highlights.length
    ? work.highlights
    : [
        `${work.yearText || "待核验"} · ${kindLabels[work.kind]} · ${statusLabels[work.status] ?? work.status}`,
        ...(work.facts["Directed by"]
          ? [`导演：${work.facts["Directed by"].replace(/ · $/, "")}`]
          : []),
        ...(work.facts["Music by"]
          ? [`音乐：${work.facts["Music by"].replace(/ · $/, "")}`]
          : []),
      ];
  const factRows: [string, string][] = [
    ["Running time", "片长"],
    ["No. of seasons", "已记录季数"],
    ["No. of episodes", "已记录集数"],
    ["Official indexed episodes", "官方索引集数"],
    ["Official unique episode pages observed", "唯一官方单集页"],
    ["Original language", "原始语言"],
    ["Country of origin", "制作国家"],
    ["Directed by", "导演"],
    ["Produced by", "制片"],
    ["Music by", "音乐"],
    ["Productioncompany", "制作公司"],
    ["Distributed by", "发行方"],
    ["Release dates", "发行日期"],
  ];
  const officialMediaHubs = work.sources.filter((source, index, all) => {
    if (source.verification !== "editor-reviewed") return false;
    const officialWorkPage =
      /^https:\/\/(?:www\.)?marvel\.com\/(?:movies|tv-shows)\//.test(
        source.url,
      ) ||
      /^https:\/\/(?:www\.)?sonypictures\.com\/movies\//.test(source.url) ||
      /^https:\/\/marvel\.disney\.co\.jp\/movie\//.test(source.url);
    return (
      officialWorkPage &&
      all.findIndex((candidate) => candidate.url === source.url) === index
    );
  });
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
          <section className="work-lead" aria-label="作品序章">
            <div className="work-lead-copy">
              <span className="eyebrow">THE OPENING FRAME / 作品序章</span>
              <p>{work.summary}</p>
              <div className="work-lead-highlights">
                {introHighlights.slice(0, 3).map((highlight, index) => (
                  <span key={highlight + index}>
                    <b>0{index + 1}</b>
                    {highlight}
                  </span>
                ))}
              </div>
            </div>
            <dl className="work-lead-index">
              <div>
                <dt>档案年份</dt>
                <dd>{work.yearText || "待核验"}</dd>
              </div>
              <div>
                <dt>媒介类型</dt>
                <dd>{kindLabels[work.kind]}</dd>
              </div>
              <div>
                <dt>合作人物</dt>
                <dd>{people.length} 位</dd>
              </div>
              <div>
                <dt>视听状态</dt>
                <dd>
                  {regionalMedia.length
                    ? regionalMedia.length + " 条已核验"
                    : "待核验"}
                </dd>
              </div>
            </dl>
          </section>
          <div className="work-cinema">
            <div className="work-poster">
              <Poster work={work} />
              <p>{work.posterCredit ?? "正式海报正在核验；此处不是剧照。"}</p>
            </div>
            <div className="cinema-panel">
              <div className="cinema-screen">
                {current?.embedUrl ? (
                  <>
                    <iframe
                      key={current.id + region}
                      title={current.title}
                      src={current.embedUrl}
                      allow="autoplay; fullscreen; picture-in-picture"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                    <a
                      className="cinema-open-source"
                      href={current.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      在 {current.provider} 打开 ↗
                    </a>
                  </>
                ) : (
                  <div className="player-empty">
                    <div className="cinema-archive-motion" aria-hidden="true">
                      {work.poster && <img src={work.poster} alt="" />}
                      <span className="cinema-archive-light" />
                      <span className="cinema-archive-scan" />
                      <span className="cinema-archive-stamp">
                        ARCHIVE FRAME / {work.year ?? "TBA"}
                      </span>
                    </div>
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
                {displayMedia.length ||
                (tab === "trailer" &&
                  region === "overseas" &&
                  officialMediaHubs.length) ? (
                  <div className="media-resource-list">
                    {!media.length && displayMedia.length > 0 && (
                      <small>
                        本线路暂无“{tab === "trailer" ? "预告" : tab}”分类，先展示已核验的{" "}
                        {displayMedia[0]?.kind === "clip" ? "片段" : "公开素材"}。
                      </small>
                    )}
                    {displayMedia.map((m) => (
                      <button
                        className="button compact"
                        key={m.id}
                        onClick={() => setActive(m.id)}
                      >
                        {m.title} · {m.provider} · {m.kind === "clip" ? "片段" : "预告"}
                      </button>
                    ))}
                    {tab === "trailer" && region === "overseas" &&
                      officialMediaHubs.map((source) => (
                        <a
                          className="media-hub-link"
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          key={source.url}
                        >
                          官方作品页 · 预告／花絮资料入口
                          <ExternalLink size={13} />
                        </a>
                      ))}
                    {officialMediaHubs.length > 0 &&
                      tab === "trailer" &&
                      region === "overseas" && (
                        <small>
                          外部官方页可能含预告、花絮或剧照；它不是完整正片播放入口，实际内容以权利方页面为准。
                        </small>
                      )}
                  </div>
                ) : (
                  <p>
                    {region === "mainland"
                      ? "暂无已完成浏览器播放核验的中国大陆官方来源；不会自动切换到 YouTube 或版权不明网站。"
                      : "本分类暂未有完成实际播放核验的内容。切换地区不会把预告当成完整影片。"}
                  </p>
                )}
                {current && (
                  <div className="media-current-note">
                    <strong>{current.title}</strong>
                    <span>
                      {current.provider} ·{" "}
                      {current.region === "mainland" ? "中国大陆" : "海外"} ·{" "}
                      播放核验 {current.checkedAt ?? "日期待补"}
                    </span>
                    <small>
                      这是已核验的预告、宣传片或片段，不代表完整正片；完整影片入口单独核验。
                    </small>
                  </div>
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
                {factRows.map(([k, label]) =>
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
              {characters.length > 0 && (
                <div className="character-index">
                  <span className="eyebrow">ROLE INDEX / 角色索引</span>
                  <h3>本作角色</h3>
                  <div>
                    {characters.map((character) => (
                      <span key={character.id}>
                        <strong>{character.name}</strong>
                        <small>
                          {character.alias ? character.alias + " · " : ""}
                          {character.actor}
                        </small>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </aside>
          </div>
          <section className="work-deep-dive">
            <div className="section-heading">
              <div>
                <span className="eyebrow">THE STORY BEHIND THE FRAME</span>
                <h2>从这一帧继续往里走</h2>
              </div>
              <span className="work-deep-caption">
                资料、人物与视听入口分层呈现
              </span>
            </div>
            <div className="work-deep-grid">
              <article className="work-deep-card work-event-card">
                <span className="eyebrow">EVENT LOG</span>
                <h3>重要事件</h3>
                <ol>
                  {introHighlights.slice(0, 5).map((event, index) => (
                    <li key={event + index}>
                      <b>{String(index + 1).padStart(2, "0")}</b>
                      <span>{event}</span>
                    </li>
                  ))}
                </ol>
              </article>
              <article className="work-deep-card work-credit-card">
                <span className="eyebrow">CREDITS ROLL</span>
                <h3>创作与声音</h3>
                <p>
                  {directorPeople.length
                    ? "导演：" +
                      directorPeople.map((person) => person.name).join("／")
                    : work.facts["Directed by"]
                      ? "导演：" + work.facts["Directed by"]
                      : "导演资料待继续核验"}
                </p>
                <p>
                  {work.facts["Music by"]
                    ? "音乐：" + work.facts["Music by"]
                    : "音乐资料待继续核验"}
                </p>
                <p>
                  {work.facts["Productioncompany"] ?? "制作公司资料待继续核验"}
                </p>
                <small>
                  资料来源与观看入口分开记录；片段播放器只呈现已经完成播放核验的公开素材。
                </small>
              </article>
              <article className="work-deep-card work-universe-card">
                <span className="eyebrow">UNIVERSE TRACE</span>
                <h3>宇宙位置</h3>
                <p>
                  {work.universe}
                  {work.phase ? " · MCU 电影第 " + work.phase + " 阶段" : ""}
                </p>
                <p>
                  这部作品的前后关联、共同演员与导演，会在首页“关系宇宙”继续展开。
                </p>
                <Link
                  className="button compact"
                  href="/?focus=relationships#relationships"
                >
                  打开关系宇宙 <ArrowUpRight size={14} />
                </Link>
              </article>
            </div>
          </section>
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
