import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { deserializeFirestoreJson, serializeFirestoreJson } from "@/lib/firestore-json";
import { pickNgoProjectMutableFields } from "@/lib/project-write-utils";
import { getEffectiveUserRole } from "@/lib/role-routing";
import {
  deleteNgoProjectAdmin,
  getProjectAdmin,
  updateNgoProjectAdmin,
} from "@/lib/server-firestore";

function toStatus(error: Error) {
  if (error.message === "Project not found") {
    return 404;
  }

  if (error.message === "Forbidden") {
    return 403;
  }

  return 400;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "ngo") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const project = await getProjectAdmin(id);

  if (!project || project.ngoId !== session.user.id) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  return NextResponse.json(serializeFirestoreJson(project), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "ngo") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const body = deserializeFirestoreJson<
    Record<string, unknown>
  >(await request.json());
  const projectInput = pickNgoProjectMutableFields(body);

  try {
    await updateNgoProjectAdmin(session.user.id, id, projectInput);
    return NextResponse.json({ success: true });
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error("Failed to update project");
    return NextResponse.json(
      { error: normalized.message },
      { status: toStatus(normalized) },
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "ngo") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    await deleteNgoProjectAdmin(session.user.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error("Failed to delete project");
    return NextResponse.json(
      { error: normalized.message },
      { status: toStatus(normalized) },
    );
  }
}
