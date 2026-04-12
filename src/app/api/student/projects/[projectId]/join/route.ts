import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { getEffectiveUserRole } from "@/lib/role-routing";
import { joinProjectAsStudentAdmin } from "@/lib/server-firestore";

function toStatus(error: Error) {
  if (
    error.message === "Project already joined" ||
    error.message === "Project is full" ||
    error.message === "Project has expired" ||
    error.message === "Project is not joinable"
  ) {
    return 409;
  }

  if (error.message === "Project not found" || error.message === "User not found") {
    return 404;
  }

  return 500;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId } = await context.params;

  try {
    const participationId = await joinProjectAsStudentAdmin(session.user.id, projectId);
    return NextResponse.json({ participationId });
  } catch (error) {
    const normalizedError = error instanceof Error ? error : new Error("Failed to join project");
    return NextResponse.json(
      { error: normalizedError.message },
      { status: toStatus(normalizedError) },
    );
  }
}
