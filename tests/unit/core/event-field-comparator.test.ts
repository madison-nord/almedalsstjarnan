import { describe, it, expect } from 'vitest';

import type { MutableFields } from '#core/event-field-comparator';
import { normalizeFieldValue, compareEventFields } from '#core/event-field-comparator';

// ─── Helpers ──────────────────────────────────────────────────────

const baseFields: MutableFields = {
  title: 'Test Event',
  organiser: 'Test Org',
  startDateTime: '2026-06-28T10:00:00+02:00',
  endDateTime: '2026-06-28T11:00:00+02:00',
  location: 'Visby',
  description: 'A test event',
  topic: 'Demokrati',
  sourceUrl: 'https://example.com/event/1',
  icsDataUri: null,
};

// ─── normalizeFieldValue ──────────────────────────────────────────

describe('normalizeFieldValue', () => {
  it('returns null for null input', () => {
    expect(normalizeFieldValue(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizeFieldValue('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(normalizeFieldValue('  ')).toBeNull();
  });

  it('returns null for tabs and newlines only', () => {
    expect(normalizeFieldValue('\t\n\r')).toBeNull();
  });

  it('trims leading/trailing whitespace', () => {
    expect(normalizeFieldValue(' hello ')).toBe('hello');
  });

  it('trims multiple spaces and tabs', () => {
    expect(normalizeFieldValue('\t  hello world  \t')).toBe('hello world');
  });

  it('preserves non-whitespace content', () => {
    expect(normalizeFieldValue('hello')).toBe('hello');
  });

  it('preserves internal whitespace', () => {
    expect(normalizeFieldValue('hello  world')).toBe('hello  world');
  });
});

// ─── compareEventFields ───────────────────────────────────────────

describe('compareEventFields', () => {
  it('returns no changes for identical objects', () => {
    const result = compareEventFields(baseFields, { ...baseFields });

    expect(result.hasChanges).toBe(false);
    expect(result.changedFields).toEqual([]);
  });

  it('returns no changes when only whitespace differs', () => {
    const stored: MutableFields = {
      ...baseFields,
      title: '  Test Event  ',
      location: ' Visby ',
    };

    const result = compareEventFields(baseFields, stored);

    expect(result.hasChanges).toBe(false);
    expect(result.changedFields).toEqual([]);
  });

  it('treats null and empty string as equal after normalization', () => {
    const fresh: MutableFields = { ...baseFields, organiser: null };
    const stored: MutableFields = { ...baseFields, organiser: '' };

    const result = compareEventFields(fresh, stored);

    expect(result.hasChanges).toBe(false);
    expect(result.changedFields).toEqual([]);
  });

  it('treats null and whitespace-only as equal after normalization', () => {
    const fresh: MutableFields = { ...baseFields, description: null };
    const stored: MutableFields = { ...baseFields, description: '   ' };

    const result = compareEventFields(fresh, stored);

    expect(result.hasChanges).toBe(false);
    expect(result.changedFields).toEqual([]);
  });

  it('detects single field difference', () => {
    const fresh: MutableFields = { ...baseFields, title: 'Updated Event' };

    const result = compareEventFields(fresh, baseFields);

    expect(result.hasChanges).toBe(true);
    expect(result.changedFields).toEqual(['title']);
  });

  it('detects multiple field differences', () => {
    const fresh: MutableFields = {
      ...baseFields,
      title: 'Updated Event',
      location: 'Stockholm',
      topic: 'Ekonomi',
    };

    const result = compareEventFields(fresh, baseFields);

    expect(result.hasChanges).toBe(true);
    expect(result.changedFields).toContain('title');
    expect(result.changedFields).toContain('location');
    expect(result.changedFields).toContain('topic');
    expect(result.changedFields).toHaveLength(3);
  });

  it('detects all fields different', () => {
    const fresh: MutableFields = {
      title: 'New Title',
      organiser: 'New Org',
      startDateTime: '2026-07-01T09:00:00+02:00',
      endDateTime: '2026-07-01T10:00:00+02:00',
      location: 'Stockholm',
      description: 'New description',
      topic: 'Ekonomi',
      sourceUrl: 'https://example.com/event/2',
      icsDataUri: 'data:text/calendar;base64,abc',
    };

    const result = compareEventFields(fresh, baseFields);

    expect(result.hasChanges).toBe(true);
    expect(result.changedFields).toHaveLength(9);
  });

  it('handles all-null fields with no changes', () => {
    const allNull: MutableFields = {
      title: null as unknown as string,
      organiser: null,
      startDateTime: null as unknown as string,
      endDateTime: null,
      location: null,
      description: null,
      topic: null,
      sourceUrl: null,
      icsDataUri: null,
    };

    const result = compareEventFields(allNull, { ...allNull });

    expect(result.hasChanges).toBe(false);
    expect(result.changedFields).toEqual([]);
  });

  it('handles mixed null/non-null fields detecting differences', () => {
    const fresh: MutableFields = { ...baseFields, organiser: null, location: null };
    const stored: MutableFields = { ...baseFields, organiser: 'Some Org', location: 'Gotland' };

    const result = compareEventFields(fresh, stored);

    expect(result.hasChanges).toBe(true);
    expect(result.changedFields).toContain('organiser');
    expect(result.changedFields).toContain('location');
    expect(result.changedFields).toHaveLength(2);
  });

  it('detects change from null to non-null', () => {
    const fresh: MutableFields = { ...baseFields, icsDataUri: 'data:text/calendar;base64,xyz' };
    const stored: MutableFields = { ...baseFields, icsDataUri: null };

    const result = compareEventFields(fresh, stored);

    expect(result.hasChanges).toBe(true);
    expect(result.changedFields).toEqual(['icsDataUri']);
  });

  it('detects change from non-null to null', () => {
    const fresh: MutableFields = { ...baseFields, organiser: null };
    const stored: MutableFields = { ...baseFields, organiser: 'Test Org' };

    const result = compareEventFields(fresh, stored);

    expect(result.hasChanges).toBe(true);
    expect(result.changedFields).toEqual(['organiser']);
  });
});
