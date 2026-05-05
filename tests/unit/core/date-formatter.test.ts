import { describe, it, expect } from 'vitest';

import { formatEventDateTime } from '#core/date-formatter';
import type { DateFormatterLocale } from '#core/date-formatter';

// ─── Swedish Format ───────────────────────────────────────────────

describe('formatEventDateTime — Swedish locale', () => {
  const locale: DateFormatterLocale = 'sv';

  it('formats a Monday event with same-day time range', () => {
    const result = formatEventDateTime(
      '2026-06-22T07:30:00+02:00',
      '2026-06-22T08:30:00+02:00',
      locale,
    );
    expect(result).toBe('Mån 22 juni 07:30\u201308:30');
  });

  it('formats a Wednesday event with same-day time range', () => {
    const result = formatEventDateTime(
      '2026-06-24T14:00:00+02:00',
      '2026-06-24T15:30:00+02:00',
      locale,
    );
    expect(result).toBe('Ons 24 juni 14:00\u201315:30');
  });

  it('formats a Saturday event with same-day time range', () => {
    const result = formatEventDateTime(
      '2026-06-27T09:00:00+02:00',
      '2026-06-27T10:00:00+02:00',
      locale,
    );
    expect(result).toBe('Lör 27 juni 09:00\u201310:00');
  });

  it('uses full Swedish month names', () => {
    const result = formatEventDateTime(
      '2026-01-15T10:00:00+02:00',
      '2026-01-15T11:00:00+02:00',
      locale,
    );
    expect(result).toBe('Tor 15 januari 10:00\u201311:00');
  });

  it('formats December correctly', () => {
    const result = formatEventDateTime(
      '2026-12-25T18:00:00+02:00',
      '2026-12-25T20:00:00+02:00',
      locale,
    );
    expect(result).toBe('Fre 25 december 18:00\u201320:00');
  });
});

// ─── English Format ───────────────────────────────────────────────

describe('formatEventDateTime — English locale', () => {
  const locale: DateFormatterLocale = 'en';

  it('formats a Monday event with same-day time range', () => {
    const result = formatEventDateTime(
      '2026-06-22T07:30:00+02:00',
      '2026-06-22T08:30:00+02:00',
      locale,
    );
    expect(result).toBe('Mon 22 Jun 07:30\u201308:30');
  });

  it('formats a Wednesday event with same-day time range', () => {
    const result = formatEventDateTime(
      '2026-06-24T14:00:00+02:00',
      '2026-06-24T15:30:00+02:00',
      locale,
    );
    expect(result).toBe('Wed 24 Jun 14:00\u201315:30');
  });

  it('formats a Saturday event with same-day time range', () => {
    const result = formatEventDateTime(
      '2026-06-27T09:00:00+02:00',
      '2026-06-27T10:00:00+02:00',
      locale,
    );
    expect(result).toBe('Sat 27 Jun 09:00\u201310:00');
  });

  it('uses abbreviated English month names', () => {
    const result = formatEventDateTime(
      '2026-01-15T10:00:00+02:00',
      '2026-01-15T11:00:00+02:00',
      locale,
    );
    expect(result).toBe('Thu 15 Jan 10:00\u201311:00');
  });

  it('formats December correctly', () => {
    const result = formatEventDateTime(
      '2026-12-25T18:00:00+02:00',
      '2026-12-25T20:00:00+02:00',
      locale,
    );
    expect(result).toBe('Fri 25 Dec 18:00\u201320:00');
  });
});

// ─── Null endDateTime ─────────────────────────────────────────────

describe('formatEventDateTime — null endDateTime', () => {
  it('shows only start time when endDateTime is null (Swedish)', () => {
    const result = formatEventDateTime(
      '2026-06-22T07:30:00+02:00',
      null,
      'sv',
    );
    expect(result).toBe('Mån 22 juni 07:30');
  });

  it('shows only start time when endDateTime is null (English)', () => {
    const result = formatEventDateTime(
      '2026-06-22T07:30:00+02:00',
      null,
      'en',
    );
    expect(result).toBe('Mon 22 Jun 07:30');
  });

  it('does not contain an en-dash when endDateTime is null', () => {
    const result = formatEventDateTime(
      '2026-06-24T14:00:00+02:00',
      null,
      'sv',
    );
    expect(result).not.toContain('\u2013');
  });
});

// ─── Same-day range ───────────────────────────────────────────────

describe('formatEventDateTime — same-day range', () => {
  it('shows time range with en-dash for same-day events', () => {
    const result = formatEventDateTime(
      '2026-06-22T07:30:00+02:00',
      '2026-06-22T08:30:00+02:00',
      'sv',
    );
    expect(result).toContain('\u2013');
    expect(result).toBe('Mån 22 juni 07:30\u201308:30');
  });

  it('handles midnight-spanning same-day range', () => {
    const result = formatEventDateTime(
      '2026-06-22T00:00:00+02:00',
      '2026-06-22T23:59:00+02:00',
      'en',
    );
    expect(result).toBe('Mon 22 Jun 00:00\u201323:59');
  });
});

// ─── Cross-day edge case ──────────────────────────────────────────

describe('formatEventDateTime — cross-day endDateTime', () => {
  it('shows only start time when endDateTime is on a different day', () => {
    const result = formatEventDateTime(
      '2026-06-22T22:00:00+02:00',
      '2026-06-23T01:00:00+02:00',
      'sv',
    );
    expect(result).toBe('Mån 22 juni 22:00');
  });

  it('does not contain an en-dash for cross-day events (English)', () => {
    const result = formatEventDateTime(
      '2026-06-22T22:00:00+02:00',
      '2026-06-23T01:00:00+02:00',
      'en',
    );
    expect(result).not.toContain('\u2013');
    expect(result).toBe('Mon 22 Jun 22:00');
  });
});

// ─── Invalid input fallback ───────────────────────────────────────

describe('formatEventDateTime — invalid input fallback', () => {
  it('returns raw string for invalid startDateTime', () => {
    const result = formatEventDateTime('not-a-date', null, 'sv');
    expect(result).toBe('not-a-date');
  });

  it('returns raw string for empty startDateTime', () => {
    const result = formatEventDateTime('', null, 'en');
    expect(result).toBe('');
  });
});
