import { database } from "@/lib/db";
import {
  apiError,
  checkOrigin,
  input,
  rateLimit,
  visitor,
} from "@/lib/request-security";
import { getWork } from "@/lib/catalogue";
export const runtime = "nodejs";
async function state(workId: string, id: string | null) {
  const db = await database();
  const result = await db.query(
    "SELECT count(*) FILTER(WHERE liked)::integer AS likes, coalesce(bool_or(visitor_id=$2 AND liked),false) AS liked FROM marvel_likes WHERE work_id=$1",
    [workId, id],
  );
  return result.rows[0];
}
export async function GET(request: Request) {
  try {
    const workId = new URL(request.url).searchParams.get("workId") ?? "";
    if (!getWork(workId))
      return Response.json({ error: "作品不存在。" }, { status: 404 });
    return Response.json(await state(workId, await visitor()), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const data = await input(request);
    if (
      data.action !== "like" ||
      typeof data.liked !== "boolean" ||
      typeof data.workId !== "string" ||
      !getWork(data.workId)
    )
      return Response.json({ error: "作品或操作不正确。" }, { status: 400 });
    await rateLimit(request, "like", 40);
    const id = await visitor(true);
    const db = await database();
    await db.query(
      "INSERT INTO marvel_visitors(id) VALUES($1) ON CONFLICT(id) DO UPDATE SET last_seen=now()",
      [id],
    );
    await db.query(
      "INSERT INTO marvel_likes(visitor_id,work_id,liked) VALUES($1,$2,$3) ON CONFLICT(visitor_id,work_id) DO UPDATE SET liked=$3,updated_at=now()",
      [id, data.workId, data.liked],
    );
    return Response.json(await state(data.workId, id));
  } catch (e) {
    return apiError(e);
  }
}
