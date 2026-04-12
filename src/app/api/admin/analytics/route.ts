import { NextResponse } from "next/server";

import { getAnalyticsSnapshotAdmin } from "@/lib/server-firestore";
import { getMonitorConfig, isValidMonitorSession } from "@/lib/monitor-auth-server";

export async function GET(request: Request) {
  const { configured } = getMonitorConfig();

  if (!configured || !isValidMonitorSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getAnalyticsSnapshotAdmin();
  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

