import {
  adminConfigured,
  clearAdminSession,
  createAdminSession,
  hasAdminSession,
  verifyAdminPassword,
} from "@/lib/admin-auth";
import {
  apiError,
  checkOrigin,
  input,
  rateLimit,
} from "@/lib/request-security";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(
    { configured: adminConfigured(), authenticated: await hasAdminSession() },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (!adminConfigured())
      return Response.json(
        { error: "管理审核尚未在服务器中配置。" },
        { status: 503 },
      );
    await rateLimit(request, "admin-login", 5);
    const data = await input(request);
    if (!(await verifyAdminPassword(data.password)))
      return Response.json({ error: "管理口令不正确。" }, { status: 401 });
    await createAdminSession();
    return Response.json({ authenticated: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    await clearAdminSession();
    return Response.json({ authenticated: false });
  } catch (error) {
    return apiError(error);
  }
}
