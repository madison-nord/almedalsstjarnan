import { describe, it, expect } from 'vitest';

import type { StarredEvent } from '#core/types';

import {
  validateStarredEvents,
  isValidStarredEntry,
} from '#core/storage-validator';

// ─── Helpers ──────────────────────────────────────────────────────

function makeValidEntry(id: string): StarredEvent {
  return {
    id,
    title: 'Demokrati i förändring',
    organiser: 'Riksdagen',
    startDateTime: '2026-06-28T10:00:00+02:00',
    endDateTime: '2026-06-28T11:00:00+02:00',
    location: 'Visby',
    description: 'Ett seminarium om demokrati',
    topic: 'Politik',
    sourceUrl: 'https://almedalsveckan.info/event/123',
    icsDataUri: null,
    starred: true,
    starredAt: '2026-06-15T14:30:00.000Z',
  };
}

// ─── isValidStarredEntry ──────────────────────────────────────────

describe('isValidStarredEntry', () => {
  it('returns true for a valid StarredEvent entry', () => {
    const entry = makeValidEntry('evt-1');
    expect(isValidStarredEntry('evt-1', entry)).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidStarredEntry('key', null)).toBe(false);
  });

  it('returns false for an array', () => {
    expect(isValidStarredEntry('key', [1, 2, 3])).toBe(false);
  });

  it('returns false for a string', () => {
    expect(isValidStarredEntry('key', 'hello')).toBe(false);
  });

  it('returns false for a number', () => {
    expect(isValidStarredEntry('key', 42)).toBe(false);
  });

  it('returns false for a boolean', () => {
    expect(isValidStarredEntry('key', true)).toBe(false);
  });

  it('returns false when id is missing', () => {
    const entry = { ...makeValidEntry('evt-1'), id: undefined };
    expect(isValidStarredEntry('evt-1', entry)).toBe(false);
  });

  it('returns false when id is empty string', () => {
    const entry = { ...makeValidEntry(''), id: '' };
    expect(isValidStarredEntry('', entry)).toBe(false);
  });

  it('returns false when id does not match key', () => {
    const entry = makeValidEntry('evt-1');
    expect(isValidStarredEntry('different-key', entry)).toBe(false);
  });

  it('returns false when title is missing', () => {
    const { title: _, ...rest } = makeValidEntry('evt-1');
    expect(isValidStarredEntry('evt-1', rest)).toBe(false);
  });

  it('returns false when title is empty string', () => {
    const entry = { ...makeValidEntry('evt-1'), title: '' };
    expect(isValidStarredEntry('evt-1', entry)).toBe(false);
  });

  it('returns false when title is not a string', () => {
    const entry = { ...makeValidEntry('evt-1'), title: 123 };
    expect(isValidStarredEntry('evt-1', entry)).toBe(false);
  });

  it('returns false when startDateTime is missing', () => {
    const { startDateTime: _, ...rest } = makeValidEntry('evt-1');
    expect(isValidStarredEntry('evt-1', rest)).toBe(false);
  });

  it('returns false when startDateTime is empty string', () => {
    const entry = { ...makeValidEntry('evt-1'), startDateTime: '' };
    expect(isValidStarredEntry('evt-1', entry)).toBe(false);
  });

  it('returns false when starred is false', () => {
    const entry = { ...makeValidEntry('evt-1'), starred: false };
    expect(isValidStarredEntry('evt-1', entry)).toBe(false);
  });

  it('returns false when starred is not a boolean', () => {
    const entry = { ...makeValidEntry('evt-1'), starred: 'yes' };
    expect(isValidStarredEntry('evt-1', entry)).toBe(false);
  });

  it('returns false when starredAt is missing', () => {
    const { starredAt: _, ...rest } = makeValidEntry('evt-1');
    expect(isValidStarredEntry('evt-1', rest)).toBe(false);
  });

  it('returns false when starredAt is empty string', () => {
    const entry = { ...makeValidEntry('evt-1'), starredAt: '' };
    expect(isValidStarredEntry('evt-1', entry)).toBe(false);
  });
});

// ─── validateStarredEvents ────────────────────────────────────────

