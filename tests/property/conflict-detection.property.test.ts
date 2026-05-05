// Feature: ux-enhancements, Property 7: conflict detection correctness

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { detectConflicts } from '#core/conflict-detector';

// ─── Generators ───────────────────────────────────────────────────

interface ConflictTestEvent {
  readonly id: string;
  readonly startDateTime: string;
  readonly endDateTime: string | null;
}

/** Generates a hex string of the given length for use as event IDs. */
const hexStringArb = (length: number): fc.Arbitrary<string> =>
  fc
    .array(fc.integer({ min: 0, max: 15 }), { minLength: length, maxLength: length })
    .map((nums) => nums.map((n) => n.toString(16)).join(''));

/** Generates an event with a start time and optional end time (end >= start when present). */
const conflictEventArb: fc.Arbitrary<ConflictTestEvent> = fc
  .record({
    id: hexStringArb(8),
    startHour: fc.integer({ min: 0, max: 23 }),
    startMinute: fc.integer({ min: 0, max: 59 }),
    durationMinutes: fc.oneof(
      fc.constant(null as number | null),
      fc.integer({ min: 1, max: 180 }),
    ),
  })
  .map(({ id, startHour, startMinute, durationMinutes }) => {
    const start = `2026-06-22T${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}:00+02:00`;

    let end: string | null = null;
    if (durationMinutes !== null) {
      const totalMinutes = startHour * 60 + startMinute + durationMinutes;
      const endHour = Math.min(23, Math.floor(totalMinutes / 60));
      const endMinute = totalMinutes >= 24 * 60 ? 59 : totalMinutes % 60;
      end = `2026-06-22T${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}:00+02:00`;
    }

    return { id, startDateTime: start, endDateTime: end };
  });

/** Generates an array of 0–15 events with unique IDs. */
const conflictEventArrayArb: fc.Arbitrary<readonly ConflictTestEvent[]> = fc
  .array(conflictEventArb, { minLength: 0, maxLength: 15 })
  .map((events) => {
    const seen = new Set<string>();
    return events.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });
  });

// ─── Reference implementation (brute-force O(n²)) ────────────────

function getEffectiveEnd(event: ConflictTestEvent): string {
  return event.endDateTime ?? event.startDateTime;
}

/**
 * Determines overlap using the spec rule:
 * A.start < B.effectiveEnd AND A.effectiveEnd > B.start
 * Special case: two zero-duration events at the same time conflict.
 */
function eventsOverlapReference(a: ConflictTestEvent, b: ConflictTestEvent): boolean {
  const aEnd = getEffectiveEnd(a);
  const bEnd = getEffectiveEnd(b);

  // Special case: two zero-duration events at the same start time
  if (
    a.endDateTime === null &&
    b.endDateTime === null &&
    a.startDateTime === b.startDateTime
  ) {
    return true;
  }

  return a.startDateTime < bEnd && aEnd > b.startDateTime;
}

/** Brute-force reference: check all pairs. */
function detectConflictsReference(
  events: readonly ConflictTestEvent[],
): Array<{ eventIdA: string; eventIdB: string }> {
  const pairs: Array<{ eventIdA: string; eventIdB: string }> = [];

  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i]!;
      const b = events[j]!;
      if (eventsOverlapReference(a, b)) {
        const [idA, idB] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
        pairs.push({ eventIdA: idA, eventIdB: idB });
      }
    }
  }

  return pairs;
}

// ─── Properties ───────────────────────────────────────────────────

describe('Property 7: conflict detection correctness', () => {
  /**
   * **Validates: Requirements 8.1, 8.3, 8.4, 8.6**
   *
   * For any array of events, detectConflicts returns a pair (A, B) if and only if
   * A.start < B.effectiveEnd AND A.effectiveEnd > B.start (with the zero-duration
   * special case). Verified by comparing against a brute-force reference implementation.
   */
  it('returns exactly the same conflict pairs as a brute-force reference', () => {
    fc.assert(
      fc.property(conflictEventArrayArb, (events) => {
        const actual = detectConflicts(events);
        const expected = detectConflictsReference(events);

        // Sort both for comparison
        const sortPairs = (
          pairs: Array<{ eventIdA: string; eventIdB: string }>,
        ) =>
          [...pairs].sort((a, b) => {
            const cmp = a.eventIdA.localeCompare(b.eventIdA);
            if (cmp !== 0) return cmp;
            return a.eventIdB.localeCompare(b.eventIdB);
          });

        expect(sortPairs(actual)).toEqual(sortPairs(expected));
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 8.6**
   *
   * Removing any event from the array and re-running detection produces a result
   * that contains no pairs involving the removed event's ID.
   */
  it('removing an event eliminates all pairs involving that event', () => {
    fc.assert(
      fc.property(conflictEventArrayArb, (events) => {
        if (events.length === 0) return;

        // Pick a random event to remove (use first for determinism in shrinking)
        const removedEvent = events[0]!;
        const remaining = events.filter((e) => e.id !== removedEvent.id);
        const result = detectConflicts(remaining);

        // No pair should reference the removed event
        for (const pair of result) {
          expect(pair.eventIdA).not.toBe(removedEvent.id);
          expect(pair.eventIdB).not.toBe(removedEvent.id);
        }
      }),
      { numRuns: 100 },
    );
  });
});
