// Feature: content-scraping-and-sync, Property 6: ICS Text Escape Round-Trip
// Feature: content-scraping-and-sync, Property 7: ICS Line Folding Octet Limit
// Feature: content-scraping-and-sync, Property 8: ICS Description Assembly With Source URL

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { escapeICSText, foldLine, buildDescription } from '#core/ics-generator';
import { unescapeICSText } from '#core/ics-parser';

describe('Property 6: ICS Text Escape Round-Trip', () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.3**
   *
   * For any string containing arbitrary characters (including \, ,, ;, and \n),
   * applying escapeICSText and then unescapeICSText shall produce the original string.
   */
  it('escapeICSText followed by unescapeICSText produces original string', () => {
    // Generate strings that include the special characters \, ,, ;, and \n
    const icsTextArb = fc.string({ minLength: 0, maxLength: 500 }).filter((s) => !s.includes('\r'));

    fc.assert(
      fc.property(icsTextArb, (original) => {
        const escaped = escapeICSText(original);
        const unescaped = unescapeICSText(escaped);
        expect(unescaped).toBe(original);
      }),
      { numRuns: 100 },
    );
  });

  it('escapeICSText followed by unescapeICSText preserves strings with all special characters', () => {
    // Specifically bias toward strings containing the RFC 5545 special chars
    const specialCharsArb = fc
      .array(
        fc.oneof(
          fc.constant('\\'),
          fc.constant(','),
          fc.constant(';'),
          fc.constant('\n'),
          fc.string({ minLength: 1, maxLength: 1 }).filter((c) => c !== '\r'),
        ),
        { minLength: 1, maxLength: 200 },
      )
      .map((chars) => chars.join(''));

    fc.assert(
      fc.property(specialCharsArb, (original) => {
        const escaped = escapeICSText(original);
        const unescaped = unescapeICSText(escaped);
        expect(unescaped).toBe(original);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 7: ICS Line Folding Octet Limit', () => {
  /**
   * **Validates: Requirements 3.4**
   *
   * For any input string, after applying foldLine, every resulting line
   * (split by CRLF) shall be at most 75 octets in UTF-8 encoding.
   */
  it('every folded line is at most 75 octets in UTF-8', () => {
    // Generate arbitrary strings including multi-byte UTF-8 characters
    const longStringArb = fc.string({ minLength: 0, maxLength: 2000 }).filter((s) => !s.includes('\r') && !s.includes('\n'));

    fc.assert(
      fc.property(longStringArb, (input) => {
        const folded = foldLine(input);
        const lines = folded.split('\r\n');
        const encoder = new TextEncoder();

        for (const line of lines) {
          const octets = encoder.encode(line).length;
          expect(octets).toBeLessThanOrEqual(75);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('foldLine handles multi-byte UTF-8 characters without splitting them', () => {
    // Generate strings with multi-byte characters (emoji, CJK, Swedish chars)
    const multiByteArb = fc
      .array(
        fc.oneof(
          fc.constantFrom('å', 'ä', 'ö', 'Å', 'Ä', 'Ö', '€', '£', '¥'),
          fc.constantFrom('日', '本', '語', '中', '文'),
          fc.constantFrom('😀', '🎉', '🌍', '💻', '🎵'),
          fc.string({ minLength: 1, maxLength: 1 }).filter((c) => c !== '\r' && c !== '\n'),
        ),
        { minLength: 50, maxLength: 500 },
      )
      .map((chars) => chars.join(''));

    fc.assert(
      fc.property(multiByteArb, (input) => {
        const folded = foldLine(input);
        const lines = folded.split('\r\n');
        const encoder = new TextEncoder();

        for (const line of lines) {
          const octets = encoder.encode(line).length;
          expect(octets).toBeLessThanOrEqual(75);
        }
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 8: ICS Description Assembly With Source URL', () => {
  /**
   * **Validates: Requirements 3.5**
   *
   * For any (description, sourceUrl, locale) triple where sourceUrl is non-null,
   * buildDescription shall produce output ending with \n{label} {sourceUrl}
   * where label is "Källa:" when locale is 'sv' and "Source:" otherwise.
   */
  it('output ends with locale-appropriate label + URL when sourceUrl is non-null', () => {
    const descriptionArb = fc.oneof(
      fc.constant(null),
      fc.string({ minLength: 1, maxLength: 500 }).filter((s) => s.trim().length > 0),
    );

    const sourceUrlArb = fc
      .webUrl()
      .filter((url) => url.length > 0);

    const localeArb = fc.constantFrom('sv' as const, 'en' as const);

    fc.assert(
      fc.property(descriptionArb, sourceUrlArb, localeArb, (description, sourceUrl, locale) => {
        const result = buildDescription(description, sourceUrl, locale);

        expect(result).not.toBeNull();

        const expectedLabel = locale === 'sv' ? 'Källa:' : 'Source:';
        const expectedSuffix = `\n${expectedLabel} ${sourceUrl}`;

        expect(result!.endsWith(expectedSuffix)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('returns null when both description and sourceUrl are null', () => {
    const localeArb = fc.constantFrom('sv' as const, 'en' as const);

    fc.assert(
      fc.property(localeArb, (locale) => {
        const result = buildDescription(null, null, locale);
        expect(result).toBeNull();
      }),
      { numRuns: 100 },
    );
  });
});
