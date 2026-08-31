import { database, databaseMode } from "@/lib/db";
export const runtime = "nodejs";
export async function GET() {
  try {
    const db = await database();
    await db.query("SELECT 1");
    return Response.json(
      { status: "ok", storage: databaseMode(), catalogue: "2026-08-31" },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { status: "degraded", storage: "unavailable", catalogue: "2026-08-31" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
