import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { getEffectiveUserRole } from "@/lib/role-routing";
import { getUsersByRoleAdmin } from "@/lib/server-firestore";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "ngo") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const students = await getUsersByRoleAdmin("student");
  return NextResponse.json(
    students.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.email,
      avatar: student.avatar,
    })),
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

