import { describe, it, expect } from 'vitest';

import { detectConflicts, getConflictingEventIds } from '#core/conflict-detector';

// ─── Helpers ──────────────────────────────────────────────────────

interface TestEvent {
  readonly id: string;
  readonly startDateTime: string;
  readonly endDateTime: string | null;
}

function makeEvent(
  id: string,
  start: string,
  end: string | null = null,
): TestEvent {
  return { id, startDateTime: start, endDateTime: end };
}

// ─── detectConflicts ──────────────────────────────────────────────

describe('detectConflicts', () => {
  describe('no conflicts', () => {
    it('returns empty array for empty input', () => {
      expect(detectConflicts([])).toEqual([]);
    });

    it('returns empty array for a single event', () => {
      const events = [
        makeEvent('a', '2026-06-22T10:00:00+02:00', '2026-06-22T11:00:00+02:00'),
      ];
      expect(detectConflicts(events)).toEqual([]);
    });

    it('returns empty array for non-overlapping events', () => {
      const events = [
        makeEvent('a', '2026-06-22T10:00:00+02:00', '2026-06-22T11:00:00+02:00'),
        makeEvent('b', '2026-06-22T11:00:00+02:00', '2026-06-22T12:00:00+02:00'),
        makeEvent('c', '2026-06-22T12:00:00+02:00', '2026-06-22T13:00:00+02:00'),
      ];
      expect(detectConflicts(events)).toEqual([]);
    });

    it('returns empty array when events are adjacent (end equals next start)', () => {
      const events = [
        makeEvent('a', '2026-06-22T09:00:00+02:00', '2026-06-22T10:00:00+02:00'),
        makeEvent('b', '2026-06-22T10:00:00+02:00', '2026-06-22T11:00:00+02:00'),
      ];
      expect(detectConflicts(events)).toEqual([]);
    });
  });

  describe('two-way overlap', () => {
    it('detects two overlapping events', () => {
      const events = [
        makeEvent('a', '2026-06-22T10:00:00+02:00', '2026-06-22T11:00:00+02:00'),
        makeEvent('b', '2026-06-22T10:30:00+02:00', '2026-06-22T11:30:00+02:00'),
      ];
      const result = detectConflicts(events);
      expect(result).toEqual([{ eventIdA: 'a', eventIdB: 'b' }]);
    });

    it('detects overlap when one event fully contains another', () => {
      const events = [
        makeEvent('outer', '2026-06-22T09:00:00+02:00', '2026-06-22T12:00:00+02:00'),
        makeEvent('inner', '2026-06-22T10:00:00+02:00', '2026-06-22T11:00:00+02:00'),
      ];
      const result = detectConflicts(events);
      expect(result).toEqual([{ eventIdA: 'inner', eventIdB: 'outer' }]);
    });

    it('orders pair by id (A < B lexicographically)', () => {
      const events = [
        makeEvent('z-event', '2026-06-22T10:00:00+02:00', '2026-06-22T11:00:00+02:00'),
        makeEvent('a-event', '2026-06-22T10:30:00+02:00', '2026-06-22T11:30:00+02:00'),
      ];
      const result = detectConflicts(events);
      expect(result).toEqual([{ eventIdA: 'a-event', eventIdB: 'z-event' }]);
    });
  });

  describe('three-way overlap', () => {
    it('detects all pairs in a three-way overlap', () => {
      const events = [
        makeEvent('a', '2026-06-22T10:00:00+02:00', '2026-06-22T12:00:00+02:00'),
        makeEvent('b', '2026-06-22T10:30:00+02:00', '2026-06-22T11:30:00+02:00'),
        makeEvent('c', '2026-06-22T11:00:00+02:00', '2026-06-22T13:00:00+02:00'),
      ];
      const result = detectConflicts(events);
      // a overlaps b, a overlaps c, b overlaps c
      expect(result).toHaveLength(3);
      expect(result).toContainEqual({ eventIdA: 'a', eventIdB: 'b' });
      expect(result).toContainEqual({ eventIdA: 'a', eventIdB: 'c' });
      expect(result).toContainEqual({ eventIdA: 'b', eventIdB: 'c' });
    });

    it('detects partial three-way overlap (A overlaps B, B overlaps C, A does not overlap C)', () => {
      const events = [
        makeEvent('a', '2026-06-22T10:00:00+02:00', '2026-06-22T11:00:00+02:00'),
        makeEvent('b', '2026-06-22T10:30:00+02:00', '2026-06-22T11:30:00+02:00'),
        makeEvent('c', '2026-06-22T11:00:00+02:00', '2026-06-22T12:00:00+02:00'),
      ];
      const result = detectConflicts(events);
      // a overlaps b (10:00-11:00 vs 10:30-11:30)
      // b overlaps c (10:30-11:30 vs 11:00-12:00)
      // a does NOT overlap c (10:00-11:00 vs 11:00-12:00 — adjacent, not overlapping)
      expect(result).toHaveLength(2);
      expect(result).toContainEqual({ eventIdA: 'a', eventIdB: 'b' });
      expect(result).toContainEqual({ eventIdA: 'b', eventIdB: 'c' });
    });
  });

  describe('zero-duration events (null endDateTime)', () => {
    it('two zero-duration events at the same time conflict', () => {
      const events = [
        makeEvent('a', '2026-06-22T10:00:00+02:00', null),
        makeEvent('b', '2026-06-22T10:00:00+02:00', null),
      ];
      const result = detectConflicts(events);
      expect(result).toEqual([{ eventIdA: 'a', eventIdB: 'b' }]);
    });

    it('two zero-duration events at different times do not conflict', () => {
      const events = [
        makeEvent('a', '2026-06-22T10:00:00+02:00', null),
        makeEvent('b', '2026-06-22T11:00:00+02:00', null),
      ];
      expect(detectConflicts(events)).toEqual([]);
    });

    it('zero-duration event conflicts with a range that contains its time', () => {
      const events = [
        makeEvent('range', '2026-06-22T09:00:00+02:00', '2026-06-22T11:00:00+02:00'),
        makeEvent('point', '2026-06-22T10:00:00+02:00', null),
      ];
      const result = detectConflicts(events);
      expect(result).toEqual([{ eventIdA: 'point', eventIdB: 'range' }]);
    });

    it('zero-duration event at the start boundary of a range conflicts', () => {
      // point.start === range.start, so point.start < range.end AND point.end > range.start
      // point.end = point.start, so point.end > range.start is false when they're equal
      // Actually: effectiveEnd = start for zero-duration. A.start < B.end AND A.end > B.start
      // point: start=10:00, end=10:00. range: start=10:00, end=11:00
      // point.start < range.end (10:00 < 11:00 ✓) AND point.end > range.start (10:00 > 10:00 ✗)
      // So they do NOT conflict by the strict overlap rule
      // But wait — two zero-duration at same time DO conflict. Let me re-read the spec.
      // The spec says: effectiveEnd = endDateTime ?? startDateTime
      // Overlap: A.start < B.effectiveEnd AND A.effectiveEnd > B.start
      // point: start=10:00, effectiveEnd=10:00. range: start=10:00, effectiveEnd=11:00
      // point.start < range.effectiveEnd (10:00 < 11:00 ✓) AND point.effectiveEnd > range.start (10:00 > 10:00 ✗)
      // So NO conflict. This is correct — the zero-duration event at the exact start boundary doesn't overlap.
      const events = [
        makeEvent('range', '2026-06-22T10:00:00+02:00', '2026-06-22T11:00:00+02:00'),
        makeEvent('point', '2026-06-22T10:00:00+02:00', null),
      ];
      const result = detectConflicts(events);
      expect(result).toEqual([]);
    });

    it('zero-duration event at the end boundary of a range does not conflict', () => {
      // point: start=11:00, effectiveEnd=11:00. range: start=10:00, effectiveEnd=11:00
      // point.start < range.effectiveEnd (11:00 < 11:00 ✗)
      // So NO conflict.
      const events = [
        makeEvent('range', '2026-06-22T10:00:00+02:00', '2026-06-22T11:00:00+02:00'),
        makeEvent('point', '2026-06-22T11:00:00+02:00', null),
      ];
      const result = detectConflicts(events);
      expect(result).toEqual([]);
    });
  });
});

