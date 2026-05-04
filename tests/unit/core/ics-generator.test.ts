import { describe, it, expect } from 'vitest';

import {
  generateICS,
  foldLine,
  escapeICSText,
  generateExportFilename,
} from '#core/ics-generator';
import { parseICS } from '#core/ics-parser';
import type { StarredEvent } from '#core/types';

// ─── Helper: create a minimal StarredEvent ────────────────────────

function createStarredEvent(overrides: Partial<StarredEvent> = {}): StarredEvent {
  return {
    id: 'abc123',
    title: 'Demokrati i förändring',
    organiser: 'Sveriges Riksdag',
    startDateTime: '2026-06-28T10:00:00+02:00',
    endDateTime: '2026-06-28T11:30:00+02:00',
    location: 'Donners plats, Visby',
    description: 'Panelsamtal om demokratins framtid',
    topic: 'Demokrati',
    sourceUrl: 'https://almedalsveckan.info/event/abc123',
    icsDataUri: null,
    starred: true as const,
    starredAt: '2026-06-15T14:30:00.000Z',
    ...overrides,
  };
}

// ─── VCALENDAR header ─────────────────────────────────────────────

describe('generateICS', () => {
  describe('VCALENDAR header', () => {
    it('includes VERSION:2.0', () => {
      const ics = generateICS([], 'sv');
      expect(ics).toContain('VERSION:2.0');
    });

    it('includes PRODID:-//Almedalsstjärnan//EN', () => {
      const ics = generateICS([], 'sv');
      expect(ics).toContain('PRODID:-//Almedalsstjärnan//EN');
    });

    it('includes CALSCALE:GREGORIAN', () => {
      const ics = generateICS([], 'sv');
      expect(ics).toContain('CALSCALE:GREGORIAN');
    });

    it('includes METHOD:PUBLISH', () => {
      const ics = generateICS([], 'sv');
      expect(ics).toContain('METHOD:PUBLISH');
    });

    it('parses back with correct header properties', () => {
      const ics = generateICS([], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.version).toBe('2.0');
      expect(parsed.prodid).toBe('-//Almedalsstjärnan//EN');
      expect(parsed.calscale).toBe('GREGORIAN');
      expect(parsed.method).toBe('PUBLISH');
    });
  });

  // ─── VEVENT fields ────────────────────────────────────────────

  describe('VEVENT fields', () => {
    it('generates UID as {id}@almedalsstjarnan', () => {
      const event = createStarredEvent({ id: 'evt42' });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.uid).toBe('evt42@almedalsstjarnan');
    });

    it('generates DTSTAMP in YYYYMMDDTHHMMSSZ format', () => {
      const event = createStarredEvent();
      const ics = generateICS([event], 'sv');
      // DTSTAMP should match the UTC timestamp format
      expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/);
    });

    it('generates DTSTART from ISO 8601 start date-time', () => {
      const event = createStarredEvent({ startDateTime: '2026-06-22T07:30:00+02:00' });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.dtstart).toBe('20260622T073000');
    });

    it('generates DTEND from ISO 8601 end date-time', () => {
      const event = createStarredEvent({ endDateTime: '2026-06-22T09:00:00+02:00' });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.dtend).toBe('20260622T090000');
    });

    it('omits DTEND when endDateTime is null', () => {
      const event = createStarredEvent({ endDateTime: null });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.dtend).toBeNull();
    });

    it('generates SUMMARY from event title', () => {
      const event = createStarredEvent({ title: 'Klimatkrisen och politiken' });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.summary).toBe('Klimatkrisen och politiken');
    });

    it('generates LOCATION from event location', () => {
      const event = createStarredEvent({ location: 'Almedalsparken' });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.location).toBe('Almedalsparken');
    });

    it('omits LOCATION when location is null', () => {
      const event = createStarredEvent({ location: null });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.location).toBeNull();
    });

    it('generates DESCRIPTION with event description only (no source URL)', () => {
      const event = createStarredEvent({
        description: 'Panelsamtal',
        sourceUrl: 'https://almedalsveckan.info/event/abc123',
      });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.description).toBe('Panelsamtal');
    });

    it('omits DESCRIPTION when both description and sourceUrl are null', () => {
      const event = createStarredEvent({ description: null, sourceUrl: null });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.description).toBeNull();
    });

    it('generates ORGANIZER from event organiser', () => {
      const event = createStarredEvent({ organiser: 'Sveriges Riksdag' });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.organizer).toBe('Sveriges Riksdag');
    });

    it('omits ORGANIZER when organiser is null', () => {
      const event = createStarredEvent({ organiser: null });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.organizer).toBeNull();
    });
  });

  // ─── CRLF line endings ────────────────────────────────────────

  describe('CRLF line endings', () => {
    it('uses CRLF line endings throughout', () => {
      const event = createStarredEvent();
      const ics = generateICS([event], 'sv');
      // After removing all \r\n, there should be no bare \n left
      const withoutCRLF = ics.replace(/\r\n/g, '');
      expect(withoutCRLF).not.toContain('\n');
    });

    it('does not contain bare LF characters', () => {
      const event = createStarredEvent();
      const ics = generateICS([event], 'sv');
      // Check that every \n is preceded by \r
      for (let i = 0; i < ics.length; i++) {
        if (ics[i] === '\n') {
          expect(ics[i - 1]).toBe('\r');
        }
      }
    });
  });

  // ─── Line folding ────────────────────────────────────────────

  describe('line folding', () => {
    it('folds lines longer than 75 octets', () => {
      const event = createStarredEvent({
        description:
          'This is a very long description that should definitely exceed the seventy-five octet limit for ICS content lines and trigger line folding behavior',
      });
      const ics = generateICS([event], 'sv');
      // After unfolding, the content should be intact
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.description).toContain(
        'This is a very long description',
      );
    });

    it('all content lines are at most 75 octets before CRLF', () => {
      const event = createStarredEvent({
        title: 'A'.repeat(100),
        description: 'B'.repeat(200),
        location: 'C'.repeat(100),
      });
      const ics = generateICS([event], 'sv');
      const lines = ics.split('\r\n');
      for (const line of lines) {
        const octets = new TextEncoder().encode(line).length;
        expect(octets).toBeLessThanOrEqual(75);
      }
    });
  });

  // ─── Empty events array ───────────────────────────────────────

  describe('empty events array', () => {
    it('produces valid VCALENDAR with zero VEVENTs', () => {
      const ics = generateICS([], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events).toHaveLength(0);
      expect(parsed.version).toBe('2.0');
      expect(parsed.prodid).toBe('-//Almedalsstjärnan//EN');
    });

    it('contains BEGIN:VCALENDAR and END:VCALENDAR', () => {
      const ics = generateICS([], 'sv');
      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('END:VCALENDAR');
    });

    it('does not contain BEGIN:VEVENT', () => {
      const ics = generateICS([], 'sv');
      expect(ics).not.toContain('BEGIN:VEVENT');
    });
  });

  // ─── Localized source label (removed — source URL now uses URL property) ──

  describe('DESCRIPTION without source label', () => {
    it('does not include "Källa:" in DESCRIPTION for Swedish locale', () => {
      const event = createStarredEvent({
        description: 'Test',
        sourceUrl: 'https://almedalsveckan.info/event/abc123',
      });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.description).not.toContain('Källa:');
    });

    it('does not include "Source:" in DESCRIPTION for English locale', () => {
      const event = createStarredEvent({
        description: 'Test',
        sourceUrl: 'https://almedalsveckan.info/event/abc123',
      });
      const ics = generateICS([event], 'en');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.description).not.toContain('Source:');
    });

    it('DESCRIPTION contains only description text when sourceUrl is present', () => {
      const event = createStarredEvent({
        description: 'Test',
        sourceUrl: 'https://almedalsveckan.info/event/abc123',
      });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.description).toBe('Test');
    });

    it('omits DESCRIPTION when description is null even if sourceUrl exists', () => {
      const event = createStarredEvent({
        description: null,
        sourceUrl: 'https://almedalsveckan.info/event/abc123',
      });
      const ics = generateICS([event], 'en');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.description).toBeNull();
    });
  });

  // ─── Multiple events ──────────────────────────────────────────

  describe('URL property', () => {
    it('emits URL property when sourceUrl is non-null', () => {
      const event = createStarredEvent({
        sourceUrl: 'https://almedalsveckan.info/event/abc123',
      });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.url).toBe('https://almedalsveckan.info/event/abc123');
    });

    it('DESCRIPTION does not contain source URL when sourceUrl is non-null', () => {
      const event = createStarredEvent({
        description: 'Panelsamtal',
        sourceUrl: 'https://almedalsveckan.info/event/abc123',
      });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.description).not.toContain('https://almedalsveckan.info/event/abc123');
    });

    it('DESCRIPTION does not contain localized source label when sourceUrl is non-null', () => {
      const event = createStarredEvent({
        description: 'Panelsamtal',
        sourceUrl: 'https://almedalsveckan.info/event/abc123',
      });
      const icsSv = generateICS([event], 'sv');
      const parsedSv = parseICS(icsSv);
      expect(parsedSv.events[0]!.description).not.toContain('Källa:');

      const icsEn = generateICS([event], 'en');
      const parsedEn = parseICS(icsEn);
      expect(parsedEn.events[0]!.description).not.toContain('Source:');
    });

    it('omits URL property when sourceUrl is null', () => {
      const event = createStarredEvent({ sourceUrl: null });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.url).toBeNull();
    });

    it('DESCRIPTION contains only description text when sourceUrl is non-null', () => {
      const event = createStarredEvent({
        description: 'Panelsamtal om demokratins framtid',
        sourceUrl: 'https://almedalsveckan.info/event/abc123',
      });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.description).toBe('Panelsamtal om demokratins framtid');
    });

    it('omits DESCRIPTION when description is null and sourceUrl is non-null', () => {
      const event = createStarredEvent({
        description: null,
        sourceUrl: 'https://almedalsveckan.info/event/abc123',
      });
      const ics = generateICS([event], 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events[0]!.description).toBeNull();
    });
  });

  describe('multiple events', () => {
    it('generates one VEVENT per starred event', () => {
      const events = [
        createStarredEvent({ id: 'evt1', title: 'Event One' }),
        createStarredEvent({ id: 'evt2', title: 'Event Two' }),
        createStarredEvent({ id: 'evt3', title: 'Event Three' }),
      ];
      const ics = generateICS(events, 'sv');
      const parsed = parseICS(ics);
      expect(parsed.events).toHaveLength(3);
    });
  });
});

