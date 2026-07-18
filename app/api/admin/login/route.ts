import { adminCookie, authConfigured, createAdminSession, verifyPassword } from "@/lib/admin-auth";

export async function POST(request: Request) {
  if (!authConfigured()) return Response.json({ error: "Admin access is not configured yet." }, { status: 503 });
  const body = await request.json().catch(() => ({})) as { password?: string };
  const password = body.password ?? "";
  if (!password || !(await verifyPassword(password))) {
    return Response.json({ error: "Incorrect password." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const session = await createAdminSession();
  return Response.json({ ok: true, expiresAt: session.expires }, { headers: { "Set-Cookie": adminCookie(session.value), "Cache-Control": "no-store" } });
}
