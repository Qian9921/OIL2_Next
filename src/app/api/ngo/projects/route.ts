import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { deserializeFirestoreJson, serializeFirestoreJson } from "@/lib/firestore-json";
import { pickNgoProjectMutableFields } from "@/lib/project-write-utils";
import { getEffectiveUserRole } from "@/lib/role-routing";
import {
  createNgoProjectAdmin,
  getProjectsAdmin,
} from "@/lib/server-firestore";
import type { Project } from "@/lib/types";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "ngo") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : undefined;

  const projects = await getProjectsAdmin({
    ngoId: session.user.id,
    ...(status ? { status } : {}),
    ...(Number.isFinite(limit) ? { limit } : {}),
  });

  return NextResponse.json(serializeFirestoreJson(projects), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "ngo") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = deserializeFirestoreJson<
    Record<string, unknown>
  >(await request.json());
  const projectInput = pickNgoProjectMutableFields(body) as Omit<
    Project,
    "id" | "createdAt" | "updatedAt" | "currentParticipants" | "ngoId" | "ngoName"
  >;

  const projectId = await createNgoProjectAdmin(session.user.id, projectInput);
  return NextResponse.json({ projectId });
}
