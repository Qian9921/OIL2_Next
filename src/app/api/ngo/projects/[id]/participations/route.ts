import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { getEffectiveUserRole } from "@/lib/role-routing";
import {
  getProjectAdmin,
  getProjectParticipationSummariesAdmin,
} from "@/lib/server-firestore";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "ngo") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const project = await getProjectAdmin(id);

  if (!project || project.ngoId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const data = await getProjectParticipationSummariesAdmin(id);
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

