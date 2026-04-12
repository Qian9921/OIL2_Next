import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { getEffectiveUserRole } from "@/lib/role-routing";
import { getNGODashboardAdmin } from "@/lib/server-firestore";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "ngo") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getNGODashboardAdmin(session.user.id);
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

