// Feature: popup-ux-improvements, Property 3: EventRow date/time column has no conditional border styling

/**
 * Property-based test verifying that the EventRow date/time column never
 * contains border-l class variants, regardless of conflict state.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { render, cleanup } from '@testing-library/react';
import React from 'react';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { starredEventArb } from '#test/helpers/event-generators';

import { EventRow } from '#ui/stars/components/EventRow';

// ─── Helpers ──────────────────────────────────────────────────────

function setupAdapter(): IBrowserApiAdapter {
  (mockBrowserApi.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => key,
  );
  return mockBrowserApi;
}

// ─── Properties ───────────────────────────────────────────────────

describe('Property 3: EventRow date/time column has no conditional border styling', () => {
  /**
   * **Validates: Requirements 3.1, 3.2, 3.3**
   *
   * For any event and any conflict state (true or false), the date/time
   * column <td> in EventRow shall have identical border-related class names —
   * specifically, no `border-l` variant shall be present.
   */
  it('date/time td never contains border-l class variants regardless of isConflicting', () => {
    const adapter = setupAdapter();

    fc.assert(
      fc.property(
        starredEventArb,
        fc.boolean(),
        (event: StarredEvent, isConflicting: boolean) => {
          const { container } = render(
            React.createElement(
              'table',
              null,
              React.createElement(
                'tbody',
                null,
                React.createElement(EventRow, {
                  event,
                  onUnstar: vi.fn(),
                  adapter,
                  isConflicting,
                  conflictTitles: isConflicting ? ['Other Event'] : [],
                }),
              ),
            ),
          );

          // Cells: 0=checkbox, 1=title, 2=organiser, 3=datetime, 4=location, 5=topic, 6=actions
          const tds = container.querySelectorAll('td');
          const dateTimeTd = tds[3];

          expect(dateTimeTd).toBeDefined();

          // Assert no border-l class variants are present
          const classList = dateTimeTd!.className;
          const hasBorderL = /\bborder-l\b/.test(classList) || /\bborder-l-/.test(classList);
          expect(hasBorderL).toBe(false);

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});
