import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { getEffectiveUserRole } from "@/lib/role-routing";
import { getNgoProfileAdmin, updateNgoProfileAdmin } from "@/lib/server-firestore";
import { toIsoTimestamp } from "@/lib/timestamp-serialization";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "ngo") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await getNgoProfileAdmin(session.user.id);

  return NextResponse.json(
    {
      user: data.user
        ? {
            ...data.user,
            createdAt: toIsoTimestamp(data.user.createdAt),
            updatedAt: toIsoTimestamp(data.user.updatedAt),
          }
        : null,
      dashboard: data.dashboard,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "ngo") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | {
        name?: unknown;
        bio?: unknown;
        website?: unknown;
        location?: unknown;
        focusAreas?: unknown;
        signature?: unknown;
      }
    | null;

  if (
    !body ||
    typeof body.name !== "string" ||
    typeof body.bio !== "string" ||
    typeof body.website !== "string" ||
    typeof body.location !== "string" ||
    typeof body.signature !== "string" ||
    !Array.isArray(body.focusAreas) ||
    !body.focusAreas.every((item) => typeof item === "string")
  ) {
    return NextResponse.json({ error: "Invalid NGO profile payload" }, { status: 400 });
  }

  const user = await updateNgoProfileAdmin(session.user.id, {
    name: body.name.trim(),
    bio: body.bio,
    website: body.website,
    location: body.location,
    focusAreas: body.focusAreas.map((item) => item.trim()).filter(Boolean),
    signature: body.signature,
  });

  return NextResponse.json({
    user: user
      ? {
          ...user,
          createdAt: toIsoTimestamp(user.createdAt),
          updatedAt: toIsoTimestamp(user.updatedAt),
        }
      : null,
  });
}
