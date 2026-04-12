import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { serializeFirestoreJson } from "@/lib/firestore-json";
import { getEffectiveUserRole } from "@/lib/role-routing";
import { getProjectViewerAdmin } from "@/lib/server-firestore";

function isPublicProjectStatus(status: string) {
  return status === "published" || status === "completed" || status === "archived";
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const session = await getServerSession(authOptions);

  const data = await getProjectViewerAdmin({
    projectId: id,
    studentId: getEffectiveUserRole(session?.user?.role) === "student" ? session?.user?.id : undefined,
  });

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const effectiveRole = getEffectiveUserRole(session?.user?.role);
  const canViewDraft =
    effectiveRole === "ngo" && session?.user?.id && session.user.id === data.project.ngoId;

  if (!isPublicProjectStatus(data.project.status) && !canViewDraft) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(
    serializeFirestoreJson(data),
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
