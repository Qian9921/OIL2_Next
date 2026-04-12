import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { getEffectiveUserRole } from "@/lib/role-routing";
import { getStudentDashboardAdmin } from "@/lib/server-firestore";
import { toIsoTimestamp } from "@/lib/timestamp-serialization";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getStudentDashboardAdmin(session.user.id);

  return NextResponse.json(
    {
      ...data,
      recentActivity: data.recentActivity.map((activity) => ({
        ...activity,
        timestamp: toIsoTimestamp(activity.timestamp),
      })),
      upcomingDeadlines: data.upcomingDeadlines.map((deadline) => ({
        ...deadline,
        dueDate: toIsoTimestamp(deadline.dueDate),
      })),
      promptQualityMetrics: data.promptQualityMetrics
        ? {
            ...data.promptQualityMetrics,
            recentPrompts: data.promptQualityMetrics.recentPrompts.map((prompt) => ({
              ...prompt,
              timestamp: toIsoTimestamp(prompt.timestamp),
            })),
          }
        : undefined,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
