import { NextResponse } from "next/server";

import { getPublicProjectParticipantSummariesAdmin } from "@/lib/server-firestore";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const data = await getPublicProjectParticipantSummariesAdmin(id);

  if (data === null) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, max-age=60",
    },
  });
}