// ─── escapeICSText ──────────────────────────────────────────────

describe('escapeICSText', () => {
  it('escapes commas', () => {
    expect(escapeICSText('Donners plats, Visby')).toBe('Donners plats\\, Visby');
  });

  it('escapes semicolons', () => {
    expect(escapeICSText('Part A; Part B')).toBe('Part A\\; Part B');
  });

  it('escapes backslashes', () => {
    expect(escapeICSText('path\\to\\file')).toBe('path\\\\to\\\\file');
  });

  it('escapes newlines', () => {
    expect(escapeICSText('Line one\nLine two')).toBe('Line one\\nLine two');
  });

  it('escapes multiple special characters in one string', () => {
    expect(escapeICSText('A, B; C\nD')).toBe('A\\, B\\; C\\nD');
  });

  it('returns unchanged text when no special characters', () => {
    expect(escapeICSText('Plain text')).toBe('Plain text');
  });

  it('handles empty string', () => {
    expect(escapeICSText('')).toBe('');
  });

  it('escapes backslash before other characters to avoid double-escaping', () => {
    // A backslash followed by a comma: \ then , → \\ then \,
    expect(escapeICSText('test\\,value')).toBe('test\\\\\\,value');
  });
});

// ─── foldLine ───────────────────────────────────────────────────

