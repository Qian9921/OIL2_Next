import assert from "node:assert/strict";
import test from "node:test";
import { Timestamp } from "firebase/firestore";

import {
  buildCertificatePersistencePlan,
  buildStoredCertificateRenderPayload,
  canAccessStoredCertificate,
  parseCertificateRenderRequest,
} from "./certificate-access-utils";
import { Certificate } from "./types";

function timestamp(ms: number) {
  return Timestamp.fromMillis(ms);
}

function createCertificate(overrides: Partial<Certificate> = {}): Certificate {
  return {
    id: "certificate-1",
    studentId: "student-1",
    studentName: "Student One",
    projectId: "project-1",
    projectTitle: "Community Garden",
    ngoId: "ngo-1",
    ngoName: "Green NGO",
    ngoSignature: "Jane NGO",
    participationId: "participation-1",
    issuedAt: timestamp(300),
    certificateNumber: "CERT-001",
    completionDate: timestamp(250),
    ...overrides,
  };
}

test("parseCertificateRenderRequest accepts certificate lookup mode and rejects mixed bodies", () => {
  assert.deepEqual(parseCertificateRenderRequest({ certificateId: " cert-1 " }), {
    mode: "existing",
    certificateId: "cert-1",
  });

  assert.equal(
    parseCertificateRenderRequest({
      certificateId: "cert-1",
      studentName: "Student One",
    }),
    null,
  );
});

test("parseCertificateRenderRequest accepts NGO preview payload mode", () => {
  assert.deepEqual(
    parseCertificateRenderRequest({
      studentName: "Student One",
      ngoSignature: "Jane NGO",
      ngoName: "Green NGO",
      contents: "Community Garden",
      date: "2026-04-12",
    }),
    {
      mode: "preview",
      payload: {
        studentName: "Student One",
        ngoSignature: "Jane NGO",
        ngoName: "Green NGO",
        contents: "Community Garden",
        date: "2026-04-12",
      },
    },
  );
});

test("canAccessStoredCertificate allows the owner student and issuing ngo only", () => {
  const certificate = createCertificate();

  assert.equal(canAccessStoredCertificate(certificate, { id: "student-1", role: "student" }), true);
  assert.equal(canAccessStoredCertificate(certificate, { id: "ngo-1", role: "ngo" }), true);
  assert.equal(canAccessStoredCertificate(certificate, { id: "ngo-1", role: "teacher" }), true);
  assert.equal(canAccessStoredCertificate(certificate, { id: "student-2", role: "student" }), false);
  assert.equal(canAccessStoredCertificate(certificate, { id: "ngo-2", role: "ngo" }), false);
});

test("buildStoredCertificateRenderPayload uses persisted certificate data", () => {
  const payload = buildStoredCertificateRenderPayload(createCertificate());

  assert.deepEqual(payload, {
    studentName: "Student One",
    ngoSignature: "Jane NGO",
    ngoName: "Green NGO",
    contents: "Community Garden",
    date: "1970-01-01",
  });
});

test("buildCertificatePersistencePlan reuses existing certificate instead of creating a duplicate", () => {
  const plan = buildCertificatePersistencePlan({
    participationId: "participation-1",
    generatedCertificateNumber: "CERT-NEW",
    existingCertificate: {
      id: "certificate-existing",
      certificateNumber: "CERT-OLD",
    },
  });

  assert.deepEqual(plan, {
    documentId: "certificate-existing",
    certificateNumber: "CERT-OLD",
    shouldCreate: false,
  });
});

test("buildCertificatePersistencePlan uses participation id as canonical document id for new certificates", () => {
  const plan = buildCertificatePersistencePlan({
    participationId: "participation-1",
    generatedCertificateNumber: "CERT-NEW",
    existingCertificate: null,
  });

  assert.deepEqual(plan, {
    documentId: "participation-1",
    certificateNumber: "CERT-NEW",
    shouldCreate: true,
  });
});
