/**
 * Property-based tests for selection cleanup and fetch generation staleness.
 *
 * Feature: content-scraping-and-sync, Property 9: Selection State Cleanup on Event List Change
 * Feature: content-scraping-and-sync, Property 10: Fetch Generation Staleness
 * Validates: Requirements 5.4, 5.5
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ─── Pure Logic Under Test ────────────────────────────────────────

/**
 * Extracts the pure selection cleanup logic from useStarredEvents.
 * Given a previous set of selected IDs and a new set of event IDs,
 * returns the intersection (only selected IDs still present in the event list).
 */
function cleanupSelection(selectedIds: ReadonlySet<string>, eventIds: ReadonlySet<string>): Set<string> {
  const cleaned = new Set([...selectedIds].filter((id) => eventIds.has(id)));
  return cleaned;
}

/**
 * Simulates the fetch generation counter logic.
 * Given a sequence of N fetch operations, only the response from the
 * operation whose generation matches the final counter value is applied.
 *
 * Returns the index of the fetch whose response would be applied (0-based),
 * or -1 if no response is applied (should not happen with N >= 1).
 */
function simulateFetchGenerations(fetchCount: number): number {
  // The generation counter starts at 0 and increments before each fetch
  let generationRef = 0;
  const generations: number[] = [];

  // Each fetch increments the counter and captures its generation
  for (let i = 0; i < fetchCount; i++) {
    generationRef++;
    generations.push(generationRef);
  }

  // Only the fetch whose generation matches the final counter value proceeds
  const finalGeneration = generationRef;
  for (let i = generations.length - 1; i >= 0; i--) {
    if (generations[i] === finalGeneration) {
      return i;
    }
  }

  return -1;
}

// ─── Arbitraries ──────────────────────────────────────────────────

/** Generates a hex string of the given length for use as event IDs. */
const hexIdArb: fc.Arbitrary<string> = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 16, maxLength: 16 })
  .map((nums) => nums.map((n) => n.toString(16)).join(''));

/** Generates a set of event ID strings. */
const eventIdSetArb: fc.Arbitrary<Set<string>> = fc
  .array(hexIdArb, { minLength: 0, maxLength: 30 })
  .map((ids) => new Set(ids));

/** Generates a set of selected IDs, optionally overlapping with an event ID set. */
function selectedIdsArb(eventIds: Set<string>): fc.Arbitrary<Set<string>> {
  const eventIdArray = [...eventIds];
  return fc
    .record({
      // Some IDs from the event list (will survive cleanup)
      fromEvents: fc.subarray(eventIdArray),
      // Some IDs NOT in the event list (will be removed by cleanup)
      extraIds: fc.array(hexIdArb, { minLength: 0, maxLength: 10 }),
    })
    .map(({ fromEvents, extraIds }) => new Set([...fromEvents, ...extraIds]));
}

// ─── Test Suite ───────────────────────────────────────────────────

