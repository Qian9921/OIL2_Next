import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { getEffectiveUserRole } from "@/lib/role-routing";
import { reviewNgoSubmissionAdmin } from "@/lib/server-firestore";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "ngo") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as {
    status?: "approved" | "rejected" | "needs_revision";
    reviewComment?: string;
    rating?: number;
  };

  if (!body.status || !["approved", "rejected", "needs_revision"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid review status." }, { status: 400 });
  }

  await reviewNgoSubmissionAdmin({
    ngoId: session.user.id,
    submissionId: id,
    status: body.status,
    reviewComment: body.reviewComment,
    rating: body.rating,
    reviewedBy: session.user.id,
  });

  return NextResponse.json({ success: true });
}

