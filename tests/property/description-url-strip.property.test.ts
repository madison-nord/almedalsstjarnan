/**
 * Property-based test for description URL stripping.
 *
 * Property 3: For any event where sourceUrl is non-null and description
 * contains the sourceUrl string, the stripped description SHALL NOT
 * contain the sourceUrl as a substring.
 *
 * // Feature: ui-polish-fixes, Property 3: description URL stripping removes sourceUrl
 *
 * **Validates: Requirements 11.1, 11.2**
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { stripSourceUrl } from '#ui/popup/components/EventItem';

// ─── Custom Arbitraries ───────────────────────────────────────────

/** Generates a realistic URL string. */
const urlArb: fc.Arbitrary<string> = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 4, maxLength: 16 })
  .map((nums) => `https://almedalsveckan.info/event/${nums.map((n) => n.toString(16)).join('')}`);

/** Generates a description that contains the sourceUrl. */
const descriptionContainingUrlArb: fc.Arbitrary<{ description: string; sourceUrl: string }> =
  fc
    .record({
      prefix: fc.stringMatching(/^[A-Za-z0-9 ]{0,50}$/),
      suffix: fc.stringMatching(/^[A-Za-z0-9 ]{0,50}$/),
      sourceUrl: urlArb,
    })
    .map(({ prefix, suffix, sourceUrl }) => ({
      description: `${prefix}${sourceUrl}${suffix}`,
      sourceUrl,
    }));

// ─── Property Tests ───────────────────────────────────────────────

describe('Property 3: description URL stripping removes sourceUrl', () => {
  it('stripped description does not contain sourceUrl when sourceUrl is present in description', () => {
    fc.assert(
      fc.property(descriptionContainingUrlArb, ({ description, sourceUrl }) => {
        const result = stripSourceUrl(description, sourceUrl);
        expect(result).not.toContain(sourceUrl);
      }),
      { numRuns: 100 },
    );
  });

  it('returns description unchanged when sourceUrl is null', () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[A-Za-z0-9 ]{0,100}$/), (description) => {
        const result = stripSourceUrl(description, null);
        expect(result).toBe(description);
      }),
      { numRuns: 100 },
    );
  });

  it('returns description unchanged when sourceUrl is not found in description', () => {
    fc.assert(
      fc.property(
        fc.stringMatching(/^[A-Za-z0-9 ]{1,100}$/).filter((s) => !s.includes('https://almedalsveckan.info')),
        urlArb,
        (description, sourceUrl) => {
          // Ensure description does not contain the sourceUrl
          fc.pre(!description.includes(sourceUrl));
          const result = stripSourceUrl(description, sourceUrl);
          expect(result).toBe(description);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('result is trimmed when sourceUrl is stripped', () => {
    fc.assert(
      fc.property(descriptionContainingUrlArb, ({ description, sourceUrl }) => {
        const result = stripSourceUrl(description, sourceUrl);
        expect(result).toBe(result.trim());
      }),
      { numRuns: 100 },
    );
  });
});
