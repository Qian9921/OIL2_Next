import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { getEffectiveUserRole } from "@/lib/role-routing";
import { getStudentProfileAdmin } from "@/lib/server-firestore";
import { toIsoTimestamp } from "@/lib/timestamp-serialization";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getStudentProfileAdmin(session.user.id);

  return NextResponse.json(
    {
      user: data.user
        ? {
            ...data.user,
            createdAt: toIsoTimestamp(data.user.createdAt),
            updatedAt: toIsoTimestamp(data.user.updatedAt),
          }
        : null,
      dashboard: {
        ...data.dashboard,
        recentActivity: data.dashboard.recentActivity.map((activity) => ({
          ...activity,
          timestamp: toIsoTimestamp(activity.timestamp),
        })),
        upcomingDeadlines: data.dashboard.upcomingDeadlines.map((deadline) => ({
          ...deadline,
          dueDate: toIsoTimestamp(deadline.dueDate),
        })),
        promptQualityMetrics: data.dashboard.promptQualityMetrics
          ? {
              ...data.dashboard.promptQualityMetrics,
              recentPrompts: data.dashboard.promptQualityMetrics.recentPrompts.map((prompt) => ({
                ...prompt,
                timestamp: toIsoTimestamp(prompt.timestamp),
              })),
            }
          : undefined,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
