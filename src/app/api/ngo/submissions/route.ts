import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { getEffectiveUserRole } from "@/lib/role-routing";
import { getSubmissionsForNgoAdmin } from "@/lib/server-firestore";
import { toIsoTimestamp } from "@/lib/timestamp-serialization";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "ngo") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getSubmissionsForNgoAdmin(session.user.id);
  return NextResponse.json(
    data.map((submission) => ({
      ...submission,
      submittedAt: toIsoTimestamp(submission.submittedAt),
      reviewedAt: toIsoTimestamp(submission.reviewedAt),
    })),
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

