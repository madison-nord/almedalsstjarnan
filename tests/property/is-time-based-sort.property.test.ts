// Feature: stars-page-sorting, Property 6: Non-time-based sort produces flat output

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

import { SORT_ORDERS } from '#core/types';
import { isTimeBasedSort } from '#core/sorter';

import { sortOrderArb } from '#test/helpers/event-generators';

const TIME_BASED_ORDERS = new Set(['chronological', 'reverse-chronological']);

describe('Property 6: Non-time-based sort produces flat output', () => {
  /**
   * Validates: Requirements 2.2
   *
   * For any sort order from the SORT_ORDERS array, isTimeBasedSort returns true
   * ONLY for 'chronological' and 'reverse-chronological', and false for all others.
   */
  it('isTimeBasedSort returns true only for chronological and reverse-chronological', () => {
    fc.assert(
      fc.property(sortOrderArb, (order) => {
        const result = isTimeBasedSort(order);

        if (TIME_BASED_ORDERS.has(order)) {
          expect(result).toBe(true);
        } else {
          expect(result).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('all SORT_ORDERS are classified as either time-based or non-time-based', () => {
    fc.assert(
      fc.property(fc.constantFrom(...SORT_ORDERS), (order) => {
        const result = isTimeBasedSort(order);
        expect(typeof result).toBe('boolean');
      }),
      { numRuns: 100 },
    );
  });
});
