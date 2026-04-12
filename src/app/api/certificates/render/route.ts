import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';

import { authOptions } from '@/lib/auth-options';
import {
  buildStoredCertificateRenderPayload,
  canAccessStoredCertificate,
  parseCertificateRenderRequest,
} from '@/lib/certificate-access-utils';
import { getEffectiveUserRole } from '@/lib/role-routing';
import { getCertificateAdmin } from '@/lib/server-firestore';

const CERTIFICATE_RENDER_API_URL =
  process.env.CERTIFICATE_RENDER_API_URL ??
  'https://auto-cert-py-827682634474.us-central1.run.app/generate-certificate';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const renderRequest = parseCertificateRenderRequest(await request.json());
    if (!renderRequest) {
      return NextResponse.json(
        { error: 'Invalid certificate render request.' },
        { status: 400 },
      );
    }

    const payload =
      renderRequest.mode === 'preview'
        ? (() => {
            if (getEffectiveUserRole(session.user.role) !== 'ngo') {
              return null;
            }
            return renderRequest.payload;
          })()
        : await (async () => {
            const certificate = await getCertificateAdmin(renderRequest.certificateId);
            if (!certificate) {
              return undefined;
            }
            if (!canAccessStoredCertificate(certificate, session.user)) {
              return null;
            }
            return buildStoredCertificateRenderPayload(certificate);
          })();

    if (payload === null) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (payload === undefined) {
      return NextResponse.json({ error: 'Certificate not found' }, { status: 404 });
    }

    const response = await fetch(CERTIFICATE_RENDER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
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
