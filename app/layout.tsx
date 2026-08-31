import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "漫威所有相关作品全集欣赏", template: "%s · 漫威作品欣赏" },
  description:
    "一个影迷整理的漫威银幕档案。沿着年份、作品与人物关系，重访电影、剧集、动画及幕后故事。非官方网站，无商业隶属关系。",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  themeColor: "#090d15",
  width: "device-width",
  initialScale: 1,
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <a className="skip-link" href="#main">
          跳到主要内容
        </a>
        {children}
      </body>
    </html>
  );
}
