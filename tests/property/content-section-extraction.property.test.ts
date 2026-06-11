/**
 * Property-based tests for content section extraction.
 *
 * Feature: content-scraping-and-sync, Property 4: Content Section Extraction Completeness
 * Feature: content-scraping-and-sync, Property 5: Content Description Length Invariant
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.8, 2.9, 2.10, 2.11
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import {
  extractContentSections,
  CONTENT_SECTION_HEADINGS,
  MAX_DESCRIPTION_LENGTH,
} from '#core/event-normalizer';

// ─── Arbitraries ──────────────────────────────────────────────────

/** Generates a non-empty subset of the 5 known headings (preserving DOM order). */
const headingSubsetArb: fc.Arbitrary<readonly string[]> = fc
  .subarray([...CONTENT_SECTION_HEADINGS], { minLength: 1, maxLength: 5 })
  .map((subset) =>
    [...subset].sort(
      (a, b) => CONTENT_SECTION_HEADINGS.indexOf(a as typeof CONTENT_SECTION_HEADINGS[number]) -
        CONTENT_SECTION_HEADINGS.indexOf(b as typeof CONTENT_SECTION_HEADINGS[number]),
    ),
  );

/** Generates a non-empty trimmed paragraph string (no leading/trailing whitespace). */
const paragraphTextArb: fc.Arbitrary<string> = fc
  .stringMatching(/^[A-Za-zÀ-ÖØ-öø-ÿ0-9.,!? ]{1,200}$/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

/** Generates 1-4 non-empty paragraph strings for a section. */
const paragraphsArb: fc.Arbitrary<readonly string[]> = fc.array(paragraphTextArb, {
  minLength: 1,
  maxLength: 4,
});

/** Represents a generated section with heading and paragraph content. */
interface GeneratedSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

/** Generates a list of sections from a random subset of headings, each with random paragraphs. */
const sectionsFromSubsetArb: fc.Arbitrary<readonly GeneratedSection[]> = headingSubsetArb.chain(
  (headings) =>
    fc.tuple(...headings.map((heading) => paragraphsArb.map((paragraphs) => ({ heading, paragraphs })))),
);

/** Generates very long paragraph text (up to 20000 chars) for length invariant testing. */
const longParagraphArb: fc.Arbitrary<string> = fc
  .integer({ min: 500, max: 20000 })
  .chain((len) =>
    fc
      .array(fc.constantFrom('a', 'b', 'c', 'd', 'e', 'f', 'g', ' ', '.', ','), {
        minLength: len,
        maxLength: len,
      })
      .map((chars) => chars.join('')),
  )
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

// ─── DOM Builder ──────────────────────────────────────────────────

/**
 * Builds an Event_Card-like DOM element with a div.env-collapse containing
 * the provided sections as h3 + p elements in order.
 */
function buildEventCardWithSections(sections: readonly GeneratedSection[]): HTMLElement {
  const li = document.createElement('li');
  const collapseDiv = document.createElement('div');
  collapseDiv.className = 'env-collapse';

  for (const section of sections) {
    const h3 = document.createElement('h3');
    h3.textContent = section.heading;
    collapseDiv.appendChild(h3);

    for (const para of section.paragraphs) {
      const p = document.createElement('p');
      p.textContent = para;
      collapseDiv.appendChild(p);
    }
  }

  li.appendChild(collapseDiv);
  return li;
}

/**
 * Builds an Event_Card with sections that have very long paragraph content.
 */
function buildEventCardWithLongContent(
  headings: readonly string[],
  paragraphs: readonly string[],
): HTMLElement {
  const li = document.createElement('li');
  const collapseDiv = document.createElement('div');
  collapseDiv.className = 'env-collapse';

  for (let i = 0; i < headings.length; i++) {
    const h3 = document.createElement('h3');
    h3.textContent = headings[i]!;
    collapseDiv.appendChild(h3);

    const p = document.createElement('p');
    p.textContent = paragraphs[i] ?? paragraphs[0]!;
    collapseDiv.appendChild(p);
  }

  li.appendChild(collapseDiv);
  return li;
}

// ─── Test Suite ───────────────────────────────────────────────────

describe('Content Section Extraction Properties', () => {
  // Feature: content-scraping-and-sync, Property 4: Content Section Extraction Completeness
  describe('Property 4: Content Section Extraction Completeness', () => {
    it('output contains each heading label followed by colon and paragraph text in DOM order', () => {
      fc.assert(
        fc.property(sectionsFromSubsetArb, (sections) => {
          const element = buildEventCardWithSections(sections);
          const result = extractContentSections(element);

          // All sections have at least one non-empty paragraph, so result should be non-null
          expect(result).not.toBeNull();

          // Verify each heading appears with colon prefix
          for (const section of sections) {
            expect(result).toContain(`${section.heading}:`);
          }

          // Verify paragraphs appear after their heading
          for (const section of sections) {
            const sectionPrefix = `${section.heading}:\n`;
            const sectionStart = result!.indexOf(sectionPrefix);
            expect(sectionStart).toBeGreaterThanOrEqual(0);

            // Each paragraph should appear in the section's text
            const afterHeading = result!.slice(sectionStart + sectionPrefix.length);
            // Get text up to next section separator or end
            const nextSectionEnd = afterHeading.indexOf('\n\n');
            const sectionText =
              nextSectionEnd >= 0 ? afterHeading.slice(0, nextSectionEnd) : afterHeading;

            for (const para of section.paragraphs) {
              expect(sectionText).toContain(para);
            }
          }

          // Verify DOM order: sections appear in the output in the same order as CONTENT_SECTION_HEADINGS
          const indices = sections.map((s) => result!.indexOf(`${s.heading}:`));
          for (let i = 1; i < indices.length; i++) {
            expect(indices[i]).toBeGreaterThan(indices[i - 1]!);
          }

          // Verify sections are separated by \n\n
          if (sections.length > 1) {
            expect(result).toContain('\n\n');
          }

          // Verify paragraphs within a section are joined with \n
          for (const section of sections) {
            if (section.paragraphs.length > 1) {
              const expectedJoined = section.paragraphs.join('\n');
              expect(result).toContain(expectedJoined);
            }
          }
        }),
        { numRuns: 100 },
      );
    });

    it('output format is "Heading:\\nparagraph1\\nparagraph2" for each section', () => {
      fc.assert(
        fc.property(sectionsFromSubsetArb, (sections) => {
          const element = buildEventCardWithSections(sections);
          const result = extractContentSections(element);

          expect(result).not.toBeNull();

          // Build expected output manually
          const expected = sections
            .map((s) => `${s.heading}:\n${s.paragraphs.join('\n')}`)
            .join('\n\n');

          // Account for truncation
          const expectedTrimmed =
            expected.length > MAX_DESCRIPTION_LENGTH
              ? expected.slice(0, MAX_DESCRIPTION_LENGTH)
              : expected;

          expect(result).toBe(expectedTrimmed);
        }),
        { numRuns: 100 },
      );
    });
  });

  // Feature: content-scraping-and-sync, Property 5: Content Description Length Invariant
  describe('Property 5: Content Description Length Invariant', () => {
    it('output never exceeds 10000 characters', () => {
      fc.assert(
        fc.property(
          headingSubsetArb,
          fc.array(longParagraphArb, { minLength: 1, maxLength: 5 }),
          (headings, longParagraphs) => {
            const element = buildEventCardWithLongContent(headings, longParagraphs);
            const result = extractContentSections(element);

            if (result !== null) {
              expect(result.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('output never exceeds 10000 characters even with maximum sections and content', () => {
      fc.assert(
        fc.property(
          fc.array(longParagraphArb, { minLength: 5, maxLength: 5 }),
          (longParagraphs) => {
            // Use all 5 headings with very long paragraphs
            const allHeadings = [...CONTENT_SECTION_HEADINGS];
            const element = buildEventCardWithLongContent(allHeadings, longParagraphs);
            const result = extractContentSections(element);

            if (result !== null) {
              expect(result.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
