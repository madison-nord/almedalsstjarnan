/**
 * Conflict detection for overlapping event time ranges.
 *
 * Uses a sweep-line algorithm: sort events by startDateTime, then for each event
 * compare against subsequent events until the next event's start is past the
 * current event's effective end. Complexity: O(n log n + k) where k = number of conflicts.
 */

// ─── Types ────────────────────────────────────────────────────────

export interface ConflictPair {
  readonly eventIdA: string;
  readonly eventIdB: string;
}

interface ConflictEvent {
  readonly id: string;
  readonly startDateTime: string;
  readonly endDateTime: string | null;
}

// ─── Implementation ───────────────────────────────────────────────

/**
 * Returns the effective end time for an event.
 * When endDateTime is null, the event is zero-duration: effectiveEnd = startDateTime.
 */
function getEffectiveEnd(event: ConflictEvent): string {
  return event.endDateTime ?? event.startDateTime;
}

/**
 * Determines whether two events overlap.
 *
 * Overlap rule: A.start < B.effectiveEnd AND A.effectiveEnd > B.start
 *
 * Special case: two zero-duration events at the same time conflict
 * (A.start === B.start when both have null endDateTime).
 */
function eventsOverlap(a: ConflictEvent, b: ConflictEvent): boolean {
  const aEnd = getEffectiveEnd(a);
  const bEnd = getEffectiveEnd(b);

  // Special case: two zero-duration events at the same start time conflict
  if (
    a.endDateTime === null &&
    b.endDateTime === null &&
    a.startDateTime === b.startDateTime
  ) {
    return true;
  }

  return a.startDateTime < bEnd && aEnd > b.startDateTime;
}

/**
 * Creates a ConflictPair with IDs sorted lexicographically (A < B).
 */
function makePair(idA: string, idB: string): ConflictPair {
  if (idA < idB) {
    return { eventIdA: idA, eventIdB: idB };
  }
  return { eventIdA: idB, eventIdB: idA };
}

/**
 * Finds all pairs of events with overlapping time ranges.
 *
 * Overlap rule: event A conflicts with event B when
 *   A.start < B.effectiveEnd AND A.effectiveEnd > B.start
 *   (where effectiveEnd = endDateTime ?? startDateTime)
 *
 * Events with no endDateTime are treated as zero-duration (point-in-time):
 *   they conflict only if another event's range strictly contains that exact start time.
 *   Two zero-duration events at the same time also conflict.
 *
 * @param events - Array of events with startDateTime and optional endDateTime
 * @returns Array of ConflictPair, each pair listed once (A < B by id sort)
 */
export function detectConflicts(
  events: ReadonlyArray<{
    readonly id: string;
    readonly startDateTime: string;
    readonly endDateTime: string | null;
  }>,
): ConflictPair[] {
  if (events.length < 2) {
    return [];
  }

  // Sort by startDateTime, then by id for deterministic ordering
  const sorted = [...events].sort((a, b) => {
    const cmp = a.startDateTime.localeCompare(b.startDateTime);
    if (cmp !== 0) return cmp;
    return a.id.localeCompare(b.id);
  });

  const pairs: ConflictPair[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    if (!current) continue;
    const currentEnd = getEffectiveEnd(current);

    for (let j = i + 1; j < sorted.length; j++) {
      const next = sorted[j];
      if (!next) continue;

      // Sweep-line optimization: if next starts strictly after current's effective end,
      // no further events can overlap with current (since they're sorted by start).
      if (next.startDateTime > currentEnd) {
        break;
      }

      if (eventsOverlap(current, next)) {
        pairs.push(makePair(current.id, next.id));
      }
    }
  }

  return pairs;
}

/**
 * Builds a Set of event IDs that participate in at least one conflict.
 * Convenience wrapper around detectConflicts.
 */
export function getConflictingEventIds(
  events: ReadonlyArray<{
    readonly id: string;
    readonly startDateTime: string;
    readonly endDateTime: string | null;
  }>,
): Set<string> {
  const pairs = detectConflicts(events);
  const ids = new Set<string>();

  for (const pair of pairs) {
    ids.add(pair.eventIdA);
    ids.add(pair.eventIdB);
  }

  return ids;
}
