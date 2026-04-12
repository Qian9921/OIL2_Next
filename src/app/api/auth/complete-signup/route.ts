import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { createUserAdmin, getUserByEmailAdmin } from "@/lib/server-firestore";
import { generateAvatar } from "@/lib/utils";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email || !session.user.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.user.needsRoleSelection) {
    return NextResponse.json(
      { error: "Account is already configured." },
      { status: 400 },
    );
  }

  const body = (await request.json()) as { role?: string };
  const role = body.role;

  if (role !== "student" && role !== "ngo") {
    return NextResponse.json({ error: "Invalid signup role." }, { status: 400 });
  }

  const existingUser = await getUserByEmailAdmin(session.user.email);
  if (!existingUser) {
    await createUserAdmin({
      name: session.user.name,
      email: session.user.email,
      role,
      avatar: generateAvatar(session.user.email),
    });
  }

  return NextResponse.json({ success: true });
}
