import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { getEffectiveUserRole } from "@/lib/role-routing";
import { getStudentMyProjectsAdmin } from "@/lib/server-firestore";
import { toIsoTimestamp } from "@/lib/timestamp-serialization";

function serializeProjectRecord(record: Awaited<ReturnType<typeof getStudentMyProjectsAdmin>>["projects"][number]) {
  return {
    ...record,
    joinedAt: toIsoTimestamp(record.joinedAt),
    createdAt: toIsoTimestamp(record.createdAt),
    updatedAt: toIsoTimestamp(record.updatedAt),
    completedAt: toIsoTimestamp(record.completedAt),
    project: {
      ...record.project,
      createdAt: toIsoTimestamp(record.project.createdAt),
      updatedAt: toIsoTimestamp(record.project.updatedAt),
      deadline: toIsoTimestamp(record.project.deadline),
    },
    submission: record.submission
      ? {
          ...record.submission,
          submittedAt: toIsoTimestamp(record.submission.submittedAt),
          reviewedAt: toIsoTimestamp(record.submission.reviewedAt),
        }
      : null,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getStudentMyProjectsAdmin(session.user.id);

  return NextResponse.json(
    {
      projects: data.projects.map(serializeProjectRecord),
      certificates: data.certificates.map((certificate) => ({
        ...certificate,
        issuedAt: toIsoTimestamp(certificate.issuedAt),
        completionDate: toIsoTimestamp(certificate.completionDate),
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
