import { getEffectiveUserRole } from "./role-routing";
import { Certificate } from "./types";

export interface CertificatePreviewPayload {
  studentName: string;
  ngoSignature: string;
  ngoName: string;
  contents: string;
  date: string;
}

type SessionLikeUser = {
  id?: string | null;
  role?: string | null;
};

export type CertificateRenderRequest =
  | { mode: "existing"; certificateId: string }
  | { mode: "preview"; payload: CertificatePreviewPayload };

function asTrimmedString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseCertificateRenderRequest(body: unknown): CertificateRenderRequest | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const candidate = body as Record<string, unknown>;
  const certificateId = asTrimmedString(candidate.certificateId);
  const studentName = asTrimmedString(candidate.studentName);
  const ngoSignature = asTrimmedString(candidate.ngoSignature);
  const ngoName = asTrimmedString(candidate.ngoName);
  const contents = asTrimmedString(candidate.contents);
  const date = asTrimmedString(candidate.date);
  const hasPreviewFields = Boolean(studentName || ngoSignature || ngoName || contents || date);

  if (certificateId && hasPreviewFields) {
    return null;
  }

  if (certificateId) {
    return {
      mode: "existing",
      certificateId,
    };
  }

  if (studentName && ngoSignature && ngoName && contents && date) {
    return {
      mode: "preview",
      payload: {
        studentName,
        ngoSignature,
        ngoName,
        contents,
        date,
      },
    };
  }

  return null;
}

export function canAccessStoredCertificate(
  certificate: Pick<Certificate, "studentId" | "ngoId">,
  user: SessionLikeUser | null | undefined,
): boolean {
  if (!user?.id) {
    return false;
  }

  const role = getEffectiveUserRole(user.role ?? undefined);

  if (role === "student") {
    return certificate.studentId === user.id;
  }

  if (role === "ngo") {
    return certificate.ngoId === user.id;
  }

  return false;
}

export function buildStoredCertificateRenderPayload(
  certificate: Pick<Certificate, "studentName" | "ngoSignature" | "ngoName" | "projectTitle" | "completionDate">,
): CertificatePreviewPayload {
  const completionDate =
    typeof certificate.completionDate?.toDate === "function"
      ? certificate.completionDate.toDate()
      : new Date(certificate.completionDate as unknown as string | number | Date);

  return {
    studentName: certificate.studentName,
    ngoSignature: certificate.ngoSignature,
    ngoName: certificate.ngoName,
    contents: certificate.projectTitle,
    date: completionDate.toISOString().split("T")[0],
  };
}

export function buildCertificatePersistencePlan(input: {
  participationId: string;
  generatedCertificateNumber: string;
  existingCertificate: Pick<Certificate, "id" | "certificateNumber"> | null;
}) {
  if (input.existingCertificate) {
    return {
      documentId: input.existingCertificate.id,
      certificateNumber: input.existingCertificate.certificateNumber,
      shouldCreate: false,
    };
  }

  return {
    documentId: input.participationId,
    certificateNumber: input.generatedCertificateNumber,
    shouldCreate: true,
  };
}
