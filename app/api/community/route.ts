import { countries } from "countries-list";
import { database, databaseMode } from "@/lib/db";
import {
  apiError,
  checkOrigin,
  input,
  rateLimit,
  visitor,
} from "@/lib/request-security";
export const runtime = "nodejs";
export async function GET() {
  try {
    const db = await database();
    const [total, distribution, genders, likes] = await Promise.all([
      db.query(
        "SELECT count(*)::integer AS total, count(*) FILTER(WHERE last_seen>now()-interval '15 minutes')::integer AS recent FROM marvel_visitors",
      ),
      db.query(
        "SELECT country,count(*)::integer AS count FROM marvel_visitors WHERE profile_consent AND country IS NOT NULL GROUP BY country",
      ),
      db.query(
        "SELECT gender,count(*)::integer AS count FROM marvel_visitors WHERE profile_consent AND gender IS NOT NULL GROUP BY gender",
      ),
      db.query(
        "SELECT work_id,count(*)::integer AS count FROM marvel_likes WHERE liked GROUP BY work_id ORDER BY count DESC,work_id LIMIT 5",
      ),
    ]);
    return Response.json(
      {
        ...total.rows[0],
        distribution: distribution.rows,
        genders: genders.rows,
        likes: likes.rows,
        mode: databaseMode(),
        updatedAt: new Date().toISOString(),
      },
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
    if (data.consent !== true)
      return Response.json(
        { error: "请先同意匿名统计说明。" },
        { status: 400 },
      );
    const country = data.country || null,
      gender = data.gender || null;
    if (
      (country && !(country in countries)) ||
      (gender && !["female", "male", "other", "undisclosed"].includes(gender))
    )
      return Response.json(
        { error: "地区或性别选项不正确。" },
        { status: 400 },
      );
    await rateLimit(request, "profile", 10);
    const id = await visitor(true),
      db = await database();
    await db.query(
      "INSERT INTO marvel_visitors(id,country,gender,profile_consent) VALUES($1,$2,$3,true) ON CONFLICT(id) DO UPDATE SET country=$2,gender=$3,profile_consent=true,last_seen=now()",
      [id, country, gender],
    );
    return Response.json({
      message: "已保存自愿填写的匿名资料。你可以随时更新或撤回。",
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    const id = await visitor();
    if (id) {
      const db = await database();
      await db.query(
        "UPDATE marvel_visitors SET country=NULL,gender=NULL,profile_consent=false WHERE id=$1",
        [id],
      );
    }
    return Response.json({
      message: "已撤回地区与性别资料。匿名互动记录仍保留。",
    });
  } catch (e) {
    return apiError(e);
  }
}
