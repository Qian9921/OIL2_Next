import { NextResponse } from 'next/server';
import { buildPublicHealthSnapshot } from '@/lib/runtime-config';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json(buildPublicHealthSnapshot(process.env), {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
