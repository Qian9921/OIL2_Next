import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { deleteUserAccountAdmin } from "@/lib/server-firestore";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { userId?: string };
  const requestedUserId = body.userId?.trim();

  if (!requestedUserId || requestedUserId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteUserAccountAdmin(requestedUserId);

  return NextResponse.json({ success: true });
}
