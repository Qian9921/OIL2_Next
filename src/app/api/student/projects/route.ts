import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { getEffectiveUserRole } from "@/lib/role-routing";
import { getStudentProjectsCatalogAdmin } from "@/lib/server-firestore";
import { toIsoTimestamp } from "@/lib/timestamp-serialization";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getStudentProjectsCatalogAdmin(session.user.id);

  return NextResponse.json(
    {
      projects: data.projects.map((project) => ({
        ...project,
        createdAt: toIsoTimestamp(project.createdAt),
        updatedAt: toIsoTimestamp(project.updatedAt),
        deadline: toIsoTimestamp(project.deadline),
      })),
      participations: data.participations.map((participation) => ({
        id: participation.id,
        projectId: participation.projectId,
        status: participation.status,
        progress: participation.progress,
      })),
      userParticipationProjectIds: data.userParticipationProjectIds,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
