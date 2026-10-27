import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADORED_QUALITIES,
  DATE_VOUCHERS,
  LOVE_LETTER_PARAGRAPHS,
  MEMORY_PHOTOS,
  OPEN_WHEN_ENVELOPES,
} from '../data/keepsakeData';
import {
  containsStandaloneEnglishStar,
  filterMemoriesByCategory,
  getCyclicPhotoIndex,
  toggleHeartedQuality,
  validateReplyNote,
} from './keepsakeLogic';

test('all copy strictly uses her exact name Nkanyezi and never standalone English Star or Inkanyezi', () => {
  const allStrings: string[] = [
    ...MEMORY_PHOTOS.flatMap((p) => [p.title, p.season, p.caption, p.alt]),
    ...ADORED_QUALITIES.flatMap((q) => [q.title, q.kicker, q.summary, q.deeperNote]),
    ...OPEN_WHEN_ENVELOPES.flatMap((e) => [e.prompt, e.moodLabel, e.heading, e.message]),
    ...DATE_VOUCHERS.flatMap((v) => [v.title, v.vibe, v.description]),
    ...LOVE_LETTER_PARAGRAPHS,
  ];

  for (const text of allStrings) {
    assert.equal(
      containsStandaloneEnglishStar(text),
      false,
      `Expected no English 'Star' in copy, found in: "${text}"`
    );
    assert.equal(
      /\binkanyezi\b/i.test(text),
      false,
      `Expected exact name 'Nkanyezi' (not 'Inkanyezi'), found in: "${text}"`
    );
  }

  const combined = allStrings.join(' ');
  assert.equal(combined.includes('Nkanyezi'), true);

  for (const photo of MEMORY_PHOTOS) {
    assert.equal(
      photo.src.startsWith('./assets/'),
      true,
      `Expected relative path './assets/...' for GitHub Pages compatibility, got: "${photo.src}"`
    );
  }
});

test('filterMemoriesByCategory returns expected counts for all, her, and us', () => {
  assert.equal(filterMemoriesByCategory(MEMORY_PHOTOS, 'all').length, 6);
  const herOnly = filterMemoriesByCategory(MEMORY_PHOTOS, 'her');
  const usOnly = filterMemoriesByCategory(MEMORY_PHOTOS, 'us');
  assert.equal(herOnly.length, 4);
  assert.equal(usOnly.length, 2);
  assert.equal(herOnly.every((p) => p.category === 'her'), true);
  assert.equal(usOnly.every((p) => p.category === 'us'), true);
});

test('getCyclicPhotoIndex wraps cleanly forward and backward', () => {
  assert.equal(getCyclicPhotoIndex(0, 'prev', 6), 5);
  assert.equal(getCyclicPhotoIndex(5, 'next', 6), 0);
  assert.equal(getCyclicPhotoIndex(2, 'next', 6), 3);
  assert.equal(getCyclicPhotoIndex(2, 'prev', 6), 1);
});

test('toggleHeartedQuality adds and removes quality IDs predictably', () => {
  const initial = ['honesty'];
  const added = toggleHeartedQuality(initial, 'empathy');
  assert.deepEqual(added, ['honesty', 'empathy']);
  const removed = toggleHeartedQuality(added, 'honesty');
  assert.deepEqual(removed, ['empathy']);
});

test('validateReplyNote rejects empty input and trims valid notes', () => {
  const emptyResult = validateReplyNote('   ');
  assert.equal(emptyResult.valid, false);
  assert.equal(typeof emptyResult.error, 'string');

  const validResult = validateReplyNote('  I love this so much!  ');
  assert.equal(validResult.valid, true);
  assert.equal(validResult.cleanedMessage, 'I love this so much!');

  const tooLongResult = validateReplyNote('a'.repeat(285));
  assert.equal(tooLongResult.valid, false);
});
