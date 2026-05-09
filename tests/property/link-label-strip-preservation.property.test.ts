/**
 * Preservation property tests for stripSourceUrl.
 *
 * These tests verify that descriptions which do NOT contain the
 * "Länk till evenemanget:" label pattern are handled identically
 * before and after the fix — preserving existing behavior.
 *
 * Written BEFORE implementing the fix, using observation-first methodology.
 * All tests MUST PASS on unfixed code.
 *
 * // Feature: almedals-planner-extension, Property 2: Preservation - Descriptions Without Link Label Unchanged
 *
 * **Validates: Requirements 3.2**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { stripSourceUrl } from '#ui/popup/components/EventItem';

// ─── Bug Condition Guard ──────────────────────────────────────────

/**
 * Returns true if the input satisfies the bug condition (has the label+URL pattern).
 * Preservation tests only run on inputs where this is FALSE.
 */
function isBugCondition_LinkLabel(description: string, sourceUrl: string | null): boolean {
  if (sourceUrl === null) return false;
  return description.includes(`Länk till evenemanget: ${sourceUrl}`);
}

// ─── Custom Arbitraries ───────────────────────────────────────────

/** Generates a realistic URL string. */
const urlArb: fc.Arbitrary<string> = fc
  .record({
    domain: fc.constantFrom('example.com', 'almedalsveckan.info', 'test.se', 'event.org'),
    path: fc.array(fc.stringMatching(/^[a-z0-9]{1,8}$/), { minLength: 1, maxLength: 3 }),
    id: fc.integer({ min: 100, max: 99999 }),
  })
  .map(({ domain, path, id }) => `https://${domain}/${path.join('/')}/${id}`);

/** Generates description text that does NOT contain "Länk till evenemanget:". */
const safeTextArb: fc.Arbitrary<string> = fc
  .stringMatching(/^[A-Za-zÀ-ÖØ-öø-ÿ0-9 ,.!?\n]{1,120}$/)
  .filter((s) => !s.includes('Länk till evenemanget:'));

/**
 * Generates a description containing a bare sourceUrl (WITHOUT the label prefix).
 * This represents the normal case where the URL appears in the description
 * but not preceded by "Länk till evenemanget:".
 */
const bareUrlDescriptionArb: fc.Arbitrary<{ description: string; sourceUrl: string }> = fc
  .record({
    prefix: safeTextArb,
    sourceUrl: urlArb,
  })
  .map(({ prefix, sourceUrl }) => ({
    description: `${prefix.trim()}\n${sourceUrl}`,
    sourceUrl,
  }))
  .filter(({ description, sourceUrl }) => !isBugCondition_LinkLabel(description, sourceUrl));

/**
 * Generates a description where sourceUrl is null.
 */
const nullSourceUrlArb: fc.Arbitrary<{ description: string; sourceUrl: null }> = safeTextArb.map(
  (text) => ({
    description: text.trim() || 'Some description',
    sourceUrl: null,
  }),
);

/**
 * Generates a description where sourceUrl is NOT found in the description.
 */
const urlNotInDescriptionArb: fc.Arbitrary<{ description: string; sourceUrl: string }> = fc
  .record({
    description: safeTextArb,
    sourceUrl: urlArb,
  })
  .map(({ description, sourceUrl }) => ({
    description: description.trim() || 'Text without the url',
    sourceUrl,
  }))
  .filter(
    ({ description, sourceUrl }) =>
      !description.includes(sourceUrl) && !isBugCondition_LinkLabel(description, sourceUrl),
  );

// ─── Property Tests ───────────────────────────────────────────────

describe('Property 2: Preservation - Descriptions Without Link Label Unchanged', () => {
  it('bare sourceUrl in description: result equals description.replace(sourceUrl, "").trim()', () => {
    fc.assert(
      fc.property(bareUrlDescriptionArb, ({ description, sourceUrl }) => {
        const result = stripSourceUrl(description, sourceUrl);
        const expected = description.replace(sourceUrl, '').trim();
        expect(result).toBe(expected);
      }),
      { numRuns: 100 },
    );
  });

  it('null sourceUrl: result equals description unchanged', () => {
    fc.assert(
      fc.property(nullSourceUrlArb, ({ description, sourceUrl }) => {
        const result = stripSourceUrl(description, sourceUrl);
        expect(result).toBe(description);
      }),
      { numRuns: 100 },
    );
  });

  it('sourceUrl not found in description: result equals description unchanged', () => {
    fc.assert(
      fc.property(urlNotInDescriptionArb, ({ description, sourceUrl }) => {
        const result = stripSourceUrl(description, sourceUrl);
        expect(result).toBe(description);
      }),
      { numRuns: 100 },
    );
  });
});
