"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  Simulation,
  SimulationNodeDatum,
} from "d3-force";
import {
  Search,
  Plus,
  Minus,
  RotateCcw,
  ArrowUpRight,
  UserRound,
  Maximize2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Work, Person, Character } from "@/lib/catalogue-types";
type RelationWork = Pick<Work, "id" | "title" | "year" | "people">;
type RelationshipPayload = {
  works: RelationWork[];
  people: Person[];
  characters: Character[];
};
type GraphNode = SimulationNodeDatum & {
  id: string;
  label: string;
  kind: "center" | "work" | "person";
  workId?: string;
  personId?: string;
  portrait?: string | null;
  portraitKind?: string | null;
};
type GraphState = {
  nodes: GraphNode[];
  edges: {
    source: string;
    target: string;
    kind: "anchor" | "collaboration";
  }[];
};
export default function Relationships() {
  const section = useRef<HTMLElement>(null);
  const [activated, setActivated] = useState(false);
  const [payload, setPayload] = useState<RelationshipPayload | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("person")) {
      const frame = requestAnimationFrame(() => setActivated(true));
      return () => cancelAnimationFrame(frame);
    }
    const node = section.current;
    if (!node || !("IntersectionObserver" in window)) {
      const frame = requestAnimationFrame(() => setActivated(true));
      return () => cancelAnimationFrame(frame);
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActivated(true);
          observer.disconnect();
        }
      },
      { rootMargin: "700px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!activated) return;
    const controller = new AbortController();
    fetch("/data/relationships.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("RELATIONSHIP_DATA_UNAVAILABLE");
        return response.json();
      })
      .then((data: RelationshipPayload) => {
        if (
          !Array.isArray(data.works) ||
          !Array.isArray(data.people) ||
          !Array.isArray(data.characters)
        )
          throw new Error("RELATIONSHIP_DATA_INVALID");
        setPayload(data);
      })
      .catch((reason) => {
        if (reason?.name !== "AbortError") setError(true);
      });
    return () => controller.abort();
  }, [activated, attempt]);

  if (payload) return <RelationshipGraph {...payload} />;

  return (
    <section
      ref={section}
      id="relationships"
      className="section relationship-section relationship-loading"
      aria-busy={activated && !error}
    >
      <span className="eyebrow">03 / CONNECTED UNIVERSES</span>
      <h2>关系宇宙</h2>
      <p>
        {error
          ? "关系数据暂时没有载入，其他作品浏览功能不受影响。"
          : activated
            ? "正在按需打开 1,315 位演职员与作品关系…"
            : "继续向下浏览时，再载入完整人物关系数据。"}
      </p>
      {error && (
        <button
          className="button compact"
          onClick={() => {
            setError(false);
            setAttempt((n) => n + 1);
          }}
        >
          重新载入关系图
        </button>
      )}
    </section>
  );
}

