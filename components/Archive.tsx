"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Disc3,
  VolumeX,
  FileCheck2,
  ExternalLink,
} from "lucide-react";
import type { Catalogue, WorkKind } from "@/lib/catalogue-types";
import { kindLabels } from "@/lib/catalogue-types";
import { Header, Disclaimer, Footer } from "./Chrome";
import { WorkCard } from "./Poster";
import { ReferenceChecklist } from "./ReferenceChecklist";
import Timeline from "./Timeline";
const Relationships = dynamic(() => import("./Relationships"), {
  loading: () => <div className="loading-section">正在打开关系宇宙…</div>,
  ssr: false,
});
const Community = dynamic(() => import("./Community"), {
  loading: () => <div className="loading-section">正在打开影迷现场…</div>,
  ssr: false,
});
const PAGE_SIZE = 20;
export default function Archive({ data }: { data: Catalogue }) {
  const [region, setRegion] = useState<"mainland" | "overseas">("mainland"),
    [query, setQuery] = useState(""),
    [universe, setUniverse] = useState("all"),
    [kind, setKind] = useState("all"),
    [phase, setPhase] = useState("all"),
    [release, setRelease] = useState("all"),
    [sort, setSort] = useState("asc"),
    [onlySaved, setOnlySaved] = useState(false),
    [page, setPage] = useState(1),
    [saved, setSaved] = useState<string[]>([]),
    [auditOpen, setAuditOpen] = useState(false),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const state = JSON.parse(
          sessionStorage.getItem("marvel-archive-state") ?? "null",
        );
        if (state) {
          setQuery(state.query ?? "");
          setUniverse(state.universe ?? "all");
          setKind(state.kind ?? "all");
          setPhase(state.phase ?? "all");
          setPage(state.page ?? 1);
          setRelease(state.release ?? "all");
          setSort(state.sort ?? "asc");
          setOnlySaved(!!state.onlySaved);
        }
        setSaved(JSON.parse(localStorage.getItem("marvel-saved") ?? "[]"));
        setRegion(
          localStorage.getItem("marvel-region") === "overseas"
            ? "overseas"
            : "mainland",
        );
      } catch {}
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(
        "marvel-archive-state",
        JSON.stringify({
          query,
          universe,
          kind,
          phase,
          page,
          release,
          sort,
          onlySaved,
        }),
      );
    } catch {}
  }, [query, universe, kind, phase, page, release, sort, onlySaved]);
  const changeRegion = (r: "mainland" | "overseas") => {
    setRegion(r);
    try {
      localStorage.setItem("marvel-region", r);
    } catch {}
  };
  const toggleSaved = (id: string) => {
    setSaved((current) => {
      const next = current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id];
      try {
        localStorage.setItem("marvel-saved", JSON.stringify(next));
      } catch {
        setNotice("当前浏览器禁止本地保存，收藏仅在本次页面中有效。");
      }
      return next;
    });
  };
  const universes = [...new Set(data.works.map((w) => w.universe))];
  const filtered = useMemo(
    () =>
      data.works
        .filter(
          (w) =>
            (!query ||
              [w.title, w.titleEn, w.yearText]
                .join(" ")
                .toLowerCase()
                .includes(query.toLowerCase())) &&
            (universe === "all" || w.universe === universe) &&
            (kind === "all" || w.kind === kind) &&
            (phase === "all" || w.phase === Number(phase)) &&
            (release === "all" || w.status === release) &&
            (!onlySaved || saved.includes(w.id)),
        )
        .sort((a, b) =>
          sort === "desc"
            ? (b.year ?? 9999) - (a.year ?? 9999)
            : (a.year ?? 9999) - (b.year ?? 9999),
        ),
    [data.works, query, universe, kind, phase, release, sort, onlySaved, saved],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)),
    safePage = Math.min(page, pageCount);
  const paged = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );
  const reset = () => {
    setQuery("");
    setUniverse("all");
    setKind("all");
    setPhase("all");
    setRelease("all");
    setOnlySaved(false);
    setPage(1);
  };
  const goPage = (value: number) => {
    setPage(value);
    document
      .getElementById("archive")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const hero = data.works.find(
    (w) => w.id === "spider-man-brand-new-day-2026-film",
  );
  return (
    <>
      <Header region={region} onRegion={changeRegion} />
      <main id="main">
        <section className="hero">
          <div className="hero-scene" aria-hidden="true">
            {hero?.backdrop ? (
              <img src={hero.backdrop} alt="" fetchPriority="high" />
            ) : (
              <>
                <div className="cosmic-orbit orbit-one" />
                <div className="cosmic-orbit orbit-two" />
                <div className="cosmic-orbit orbit-three" />
                <div className="cosmic-grain" />
                <span className="universe-watermark">
                  A WORLD
                  <br />
                  OF STORIES.
                </span>
              </>
            )}
          </div>
          <div className="hero-content">
            <div className="hero-kicker">
              <span />
              私人银幕档案 <i>·</i> FOR THE LOVE OF STORIES
            </div>
            <h1>
              每一个宇宙，
              <br />
              都有值得<span>重看</span>的故事。
            </h1>
            <p>
              从银幕初见，到多元宇宙。
              <br />
              按作品、角色与时间，重新走进漫威。
            </p>
            <div className="hero-ctas">
              <a className="button primary" href="#timeline">
                进入时间长廊 <ArrowRight size={18} />
              </a>
              <a className="button ghost" href="#archive">
                浏览全部作品 <ArrowUpRight size={18} />
              </a>
            </div>
            <div className="hero-note">
              <span>1944—</span>
              <div>
                不只 MCU
                <br />
                <small>真人 · 动画 · 剧集 · 纪录 · 历史关联</small>
              </div>
            </div>
          </div>
          <div className="hero-bottom">
            <span>
              LEOYOYOFIONA <i>/</i> 非官方影迷项目
            </span>
            <button
              onClick={() => {
                document
                  .getElementById("listening")
                  ?.scrollIntoView({ behavior: "smooth" });
                setNotice(
                  "音乐仅在点击合规来源后播放；当前不自动播放未核验音源。",
                );
              }}
            >
              <VolumeX size={16} />
              声音默认关闭 <ArrowUpRight size={14} />
            </button>
            <span>
              向下探索 <ArrowRight className="rotate" size={17} />
            </span>
          </div>
        </section>
        <div className="container">
          <Disclaimer />
          <div className="build-status">
            <span>
              <i />
              档案建设中
            </span>
            <p>
              已索引 {data.works.length} 个系列级项目，其中含{" "}
              {data.audit.officialDigitalSeriesCount} 个 Marvel
              官方数字节目／播客；官方页面可见单集总量为{" "}
              {data.audit.officialDigitalEpisodeTotal.toLocaleString("zh-CN")}。
              这不等于每一集均已完成资料核验。
            </p>
            <button
              onClick={() => setAuditOpen(!auditOpen)}
              aria-expanded={auditOpen}
            >
              查看收录进度 <ArrowUpRight size={14} />
            </button>
          </div>
          {auditOpen && (
            <section className="audit-panel">
              <h2>收录与核验进度</h2>
              <div className="audit-metrics">
                <span>
                  {data.audit.candidateCount}
                  <small>片目项目</small>
                </span>
                <span>
                  {data.audit.primaryReviewed}
                  <small>部分官方信息已核</small>
                </span>
                <span>
                  {data.audit.posterCount}
                  <small>可发布海报</small>
                </span>
                <span>
                  {data.audit.officialDigitalSeriesCount}
                  <small>官方数字系列</small>
                </span>
                <span>
                  {data.audit.officialDigitalEpisodeTotal.toLocaleString(
                    "zh-CN",
                  )}
                  <small>官方可见单集总量</small>
                </span>
                <span>
                  {data.audit.personPortraitCount}
                  <small>
                    人物头像 · {data.audit.personRealPortraitCount}{" "}
                    张开放许可照片
                  </small>
                </span>
                <span>
                  {data.works.length - data.audit.untranslated}
                  <small>中文档案标题 · 同时保留英文原名</small>
                </span>
                <span>
                  {data.audit.watchLinkCount}
                  <small>合规全片链接</small>
                </span>
              </div>
              <ul>
                {data.audit.gaps.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
              <p>
                中文名称为整理用译名；未找到可靠中文名的条目保留原名。剧集电影版、历史合作与旗下出版品牌单独标注，不把它们伪装成
                MCU 正史。
              </p>
              <ReferenceChecklist />
            </section>
          )}
          <Timeline works={data.works} />
          <section id="archive" className="section archive-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">02 / THE SCREEN ARCHIVE</span>
                <h2>
                  作品档案<span>每一个故事，都有自己的坐标</span>
                </h2>
              </div>
              <button
                className={"button compact " + (onlySaved ? "selected" : "")}
                aria-pressed={onlySaved}
                onClick={() => {
                  setOnlySaved(!onlySaved);
                  setPage(1);
                }}
              >
                <Bookmark size={15} />
                我的收藏 · {saved.length}
              </button>
            </div>
            <div className="filter-top">
              <label className="search-field">
                <Search size={19} />
                <input
                  aria-label="搜索作品"
                  placeholder="搜索片名、英文名或年份…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
                {query && (
                  <button aria-label="清空搜索" onClick={() => setQuery("")}>
                    ×
                  </button>
                )}
              </label>
              <span className="filter-label">
                <SlidersHorizontal size={16} />
                筛选档案
              </span>
            </div>
            <div className="filter-row">
              <label>
                所属世界
                <select
                  aria-label="筛选宇宙"
                  value={universe}
                  onChange={(e) => {
                    setUniverse(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">全部宇宙</option>
                  {universes.map((u) => (
                    <option key={u}>{u}</option>
                  ))}
                </select>
              </label>
              <label>
                作品形式
                <select
                  aria-label="筛选作品类型"
                  value={kind}
                  onChange={(e) => {
                    setKind(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">全部类型</option>
                  {Object.entries(kindLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                MCU 电影阶段
                <select
                  aria-label="筛选MCU阶段"
                  value={phase}
                  onChange={(e) => {
                    setPhase(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">全部阶段</option>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      第 {n} 阶段
                    </option>
                  ))}
                </select>
              </label>
              <label>
                发行状态
                <select
                  aria-label="筛选发行状态"
                  value={release}
                  onChange={(e) => {
                    setRelease(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">全部状态</option>
                  <option value="released">已推出</option>
                  <option value="announced">后续已公布</option>
                  <option value="unreleased">未正式发行</option>
                  <option value="release-unverified">发行状态待核</option>
                </select>
              </label>
              <label>
                排列方式
                <select
                  aria-label="作品排序"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="asc">首发年份：从早到晚</option>
                  <option value="desc">首发年份：从晚到早</option>
                </select>
              </label>
            </div>
            <div className="results-line">
              <span>
                找到 <strong>{filtered.length}</strong> 项档案 <i>／</i> 共{" "}
                {data.works.length} 项
              </span>
              <button onClick={reset}>重置筛选</button>
            </div>
            {paged.length ? (
              <div className="poster-grid">
                {paged.map((w) => (
                  <WorkCard
                    key={w.id}
                    work={w}
                    saved={saved.includes(w.id)}
                    onSave={toggleSaved}
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <Search size={28} />
                <h3>这个组合暂时没有作品。</h3>
                <p>可以换一个关键词，或清除筛选继续浏览。</p>
                <button className="button" onClick={reset}>
                  清除筛选
                </button>
              </div>
            )}
            <nav className="pagination" aria-label="作品分页">
              <button
                className="button compact"
                disabled={safePage === 1}
                onClick={() => goPage(safePage - 1)}
              >
                <ChevronLeft size={16} />
                上一页
              </button>
              <span>
                第 {safePage} / {pageCount} 页
              </span>
              <label>
                跳到
                <select
                  aria-label="跳转作品页码"
                  value={safePage}
                  onChange={(e) => goPage(Number(e.target.value))}
                >
                  {Array.from({ length: pageCount }, (_, i) => (
                    <option key={i + 1}>{i + 1}</option>
                  ))}
                </select>
                页
              </label>
              <button
                className="button compact"
                disabled={safePage === pageCount}
                onClick={() => goPage(safePage + 1)}
              >
                下一页
                <ChevronRight size={16} />
              </button>
            </nav>
          </section>
          <Relationships
            works={data.works}
            people={data.people}
            characters={data.characters}
          />
          <section className="section behind-section">
            <div>
              <span className="eyebrow">04 / BEHIND THE FRAME</span>
              <h2>
                英雄之外，
                <br />
                还有创造故事的人。
              </h2>
              <p>
                制作纪录、配乐访谈与幕后影像独立归档。
                <br />
                不是虚构世界的角色出场，也不是完整版电影。
              </p>
              <button
                className="button ghost"
                onClick={() => {
                  setKind("documentary");
                  setUniverse("all");
                  setPhase("all");
                  setRelease("all");
                  setQuery("");
                  setPage(1);
                  document
                    .getElementById("archive")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                查看纪录与幕后 <ArrowUpRight size={16} />
              </button>
            </div>
            <div className="behind-list">
              {data.works
                .filter((w) => w.kind === "documentary")
                .slice(0, 3)
                .map((w, i) => (
                  <Link href={"/works/" + w.id} key={w.id}>
                    <span>0{i + 1}</span>
                    <div>
                      <h3>{w.title}</h3>
                      <p>{w.year} · 纪录／幕后</p>
                    </div>
                    <ArrowUpRight size={21} />
                  </Link>
                ))}
            </div>
          </section>
          <section id="listening" className="section listening-section">
            <div className="section-heading">
              <div>
                <span className="eyebrow">05 / THE SOUND OF STORIES</span>
                <h2>
                  视听厅<span>有些旋律，一响起就是一段回忆</span>
                </h2>
              </div>
              <Disc3 size={30} className="silver" />
            </div>
            <div className="listening-empty">
              <div className="record-art">
                <div />
                <span>
                  ORIGINAL
                  <br />
                  SOUNDTRACKS
                </span>
              </div>
              <div>
                <span className="tag">
                  {region === "mainland" ? "中国大陆线路" : "海外线路"}
                </span>
                <h3>留给真正的电影原声。</h3>
                <p>
                  曲目、经典对白与官方片段正在逐条核对来源和播放条件。不会用其他音乐冒充电影配乐，也不会把搜索结果或预告当成免费全片。
                </p>
                <span className="muted">
                  <FileCheck2 size={16} /> 当前无已完成播放核验的音频条目
                </span>
              </div>
            </div>
          </section>
          <Community />
          <section className="source-note">
            <FileCheck2 size={19} />
            <div>
              <h3>每一项资料，都应该有出处。</h3>
              <p>
                本轮目录以影视索引建立，再以漫威、迪士尼、索尼等官方作品页交叉核对。完整性、图片使用依据与播放状态分别记录，不以一个“已验证”笼统代替。
              </p>
              <a
                href="https://www.marvel.com/movies/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Marvel 官方电影目录 <ExternalLink size={13} />
              </a>
            </div>
          </section>
        </div>
      </main>
      <Footer />
      {notice && (
        <div role="status" className="toast">
          {notice}
          <button aria-label="关闭提示" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}
      <nav className="mobile-bottom" aria-label="移动导航">
        <a href="#timeline">时间</a>
        <a href="#archive">作品</a>
        <a href="#relationships">关系</a>
        <a href="#community">影迷</a>
      </nav>
    </>
  );
}