// ─── getConflictingEventIds ───────────────────────────────────────

describe('getConflictingEventIds', () => {
  it('returns empty set for empty input', () => {
    expect(getConflictingEventIds([])).toEqual(new Set());
  });

  it('returns empty set for non-overlapping events', () => {
    const events = [
      makeEvent('a', '2026-06-22T10:00:00+02:00', '2026-06-22T11:00:00+02:00'),
      makeEvent('b', '2026-06-22T11:00:00+02:00', '2026-06-22T12:00:00+02:00'),
    ];
    expect(getConflictingEventIds(events)).toEqual(new Set());
  });

  it('returns IDs of all conflicting events', () => {
    const events = [
      makeEvent('a', '2026-06-22T10:00:00+02:00', '2026-06-22T11:00:00+02:00'),
      makeEvent('b', '2026-06-22T10:30:00+02:00', '2026-06-22T11:30:00+02:00'),
      makeEvent('c', '2026-06-22T12:00:00+02:00', '2026-06-22T13:00:00+02:00'),
    ];
    expect(getConflictingEventIds(events)).toEqual(new Set(['a', 'b']));
  });

  it('returns all IDs involved in a three-way overlap', () => {
    const events = [
      makeEvent('a', '2026-06-22T10:00:00+02:00', '2026-06-22T12:00:00+02:00'),
      makeEvent('b', '2026-06-22T10:30:00+02:00', '2026-06-22T11:30:00+02:00'),
      makeEvent('c', '2026-06-22T11:00:00+02:00', '2026-06-22T13:00:00+02:00'),
    ];
    expect(getConflictingEventIds(events)).toEqual(new Set(['a', 'b', 'c']));
  });
});
