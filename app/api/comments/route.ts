import { randomUUID } from "node:crypto";
import { database } from "@/lib/db";
import {
  apiError,
  checkOrigin,
  input,
  rateLimit,
  visitor,
} from "@/lib/request-security";
import { validateComment } from "@/lib/community-validation.mjs";
import { getWork } from "@/lib/catalogue";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const workId = new URL(request.url).searchParams.get("workId");
    if (workId && !getWork(workId))
      return Response.json({ error: "作品不存在。" }, { status: 404 });
    const db = await database();
    const result = await db.query(
      "SELECT id,name,body,created_at FROM marvel_comments WHERE status='approved' AND work_id IS NOT DISTINCT FROM $1 ORDER BY created_at DESC LIMIT 50",
      [workId],
    );
    return Response.json(
      { comments: result.rows },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const data = await input(request);
    const checked = validateComment(data);
    if ("error" in checked) return Response.json(checked, { status: 400 });
    const workId = data.workId ?? null;
    if (workId && !getWork(workId))
      return Response.json({ error: "作品不存在。" }, { status: 404 });
    await rateLimit(request, "comment", 4);
    const id = await visitor(true),
      db = await database();
    await db.query(
      "INSERT INTO marvel_visitors(id) VALUES($1) ON CONFLICT(id) DO UPDATE SET last_seen=now()",
      [id],
    );
    const commentId = randomUUID();
    await db.query(
      "INSERT INTO marvel_comments(id,visitor_id,work_id,name,body) VALUES($1,$2,$3,$4,$5)",
      [commentId, id, workId, checked.name, checked.body],
    );
    return Response.json(
      {
        id: commentId,
        status: "pending",
        message: "已收到你的留言，审核通过后会公开显示。",
      },
      { status: 201 },
    );
  } catch (e) {
    return apiError(e);
  }
}
