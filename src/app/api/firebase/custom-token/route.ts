import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { adminAuth } from "@/lib/firebase-admin";
import { getEffectiveUserRole } from "@/lib/role-routing";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.needsRoleSelection) {
    return NextResponse.json(
      { error: "Role selection required before Firebase access." },
      { status: 400 },
    );
  }

  const token = await adminAuth.createCustomToken(session.user.id, {
    app_email: session.user.email,
    app_role: getEffectiveUserRole(session.user.role) ?? "student",
  });

  return NextResponse.json({ token });
}

