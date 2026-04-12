import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth-options";
import { getEffectiveUserRole } from "@/lib/role-routing";
import { getCertificatesAdmin } from "@/lib/server-firestore";
import { toIsoTimestamp } from "@/lib/timestamp-serialization";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || getEffectiveUserRole(session.user.role) !== "student") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const certificates = await getCertificatesAdmin({ studentId: session.user.id });

  return NextResponse.json(
    {
      certificates: certificates.map((certificate) => ({
        ...certificate,
        issuedAt: toIsoTimestamp(certificate.issuedAt),
        completionDate: toIsoTimestamp(certificate.completionDate),
      })),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