function RelationshipGraph({
  works,
  people,
  characters,
}: {
  works: RelationWork[];
  people: Person[];
  characters: Character[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"people" | "characters">("people"),
    [search, setSearch] = useState(""),
    [department, setDepartment] = useState("all"),
    [decade, setDecade] = useState("all"),
    [selected, setSelected] = useState(
      people.find((p) => p.nameEn === "Robert Downey Jr.")?.id ??
        people[0]?.id ??
        "",
    ),
    [limit, setLimit] = useState(12),
    [collaboratorLimit, setCollaboratorLimit] = useState(24),
    [zoom, setZoom] = useState(1),
    [pan, setPan] = useState({ x: 0, y: 0 }),
    [layout, setLayout] = useState<GraphState>({ nodes: [], edges: [] });
  const simulation = useRef<Simulation<GraphNode, undefined> | null>(null),
    svg = useRef<SVGSVGElement>(null),
    drag = useRef<{
      id: string;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
    } | null>(null);
  const items = useMemo(
    () =>
      mode === "people"
        ? people.filter(
            (p) =>
              (department === "all" || p.departments.includes(department)) &&
              [p.name, p.nameEn]
                .join(" ")
                .toLowerCase()
                .includes(search.toLowerCase()),
          )
        : characters.filter((c) =>
            [c.name, c.alias].join(" ").includes(search),
          ),
    [mode, people, characters, search, department],
  );
  const entity =
    mode === "people"
      ? people.find((p) => p.id === selected)
      : characters.find((c) => c.id === selected);
  const entityPortraitKind =
    entity && "portraitKind" in entity ? entity.portraitKind : null;
  const entityWorkIds = entity
    ? "workIds" in entity
      ? entity.workIds
      : entity.works
    : undefined;
  const allWorks = useMemo(
    () =>
      entityWorkIds
        ? works.filter((work) => entityWorkIds.includes(work.id))
        : [],
    [works, entityWorkIds],
  );
  const related = useMemo(
    () =>
      allWorks.filter(
        (w) =>
          decade === "all" ||
          (w.year && Math.floor(w.year / 10) * 10 === Number(decade)),
      ),
    [allWorks, decade],
  );
  const relatedIds = useMemo(() => new Set(related.map((work) => work.id)), [related]);
  const displayedWorkIds = useMemo(
    () => new Set(related.slice(0, limit).map((work) => work.id)),
    [related, limit],
  );
  const allCollaborators = useMemo(
    () =>
      mode === "people"
        ? people.filter(
            (person) =>
              person.id !== selected &&
              person.workIds.some((workId) => relatedIds.has(workId)),
          )
        : [],
    [mode, people, relatedIds, selected],
  );
  const collaborators = useMemo(
    () =>
      allCollaborators
        .filter((person) =>
          person.workIds.some((workId) => displayedWorkIds.has(workId)),
        )
        .slice(0, collaboratorLimit),
    [allCollaborators, displayedWorkIds, collaboratorLimit],
  );
  const signature = related
    .slice(0, limit)
    .map((w) => w.id)
    .join("|");
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const id = new URLSearchParams(window.location.search).get("person");
      if (id && people.some((p) => p.id === id)) {
        setSelected(id);
        setMode("people");
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [people]);
  useEffect(() => {
    const ids = signature.split("|").filter(Boolean);
    const nodes: GraphNode[] = [
      {
        id: selected,
        label: entity?.name ?? "选择人物",
        kind: "center",
        x: 390,
        y: 220,
        fx: 390,
        fy: 220,
        portrait: entity?.portrait,
        portraitKind: entityPortraitKind,
      },
    ];
    ids.forEach((id, i) => {
      const w = works.find((w) => w.id === id);
      if (w)
        nodes.push({
          id,
          label: w.title,
          workId: id,
          kind: "work",
          x: 390 + Math.cos((i / ids.length) * Math.PI * 2) * 230,
          y: 220 + Math.sin((i / ids.length) * Math.PI * 2) * 170,
        });
    });
    if (mode === "people") {
      collaborators.forEach((person, i) => {
        nodes.push({
          id: person.id,
          label: person.name,
          personId: person.id,
          kind: "person",
          portrait: person.portrait,
          portraitKind: person.portraitKind,
          x: 70 + (i % 7) * 110,
          y: 55 + Math.floor(i / 7) * 92,
        });
      });
    }
    const edges: GraphState["edges"] = ids.map((id) => ({
      source: selected,
      target: id,
      kind: "anchor",
    }));
    if (mode === "people") {
      collaborators.forEach((person) => {
        person.workIds
          .filter((workId) => ids.includes(workId))
          .forEach((workId) =>
            edges.push({
              source: workId,
              target: person.id,
              kind: "collaboration",
            }),
          );
      });
    }
    const sim = forceSimulation(nodes)
      .force(
        "link",
        forceLink<GraphNode, { source: string; target: string }>(
          edges.map(({ source, target }) => ({ source, target })),
        )
          .id((n) => n.id)
          .distance(210),
      )
      .force("charge", forceManyBody().strength(-180))
      .force("center", forceCenter(390, 225))
      .force("collide", forceCollide(62))
      .on("tick", () =>
        setLayout({ nodes: nodes.map((n) => ({ ...n })), edges }),
      );
    simulation.current = sim;
    let settleFrame = 0;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sim.stop();
      sim.tick(150);
      settleFrame = requestAnimationFrame(() =>
        setLayout({ nodes: nodes.map((n) => ({ ...n })), edges }),
      );
    }
    return () => {
      cancelAnimationFrame(settleFrame);
      sim.stop();
      simulation.current = null;
    };
  }, [
    selected,
    signature,
    entity?.name,
    entity?.portrait,
    entityPortraitKind,
    works,
    mode,
    collaborators,
  ]);
  const choose = (id: string) => {
    setSelected(id);
    setLimit(12);
    setCollaboratorLimit(24);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };
  const switchMode = (value: "people" | "characters") => {
    setMode(value);
    setSearch("");
    setDepartment("all");
    choose(
      value === "people"
        ? (people.find((p) => p.nameEn === "Robert Downey Jr.")?.id ??
            people[0]?.id ??
            "")
        : (characters[0]?.id ?? ""),
    );
  };
  function position(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * 780) / rect.width,
      y: ((e.clientY - rect.top) * 450) / rect.height,
    };
  }
  return (
    <section id="relationships" className="section relationship-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">03 / CONNECTED UNIVERSES</span>
          <h2>
            关系宇宙<span>故事相连，人物相遇</span>
          </h2>
        </div>
        <div className="segmented">
          <button
            aria-pressed={mode === "people"}
            onClick={() => switchMode("people")}
          >
            演员与创作者
          </button>
          <button
            aria-pressed={mode === "characters"}
            onClick={() => switchMode("characters")}
          >
            角色与作品
          </button>
        </div>
      </div>
      <p className="section-description">
        现实人物与虚构角色分别浏览。演员、导演、配音与创作者都通过作品节点串联；点击任意人物可继续向外展开其全部已索引作品。节点可拖拽，电影票根可打开作品。当前关系为已导入／已整理部分，不代表完整出演或客串名单。
      </p>
      <div className="graph-filters">
        <label className="search-field">
          <Search size={17} />
          <input
            aria-label="搜索关系图人物"
            placeholder={
              mode === "people"
                ? "搜索演员、导演的中英文姓名…"
                : "搜索角色或英雄名…"
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        {mode === "people" && (
          <select
            aria-label="人物身份筛选"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
          >
            <option value="all">全部身份</option>
            <option value="actor">演员／配音</option>
            <option value="director">导演</option>
            <option value="creator">创作者</option>
          </select>
        )}
        <select
          aria-label="关系作品年代"
          value={decade}
          onChange={(e) => setDecade(e.target.value)}
        >
          <option value="all">全部年代</option>
          {[1940, 1960, 1970, 1980, 1990, 2000, 2010, 2020].map((y) => (
            <option value={y} key={y}>
              {y} 年代
            </option>
          ))}
        </select>
      </div>
      <div className="person-strip" aria-label="选择关系人物">
        {items.slice(0, search ? 50 : 16).map((p) => (
          <button
            key={p.id}
            className={p.id === selected ? "active" : ""}
            onClick={() => choose(p.id)}
            aria-pressed={p.id === selected}
          >
            {p.portrait ? (
              <img src={p.portrait} alt="" />
            ) : (
              <UserRound size={17} />
            )}
            <span>{p.name}</span>
          </button>
        ))}
        {items.length === 0 && (
          <span className="muted">未找到人物；可尝试英文姓氏。</span>
        )}
        {items.length > 16 && !search && (
          <span className="strip-hint">
            搜索可访问全部 {items.length} 位索引人物
          </span>
        )}
      </div>
      <div className="graph-layout">
        <div className="graph-stage">
          <div className="graph-caption">
            <span>
              <i className="node-key" />
              演员／导演／创作者
            </span>
            <span>
              <i className="node-key square" />
              作品
            </span>
            <small>人物 — 作品 — 人物，线条只表示共同参与</small>
          </div>
          <svg
            ref={svg}
            viewBox="0 0 780 450"
            role="img"
            aria-label={"人物关系图：" + (entity?.name ?? "未选择")}
            onPointerDown={(e) => {
              if ((e.target as Element).closest("[data-node]")) return;
              const point = position(e);
              drag.current = {
                id: "pan",
                startX: point.x,
                startY: point.y,
                originX: pan.x,
                originY: pan.y,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const point = position(e);
              if (drag.current.id === "pan")
                setPan({
                  x: drag.current.originX + point.x - drag.current.startX,
                  y: drag.current.originY + point.y - drag.current.startY,
                });
              else {
                const n = simulation.current
                  ?.nodes()
                  .find((n) => n.id === drag.current?.id);
                if (n) {
                  n.fx = (point.x - pan.x - 390) / zoom + 390;
                  n.fy = (point.y - pan.y - 225) / zoom + 225;
                  simulation.current?.alphaTarget(0.2).restart();
                }
              }
            }}
            onPointerUp={() => {
              if (drag.current?.id !== "pan") {
                const n = simulation.current
                  ?.nodes()
                  .find((n) => n.id === drag.current?.id);
                if (n && n.kind !== "center") {
                  n.fx = null;
                  n.fy = null;
                }
                simulation.current?.alphaTarget(0);
              }
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
              simulation.current?.alphaTarget(0);
            }}
          >
            <defs>
              <radialGradient id="graph-glow">
                <stop stopColor="#902032" stopOpacity=".25" />
                <stop offset="1" stopColor="#090d15" stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx="390" cy="225" r="220" fill="url(#graph-glow)" />
            <g
              transform={`translate(${pan.x + 390} ${pan.y + 225}) scale(${zoom}) translate(-390 -225)`}
            >
              {layout.edges.map((edge) => {
                const a = layout.nodes.find((n) => n.id === edge.source),
                  b = layout.nodes.find((n) => n.id === edge.target);
                return a && b ? (
                  <line
                    key={edge.source + "-" + edge.target}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={edge.kind === "anchor" ? "#a32a3d" : "#755361"}
                    strokeWidth={edge.kind === "anchor" ? "1.4" : ".8"}
                    strokeDasharray={
                      edge.kind === "collaboration" ? "3 4" : undefined
                    }
                  />
                ) : null;
              })}
              {layout.nodes.map((n) => (
                <g
                  key={n.id}
                  data-node={n.id}
                  transform={`translate(${n.x ?? 0} ${n.y ?? 0})`}
                  className={"graph-node " + n.kind}
                  tabIndex={n.kind === "work" || n.kind === "person" ? 0 : -1}
                  role={
                    n.kind === "work"
                      ? "link"
                      : n.kind === "person"
                        ? "button"
                        : undefined
                  }
                  aria-label={n.label}
                  onKeyDown={(e) => {
                    if (n.workId && e.key === "Enter")
                      router.push("/works/" + n.workId);
                    if (n.personId && (e.key === "Enter" || e.key === " ")) {
                      e.preventDefault();
                      choose(n.personId);
                    }
                  }}
                  onClick={() => {
                    if (n.personId) choose(n.personId);
                  }}
                  onDoubleClick={() => {
                    if (n.workId) router.push("/works/" + n.workId);
                  }}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    drag.current = {
                      id: n.id,
                      startX: e.clientX,
                      startY: e.clientY,
                      originX: n.x ?? 0,
                      originY: n.y ?? 0,
                    };
                    svg.current?.setPointerCapture(e.pointerId);
                  }}
                >
                  {n.kind === "center" ? (
                    <>
                      <circle
                        r="50"
                        fill="#171b27"
                        stroke="#ec2638"
                        strokeWidth="2"
                      />
                      <circle r="58" stroke="#ed26383d" fill="none" />
                      {n.portrait && (
                        <image
                          href={n.portrait}
                          x="-48"
                          y="-48"
                          width="96"
                          height="96"
                          preserveAspectRatio="xMidYMid slice"
                          clipPath="circle(48px at 48px 48px)"
                        />
                      )}
                      <text
                        textAnchor="middle"
                        y={n.portrait ? "67" : "-4"}
                        fill="#eee"
                        fontSize="12"
                      >
                        {n.label}
                      </text>
                      <text
                        textAnchor="middle"
                        y={n.portrait ? "80" : "17"}
                        fill="#929bab"
                        fontSize="9"
                      >
                        {n.portraitKind === "identity-fallback"
                          ? "姓名身份头像 · 非真人照片"
                          : n.portrait
                            ? "开放许可人物照片"
                            : "头像待核验"}
                      </text>
                    </>
                ) : n.kind === "person" ? (
                  <>
                    <circle
                      r="31"
                      fill="#171b27"
                      stroke={
                        people
                          .find((person) => person.id === n.personId)
                          ?.departments.includes("director")
                          ? "#d59b57"
                          : "#6e8498"
                      }
                      strokeWidth="1.5"
                    />
                    {n.portrait && (
                      <image
                        href={n.portrait}
                        x="-28"
                        y="-28"
                        width="56"
                        height="56"
                        preserveAspectRatio="xMidYMid slice"
                        clipPath="circle(28px at 28px 28px)"
                      />
                    )}
                    <text textAnchor="middle" y="46" fill="#e5e9f0" fontSize="9">
                      {n.label.length > 8 ? n.label.slice(0, 7) + "…" : n.label}
                    </text>
                    <text textAnchor="middle" y="58" fill="#a4adba" fontSize="8">
                      {people
                        .find((person) => person.id === n.personId)
                        ?.departments.map((department) =>
                          department === "director"
                            ? "导演"
                            : department === "creator"
                              ? "创作者"
                              : "演员",
                        )
                        .join("／")}
                    </text>
                  </>
                ) : (
                    <>
                      <rect
                        x="-68"
                        y="-23"
                        width="136"
                        height="46"
                        rx="3"
                        fill="#151b26"
                        stroke="#47515e"
                      />
                      <path
                        d="M-60 -23V23 M60 -23V23"
                        stroke="#414854"
                        strokeDasharray="3 3"
                      />
                      <text
                        textAnchor="middle"
                        y="-1"
                        fill="#e5e9f0"
                        fontSize="10"
                      >
                        {n.label.length > 13
                          ? n.label.slice(0, 12) + "…"
                          : n.label}
                      </text>
                      <text
                        textAnchor="middle"
                        y="14"
                        fill="#a4adba"
                        fontSize="9"
                      >
                        {works.find((w) => w.id === n.id)?.year} · 双击打开
                      </text>
                    </>
                  )}
                </g>
              ))}
            </g>
          </svg>
          <div className="graph-controls">
            <button
              className="icon-button"
              aria-label="放大关系图"
              onClick={() => setZoom((z) => Math.min(z + 0.2, 2.5))}
            >
              <Plus size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="缩小关系图"
              onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))}
            >
              <Minus size={17} />
            </button>
            <button
              className="icon-button"
              aria-label="重置关系图"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
            >
              <RotateCcw size={17} />
            </button>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <span className="graph-instruction">
            <Maximize2 size={12} />
            拖动平移 · 双击票根打开作品
          </span>
        </div>
        <aside className="relationship-detail">
          <span className="eyebrow">SELECTED CONNECTION</span>
          <div className="person-heading">
            <div className="avatar-fallback">
              {entity?.portrait ? (
                <img src={entity.portrait} alt={entity.name + "头像"} />
              ) : (
                <UserRound size={27} />
              )}
            </div>
            <div>
              <h3>{entity?.name ?? "请选择人物"}</h3>
              <p>
                {entity && "nameEn" in entity
                  ? entity.nameEn
                  : entity && "alias" in entity
                    ? entity.alias
                    : ""}
              </p>
            </div>
          </div>
          <p className="relationship-note">
            {mode === "people"
              ? "人物与作品按影视条目的演职员资料连接；作品节点会继续串出共同演员、配音、导演和创作者。"
              : "这是虚构角色的银幕出场档案，不与演员的其他角色合并。"}
          </p>
          {entity && "portraitCredit" in entity && entity.portraitCredit && (
            <p className="portrait-credit">
              {entity.portraitCredit}
              {entity.portraitSource && (
                <a
                  href={entity.portraitSource}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  图片来源 <ArrowUpRight size={10} />
                </a>
              )}
              {entity.portraitLicenseUrl && (
                <a
                  href={entity.portraitLicenseUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  使用许可 <ArrowUpRight size={10} />
                </a>
              )}
            </p>
          )}
          <div className="relation-stats">
            <span>
              {allWorks.length}
              <small>已索引相关作品</small>
            </span>
            <span>
              {allWorks[0]?.year ?? "—"}
              <small>本索引最早年份</small>
            </span>
          </div>
          {mode === "people" && (
            <div className="network-summary">
              <strong>合作网络</strong>
              <span>
                当前图中串联 {collaborators.length} 位共同演职员；所选人物在已索引作品中共有 {allCollaborators.length} 位合作人物。
              </span>
              {allCollaborators.length > collaboratorLimit && (
                <button
                  className="button compact full-width"
                  onClick={() => setCollaboratorLimit(allCollaborators.length)}
                >
                  展开全部合作人物（还有 {allCollaborators.length - collaboratorLimit} 位）
                </button>
              )}
            </div>
          )}
          <div className="relation-work-list">
            {related.slice(0, limit).map((w) => (
              <Link href={"/works/" + w.id} key={w.id}>
                <time>{w.year}</time>
                <span>{w.title}</span>
                <ArrowUpRight size={13} />
              </Link>
            ))}
            {!related.length && <p>所选年代暂无相关作品。</p>}
          </div>
          {related.length > limit && (
            <button
              className="button compact full-width"
              onClick={() => setLimit((n) => n + 12)}
            >
              展开更多（还有 {related.length - limit} 项）
            </button>
          )}
          <small>上方票根与此列表同步；列表支持键盘操作。</small>
        </aside>
      </div>
    </section>
  );
}
