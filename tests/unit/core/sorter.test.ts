import { describe, it, expect } from 'vitest';

import type { StarredEvent } from '#core/types';

import { sortEvents } from '#core/sorter';

// ─── Helpers ──────────────────────────────────────────────────────

function makeEvent(overrides: Partial<StarredEvent> & { id: string }): StarredEvent {
  return {
    id: overrides.id,
    title: overrides.title ?? 'Default Title',
    organiser: overrides.organiser ?? null,
    startDateTime: overrides.startDateTime ?? '2026-06-28T10:00:00+02:00',
    endDateTime: overrides.endDateTime ?? null,
    location: overrides.location ?? null,
    description: overrides.description ?? null,
    topic: overrides.topic ?? null,
    sourceUrl: overrides.sourceUrl ?? null,
    icsDataUri: overrides.icsDataUri ?? null,
    starred: true,
    starredAt: overrides.starredAt ?? '2026-06-15T14:30:00.000Z',
  };
}

// ─── Chronological sort ───────────────────────────────────────────

describe('sortEvents', () => {
  describe('chronological', () => {
    it('sorts events by startDateTime ascending', () => {
      const events: readonly StarredEvent[] = [
        makeEvent({ id: 'c', startDateTime: '2026-06-30T10:00:00+02:00' }),
        makeEvent({ id: 'a', startDateTime: '2026-06-28T10:00:00+02:00' }),
        makeEvent({ id: 'b', startDateTime: '2026-06-29T10:00:00+02:00' }),
      ];

      const result = sortEvents(events, 'chronological');

      expect(result.map((e) => e.id)).toEqual(['a', 'b', 'c']);
    });

    it('uses id ascending as tiebreaker when startDateTime is equal', () => {
      const events: readonly StarredEvent[] = [
        makeEvent({ id: 'z', startDateTime: '2026-06-28T10:00:00+02:00' }),
        makeEvent({ id: 'a', startDateTime: '2026-06-28T10:00:00+02:00' }),
        makeEvent({ id: 'm', startDateTime: '2026-06-28T10:00:00+02:00' }),
      ];

      const result = sortEvents(events, 'chronological');

      expect(result.map((e) => e.id)).toEqual(['a', 'm', 'z']);
    });
  });

  // ─── Reverse-chronological sort ─────────────────────────────────

  describe('reverse-chronological', () => {
    it('sorts events by startDateTime descending', () => {
      const events: readonly StarredEvent[] = [
        makeEvent({ id: 'a', startDateTime: '2026-06-28T10:00:00+02:00' }),
        makeEvent({ id: 'c', startDateTime: '2026-06-30T10:00:00+02:00' }),
        makeEvent({ id: 'b', startDateTime: '2026-06-29T10:00:00+02:00' }),
      ];

      const result = sortEvents(events, 'reverse-chronological');

      expect(result.map((e) => e.id)).toEqual(['c', 'b', 'a']);
    });

    it('uses id ascending as tiebreaker when startDateTime is equal', () => {
      const events: readonly StarredEvent[] = [
        makeEvent({ id: 'z', startDateTime: '2026-06-28T10:00:00+02:00' }),
        makeEvent({ id: 'a', startDateTime: '2026-06-28T10:00:00+02:00' }),
        makeEvent({ id: 'm', startDateTime: '2026-06-28T10:00:00+02:00' }),
      ];

      const result = sortEvents(events, 'reverse-chronological');

      expect(result.map((e) => e.id)).toEqual(['a', 'm', 'z']);
    });
  });

  // ─── Alphabetical-by-title sort ─────────────────────────────────

  describe('alphabetical-by-title', () => {
    it('sorts events by title ascending using locale-aware comparison', () => {
      const events: readonly StarredEvent[] = [
        makeEvent({ id: '1', title: 'Demokrati i förändring' }),
        makeEvent({ id: '2', title: 'Almedalen öppnar' }),
        makeEvent({ id: '3', title: 'Framtidens sjukvård' }),
      ];

      const result = sortEvents(events, 'alphabetical-by-title');

      expect(result.map((e) => e.title)).toEqual([
        'Almedalen öppnar',
        'Demokrati i förändring',
        'Framtidens sjukvård',
      ]);
    });

    it('uses id ascending as tiebreaker when titles are equal', () => {
      const events: readonly StarredEvent[] = [
        makeEvent({ id: 'z', title: 'Same Title' }),
        makeEvent({ id: 'a', title: 'Same Title' }),
        makeEvent({ id: 'm', title: 'Same Title' }),
      ];

      const result = sortEvents(events, 'alphabetical-by-title');

      expect(result.map((e) => e.id)).toEqual(['a', 'm', 'z']);
    });

    it('handles Swedish characters correctly', () => {
      const events: readonly StarredEvent[] = [
        makeEvent({ id: '1', title: 'Öppning' }),
        makeEvent({ id: '2', title: 'Ärende' }),
        makeEvent({ id: '3', title: 'Avslutning' }),
      ];

      const result = sortEvents(events, 'alphabetical-by-title');

      // In Swedish locale, Ä and Ö come after Z
      expect(result.map((e) => e.title)).toEqual([
        'Avslutning',
        'Ärende',
        'Öppning',
      ]);
    });
  });

  // ─── Starred-desc sort ──────────────────────────────────────────

  describe('starred-desc', () => {
    it('sorts events by starredAt descending (most recently starred first)', () => {
      const events: readonly StarredEvent[] = [
        makeEvent({ id: '1', starredAt: '2026-06-15T10:00:00.000Z' }),
        makeEvent({ id: '2', starredAt: '2026-06-17T10:00:00.000Z' }),
        makeEvent({ id: '3', starredAt: '2026-06-16T10:00:00.000Z' }),
      ];

      const result = sortEvents(events, 'starred-desc');

      expect(result.map((e) => e.id)).toEqual(['2', '3', '1']);
    });

    it('uses startDateTime ascending as tiebreaker when starredAt is equal', () => {
      const events: readonly StarredEvent[] = [
        makeEvent({
          id: '1',
          starredAt: '2026-06-15T10:00:00.000Z',
          startDateTime: '2026-06-30T10:00:00+02:00',
        }),
        makeEvent({
          id: '2',
          starredAt: '2026-06-15T10:00:00.000Z',
          startDateTime: '2026-06-28T10:00:00+02:00',
        }),
        makeEvent({
          id: '3',
          starredAt: '2026-06-15T10:00:00.000Z',
          startDateTime: '2026-06-29T10:00:00+02:00',
        }),
      ];

      const result = sortEvents(events, 'starred-desc');

      expect(result.map((e) => e.id)).toEqual(['2', '3', '1']);
    });
  });

  // ─── Non-mutation ───────────────────────────────────────────────

  describe('non-mutation', () => {
    it('does not mutate the input array', () => {
      const events: readonly StarredEvent[] = [
        makeEvent({ id: 'c', startDateTime: '2026-06-30T10:00:00+02:00' }),
        makeEvent({ id: 'a', startDateTime: '2026-06-28T10:00:00+02:00' }),
        makeEvent({ id: 'b', startDateTime: '2026-06-29T10:00:00+02:00' }),
      ];

      const originalIds = events.map((e) => e.id);
      sortEvents(events, 'chronological');

      expect(events.map((e) => e.id)).toEqual(originalIds);
    });

    it('returns a new array instance', () => {
      const events: readonly StarredEvent[] = [
        makeEvent({ id: 'a' }),
        makeEvent({ id: 'b' }),
      ];

      const result = sortEvents(events, 'chronological');

      expect(result).not.toBe(events);
    });
  });

  // ─── Empty array ────────────────────────────────────────────────

  describe('empty array', () => {
    it('returns an empty array for chronological', () => {
      expect(sortEvents([], 'chronological')).toEqual([]);
    });

    it('returns an empty array for reverse-chronological', () => {
      expect(sortEvents([], 'reverse-chronological')).toEqual([]);
    });

    it('returns an empty array for alphabetical-by-title', () => {
      expect(sortEvents([], 'alphabetical-by-title')).toEqual([]);
    });

    it('returns an empty array for starred-desc', () => {
      expect(sortEvents([], 'starred-desc')).toEqual([]);
    });
  });

  // ─── Single-element array ──────────────────────────────────────

  describe('single-element array', () => {
    it('returns a single-element array unchanged for chronological', () => {
      const events: readonly StarredEvent[] = [makeEvent({ id: 'only' })];
      const result = sortEvents(events, 'chronological');

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('only');
    });

    it('returns a single-element array unchanged for reverse-chronological', () => {
      const events: readonly StarredEvent[] = [makeEvent({ id: 'only' })];
      const result = sortEvents(events, 'reverse-chronological');

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('only');
    });

    it('returns a single-element array unchanged for alphabetical-by-title', () => {
      const events: readonly StarredEvent[] = [makeEvent({ id: 'only' })];
      const result = sortEvents(events, 'alphabetical-by-title');

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('only');
    });

    it('returns a single-element array unchanged for starred-desc', () => {
      const events: readonly StarredEvent[] = [makeEvent({ id: 'only' })];
      const result = sortEvents(events, 'starred-desc');

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('only');
    });

    it('returns a new array instance even for single element', () => {
      const events: readonly StarredEvent[] = [makeEvent({ id: 'only' })];
      const result = sortEvents(events, 'chronological');

      expect(result).not.toBe(events);
    });
  });

  // ─── Tiebreaker consistency ─────────────────────────────────────

  describe('tiebreaker consistency', () => {
    it('chronological: id ascending as final tiebreaker', () => {
      const events: readonly StarredEvent[] = [
        makeEvent({ id: 'beta', startDateTime: '2026-06-28T10:00:00+02:00' }),
        makeEvent({ id: 'alpha', startDateTime: '2026-06-28T10:00:00+02:00' }),
        makeEvent({ id: 'gamma', startDateTime: '2026-06-28T10:00:00+02:00' }),
      ];

      const result = sortEvents(events, 'chronological');

      expect(result.map((e) => e.id)).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('reverse-chronological: id ascending as final tiebreaker', () => {
      const events: readonly StarredEvent[] = [
        makeEvent({ id: 'beta', startDateTime: '2026-06-28T10:00:00+02:00' }),
        makeEvent({ id: 'alpha', startDateTime: '2026-06-28T10:00:00+02:00' }),
        makeEvent({ id: 'gamma', startDateTime: '2026-06-28T10:00:00+02:00' }),
      ];

      const result = sortEvents(events, 'reverse-chronological');

      expect(result.map((e) => e.id)).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('alphabetical-by-title: id ascending as final tiebreaker', () => {
      const events: readonly StarredEvent[] = [
        makeEvent({ id: 'beta', title: 'Same Title' }),
        makeEvent({ id: 'alpha', title: 'Same Title' }),
        makeEvent({ id: 'gamma', title: 'Same Title' }),
      ];

      const result = sortEvents(events, 'alphabetical-by-title');

      expect(result.map((e) => e.id)).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('starred-desc: startDateTime ascending as tiebreaker', () => {
      const events: readonly StarredEvent[] = [
        makeEvent({
          id: '1',
          starredAt: '2026-06-15T10:00:00.000Z',
          startDateTime: '2026-06-30T10:00:00+02:00',
        }),
        makeEvent({
          id: '2',
          starredAt: '2026-06-15T10:00:00.000Z',
          startDateTime: '2026-06-28T10:00:00+02:00',
        }),
        makeEvent({
          id: '3',
          starredAt: '2026-06-15T10:00:00.000Z',
          startDateTime: '2026-06-29T10:00:00+02:00',
        }),
      ];

      const result = sortEvents(events, 'starred-desc');

      expect(result.map((e) => e.id)).toEqual(['2', '3', '1']);
    });
  });
});
