/**
 * Unit tests for conflict indicator rendering in the Stars Page.
 *
 * Validates that EventRow displays a subtle dot indicator when isConflicting
 * is true, with a tooltip showing overlapping event titles.
 * Note: The left border accent was removed per popup-ux-improvements spec.
 *
 * Requirements: 8.1, 8.2, 8.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';

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

function makeEvent(overrides: Partial<StarredEvent> = {}): StarredEvent {
  return {
    id: 'e1',
    title: 'Test Event',
    organiser: 'Test Organiser',
    startDateTime: '2026-06-22T10:00:00+02:00',
    endDateTime: '2026-06-22T11:00:00+02:00',
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
  isConflicting?: boolean,
  conflictTitles?: readonly string[],
): void {
  const adapter = setupAdapter();
  render(
    <table>
      <tbody>
        <EventRow
          event={event}
          onUnstar={vi.fn()}
          adapter={adapter}
          isConflicting={isConflicting}
          conflictTitles={conflictTitles}
        />
      </tbody>
    </table>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Stars EventRow conflict indicator', () => {
  it('does not render conflict dot when isConflicting is false', () => {
    renderRow(makeEvent(), false);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('does not render conflict dot when isConflicting is undefined', () => {
    renderRow(makeEvent());

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders conflict dot when isConflicting is true', () => {
    renderRow(makeEvent(), true, ['Other Event']);

    const dot = screen.getByRole('img');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveTextContent('●');
  });

  it('applies muted slate color class to the conflict dot', () => {
    renderRow(makeEvent(), true, ['Other Event']);

    const dot = screen.getByRole('img');
    expect(dot).toHaveClass('text-slate-400');
  });

  it('shows tooltip with conflicting event title', () => {
    renderRow(makeEvent(), true, ['Demokrati i förändring']);

    const dot = screen.getByRole('img');
    expect(dot).toHaveAttribute('title', 'Demokrati i förändring');
  });

  it('shows tooltip with multiple conflicting event titles joined by comma', () => {
    renderRow(makeEvent(), true, ['Event A', 'Event B']);

    const dot = screen.getByRole('img');
    expect(dot).toHaveAttribute('title', 'Event A, Event B');
  });

  it('provides aria-label for accessibility', () => {
    renderRow(makeEvent(), true, ['Hållbar utveckling']);

    const dot = screen.getByRole('img');
    expect(dot).toHaveAttribute('aria-label', 'Hållbar utveckling');
  });

  it('does not add left border accent to the time cell when conflicting (border removed)', () => {
    renderRow(makeEvent(), true, ['Other Event']);

    const dot = screen.getByRole('img');
    const timeCell = dot.closest('td');
    expect(timeCell).not.toHaveClass('border-l-2');
    expect(timeCell).not.toHaveClass('border-l-slate-300');
  });

  it('does not add left border accent when not conflicting', () => {
    renderRow(makeEvent(), false);

    // Find the time cell by its content
    const timeText = screen.getByText(/Mån 22 juni 10:00/);
    const timeCell = timeText.closest('td');
    expect(timeCell).not.toHaveClass('border-l-2');
  });

  it('renders empty tooltip when conflictTitles is empty', () => {
    renderRow(makeEvent(), true, []);

    const dot = screen.getByRole('img');
    expect(dot).toHaveAttribute('title', '');
  });
});
