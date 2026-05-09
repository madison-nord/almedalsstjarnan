/**
 * Bug condition exploration test for the "Länk till evenemanget:" label residual bug.
 *
 * This test exercises the bug condition where an event description contains
 * "Länk till evenemanget: {URL}" and asserts the expected correct behavior:
 * the stripped result should contain neither the label text nor the URL.
 *
 * On UNFIXED code, this test is EXPECTED TO FAIL — failure confirms the bug exists.
 *
 * // Feature: almedals-planner-extension, Property 1: Bug Condition - Empty "Länk till evenemanget:" Label Residual
 *
 * **Validates: Requirements 1.2, 2.2**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { stripSourceUrl } from '#ui/popup/components/EventItem';

// ─── Custom Arbitraries ───────────────────────────────────────────

/** Generates a realistic URL string for sourceUrl. */
const sourceUrlArb: fc.Arbitrary<string> = fc
  .record({
    pathSegment: fc.array(fc.integer({ min: 0, max: 15 }), { minLength: 4, maxLength: 12 }),
    id: fc.integer({ min: 1000, max: 999999 }),
  })
  .map(
    ({ pathSegment, id }) =>
      `https://almedalsveckan.info/event/${pathSegment.map((n) => n.toString(16)).join('')}/${id}`,
  );

/** Generates a non-empty prefix text (event description content before the link label). */
const prefixTextArb: fc.Arbitrary<string> = fc
  .stringMatching(/^[A-Za-zÀ-ÖØ-öø-ÿ0-9 ,.!?]{1,80}$/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

/**
 * Generates an input that satisfies the bug condition:
 * description contains "Länk till evenemanget: {sourceUrl}"
 *
 * Bug condition from design:
 *   isBugCondition_LinkLabel(input) = input.sourceUrl IS NOT NULL
 *     AND input.description CONTAINS ("Länk till evenemanget: " + input.sourceUrl)
 */
const bugConditionInputArb: fc.Arbitrary<{ description: string; sourceUrl: string }> = fc
  .record({
    prefix: prefixTextArb,
    sourceUrl: sourceUrlArb,
  })
  .map(({ prefix, sourceUrl }) => ({
    description: `${prefix}\nLänk till evenemanget: ${sourceUrl}`,
    sourceUrl,
  }));

// ─── Property Tests ───────────────────────────────────────────────

describe('Property 1: Bug Condition - Empty "Länk till evenemanget:" Label Residual', () => {
  it('stripSourceUrl removes both the label and the URL when description contains "Länk till evenemanget: {URL}"', () => {
    fc.assert(
      fc.property(bugConditionInputArb, ({ description, sourceUrl }) => {
        const result = stripSourceUrl(description, sourceUrl);

        // Expected behavior: result contains neither the label nor the URL
        expect(result).not.toContain('Länk till evenemanget:');
        expect(result).not.toContain(sourceUrl);
      }),
      { numRuns: 100 },
    );
  });
});