describe('validateStarredEvents', () => {
  describe('non-object values return empty valid record', () => {
    it('returns empty result for null', () => {
      const result = validateStarredEvents(null);
      expect(result).toEqual({ valid: {}, invalidKeys: [] });
    });

    it('returns empty result for an array', () => {
      const result = validateStarredEvents([1, 2, 3]);
      expect(result).toEqual({ valid: {}, invalidKeys: [] });
    });

    it('returns empty result for a string', () => {
      const result = validateStarredEvents('hello');
      expect(result).toEqual({ valid: {}, invalidKeys: [] });
    });

    it('returns empty result for a number', () => {
      const result = validateStarredEvents(42);
      expect(result).toEqual({ valid: {}, invalidKeys: [] });
    });

    it('returns empty result for a boolean', () => {
      const result = validateStarredEvents(true);
      expect(result).toEqual({ valid: {}, invalidKeys: [] });
    });

    it('returns empty result for undefined', () => {
      const result = validateStarredEvents(undefined);
      expect(result).toEqual({ valid: {}, invalidKeys: [] });
    });
  });

  describe('valid entries are preserved unchanged', () => {
    it('preserves a single valid entry', () => {
      const entry = makeValidEntry('evt-1');
      const raw = { 'evt-1': entry };

      const result = validateStarredEvents(raw);

      expect(result.valid).toEqual({ 'evt-1': entry });
      expect(result.invalidKeys).toEqual([]);
    });

    it('preserves multiple valid entries', () => {
      const entry1 = makeValidEntry('evt-1');
      const entry2 = makeValidEntry('evt-2');
      const raw = { 'evt-1': entry1, 'evt-2': entry2 };

      const result = validateStarredEvents(raw);

      expect(result.valid).toEqual({ 'evt-1': entry1, 'evt-2': entry2 });
      expect(result.invalidKeys).toEqual([]);
    });

    it('preserves valid entry with minimal optional fields (nulls)', () => {
      const entry: StarredEvent = {
        id: 'minimal',
        title: 'Minimal Event',
        organiser: null,
        startDateTime: '2026-06-28T10:00:00+02:00',
        endDateTime: null,
        location: null,
        description: null,
        topic: null,
        sourceUrl: null,
        icsDataUri: null,
        starred: true,
        starredAt: '2026-06-15T14:30:00.000Z',
      };
      const raw = { minimal: entry };

      const result = validateStarredEvents(raw);

      expect(result.valid).toEqual({ minimal: entry });
      expect(result.invalidKeys).toEqual([]);
    });
  });

  describe('entries with missing/wrong fields are excluded', () => {
    it('excludes entry with missing title', () => {
      const { title: _, ...broken } = makeValidEntry('evt-1');
      const raw = { 'evt-1': broken };

      const result = validateStarredEvents(raw);

      expect(result.valid).toEqual({});
      expect(result.invalidKeys).toEqual(['evt-1']);
    });

    it('excludes entry with starred set to false', () => {
      const broken = { ...makeValidEntry('evt-1'), starred: false };
      const raw = { 'evt-1': broken };

      const result = validateStarredEvents(raw);

      expect(result.valid).toEqual({});
      expect(result.invalidKeys).toEqual(['evt-1']);
    });

    it('excludes entry with empty startDateTime', () => {
      const broken = { ...makeValidEntry('evt-1'), startDateTime: '' };
      const raw = { 'evt-1': broken };

      const result = validateStarredEvents(raw);

      expect(result.valid).toEqual({});
      expect(result.invalidKeys).toEqual(['evt-1']);
    });

    it('excludes entry with null value', () => {
      const raw = { 'evt-1': null };

      const result = validateStarredEvents(raw);

      expect(result.valid).toEqual({});
      expect(result.invalidKeys).toEqual(['evt-1']);
    });
  });

  describe('id/key mismatch is excluded', () => {
    it('excludes entry when id does not match its object key', () => {
      const entry = makeValidEntry('actual-id');
      const raw = { 'wrong-key': entry };

      const result = validateStarredEvents(raw);

      expect(result.valid).toEqual({});
      expect(result.invalidKeys).toEqual(['wrong-key']);
    });

    it('preserves entry when id matches its object key', () => {
      const entry = makeValidEntry('matching-key');
      const raw = { 'matching-key': entry };

      const result = validateStarredEvents(raw);

      expect(result.valid).toEqual({ 'matching-key': entry });
      expect(result.invalidKeys).toEqual([]);
    });
  });

  describe('invalidKeys lists rejected keys', () => {
    it('lists all rejected keys from a mixed record', () => {
      const valid = makeValidEntry('good-1');
      const raw = {
        'good-1': valid,
        'bad-1': { id: 'bad-1', title: '' },
        'bad-2': null,
        'bad-3': { id: 'wrong-id', title: 'X', startDateTime: 'x', starred: true, starredAt: 'x' },
      };

      const result = validateStarredEvents(raw);

      expect(result.valid).toEqual({ 'good-1': valid });
      expect(result.invalidKeys).toHaveLength(3);
      expect(result.invalidKeys).toContain('bad-1');
      expect(result.invalidKeys).toContain('bad-2');
      expect(result.invalidKeys).toContain('bad-3');
    });

    it('returns empty invalidKeys when all entries are valid', () => {
      const raw = {
        'evt-1': makeValidEntry('evt-1'),
        'evt-2': makeValidEntry('evt-2'),
      };

      const result = validateStarredEvents(raw);

      expect(result.invalidKeys).toEqual([]);
    });

    it('returns empty invalidKeys for an empty object', () => {
      const result = validateStarredEvents({});

      expect(result.valid).toEqual({});
      expect(result.invalidKeys).toEqual([]);
    });
  });
});
