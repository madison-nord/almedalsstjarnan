// Feature: production-readiness, Property 4: ICS locale-aware source label

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { generateICS } from '#core/ics-generator';

import { starredEventArb } from '#test/helpers/event-generators';

/**
 * Unfolds ICS content lines per RFC 5545.
 * Continuation lines start with a single space character.
 */
function unfoldICS(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, '');
}

describe('Property 4: ICS locale-aware source label', () => {
  /**
   * **Validates: Requirements 7.1, 7.2**
   *
   * For any starred event with a non-null sourceUrl and any supported locale,
   * the generated ICS DESCRIPTION field contains the locale-appropriate
   * source label ("Källa:" for 'sv', "Source:" for 'en') followed by the sourceUrl.
   */
  it('DESCRIPTION contains locale-appropriate source label followed by sourceUrl', () => {
    const eventWithSourceUrlArb = starredEventArb.filter((event) => event.sourceUrl !== null);

    const localeArb = fc.oneof(fc.constant('sv' as const), fc.constant('en' as const));

    fc.assert(
      fc.property(eventWithSourceUrlArb, localeArb, (event, locale) => {
        const ics = generateICS([event], locale);

        // Unfold the ICS content to handle line folding at 75 chars
        const unfolded = unfoldICS(ics);

        // Find the DESCRIPTION line
        const descriptionMatch = unfolded.match(/^DESCRIPTION:(.*)$/m);
        expect(descriptionMatch).not.toBeNull();

        const descriptionValue = descriptionMatch![1]!;

        // Determine expected label
        const expectedLabel = locale === 'sv' ? 'Källa:' : 'Source:';

        // The DESCRIPTION should contain the label followed by the sourceUrl
        // In ICS, newlines are escaped as \n
        const expectedFragment = `${expectedLabel} ${event.sourceUrl}`;
        const escapedFragment = expectedFragment.replace(/\\/g, '\\\\');

        expect(descriptionValue).toContain(escapedFragment);
      }),
      { numRuns: 100 },
    );
  });
});
