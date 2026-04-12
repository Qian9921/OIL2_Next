import { NextResponse } from "next/server";

import { getMonitorDashboardStatsAdmin } from "@/lib/monitor-data-server";
import { getMonitorConfig, isValidMonitorSession } from "@/lib/monitor-auth-server";

export async function GET(request: Request) {
  const { configured } = getMonitorConfig();

  if (!configured || !isValidMonitorSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getMonitorDashboardStatsAdmin();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

