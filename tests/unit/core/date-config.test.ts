import { describe, it, expect } from 'vitest';

import { DAY_TO_DATE, SWEDISH_DAYS, STOCKHOLM_SUMMER_OFFSET } from '#core/date-config';

// ─── STOCKHOLM_SUMMER_OFFSET ──────────────────────────────────────

describe('STOCKHOLM_SUMMER_OFFSET', () => {
  it('exports the Stockholm summer timezone offset as +02:00', () => {
    expect(STOCKHOLM_SUMMER_OFFSET).toBe('+02:00');
  });

  it('is a string literal type', () => {
    expect(typeof STOCKHOLM_SUMMER_OFFSET).toBe('string');
  });
});

// ─── SWEDISH_DAYS ─────────────────────────────────────────────────

describe('SWEDISH_DAYS', () => {
  it('exports an array of 7 Swedish day names', () => {
    expect(SWEDISH_DAYS).toHaveLength(7);
  });

  it('starts with Måndag and ends with Söndag', () => {
    expect(SWEDISH_DAYS[0]).toBe('Måndag');
    expect(SWEDISH_DAYS[6]).toBe('Söndag');
  });

  it('contains all weekday names in order', () => {
    expect(SWEDISH_DAYS).toEqual([
      'Måndag',
      'Tisdag',
      'Onsdag',
      'Torsdag',
      'Fredag',
      'Lördag',
      'Söndag',
    ]);
  });

  it('is a readonly tuple', () => {
    // Verify it's an array (readonly tuples are arrays at runtime)
    expect(Array.isArray(SWEDISH_DAYS)).toBe(true);
  });
});

// ─── DAY_TO_DATE ──────────────────────────────────────────────────

describe('DAY_TO_DATE', () => {
  it('exports a record with 7 entries', () => {
    expect(Object.keys(DAY_TO_DATE)).toHaveLength(7);
  });

  it('maps each Swedish day name to a valid ISO date string', () => {
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    for (const date of Object.values(DAY_TO_DATE)) {
      expect(date).toMatch(isoDatePattern);
    }
  });

  it('maps Måndag to 2026-06-22', () => {
    expect(DAY_TO_DATE['Måndag']).toBe('2026-06-22');
  });

  it('maps Söndag to 2026-06-28', () => {
    expect(DAY_TO_DATE['Söndag']).toBe('2026-06-28');
  });

  it('has keys matching SWEDISH_DAYS', () => {
    const keys = Object.keys(DAY_TO_DATE);
    for (const day of SWEDISH_DAYS) {
      expect(keys).toContain(day);
    }
  });

  it('maps consecutive dates for the week', () => {
    const expectedDates: Record<string, string> = {
      Måndag: '2026-06-22',
      Tisdag: '2026-06-23',
      Onsdag: '2026-06-24',
      Torsdag: '2026-06-25',
      Fredag: '2026-06-26',
      Lördag: '2026-06-27',
      Söndag: '2026-06-28',
    };

    for (const [day, date] of Object.entries(expectedDates)) {
      expect(DAY_TO_DATE[day]).toBe(date);
    }
  });
});
