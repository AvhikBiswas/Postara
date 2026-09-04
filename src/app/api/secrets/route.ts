import { NextResponse } from "next/server";
import { jsonError, requireSession, sameOrigin } from "@/lib/api";
import { deleteUserSecret, listUserSecrets, upsertUserSecret } from "@/lib/services/secrets";

export async function GET(request: Request) {
  try {
    const user = await requireSession(request);
    return NextResponse.json(await listUserSecrets(user.id));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "CSRF" }, { status: 403 });
    const user = await requireSession(request);
    const body = (await request.json()) as { provider?: string; name?: string; value?: string };
    if (!body.provider || !body.value) {
      return NextResponse.json({ error: "Provider and value are required" }, { status: 400 });
    }
    const secret = await upsertUserSecret({
      userId: user.id,
      provider: body.provider,
      name: body.name || "default",
      value: body.value,
    });
    return NextResponse.json(secret);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!sameOrigin(request)) return NextResponse.json({ error: "CSRF" }, { status: 403 });
    const user = await requireSession(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await deleteUserSecret(user.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
