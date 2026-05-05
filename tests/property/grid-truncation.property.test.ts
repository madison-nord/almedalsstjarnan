// Feature: grid-and-ics-bugfixes, Property 1: Grid cells constrain content with overflow handling
// Feature: ui-polish-fixes, Property 2: Grid cell tooltips match full content

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


// ─── Property 2: Grid cell tooltips match full content ────────────

describe('Property 2: Grid cell tooltips match full content', () => {
  /**
   * Validates: Requirements 9.2, 10.2, 13.1, 13.2, 13.4
   *
   * For any StarredEvent rendered in the Stars Page EventRow, the title attribute
   * on the title cell SHALL equal event.title, the title attribute on the organiser
   * cell SHALL equal event.organiser ?? '', the title attribute on the location cell
   * SHALL equal event.location ?? '', and the title attribute on the topic cell
   * SHALL equal event.topic ?? ''.
   */
  it('for any StarredEvent, title attributes on text cells match the full event field values', () => {
    const adapter = setupAdapter();

    fc.assert(
      fc.property(starredEventArb, (event) => {
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

        // Title cell title attribute equals event.title
        expect(cells[1]!.getAttribute('title')).toBe(event.title);

        // Organiser cell title attribute equals event.organiser ?? ''
        expect(cells[2]!.getAttribute('title')).toBe(event.organiser ?? '');

        // Location cell title attribute equals event.location ?? ''
        expect(cells[4]!.getAttribute('title')).toBe(event.location ?? '');

        // Topic cell title attribute equals event.topic ?? ''
        expect(cells[5]!.getAttribute('title')).toBe(event.topic ?? '');

        // Cleanup for next iteration
        cleanup();
      }),
      { numRuns: 100 },
    );
  });
});
