import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { updateCurrentUserAvatarAdmin } from "@/lib/server-firestore";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { avatar?: unknown } | null;
  if (!body || typeof body.avatar !== "string" || !body.avatar.trim()) {
    return NextResponse.json({ error: "Invalid avatar payload" }, { status: 400 });
  }

  const user = await updateCurrentUserAvatarAdmin(session.user.id, body.avatar.trim());

  return NextResponse.json({
    avatar: user?.avatar ?? body.avatar.trim(),
  });
}
