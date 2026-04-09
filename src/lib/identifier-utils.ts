const UPPERCASE_ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function getCrypto() {
  return globalThis.crypto;
}

function buildRandomToken(length: number): string {
  const cryptoApi = getCrypto();
  const bytes = new Uint8Array(length);

  cryptoApi.getRandomValues(bytes);

  return Array.from(bytes, (byte) => UPPERCASE_ALPHANUMERIC[byte % UPPERCASE_ALPHANUMERIC.length]).join('');
}

export function generateCertificateNumber(now = Date.now()): string {
  return `CERT-${now}-${buildRandomToken(9)}`;
}

export function generateInviteCode(): string {
  return buildRandomToken(6);
}

export function normalizeInviteCode(inviteCode: string | null | undefined): string {
  return inviteCode?.trim().toUpperCase() ?? '';
}
