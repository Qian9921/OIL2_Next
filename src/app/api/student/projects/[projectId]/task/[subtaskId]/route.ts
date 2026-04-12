import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { serializeFirestoreJson } from "@/lib/firestore-json";
import { getEffectiveUserRole } from "@/lib/role-routing";
import { getStudentTaskViewAdmin } from "@/lib/server-firestore";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string; subtaskId: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { projectId, subtaskId } = await context.params;

  try {
    const data = await getStudentTaskViewAdmin({
      projectId,
      subtaskId,
      studentId: session.user.id,
    });

    if (!data) {
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
  } catch (error) {
    if (error instanceof Error && error.message === "Subtask not found") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    throw error;
  }
}
