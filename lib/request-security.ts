import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { database } from "./db";
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  const allowed = configured
    ? [new URL(configured).origin]
    : process.env.NODE_ENV !== "production"
      ? ["http://127.0.0.1:3199", "http://localhost:3199"]
      : [];
  const localDevelopmentOrigin =
    process.env.NODE_ENV !== "production" &&
    /^https?:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin ?? "");
  if (!origin || (!allowed.includes(origin) && !localDevelopmentOrigin))
    throw new Error("ORIGIN_REJECTED");
}
function secret() {
  const key = process.env.SESSION_SECRET;
  if (key && key.length >= 32) return key;
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.MARVEL_LOCAL_DB === "true"
  )
    return "marvel-isolated-local-development-not-production";
  throw new Error("DATABASE_UNAVAILABLE");
}
const sign = (value: string) =>
  createHmac("sha256", secret()).update(value).digest("hex");
export async function visitor(create = false) {
  const jar = await cookies();
  const token = jar.get("marvel_visitor")?.value;
  const [id, sig] = token?.split(".") ?? [];
  if (
    id &&
    /^[0-9a-f-]{36}$/.test(id) &&
    sig &&
    /^[a-f0-9]{64}$/.test(sig) &&
    timingSafeEqual(Buffer.from(sig), Buffer.from(sign(id)))
  )
    return id;
  if (!create) return null;
  const fresh = randomUUID();
  jar.set("marvel_visitor", fresh + "." + sign(fresh), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 365 * 86400,
  });
  return fresh;
}
export async function rateLimit(request: Request, scope: string, limit = 12) {
  // Store a salted, hour-bounded hash, never a raw IP address. The host must provide
  // a trustworthy x-forwarded-for chain; limits also include the signed browser ID.
  const address =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const bucket = sign(
    scope + "|" + address + "|" + Math.floor(Date.now() / 60000),
  );
  const db = await database();
  const result = await db.query(
    "INSERT INTO marvel_rate_limits(bucket,requests,expires_at) VALUES($1,1,now()+interval '2 minutes') ON CONFLICT(bucket) DO UPDATE SET requests=marvel_rate_limits.requests+1 RETURNING requests",
    [bucket],
  );
  if (Number(result.rows[0]?.requests) > limit) throw new Error("RATE_LIMIT");
  await db.query("DELETE FROM marvel_rate_limits WHERE expires_at<now()");
}
export async function input(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > 4096)
    throw new Error("BODY_TOO_LARGE");
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 4096) throw new Error("BODY_TOO_LARGE");
  return JSON.parse(raw);
}
export function apiError(error: unknown) {
  const reason = error instanceof Error ? error.message : "";
  const status =
    reason === "ORIGIN_REJECTED"
      ? 403
      : reason === "RATE_LIMIT"
        ? 429
        : reason === "BODY_TOO_LARGE" || error instanceof SyntaxError
          ? 400
          : 503;
  const message =
    status === 403
      ? "请求来源不正确，请从本站页面重试。"
      : status === 429
        ? "操作太频繁，请稍后再试。"
        : status === 400
          ? "请求格式不正确。"
          : "互动服务尚未连接或暂时不可用；没有保存你的操作，请稍后再试。";
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}
