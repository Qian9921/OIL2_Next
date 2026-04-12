import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { getEffectiveUserRole } from "@/lib/role-routing";
import { getCompletedProjectsForNgoAdmin } from "@/lib/server-firestore";
import { toIsoTimestamp } from "@/lib/timestamp-serialization";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "ngo") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getCompletedProjectsForNgoAdmin(session.user.id);

  return NextResponse.json(
    data.map((record) => ({
      ...record,
      participation: {
        ...record.participation,
        completedAt: toIsoTimestamp(record.participation.completedAt),
      },
      submission: {
        ...record.submission,
        submittedAt: toIsoTimestamp(record.submission.submittedAt),
        reviewedAt: toIsoTimestamp(record.submission.reviewedAt),
      },
      certificate: record.certificate
        ? {
            ...record.certificate,
            issuedAt: toIsoTimestamp(record.certificate.issuedAt),
            completionDate: toIsoTimestamp(record.certificate.completionDate),
          }
        : null,
    })),
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

