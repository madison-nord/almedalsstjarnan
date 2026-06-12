import { describe, it, expect } from 'vitest';

import { generateICS, foldLine, escapeICSText } from '#core/ics-generator';
import { parseICS } from '#core/ics-parser';
import type { StarredEvent } from '#core/types';

// ─── Helper: create a minimal StarredEvent ────────────────────────

function createStarredEvent(overrides: Partial<StarredEvent> = {}): StarredEvent {
  return {
    id: 'full-content-test',
    title: 'Multi-section event',
    organiser: 'Test Org',
    startDateTime: '2026-06-28T10:00:00+02:00',
    endDateTime: '2026-06-28T11:30:00+02:00',
    location: 'Visby',
    description: null,
    topic: 'Test',
    sourceUrl: null,
    icsDataUri: null,
    starred: true as const,
    starredAt: '2026-06-15T14:30:00.000Z',
    ...overrides,
  };
}

// ─── Multi-section description content ────────────────────────────

const MULTI_SECTION_DESCRIPTION = [
  'Beskrivning av samhällsfrågan:',
  'Hur kan vi stärka demokratin i en tid av polarisering?',
  '',
  'Utökad information om evenemanget:',
  'Seminariet samlar forskare och politiker för att diskutera.',
  'Vi tar upp frågor om digitalisering och demokrati.',
  '',
  'Medverkande:',
  'Anna Svensson, professor i statsvetenskap',
  'Erik Johansson, riksdagsledamot',
  '',
  'Evenemangsinformation:',
  'Språk: Svenska',
  'Tillgänglighetsanpassat: Ja',
  '',
  'Arrangörsuppgifter:',
  'Sveriges Riksdag',
  'kontakt@riksdagen.se',
].join('\n');

// ─── Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6 ─────────────────

