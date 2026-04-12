import { NextResponse } from "next/server";

import { getStudentDetailsAdmin } from "@/lib/monitor-data-server";
import { getMonitorConfig, isValidMonitorSession } from "@/lib/monitor-auth-server";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { configured } = getMonitorConfig();

  if (!configured || !isValidMonitorSession(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const data = await getStudentDetailsAdmin(id);

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

