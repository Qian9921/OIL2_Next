import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generateCertificateNumber,
  generateInviteCode,
  normalizeInviteCode,
} from './identifier-utils';

test('generateInviteCode returns a 6-character uppercase alphanumeric code', () => {
  const inviteCode = generateInviteCode();

  assert.match(inviteCode, /^[A-Z0-9]{6}$/);
});

test('normalizeInviteCode trims whitespace and uppercases characters', () => {
  assert.equal(normalizeInviteCode(' ab12cd '), 'AB12CD');
  assert.equal(normalizeInviteCode(undefined), '');
});

test('generateCertificateNumber preserves the existing certificate format', () => {
  const certificateNumber = generateCertificateNumber(1700000000000);

  assert.match(certificateNumber, /^CERT-1700000000000-[A-Z0-9]{9}$/);
});
