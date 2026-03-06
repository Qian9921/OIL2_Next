import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth-options';

const CERTIFICATE_RENDER_API_URL =
  process.env.CERTIFICATE_RENDER_API_URL ??
  'https://auto-cert-py-827682634474.us-central1.run.app/generate-certificate';

interface CertificateRenderRequest {
  studentName?: string;
  ngoSignature?: string;
  ngoName?: string;
  contents?: string;
  date?: string;
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as CertificateRenderRequest;
    const { studentName, ngoSignature, ngoName, contents, date } = body;

    if (!studentName || !ngoSignature || !ngoName || !contents || !date) {
      return NextResponse.json(
        { error: 'Missing required certificate fields.' },
        { status: 400 },
      );
    }

    const response = await fetch(CERTIFICATE_RENDER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        {
          error: `Certificate renderer returned ${response.status}`,
          details: errorText,
        },
        { status: response.status },
      );
    }

    const pdfBuffer = await response.arrayBuffer();

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': response.headers.get('content-type') ?? 'application/pdf',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        error: 'Failed to render certificate',
        details: message,
      },
      { status: 500 },
    );
  }
}
