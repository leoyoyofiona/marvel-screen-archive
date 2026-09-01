import { readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const production = process.env.NODE_ENV === "production";
const failures = [];

if (production && !process.env.DATABASE_URL)
  failures.push("DATABASE_URL 未配置，生产互动功能没有持久化数据库");
if (production && (process.env.SESSION_SECRET ?? "").length < 32)
  failures.push("SESSION_SECRET 必须至少为 32 个字符");
if (production && !/^scrypt:[^:]+:[^:]+:[^:]+:[^:]+:[^:]+$/.test(process.env.ADMIN_PASSWORD_HASH ?? ""))
  failures.push("ADMIN_PASSWORD_HASH 不是有效的 scrypt 哈希格式");
if (production) {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
    if (!/^https?:$/.test(url.protocol) || /localhost|127\.0\.0\.1/.test(url.hostname))
      failures.push("NEXT_PUBLIC_SITE_URL 必须是公开的 http(s) 站点地址");
  } catch {
    failures.push("NEXT_PUBLIC_SITE_URL 不是有效的 http(s) 地址");
  }
}

const blueprint = await readFile(path.join(root, "render.yaml"), "utf8");
for (const required of ["marvel-screen-archive-db", "marvel-screen-archive", "DATABASE_URL"]) {
  if (!blueprint.includes(required)) failures.push(`render.yaml 缺少 ${required}`);
}

if (failures.length) {
  console.error(
    JSON.stringify({
      status: "blocked",
      production,
      failures,
      note: "只报告配置项是否存在或格式是否合规，不输出任何秘密值。",
    }, null, 2),
  );
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "ready", production }));
}
