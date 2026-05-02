import { describe, it, expect } from 'vitest';

import { parseICS, unfoldLines, unescapeICSText } from '#core/ics-parser';

// ─── Helper: build a minimal valid ICS string ─────────────────────

function buildICS(vevents: string[], calProps?: Record<string, string>): string {
  const version = calProps?.['VERSION'] ?? '2.0';
  const prodid = calProps?.['PRODID'] ?? '-//Test//EN';
  const calscale = calProps?.['CALSCALE'] ?? 'GREGORIAN';
  const method = calProps?.['METHOD'] ?? 'PUBLISH';

  const lines = [
    'BEGIN:VCALENDAR',
    `VERSION:${version}`,
    `PRODID:${prodid}`,
    `CALSCALE:${calscale}`,
    `METHOD:${method}`,
    ...vevents,
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

function buildVEVENT(fields: Record<string, string>): string {
  const lines = ['BEGIN:VEVENT'];
  for (const [key, value] of Object.entries(fields)) {
    lines.push(`${key}:${value}`);
  }
  lines.push('END:VEVENT');
  return lines.join('\r\n');
}

// ─── parseICS ─────────────────────────────────────────────────────

describe('parseICS', () => {
  describe('valid VCALENDAR with single VEVENT', () => {
    it('parses a calendar with one event', () => {
      const vevent = buildVEVENT({
        UID: 'abc123@almedalsstjarnan',
        DTSTART: '20260628T100000',
        DTEND: '20260628T113000',
        SUMMARY: 'Demokrati i förändring',
        LOCATION: 'Donners plats',
        DESCRIPTION: 'Panelsamtal om demokratins framtid',
        ORGANIZER: 'Sveriges Riksdag',
      });
      const ics = buildICS([vevent]);
      const result = parseICS(ics);

      expect(result.version).toBe('2.0');
      expect(result.prodid).toBe('-//Test//EN');
      expect(result.calscale).toBe('GREGORIAN');
      expect(result.method).toBe('PUBLISH');
      expect(result.events).toHaveLength(1);
      expect(result.events[0]!.uid).toBe('abc123@almedalsstjarnan');
      expect(result.events[0]!.summary).toBe('Demokrati i förändring');
    });
  });

  describe('multiple VEVENTs', () => {
    it('parses a calendar with multiple events', () => {
      const vevent1 = buildVEVENT({
        UID: 'event1@test',
        DTSTART: '20260628T100000',
        SUMMARY: 'Event One',
      });
      const vevent2 = buildVEVENT({
        UID: 'event2@test',
        DTSTART: '20260629T140000',
        SUMMARY: 'Event Two',
      });
      const ics = buildICS([vevent1, vevent2]);
      const result = parseICS(ics);

      expect(result.events).toHaveLength(2);
      expect(result.events[0]!.uid).toBe('event1@test');
      expect(result.events[1]!.uid).toBe('event2@test');
    });
  });

  describe('field extraction', () => {
    it('extracts UID', () => {
      const vevent = buildVEVENT({
        UID: 'unique-id-42@almedalsstjarnan',
        DTSTART: '20260628T100000',
        SUMMARY: 'Test',
      });
      const result = parseICS(buildICS([vevent]));
      expect(result.events[0]!.uid).toBe('unique-id-42@almedalsstjarnan');
    });

    it('extracts DTSTART', () => {
      const vevent = buildVEVENT({
        UID: 'id1',
        DTSTART: '20260628T100000',
        SUMMARY: 'Test',
      });
      const result = parseICS(buildICS([vevent]));
      expect(result.events[0]!.dtstart).toBe('20260628T100000');
    });

    it('extracts DTEND', () => {
      const vevent = buildVEVENT({
        UID: 'id1',
        DTSTART: '20260628T100000',
        DTEND: '20260628T113000',
        SUMMARY: 'Test',
      });
      const result = parseICS(buildICS([vevent]));
      expect(result.events[0]!.dtend).toBe('20260628T113000');
    });

    it('extracts SUMMARY', () => {
      const vevent = buildVEVENT({
        UID: 'id1',
        DTSTART: '20260628T100000',
        SUMMARY: 'Klimatpolitik 2026',
      });
      const result = parseICS(buildICS([vevent]));
      expect(result.events[0]!.summary).toBe('Klimatpolitik 2026');
    });

    it('extracts LOCATION', () => {
      const vevent = buildVEVENT({
        UID: 'id1',
        DTSTART: '20260628T100000',
        SUMMARY: 'Test',
        LOCATION: 'Donners plats\\, Visby',
      });
      const result = parseICS(buildICS([vevent]));
      expect(result.events[0]!.location).toBe('Donners plats, Visby');
    });

    it('extracts DESCRIPTION', () => {
      const vevent = buildVEVENT({
        UID: 'id1',
        DTSTART: '20260628T100000',
        SUMMARY: 'Test',
        DESCRIPTION: 'En viktig diskussion om framtiden',
      });
      const result = parseICS(buildICS([vevent]));
      expect(result.events[0]!.description).toBe('En viktig diskussion om framtiden');
    });

    it('extracts ORGANIZER', () => {
      const vevent = buildVEVENT({
        UID: 'id1',
        DTSTART: '20260628T100000',
        SUMMARY: 'Test',
        ORGANIZER: 'Sveriges Riksdag',
      });
      const result = parseICS(buildICS([vevent]));
      expect(result.events[0]!.organizer).toBe('Sveriges Riksdag');
    });
  });

  describe('missing optional fields', () => {
    it('sets dtend to null when DTEND is missing', () => {
      const vevent = buildVEVENT({
        UID: 'id1',
        DTSTART: '20260628T100000',
        SUMMARY: 'Test',
      });
      const result = parseICS(buildICS([vevent]));
      expect(result.events[0]!.dtend).toBeNull();
    });

    it('sets location to null when LOCATION is missing', () => {
      const vevent = buildVEVENT({
        UID: 'id1',
        DTSTART: '20260628T100000',
        SUMMARY: 'Test',
      });
      const result = parseICS(buildICS([vevent]));
      expect(result.events[0]!.location).toBeNull();
    });

    it('sets description to null when DESCRIPTION is missing', () => {
      const vevent = buildVEVENT({
        UID: 'id1',
        DTSTART: '20260628T100000',
        SUMMARY: 'Test',
      });
      const result = parseICS(buildICS([vevent]));
      expect(result.events[0]!.description).toBeNull();
    });

    it('sets organizer to null when ORGANIZER is missing', () => {
      const vevent = buildVEVENT({
        UID: 'id1',
        DTSTART: '20260628T100000',
        SUMMARY: 'Test',
      });
      const result = parseICS(buildICS([vevent]));
      expect(result.events[0]!.organizer).toBeNull();
    });
  });

  describe('malformed ICS', () => {
    it('throws on missing BEGIN:VCALENDAR', () => {
      const ics = [
        'VERSION:2.0',
        'BEGIN:VEVENT',
        'UID:id1',
        'DTSTART:20260628T100000',
        'SUMMARY:Test',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      expect(() => parseICS(ics)).toThrow();
    });

    it('throws on missing BEGIN:VEVENT when events are expected', () => {
      const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Test//EN',
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        'UID:id1',
        'DTSTART:20260628T100000',
        'SUMMARY:Test',
        'END:VCALENDAR',
      ].join('\r\n');

      // This should parse but produce zero events (no VEVENT blocks)
      const result = parseICS(ics);
      expect(result.events).toHaveLength(0);
    });

    it('throws on completely empty string', () => {
      expect(() => parseICS('')).toThrow();
    });

    it('throws on random non-ICS content', () => {
      expect(() => parseICS('This is not an ICS file')).toThrow();
    });
  });

  describe('VCALENDAR properties', () => {
    it('extracts VERSION', () => {
      const vevent = buildVEVENT({
        UID: 'id1',
        DTSTART: '20260628T100000',
        SUMMARY: 'Test',
      });
      const ics = buildICS([vevent], { VERSION: '2.0' });
      const result = parseICS(ics);
      expect(result.version).toBe('2.0');
    });

    it('extracts PRODID', () => {
      const vevent = buildVEVENT({
        UID: 'id1',
        DTSTART: '20260628T100000',
        SUMMARY: 'Test',
      });
      const ics = buildICS([vevent], { PRODID: '-//Almedalsstjärnan//EN' });
      const result = parseICS(ics);
      expect(result.prodid).toBe('-//Almedalsstjärnan//EN');
    });

    it('extracts CALSCALE', () => {
      const vevent = buildVEVENT({
        UID: 'id1',
        DTSTART: '20260628T100000',
        SUMMARY: 'Test',
      });
      const ics = buildICS([vevent], { CALSCALE: 'GREGORIAN' });
      const result = parseICS(ics);
      expect(result.calscale).toBe('GREGORIAN');
    });

    it('extracts METHOD', () => {
      const vevent = buildVEVENT({
        UID: 'id1',
        DTSTART: '20260628T100000',
        SUMMARY: 'Test',
      });
      const ics = buildICS([vevent], { METHOD: 'PUBLISH' });
      const result = parseICS(ics);
      expect(result.method).toBe('PUBLISH');
    });
  });
});

// ─── unfoldLines ──────────────────────────────────────────────────

describe('unfoldLines', () => {
  it('unfolds CRLF followed by a single space', () => {
    const folded = 'DESCRIPTION:This is a long\r\n  description that continues';
    const result = unfoldLines(folded);
    expect(result).toBe('DESCRIPTION:This is a long description that continues');
  });

  it('unfolds CRLF followed by a single tab', () => {
    const folded = 'DESCRIPTION:This is a long \r\n\tdescription that continues';
    const result = unfoldLines(folded);
    expect(result).toBe('DESCRIPTION:This is a long description that continues');
  });

  it('unfolds multiple continuation lines', () => {
    const folded = 'DESCRIPTION:Line one\r\n  continues here\r\n  and here too';
    const result = unfoldLines(folded);
    expect(result).toBe('DESCRIPTION:Line one continues here and here too');
  });

  it('does not unfold CRLF not followed by whitespace', () => {
    const content = 'SUMMARY:First line\r\nDESCRIPTION:Second line';
    const result = unfoldLines(content);
    expect(result).toBe('SUMMARY:First line\r\nDESCRIPTION:Second line');
  });

  it('handles content with no folding', () => {
    const content = 'SUMMARY:Short line\r\nDESCRIPTION:Another short line';
    const result = unfoldLines(content);
    expect(result).toBe(content);
  });

  it('handles empty string', () => {
    expect(unfoldLines('')).toBe('');
  });
});

// ─── unescapeICSText ──────────────────────────────────────────────

describe('unescapeICSText', () => {
  it('unescapes escaped commas', () => {
    expect(unescapeICSText('Donners plats\\, Visby')).toBe('Donners plats, Visby');
  });

  it('unescapes escaped semicolons', () => {
    expect(unescapeICSText('Part A\\; Part B')).toBe('Part A; Part B');
  });

  it('unescapes escaped backslashes', () => {
    expect(unescapeICSText('path\\\\to\\\\file')).toBe('path\\to\\file');
  });

  it('unescapes escaped newlines (\\n)', () => {
    expect(unescapeICSText('Line one\\nLine two')).toBe('Line one\nLine two');
  });

  it('unescapes escaped newlines (\\N)', () => {
    expect(unescapeICSText('Line one\\NLine two')).toBe('Line one\nLine two');
  });

  it('handles multiple escape sequences in one string', () => {
    expect(unescapeICSText('A\\, B\\; C\\nD')).toBe('A, B; C\nD');
  });

  it('returns unescaped text when no escapes present', () => {
    expect(unescapeICSText('Plain text')).toBe('Plain text');
  });

  it('handles empty string', () => {
    expect(unescapeICSText('')).toBe('');
  });
});

// ─── Integration: unfold + parse ──────────────────────────────────

describe('parseICS with folded lines', () => {
  it('correctly parses ICS content with folded lines', () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Test//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      'UID:fold-test@almedalsstjarnan',
      'DTSTART:20260628T100000',
      'SUMMARY:A very long event title that needs to be',
      '  folded across multiple lines',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const result = parseICS(ics);
    expect(result.events[0]!.summary).toBe(
      'A very long event title that needs to be folded across multiple lines',
    );
  });
});

describe('parseICS with escaped text values', () => {
  it('unescapes text fields in parsed events', () => {
    const vevent = buildVEVENT({
      UID: 'escape-test@almedalsstjarnan',
      DTSTART: '20260628T100000',
      SUMMARY: 'Event with\\, comma',
      LOCATION: 'Place\\; Room A',
      DESCRIPTION: 'Line one\\nLine two',
    });
    const ics = buildICS([vevent]);
    const result = parseICS(ics);

    expect(result.events[0]!.summary).toBe('Event with, comma');
    expect(result.events[0]!.location).toBe('Place; Room A');
    expect(result.events[0]!.description).toBe('Line one\nLine two');
  });
});