describe('foldLine', () => {
  it('returns short lines unchanged', () => {
    const line = 'SUMMARY:Short title';
    expect(foldLine(line)).toBe(line);
  });

  it('folds lines at exactly 75 octets', () => {
    // Create a line that is exactly 76 octets (needs folding)
    const line = 'SUMMARY:' + 'A'.repeat(68); // 8 + 68 = 76 octets
    const folded = foldLine(line);
    const parts = folded.split('\r\n');
    expect(parts.length).toBeGreaterThan(1);
    // First part should be 75 octets
    expect(new TextEncoder().encode(parts[0]!).length).toBe(75);
    // Continuation lines start with a space
    for (let i = 1; i < parts.length; i++) {
      expect(parts[i]![0]).toBe(' ');
    }
  });

  it('handles multi-byte UTF-8 characters correctly', () => {
    // Swedish characters like ä, ö, å are 2 bytes in UTF-8
    const line = 'SUMMARY:' + 'ä'.repeat(40); // 8 + 80 = 88 octets (ä is 2 bytes)
    const folded = foldLine(line);
    const parts = folded.split('\r\n');
    for (const part of parts) {
      expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    }
  });

  it('produces output that unfolds back to the original', () => {
    const line = 'DESCRIPTION:' + 'X'.repeat(200);
    const folded = foldLine(line);
    // Unfold: remove CRLF followed by single space
    const unfolded = folded.replace(/\r\n /g, '');
    expect(unfolded).toBe(line);
  });

  it('handles empty string', () => {
    expect(foldLine('')).toBe('');
  });

  it('does not fold a line of exactly 75 octets', () => {
    const line = 'SUMMARY:' + 'A'.repeat(67); // 8 + 67 = 75 octets
    expect(foldLine(line)).toBe(line);
  });
});

// ─── generateExportFilename ─────────────────────────────────────

describe('generateExportFilename', () => {
  it('matches the pattern almedalsstjarnan-starred-events-YYYYMMDD-HHMMSS.ics', () => {
    const filename = generateExportFilename();
    expect(filename).toMatch(
      /^almedalsstjarnan-starred-events-\d{8}-\d{6}\.ics$/,
    );
  });

  it('uses the provided date for the timestamp', () => {
    const date = new Date('2026-06-28T14:30:45Z');
    const filename = generateExportFilename(date);
    expect(filename).toBe('almedalsstjarnan-starred-events-20260628-143045.ics');
  });

  it('uses current time when no date is provided', () => {
    const before = new Date();
    const filename = generateExportFilename();
    const after = new Date();

    // Extract the date part from the filename
    const match = filename.match(
      /^almedalsstjarnan-starred-events-(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})\.ics$/,
    );
    expect(match).not.toBeNull();

    const year = parseInt(match![1]!, 10);
    const month = parseInt(match![2]!, 10);
    const day = parseInt(match![3]!, 10);

    expect(year).toBeGreaterThanOrEqual(before.getUTCFullYear());
    expect(year).toBeLessThanOrEqual(after.getUTCFullYear());
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
  });

  it('pads single-digit values with leading zeros', () => {
    const date = new Date('2026-01-05T03:07:09Z');
    const filename = generateExportFilename(date);
    expect(filename).toBe('almedalsstjarnan-starred-events-20260105-030709.ics');
  });
});
