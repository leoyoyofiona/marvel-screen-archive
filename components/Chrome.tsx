"use client";
import Link from "next/link";
import { Menu, X, Globe2, ArrowUpRight, ShieldCheck } from "lucide-react";
import { useState } from "react";
export const navigation = [
  ["时间长廊", "timeline"],
  ["作品档案", "archive"],
  ["角色卡牌", "lore"],
  ["关系宇宙", "relationships"],
  ["视听厅", "listening"],
  ["影迷现场", "community"],
];
export function Header({
  region,
  onRegion,
  detail = false,
}: {
  region: "mainland" | "overseas";
  onRegion: (value: "mainland" | "overseas") => void;
  detail?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-mark">
          M<span>·</span>
        </span>
        <span>
          <strong>漫威所有相关作品全集欣赏</strong>
          <small>A FAN’S SCREEN ARCHIVE</small>
        </span>
      </Link>
      <nav aria-label="主导航" className={open ? "open" : ""}>
        {navigation.map(([label, id]) => (
          <a
            onClick={() => setOpen(false)}
            href={(detail ? "/" : "") + "#" + id}
            key={id}
          >
            {label}
          </a>
        ))}
      </nav>
      <div className="header-meta">
        <a
          className="creator-logo"
          href="mailto:leooelcn@gmail.com"
          aria-label="联系网站创作者 LEOYOYOFIONA"
        >
          <strong>LEOYOYOFIONA</strong>
          <small>CREATOR · CONTACT</small>
        </a>
        <label className="region-switch">
          <Globe2 size={15} />
          <span className="sr-only">访问地区</span>
          <select
            aria-label="访问地区"
            value={region}
            onChange={(e) =>
              onRegion(e.target.value as "mainland" | "overseas")
            }
          >
            <option value="mainland">中国大陆</option>
            <option value="overseas">海外地区</option>
          </select>
        </label>
      </div>
      <button
        className="mobile-menu icon-button"
        aria-label={open ? "关闭菜单" : "打开菜单"}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {open ? <X /> : <Menu />}
      </button>
    </header>
  );
}
export function Disclaimer() {
  return (
    <aside className="disclaimer">
      <div className="disclaimer-title">
        <ShieldCheck size={21} />
        <strong aria-label="免责申明">
          <span>免责</span>
          <span>申明</span>
        </strong>
      </div>
      <p>
        本站为影迷基于个人爱好制作的非官方、非商业文化档案，与漫威、迪士尼、索尼及相关发行方无隶属关系。不提供、不存储、不引导访问盗版影视资源；作品名称、海报、剧照、音乐及公开视频等权利归原作者和相关权利人所有。资料如有错漏，或权利人对展示内容有异议，欢迎联系指正，我们将及时核验与处理。
      </p>
      <a href="mailto:leooelcn@gmail.com">
        联系 LEOYOYOFIONA · leooelcn@gmail.com <ArrowUpRight size={16} />
      </a>
    </aside>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div>
        <a className="signature" href="mailto:leooelcn@gmail.com">
          LEOYOYOFIONA
        </a>
        <p>给那些让我们走进电影院的故事，留一个位置。</p>
      </div>
      <div>
        <a href="mailto:leooelcn@gmail.com">leooelcn@gmail.com</a>
        <p>
          影迷个人整理 · 非官方网站 · 资料截至 2026.08.31 ·{" "}
          <Link href="/admin">管理</Link>
        </p>
      </div>
    </footer>
  );
}
