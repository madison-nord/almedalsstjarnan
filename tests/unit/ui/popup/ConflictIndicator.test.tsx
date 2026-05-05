/**
 * Unit tests for conflict indicator rendering in the Popup UI.
 *
 * Validates that EventItem displays a subtle dot indicator when
 * isConflicting is true, with a tooltip showing overlapping event titles.
 *
 * Requirements: 8.1, 8.2, 8.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';

import { EventItem } from '#ui/popup/components/EventItem';

// ─── Helpers ──────────────────────────────────────────────────────

function makeEvent(overrides: Partial<StarredEvent> = {}): StarredEvent {
  return {
    id: 'e1',
    title: 'Test Event',
    organiser: 'Test Organiser',
    startDateTime: '2026-06-22T10:00:00+02:00',
    endDateTime: '2026-06-22T11:00:00+02:00',
    location: 'Visby',
    description: null,
    topic: null,
    sourceUrl: null,
    icsDataUri: null,
    starred: true as const,
    starredAt: '2026-06-15T14:00:00.000Z',
    ...overrides,
  };
}

const adapter: IBrowserApiAdapter = mockBrowserApi;
const onUnstar = vi.fn();

// ─── Tests ────────────────────────────────────────────────────────

describe('Popup EventItem conflict indicator', () => {
  it('does not render conflict dot when isConflicting is false', () => {
    const event = makeEvent();
    render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} isConflicting={false} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('does not render conflict dot when isConflicting is undefined', () => {
    const event = makeEvent();
    render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders conflict dot when isConflicting is true', () => {
    const event = makeEvent();
    render(
      <EventItem
        event={event}
        onUnstar={onUnstar}
        adapter={adapter}
        isConflicting={true}
        conflictTitles={['Other Event']}
      />,
    );

    const dot = screen.getByRole('img');
    expect(dot).toBeInTheDocument();
    expect(dot).toHaveTextContent('●');
  });

  it('applies muted slate color class to the conflict dot', () => {
    const event = makeEvent();
    render(
      <EventItem
        event={event}
        onUnstar={onUnstar}
        adapter={adapter}
        isConflicting={true}
        conflictTitles={['Other Event']}
      />,
    );

    const dot = screen.getByRole('img');
    expect(dot).toHaveClass('text-slate-400');
  });

  it('shows tooltip with conflicting event title', () => {
    const event = makeEvent();
    render(
      <EventItem
        event={event}
        onUnstar={onUnstar}
        adapter={adapter}
        isConflicting={true}
        conflictTitles={['Demokrati i förändring']}
      />,
    );

    const dot = screen.getByRole('img');
    expect(dot).toHaveAttribute('title', 'Demokrati i förändring');
  });

  it('shows tooltip with multiple conflicting event titles joined by comma', () => {
    const event = makeEvent();
    render(
      <EventItem
        event={event}
        onUnstar={onUnstar}
        adapter={adapter}
        isConflicting={true}
        conflictTitles={['Event A', 'Event B']}
      />,
    );

    const dot = screen.getByRole('img');
    expect(dot).toHaveAttribute('title', 'Event A, Event B');
  });

  it('provides aria-label for accessibility', () => {
    const event = makeEvent();
    render(
      <EventItem
        event={event}
        onUnstar={onUnstar}
        adapter={adapter}
        isConflicting={true}
        conflictTitles={['Hållbar utveckling']}
      />,
    );

    const dot = screen.getByRole('img');
    expect(dot).toHaveAttribute('aria-label', 'Hållbar utveckling');
  });

  it('renders empty tooltip when conflictTitles is empty', () => {
    const event = makeEvent();
    render(
      <EventItem
        event={event}
        onUnstar={onUnstar}
        adapter={adapter}
        isConflicting={true}
        conflictTitles={[]}
      />,
    );

    const dot = screen.getByRole('img');
    expect(dot).toHaveAttribute('title', '');
  });
});
