"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Globe2,
  ArrowUpRight,
  MessageCircle,
  RefreshCw,
  Send,
  ShieldCheck,
} from "lucide-react";
import { countries, continents } from "countries-list";
import type { TCountryCode } from "countries-list";
import { geoEqualEarth, geoPath, geoCentroid } from "d3-geo";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import type { Topology, GeometryCollection } from "topojson-specification";
type Comment = { id: string; name: string; body: string; created_at: string };
type Stats = {
  total: number;
  recent: number;
  distribution: { country: string; count: number }[];
  mode: string;
  updatedAt: string;
};
const display = new Intl.DisplayNames(["zh-Hans"], { type: "region" });
const continentNames: Record<string, string> = {
  AF: "非洲",
  AN: "南极洲",
  AS: "亚洲",
  EU: "欧洲",
  NA: "北美洲",
  OC: "大洋洲",
  SA: "南美洲",
};
const topology = world as unknown as Topology<{
  countries: GeometryCollection;
}>;
const geography = feature(topology, topology.objects.countries);
type WorldFeature = (typeof geography.features)[number] & {
  properties: { name?: string } | null;
};
const worldFeatures = geography.features as WorldFeature[];
const projection = geoEqualEarth().fitExtent(
  [
    [16, 18],
    [824, 402],
  ],
  geography,
);
const path = geoPath(projection);
const isoNameAliases: Record<string, string> = {
  US: "United States of America",
  RU: "Russia",
  CZ: "Czechia",
  CI: "Côte d'Ivoire",
  CD: "Dem. Rep. Congo",
  CG: "Congo",
  CF: "Central African Rep.",
  DO: "Dominican Rep.",
  SS: "S. Sudan",
  GQ: "Eq. Guinea",
  BA: "Bosnia and Herz.",
  KR: "South Korea",
  KP: "North Korea",
  TW: "Taiwan",
  TL: "Timor-Leste",
  SB: "Solomon Is.",
  FK: "Falkland Is.",
  SZ: "eSwatini",
};
export function Comments({ workId }: { workId?: string }) {
  const [comments, setComments] = useState<Comment[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [pending, setPending] = useState(false),
    [message, setMessage] = useState(""),
    [name, setName] = useState(""),
    [body, setBody] = useState(""),
    [website, setWebsite] = useState("");
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(
        "/api/comments" +
          (workId ? "?workId=" + encodeURIComponent(workId) : ""),
      );
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setComments(d.comments);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "暂时无法读取留言。");
    } finally {
      setLoading(false);
    }
  }, [workId]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => void reload());
    return () => cancelAnimationFrame(frame);
  }, [reload]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    try {
      const r = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, body, website, workId }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setBody("");
      setMessage(d.message);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "留言未保存，请重试。");
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="comment-layout">
      <form className="comment-form" onSubmit={submit}>
        <h3>
          <MessageCircle size={18} />
          {workId ? "写下你的观影记忆" : "给路过这里的影迷留句话"}
        </h3>
        <label>
          昵称
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="不必使用真实姓名"
            maxLength={24}
            required
          />
        </label>
        <label>
          留言
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="你最想重看哪一个故事？"
            maxLength={300}
            minLength={2}
            required
            rows={4}
          />
        </label>
        <label className="honeypot" aria-hidden="true">
          网站
          <input
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
          />
        </label>
        <div className="form-bottom">
          <small>{body.length}/300 · 审核通过后公开</small>
          <button
            className="button primary compact"
            disabled={pending}
            type="submit"
          >
            <Send size={14} />
            {pending ? "提交中…" : "发送留言"}
          </button>
        </div>
        <p className="tiny muted">
          提交会创建匿名浏览器标识用于防重复与反滥用；请勿留下电话、住址或其他私密信息。
        </p>
        {message && (
          <p role="status" className="form-message">
            {message}
          </p>
        )}
      </form>
      <div className="comment-feed">
        <div className="feed-heading">
          <h3>影迷留言</h3>
          <button
            className="icon-button"
            aria-label="刷新留言"
            onClick={() => void reload()}
            disabled={loading}
          >
            <RefreshCw size={15} />
          </button>
        </div>
        {loading ? (
          <p className="muted">正在读取留言…</p>
        ) : error ? (
          <div className="inline-error">
            <p>{error}</p>
            <button onClick={() => void reload()}>重新连接</button>
          </div>
        ) : comments.length ? (
          comments.map((c) => (
            <article key={c.id}>
              <div>
                <strong>{c.name}</strong>
                <time dateTime={c.created_at}>
                  {new Date(c.created_at).toLocaleDateString("zh-CN")}
                </time>
              </div>
              <p>{c.body}</p>
            </article>
          ))
        ) : (
          <div className="comment-empty">
            <MessageCircle size={30} />
            <p>
              这里还没有公开留言。
              <br />
              真实的第一条，留给真实的你。
            </p>
          </div>
        )}
        <small>
          最多展示最新 50 条已审核留言。未经审核的内容不会变成弹幕或公开显示。
        </small>
      </div>
    </div>
  );
}
export default function Community() {
  const section = useRef<HTMLElement>(null);
  const [stats, setStats] = useState<Stats | null>(null),
    [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [continent, setContinent] = useState("all"),
    [country, setCountry] = useState(""),
    [gender, setGender] = useState("undisclosed"),
    [consent, setConsent] = useState(false),
    [message, setMessage] = useState(""),
    [mapSelection, setMapSelection] = useState("");
  const loadStats = useCallback(async () => {
    try {
      const r = await fetch("/api/community", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setStats(d);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "统计暂时不可用");
    }
  }, []);
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        clearInterval(timer);
        if (entries[0].isIntersecting) {
          void loadStats();
          timer = setInterval(() => {
            if (document.visibilityState === "visible") void loadStats();
          }, 15000);
        }
      },
      { threshold: 0.08 },
    );
    if (section.current) observer.observe(section.current);
    return () => {
      observer.disconnect();
      clearInterval(timer);
    };
  }, [loadStats]);
  const countryOptions = useMemo(
    () =>
      Object.entries(countries)
        .filter(([, v]) => continent === "all" || v.continent === continent)
        .sort(([a], [b]) =>
          (display.of(a) ?? a).localeCompare(display.of(b) ?? b, "zh-CN"),
        ),
    [continent],
  );
  const points = (stats?.distribution ?? []).flatMap((d) => {
    const countryInfo = countries[d.country as TCountryCode];
    if (!countryInfo) return [];
    const name = isoNameAliases[d.country] ?? countryInfo.name;
    const f = worldFeatures.find((f) => f.properties?.name === name);
    if (!f) return [];
    const point = projection(geoCentroid(f));
    return point ? [{ ...d, x: point[0], y: point[1] }] : [];
  });
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      const r = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country, gender, consent }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessage(d.message);
      await loadStats();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "未能保存，请重试。");
    } finally {
      setPending(false);
    }
  }
  async function withdraw() {
    setPending(true);
    try {
      const r = await fetch("/api/community", { method: "DELETE" });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setMessage(d.message);
      setCountry("");
      setGender("undisclosed");
      setConsent(false);
      await loadStats();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "未能撤回，请重试。");
    } finally {
      setPending(false);
    }
  }
  return (
    <section id="community" className="section community-section" ref={section}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">06 / FANS AROUND THE WORLD</span>
          <h2>
            影迷现场<span>我们在不同的地方，喜欢同一些故事</span>
          </h2>
        </div>
        <span className="live-label">
          <i className={stats && !error ? "connected" : ""} />
          {error ? "连接暂不可用" : stats ? "可见时每15秒更新" : "等待读取统计"}
        </span>
      </div>
      <div className="community-layout">
        <div className="world-panel">
          <div className="map-heading">
            <span>
              <Globe2 size={17} />
              影迷足迹
            </span>
            <div>
              <strong>{stats?.total ?? "—"}</strong>
              <small>匿名互动浏览器</small>
              <strong>{stats?.distribution.length ?? "—"}</strong>
              <small>自愿填写的国家／地区</small>
            </div>
          </div>
          <svg
            viewBox="0 0 840 430"
            className="world-map"
            role="img"
            aria-label="访客自愿填写的国家地区分布示意地图"
          >
            <defs>
              <radialGradient id="map-red">
                <stop stopColor="#e83345" stopOpacity=".15" />
                <stop offset="1" stopColor="#10151e" stopOpacity="0" />
              </radialGradient>
            </defs>
            <rect width="840" height="430" fill="url(#map-red)" />
            {worldFeatures.map((f, index) => (
              <path
                key={
                  String(f.id ?? f.properties?.name ?? "region") + "-" + index
                }
                d={path(f) ?? ""}
                fill="#29313d"
                stroke="#111722"
                strokeWidth=".6"
              />
            ))}
            {points.map((p) => (
              <g
                key={p.country}
                className="map-point"
                tabIndex={0}
                role="button"
                aria-label={
                  (display.of(p.country) ?? p.country) +
                  "：" +
                  p.count +
                  "位匿名浏览器"
                }
                onClick={() => setMapSelection(p.country)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setMapSelection(p.country);
                }}
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={Math.min(18, 5 + Math.sqrt(p.count))}
                  fill="#ef3046"
                  opacity=".2"
                />
                <circle cx={p.x} cy={p.y} r="4" fill="#ff5768" />
                <title>
                  {display.of(p.country)}：{p.count}
                </title>
              </g>
            ))}
          </svg>
          {error ? (
            <div className="map-state">
              <p>统计服务尚未连接，暂不显示人数或地区热度。</p>
              <button onClick={() => void loadStats()}>
                重新连接 <RefreshCw size={13} />
              </button>
            </div>
          ) : stats?.total === 0 ? (
            <p className="map-state">
              尚无匿名互动记录。地图不会预置访客或示例热度。
            </p>
          ) : stats && !points.length ? (
            <p className="map-state">已有匿名互动记录，尚无人自愿公开地区。</p>
          ) : null}
          {mapSelection && (
            <p className="map-selection">
              {display.of(mapSelection)} ·{" "}
              {stats?.distribution.find((d) => d.country === mapSelection)
                ?.count ?? 0}{" "}
              位匿名浏览器<button onClick={() => setMapSelection("")}>×</button>
            </p>
          )}
          <div className="map-footer">
            <span>地点来自自愿填写，不采集精准定位。</span>
            <span>区域分布示意，不作为国界依据。</span>
          </div>
          {stats?.mode === "local-development" && (
            <p className="dev-stat-warning">
              本地开发数据库 · 与真实上线访客完全隔离
            </p>
          )}
          <details className="distribution-list">
            <summary>查看地区统计列表</summary>
            {stats?.distribution.length ? (
              stats.distribution.map((d) => (
                <div key={d.country}>
                  <span>{display.of(d.country) ?? d.country}</span>
                  <strong>{d.count}</strong>
                </div>
              ))
            ) : (
              <p className="muted">暂无地区数据。</p>
            )}
          </details>
        </div>
        <form className="visitor-form" onSubmit={submit}>
          <span className="eyebrow">WHERE ARE YOU WATCHING FROM?</span>
          <h3>你从哪里来？</h3>
          <p>自愿填写，让这里留下你的一个小坐标。</p>
          <label>
            大洲
            <select
              value={continent}
              onChange={(e) => {
                setContinent(e.target.value);
                setCountry("");
              }}
            >
              <option value="all">全部大洲</option>
              {Object.keys(continents).map((c) => (
                <option key={c} value={c}>
                  {continentNames[c]}
                </option>
              ))}
            </select>
          </label>
          <label>
            国家／地区（可不填）
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              <option value="">暂不填写</option>
              {countryOptions.map(([code]) => (
                <option value={code} key={code}>
                  {display.of(code) ?? code}
                </option>
              ))}
            </select>
          </label>
          <label>
            性别（可不填）
            <select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="undisclosed">不愿透露</option>
              <option value="female">女</option>
              <option value="male">男</option>
              <option value="other">其他</option>
            </select>
          </label>
          <label className="consent-label">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              required
            />
            <span>同意用匿名标识去重，并仅将自愿填写的资料用于汇总统计。</span>
          </label>
          <button
            className="button primary full-width"
            disabled={pending || !consent}
          >
            {pending ? "保存中…" : "留下我的足迹"}
            <ArrowUpRight size={16} />
          </button>
          <button
            className="withdraw"
            type="button"
            onClick={() => void withdraw()}
            disabled={pending}
          >
            撤回我的地区与性别资料
          </button>
          {message && (
            <p role="status" className="form-message">
              {message}
            </p>
          )}
          <small>
            <ShieldCheck size={12} />
            不创建账号。不收集真实姓名、精确位置。匿名浏览器数不等于真实人数，清除Cookie或更换设备会影响去重。
          </small>
        </form>
      </div>
      <Comments />
    </section>
  );
}
