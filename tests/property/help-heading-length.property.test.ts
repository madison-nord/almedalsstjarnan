// Feature: user-help-onboarding, Property 2: Heading Length Constraint

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { getLocalizedMessage } from '#core/locale-messages';
import { HELP_FEATURE_GROUPS } from '#ui/shared/help-feature-groups';

/**
 * **Validates: Requirements 1.3**
 *
 * For any feature group in HELP_FEATURE_GROUPS and for any supported locale
 * (sv, en), the resolved heading string SHALL have a length of at most 40 characters.
 */
describe('Property 2: Heading Length Constraint', () => {
  it('all feature group headings are at most 40 characters in every locale', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...HELP_FEATURE_GROUPS),
        fc.constantFrom('sv' as const, 'en' as const),
        (group, locale) => {
          const heading = getLocalizedMessage(group.headingKey, locale);

          expect(heading.length).toBeGreaterThan(0);
          expect(heading.length).toBeLessThanOrEqual(40);
        },
      ),
      { numRuns: 100 },
    );
  });
});
