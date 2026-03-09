import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
import { getAdminDb } from "@/lib/firebase-admin";
import { isStudentWorkspaceRole } from "@/lib/role-routing";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isStudentWorkspaceRole(session.user.role)) {
    return NextResponse.json({ error: "Only student collaborators can join projects." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const projectId = body?.projectId;

    if (!projectId || typeof projectId !== "string") {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const db = getAdminDb();
    const projectRef = db.collection("projects").doc(projectId);

    const result = await db.runTransaction(async (transaction) => {
      const projectDoc = await transaction.get(projectRef);

      if (!projectDoc.exists) {
        throw new Error("PROJECT_NOT_FOUND");
      }

      const projectData = projectDoc.data() as {
        status?: string;
        currentParticipants?: number;
        maxParticipants?: number;
        deadline?: Timestamp | { toDate?: () => Date } | string | null;
      };

      if (projectData.status !== "published") {
        throw new Error("PROJECT_NOT_JOINABLE");
      }

      const deadline =
        typeof projectData.deadline === "string"
          ? new Date(projectData.deadline)
          : projectData.deadline && typeof (projectData.deadline as { toDate?: () => Date }).toDate === "function"
            ? (projectData.deadline as { toDate: () => Date }).toDate()
            : null;

      if (deadline && deadline.getTime() < Date.now()) {
        throw new Error("PROJECT_EXPIRED");
      }

      if (
        typeof projectData.maxParticipants === "number" &&
        typeof projectData.currentParticipants === "number" &&
        projectData.currentParticipants >= projectData.maxParticipants
      ) {
        throw new Error("PROJECT_FULL");
      }

      const existingParticipationQuery = db
        .collection("participations")
        .where("projectId", "==", projectId)
        .where("studentId", "==", session.user.id)
        .limit(1);

      const existingParticipation = await transaction.get(existingParticipationQuery);

      if (!existingParticipation.empty) {
        throw new Error("ALREADY_JOINED");
      }

      const participationRef = db.collection("participations").doc();
      const now = FieldValue.serverTimestamp();

      transaction.set(participationRef, {
        projectId,
        studentId: session.user.id,
        studentName: session.user.name,
        status: "active",
        progress: 0,
        completedSubtasks: [],
        joinedAt: now,
        chatHistory: {},
        submissions: [],
        createdAt: now,
        updatedAt: now,
      });

      transaction.update(projectRef, {
        currentParticipants: FieldValue.increment(1),
        updatedAt: now,
      });

      return { participationId: participationRef.id };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";

    const statusMap: Record<string, { status: number; message: string }> = {
      PROJECT_NOT_FOUND: { status: 404, message: "Project not found." },
      PROJECT_NOT_JOINABLE: { status: 400, message: "This project is not open for joining." },
      PROJECT_EXPIRED: { status: 400, message: "This project has expired." },
      PROJECT_FULL: { status: 409, message: "This project is already full." },
      ALREADY_JOINED: { status: 409, message: "You have already joined this project." },
    };

    const mapped = statusMap[message];

    if (mapped) {
      return NextResponse.json({ error: mapped.message }, { status: mapped.status });
    }

    console.error("Error in /api/projects/join:", error);
    return NextResponse.json({ error: "Failed to join project." }, { status: 500 });
  }
}
