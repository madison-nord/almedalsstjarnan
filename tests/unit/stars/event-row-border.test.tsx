/**
 * Unit tests for EventRow border removal.
 *
 * Validates that the date/time column never has border-l classes,
 * regardless of conflict state, while the conflict dot indicator
 * still renders for conflicting events.
 *
 * Requirements: 3.1, 3.2, 3.3
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';

import { EventRow } from '#ui/stars/components/EventRow';

// ─── Helpers ──────────────────────────────────────────────────────

function setupAdapter(): IBrowserApiAdapter {
  (mockBrowserApi.getMessage as ReturnType<typeof vi.fn>).mockImplementation((key: string) => key);
  return mockBrowserApi;
}

function makeEvent(overrides: Partial<StarredEvent> = {}): StarredEvent {
  return {
    id: 'evt-1',
    title: 'Test Event',
    organiser: 'Test Org',
    startDateTime: '2026-06-28T10:00:00+02:00',
    endDateTime: '2026-06-28T11:00:00+02:00',
    location: 'Visby',
    description: null,
    topic: 'Demokrati',
    sourceUrl: null,
    icsDataUri: null,
    starred: true as const,
    starredAt: '2026-06-15T14:00:00.000Z',
    ...overrides,
  };
}

function renderRow(
  event: StarredEvent,
): { container: HTMLElement } {
  const adapter = setupAdapter();
  return render(
    <table>
      <tbody>
        <EventRow
          event={event}
          onUnstar={vi.fn()}
          adapter={adapter}
          locale="sv"
        />
      </tbody>
    </table>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────

describe('EventRow border removal (Requirements 3.1, 3.2, 3.3)', () => {
  describe('conflicting events have no border-l on date/time td', () => {
    it('does not render border-l-2 border-l-slate-300 classes', () => {
      const event = makeEvent();
      const { container } = renderRow(event);

      const tds = container.querySelectorAll('td');
      const dateTimeTd = tds[3]!;

      expect(dateTimeTd).not.toHaveClass('border-l-2');
      expect(dateTimeTd).not.toHaveClass('border-l-slate-300');
    });
  });

  describe('non-conflicting events have no border-l on date/time td', () => {
    it('does not render any border-l classes', () => {
      const event = makeEvent();
      const { container } = renderRow(event);

      const tds = container.querySelectorAll('td');
      const dateTimeTd = tds[3]!;

      expect(dateTimeTd.className).not.toMatch(/\bborder-l/);
    });
  });
});
