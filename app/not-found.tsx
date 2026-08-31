import Link from "next/link";
export default function NotFound() {
  return (
    <main id="main" className="not-found">
      <span className="eyebrow">ARCHIVE / 404</span>
      <h1>这个坐标还没有故事。</h1>
      <p>作品可能尚未收录，或者链接已经变更。</p>
      <Link className="button primary" href="/">
        返回作品档案
      </Link>
    </main>
  );
}
