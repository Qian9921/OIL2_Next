import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildTeacherEmailHtml,
  hasHeaderControlChars,
  normalizeRecipientIds,
} from './email-utils';

test('buildTeacherEmailHtml escapes HTML while preserving line breaks', () => {
  const html = buildTeacherEmailHtml('<script>alert(1)</script>\nHello');

  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;<br>Hello/);
  assert.doesNotMatch(html, /<script>/);
});

test('normalizeRecipientIds accepts string arrays and trims empty values', () => {
  assert.deepEqual(normalizeRecipientIds([' student-1 ', '', 'student-2']), ['student-1', 'student-2']);
  assert.equal(normalizeRecipientIds('student-1'), null);
});

test('hasHeaderControlChars detects header injection characters', () => {
  assert.equal(hasHeaderControlChars('Subject'), false);
  assert.equal(hasHeaderControlChars('Bad\r\nSubject'), true);
});