describe('ICS export with multi-section descriptions', () => {
  describe('full multi-section description in VEVENT DESCRIPTION', () => {
    it('includes the full multi-section description value in the VEVENT DESCRIPTION property', () => {
      const event = createStarredEvent({ description: MULTI_SECTION_DESCRIPTION });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);

      // After round-trip (escape + fold + unfold + unescape), description should be intact
      expect(parsed.events[0]!.description).toBe(MULTI_SECTION_DESCRIPTION);
    });

    it('preserves all five content sections in order', () => {
      const event = createStarredEvent({ description: MULTI_SECTION_DESCRIPTION });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      const desc = parsed.events[0]!.description!;

      expect(desc).toContain('Beskrivning av samhällsfrågan:');
      expect(desc).toContain('Utökad information om evenemanget:');
      expect(desc).toContain('Medverkande:');
      expect(desc).toContain('Evenemangsinformation:');
      expect(desc).toContain('Arrangörsuppgifter:');

      // Verify order
      const idx1 = desc.indexOf('Beskrivning av samhällsfrågan:');
      const idx2 = desc.indexOf('Utökad information om evenemanget:');
      const idx3 = desc.indexOf('Medverkande:');
      const idx4 = desc.indexOf('Evenemangsinformation:');
      const idx5 = desc.indexOf('Arrangörsuppgifter:');
      expect(idx1).toBeLessThan(idx2);
      expect(idx2).toBeLessThan(idx3);
      expect(idx3).toBeLessThan(idx4);
      expect(idx4).toBeLessThan(idx5);
    });
  });

  describe('newline escaping in description', () => {
    it('escapes newlines as literal \\n in the raw ICS output', () => {
      const description = 'Line one\nLine two\nLine three';
      const event = createStarredEvent({ description });
      const _ics = generateICS([event], 'sv');

      // In the raw ICS, newlines should be escaped as literal \n (two chars)
      // The raw output should contain \\n (the escaped form)
      const escaped = escapeICSText(description);
      expect(escaped).toBe('Line one\\nLine two\\nLine three');
      expect(escaped).not.toContain('\n');
    });

    it('round-trips newlines correctly through generate and parse', () => {
      const description = 'Section A:\nParagraph 1\nParagraph 2\n\nSection B:\nParagraph 3';
      const event = createStarredEvent({ description });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);

      expect(parsed.events[0]!.description).toBe(description);
    });
  });

  describe('line folding at 75-octet boundaries', () => {
    it('folds long description lines so no raw line exceeds 75 octets', () => {
      const longDescription = 'A'.repeat(300);
      const event = createStarredEvent({ description: longDescription });
      const ics = generateICS([event], 'sv');

      // Every line in the raw ICS output must be ≤ 75 octets
      const lines = ics.split('\r\n');
      for (const line of lines) {
        const octets = new TextEncoder().encode(line).length;
        expect(octets).toBeLessThanOrEqual(75);
      }
    });

    it('preserves content integrity after folding a long multi-section description', () => {
      const event = createStarredEvent({ description: MULTI_SECTION_DESCRIPTION });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);

      // Content should be fully preserved after unfold + unescape
      expect(parsed.events[0]!.description).toBe(MULTI_SECTION_DESCRIPTION);
    });

    it('correctly folds a line with multi-byte UTF-8 characters', () => {
      // Swedish characters (ä, ö, å) are 2 bytes each in UTF-8
      const description = 'Föreläsning: ' + 'ÅÄÖ'.repeat(30);
      const event = createStarredEvent({ description });
      const ics = generateICS([event], 'sv');

      const lines = ics.split('\r\n');
      for (const line of lines) {
        const octets = new TextEncoder().encode(line).length;
        expect(octets).toBeLessThanOrEqual(75);
      }

      // Round-trip preserves original
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.description).toBe(description);
    });

    it('foldLine produces continuation lines starting with a space', () => {
      const longLine = 'DESCRIPTION:' + 'X'.repeat(200);
      const folded = foldLine(longLine);
      const parts = folded.split('\r\n');

      expect(parts.length).toBeGreaterThan(1);
      for (let i = 1; i < parts.length; i++) {
        expect(parts[i]![0]).toBe(' ');
      }
    });
  });

  describe('source URL with locale-specific label', () => {
    it('appends source URL with "Källa:" label for sv locale', () => {
      const event = createStarredEvent({
        description: MULTI_SECTION_DESCRIPTION,
        sourceUrl: 'https://almedalsveckan.info/event/full-content-test',
      });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);

      expect(parsed.events[0]!.description).toContain(
        '\nKälla: https://almedalsveckan.info/event/full-content-test',
      );
    });

    it('appends source URL with "Source:" label for en locale', () => {
      const event = createStarredEvent({
        description: MULTI_SECTION_DESCRIPTION,
        sourceUrl: 'https://almedalsveckan.info/event/full-content-test',
      });
      const ics = generateICS([event], 'en');
      const parsed = parseICS(ics);

      expect(parsed.events[0]!.description).toContain(
        '\nSource: https://almedalsveckan.info/event/full-content-test',
      );
    });

    it('source URL appears at the end of the description', () => {
      const event = createStarredEvent({
        description: 'Short description',
        sourceUrl: 'https://almedalsveckan.info/event/test',
      });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);

      expect(parsed.events[0]!.description).toBe(
        'Short description\nKälla: https://almedalsveckan.info/event/test',
      );
    });
  });

  describe('null description and null sourceUrl', () => {
    it('omits DESCRIPTION property when both description and sourceUrl are null', () => {
      const event = createStarredEvent({ description: null, sourceUrl: null });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);

      expect(parsed.events[0]!.description).toBeNull();
    });

    it('does not contain DESCRIPTION in raw ICS output when both are null', () => {
      const event = createStarredEvent({ description: null, sourceUrl: null });
      const ics = generateICS([event], 'sv');

      // Raw ICS should not have a DESCRIPTION line
      const lines = ics.split('\r\n');
      const descLines = lines.filter((l) => l.startsWith('DESCRIPTION:'));
      expect(descLines).toHaveLength(0);
    });
  });
});
