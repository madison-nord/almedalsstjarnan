/**
 * Unit tests for badge update logic in the background service worker.
 *
 * Tests that the badge text is updated correctly when starred events change,
 * and that the badge is cleared when there are zero starred events.
 *
 * Validates: Requirements 7.4, 7.5, 7.6
 */

import { describe, it, expect } from 'vitest';

import type { StarredEvent, EventId } from '#core/types';

import { computeBadgeText, handleStorageChange } from '#extension/background';

// ─── Test Fixtures ────────────────────────────────────────────────

const sampleStarredEvent: StarredEvent = {
  id: 'evt-001',
  title: 'Demokrati i förändring',
  organiser: 'Sveriges Riksdag',
  startDateTime: '2026-06-28T10:00:00+02:00',
  endDateTime: '2026-06-28T11:30:00+02:00',
  location: 'Donners plats, Visby',
  description: 'Panelsamtal om demokratins framtid',
  topic: 'Demokrati',
  sourceUrl: 'https://almedalsveckan.info/event/evt-001',
  icsDataUri: null,
  starred: true,
  starredAt: '2026-06-15T14:30:00.000Z',
};

// ─── computeBadgeText ─────────────────────────────────────────────

describe('computeBadgeText', () => {
  it('returns empty string for empty record', () => {
    expect(computeBadgeText({})).toBe('');
  });

  it('returns "1" for a single starred event', () => {
    const record: Record<EventId, StarredEvent> = {
      'evt-001': sampleStarredEvent,
    };
    expect(computeBadgeText(record)).toBe('1');
  });

  it('returns correct count string for multiple events', () => {
    const record: Record<EventId, StarredEvent> = {
      'evt-001': sampleStarredEvent,
      'evt-002': { ...sampleStarredEvent, id: 'evt-002', title: 'Event 2' },
      'evt-003': { ...sampleStarredEvent, id: 'evt-003', title: 'Event 3' },
    };
    expect(computeBadgeText(record)).toBe('3');
  });
});

// ─── handleStorageChange ──────────────────────────────────────────

describe('handleStorageChange', () => {
  it('returns badge text and color when starredEvents changes in local area', () => {
    const changes = {
      starredEvents: {
        newValue: {
          'evt-001': sampleStarredEvent,
          'evt-002': { ...sampleStarredEvent, id: 'evt-002' },
        },
      },
    };

    const result = handleStorageChange(changes, 'local');

    expect(result).not.toBeNull();
    expect(result!.text).toBe('2');
    expect(result!.color).toBe('#f59e0b');
  });

  it('returns empty badge text when starredEvents becomes empty', () => {
    const changes = {
      starredEvents: {
        newValue: {},
      },
    };

    const result = handleStorageChange(changes, 'local');

    expect(result).not.toBeNull();
    expect(result!.text).toBe('');
    expect(result!.color).toBe('#f59e0b');
  });

  it('returns empty badge text when starredEvents newValue is undefined', () => {
    const changes = {
      starredEvents: {
        newValue: undefined,
      },
    };

    const result = handleStorageChange(changes, 'local');

    expect(result).not.toBeNull();
    expect(result!.text).toBe('');
    expect(result!.color).toBe('#f59e0b');
  });

  it('returns null when areaName is not local', () => {
    const changes = {
      starredEvents: {
        newValue: { 'evt-001': sampleStarredEvent },
      },
    };

    const result = handleStorageChange(changes, 'sync');

    expect(result).toBeNull();
  });

  it('returns null when starredEvents is not in changes', () => {
    const changes = {
      sortOrder: {
        newValue: 'alphabetical-by-title',
      },
    };

    const result = handleStorageChange(changes, 'local');

    expect(result).toBeNull();
  });

  it('handles transition from multiple events to zero events (badge cleared)', () => {
    const changes = {
      starredEvents: {
        oldValue: {
          'evt-001': sampleStarredEvent,
          'evt-002': { ...sampleStarredEvent, id: 'evt-002' },
        },
        newValue: {},
      },
    };

    const result = handleStorageChange(changes, 'local');

    expect(result).not.toBeNull();
    expect(result!.text).toBe('');
  });

  it('handles transition from zero to multiple events', () => {
    const changes = {
      starredEvents: {
        oldValue: {},
        newValue: {
          'evt-001': sampleStarredEvent,
          'evt-002': { ...sampleStarredEvent, id: 'evt-002' },
          'evt-003': { ...sampleStarredEvent, id: 'evt-003' },
        },
      },
    };

    const result = handleStorageChange(changes, 'local');

    expect(result).not.toBeNull();
    expect(result!.text).toBe('3');
  });
});
