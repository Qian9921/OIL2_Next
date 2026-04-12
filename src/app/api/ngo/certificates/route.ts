import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { deserializeFirestoreJson } from "@/lib/firestore-json";
import { getEffectiveUserRole } from "@/lib/role-routing";
import { issueNgoCertificateAdmin } from "@/lib/server-firestore";
import type { Certificate } from "@/lib/types";

function toStatus(error: Error) {
  if (error.message === "Project not found" || error.message === "Participation not found") {
    return 404;
  }

  if (error.message === "Forbidden") {
    return 403;
  }

  return 400;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "ngo") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = deserializeFirestoreJson<
    Omit<Certificate, "id" | "issuedAt" | "certificateNumber" | "ngoId">
  >(await request.json());

  try {
    const result = await issueNgoCertificateAdmin(session.user.id, body);
    return NextResponse.json(result);
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error("Failed to issue certificate");
    return NextResponse.json(
      { error: normalized.message },
      { status: toStatus(normalized) },
    );
  }
}
