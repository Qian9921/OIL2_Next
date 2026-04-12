import { NextRequest, NextResponse } from "next/server";

import { buildRuntimeAdminSettingsSnapshot } from "@/lib/admin-settings";
import { isValidMonitorSession } from "@/lib/monitor-auth-server";

export async function GET(request: NextRequest) {
  if (!isValidMonitorSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(buildRuntimeAdminSettingsSnapshot(process.env), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
