// Feature: grid-and-ics-bugfixes, Property 1: Grid cells constrain content with overflow handling

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { render, cleanup } from '@testing-library/react';
import React from 'react';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { starredEventArb } from '#test/helpers/event-generators';

import { EventRow } from '#ui/stars/components/EventRow';

// ─── Helpers ──────────────────────────────────────────────────────

const messageMap: Record<string, string> = {
  unstarAction: 'Remove',
};

function setupAdapter(): IBrowserApiAdapter {
  (mockBrowserApi.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => messageMap[key] ?? '',
  );
  return mockBrowserApi;
}

/**
 * Arbitrary that generates StarredEvents where at least one text field
 * contains a comma (triggering the bug condition).
 */
const commaFieldEventArb: fc.Arbitrary<StarredEvent> = starredEventArb.chain((event) =>
  fc.constantFrom('title', 'organiser', 'location', 'topic').map((field) => {
    switch (field) {
      case 'title':
        return { ...event, title: `${event.title}, extra` };
      case 'organiser':
        return { ...event, organiser: `Org A, Org B` };
      case 'location':
        return { ...event, location: `Place A, Place B` };
      case 'topic':
        return { ...event, topic: `Topic A, Topic B` };
      default:
        return event;
    }
  }),
);

// ─── Property Test ────────────────────────────────────────────────

describe('Property 1: Grid cells constrain content with overflow handling', () => {
  it('for any StarredEvent with comma-containing fields, rendered EventRow has truncation classes on text cells', () => {
    const adapter = setupAdapter();

    fc.assert(
      fc.property(commaFieldEventArb, (event) => {
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
              }),
            ),
          ),
        );

        const cells = container.querySelectorAll('td');
        // Cells: 0=checkbox, 1=title, 2=organiser, 3=datetime, 4=location, 5=topic, 6=actions
        // Organiser, location, topic cells (2, 4, 5) should have truncate class
        const truncatedCellIndices = [2, 4, 5];
        for (const idx of truncatedCellIndices) {
          const cell = cells[idx];
          expect(cell).toBeDefined();
          expect(cell!.classList.contains('truncate')).toBe(true);
        }

        // Title cell (1) should NOT have truncate — it wraps instead
        expect(cells[1]!.classList.contains('truncate')).toBe(false);
        expect(cells[1]!.classList.contains('break-words')).toBe(true);

        // Title cell should have a title attribute
        expect(cells[1]!.hasAttribute('title')).toBe(true);

        // Cleanup for next iteration
        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});