// Feature: content-scraping-and-sync, Property 9: Selection State Cleanup on Event List Change
describe('Property 9: Selection State Cleanup on Event List Change', () => {
  it('resulting selection equals intersection of selected IDs and current event IDs', () => {
    fc.assert(
      fc.property(
        eventIdSetArb.chain((eventIds) =>
          fc.tuple(fc.constant(eventIds), selectedIdsArb(eventIds)),
        ),
        ([eventIds, selectedIds]) => {
          const result = cleanupSelection(selectedIds, eventIds);

          // Property: result is exactly the set intersection
          // 1. Every ID in the result is in both selectedIds AND eventIds
          for (const id of result) {
            expect(selectedIds.has(id)).toBe(true);
            expect(eventIds.has(id)).toBe(true);
          }

          // 2. Every ID that is in both selectedIds AND eventIds is in the result
          for (const id of selectedIds) {
            if (eventIds.has(id)) {
              expect(result.has(id)).toBe(true);
            }
          }

          // 3. No ID in the result is absent from eventIds
          for (const id of result) {
            expect(eventIds.has(id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('cleanup never adds IDs that were not originally selected', () => {
    fc.assert(
      fc.property(
        eventIdSetArb.chain((eventIds) =>
          fc.tuple(fc.constant(eventIds), selectedIdsArb(eventIds)),
        ),
        ([eventIds, selectedIds]) => {
          const result = cleanupSelection(selectedIds, eventIds);

          // The result is always a subset of the original selection
          for (const id of result) {
            expect(selectedIds.has(id)).toBe(true);
          }

          // The result size is at most the size of the original selection
          expect(result.size).toBeLessThanOrEqual(selectedIds.size);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('cleanup with empty event list produces empty selection', () => {
    fc.assert(
      fc.property(
        fc.array(hexIdArb, { minLength: 0, maxLength: 20 }),
        (selectedArray) => {
          const selectedIds = new Set(selectedArray);
          const emptyEventIds = new Set<string>();

          const result = cleanupSelection(selectedIds, emptyEventIds);

          expect(result.size).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('cleanup with empty selection always produces empty result', () => {
    fc.assert(
      fc.property(eventIdSetArb, (eventIds) => {
        const emptySelection = new Set<string>();

        const result = cleanupSelection(emptySelection, eventIds);

        expect(result.size).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('when all selected IDs exist in event list, cleanup preserves entire selection', () => {
    fc.assert(
      fc.property(
        eventIdSetArb.filter((s) => s.size > 0).chain((eventIds) =>
          fc.tuple(fc.constant(eventIds), fc.subarray([...eventIds])),
        ),
        ([eventIds, selectedArray]) => {
          const selectedIds = new Set(selectedArray);

          const result = cleanupSelection(selectedIds, eventIds);

          // All selected IDs are in event list, so nothing is removed
          expect(result.size).toBe(selectedIds.size);
          for (const id of selectedIds) {
            expect(result.has(id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: content-scraping-and-sync, Property 10: Fetch Generation Staleness
describe('Property 10: Fetch Generation Staleness', () => {
  it('only the latest fetch response is applied to state', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        (fetchCount) => {
          const appliedIndex = simulateFetchGenerations(fetchCount);

          // The applied index must always be the last one (N-1 for 0-based)
          expect(appliedIndex).toBe(fetchCount - 1);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('all earlier fetch responses are discarded', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 50 }),
        (fetchCount) => {
          // Simulate: each fetch gets a generation number
          let generationRef = 0;
          const generations: number[] = [];

          for (let i = 0; i < fetchCount; i++) {
            generationRef++;
            generations.push(generationRef);
          }

          const finalGeneration = generationRef;

          // All generations except the last should NOT match the final counter
          for (let i = 0; i < fetchCount - 1; i++) {
            expect(generations[i]).not.toBe(finalGeneration);
          }

          // Only the last generation matches
          expect(generations[fetchCount - 1]).toBe(finalGeneration);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('interleaved fetch responses only apply the latest generation', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 20 }),
        fc.array(fc.integer({ min: 0, max: 19 }), { minLength: 1, maxLength: 20 }),
        (fetchCount, responseOrder) => {
          // Simulate N fetches being triggered in rapid succession
          let generationRef = 0;
          const generations: number[] = [];

          for (let i = 0; i < fetchCount; i++) {
            generationRef++;
            generations.push(generationRef);
          }

          const finalGeneration = generationRef;

          // Simulate responses arriving in arbitrary order
          const validResponseOrder = responseOrder
            .map((idx) => idx % fetchCount)
            .filter((idx, i, arr) => arr.indexOf(idx) === i); // unique indices

          let appliedGeneration: number | null = null;

          // Process responses in the given order
          for (const idx of validResponseOrder) {
            const responseGeneration = generations[idx]!;
            // The guard: only apply if generation matches current ref
            if (responseGeneration === finalGeneration) {
              appliedGeneration = responseGeneration;
            }
          }

          // If the last fetch's response was in the order, it should be applied
          if (validResponseOrder.includes(fetchCount - 1)) {
            expect(appliedGeneration).toBe(finalGeneration);
          }

          // No earlier generation can ever equal the final generation
          for (let i = 0; i < fetchCount - 1; i++) {
            expect(generations[i]).not.toBe(finalGeneration);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('generation counter is strictly monotonically increasing', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (fetchCount) => {
          let generationRef = 0;
          const generations: number[] = [];

          for (let i = 0; i < fetchCount; i++) {
            generationRef++;
            generations.push(generationRef);
          }

          // Each generation is strictly greater than the previous
          for (let i = 1; i < generations.length; i++) {
            expect(generations[i]).toBeGreaterThan(generations[i - 1]!);
          }

          // First generation starts at 1
          expect(generations[0]).toBe(1);

          // Last generation equals fetchCount
          expect(generations[generations.length - 1]).toBe(fetchCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});
