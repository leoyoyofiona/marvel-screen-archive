import { hasAdminSession } from "@/lib/admin-auth";
import { database } from "@/lib/db";
import { apiError, checkOrigin, input } from "@/lib/request-security";
import { getWork } from "@/lib/catalogue";

export const runtime = "nodejs";

function unauthorized() {
  return Response.json({ error: "请先通过管理验证。" }, { status: 401 });
}

export async function GET(request: Request) {
  try {
    if (!(await hasAdminSession())) return unauthorized();
    const requested =
      new URL(request.url).searchParams.get("status") ?? "pending";
    const status = ["pending", "approved", "rejected", "all"].includes(
      requested,
    )
      ? requested
      : "pending";
    const db = await database();
    const result = await db.query(
      `SELECT id,work_id,name,body,status,created_at,reviewed_at
       FROM marvel_comments
       WHERE ($1='all' OR status=$1)
       ORDER BY created_at DESC LIMIT 200`,
      [status],
    );
    const comments = result.rows.map((row) => ({
      ...row,
      workTitle: row.work_id
        ? (getWork(String(row.work_id))?.title ?? "未知作品")
        : "总站留言",
    }));
    return Response.json(
      { comments },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    checkOrigin(request);
    if (!(await hasAdminSession())) return unauthorized();
    const data = await input(request);
    if (
      typeof data.id !== "string" ||
      !["approved", "rejected", "pending"].includes(data.status)
    )
      return Response.json({ error: "审核操作不正确。" }, { status: 400 });
    const db = await database();
    const result = await db.query(
      `UPDATE marvel_comments SET status=$2,reviewed_at=CASE WHEN $2='pending' THEN NULL ELSE now() END
       WHERE id=$1 RETURNING id,status,reviewed_at`,
      [data.id, data.status],
    );
    if (!result.rows.length)
      return Response.json({ error: "留言不存在。" }, { status: 404 });
    return Response.json({ comment: result.rows[0] });
  } catch (error) {
    return apiError(error);
  }
}
