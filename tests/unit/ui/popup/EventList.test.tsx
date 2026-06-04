/**
 * Unit tests for EventList component.
 *
 * Tests count indicator accuracy and load-more behavior:
 * - Displays count indicator using getLocalizedMessage with $1/$2 substitutions
 * - Shows all events when total <= 20 (no load-more button)
 * - Shows load-more button when total > 20
 * - Clicking load-more shows next 20 events
 * - Count indicator updates after load-more click
 * - Multiple load-more clicks eventually show all events
 * - Load-more button disappears when all events are shown
 *
 * Requirements: 1.8, 1.9, 1.10, 11.1, 11.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';
import * as localeMessages from '#core/locale-messages';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';

import { EventList } from '#ui/popup/components/EventList';

// ─── Test Data ────────────────────────────────────────────────────

function makeEvent(overrides: Partial<StarredEvent> & { readonly id: string }): StarredEvent {
  return {
    title: `Event ${overrides.id}`,
    organiser: 'Test Organiser',
    startDateTime: '2026-06-28T10:00:00+02:00',
    endDateTime: '2026-06-28T11:00:00+02:00',
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

function makeEvents(count: number): StarredEvent[] {
  return Array.from({ length: count }, (_, i) =>
    makeEvent({
      id: `event-${String(i + 1).padStart(3, '0')}`,
      title: `Event ${i + 1}`,
      startDateTime: `2026-06-${String(22 + (i % 7)).padStart(2, '0')}T${String(8 + (i % 12)).padStart(2, '0')}:00:00+02:00`,
      starredAt: `2026-06-${String(15 + (i % 10)).padStart(2, '0')}T14:00:00.000Z`,
    }),
  );
}

// ─── i18n Message Map ─────────────────────────────────────────────

const messageMap: Record<string, string> = {
  loadMore: 'Load more',
  expandEvent: 'Show details',
  collapseEvent: 'Hide details',
  conflictWarning: 'Overlaps',
  conflictTooltip: 'Overlaps with: $1',
  unstarEvent: 'Unstar event',
};

// ─── Setup ────────────────────────────────────────────────────────

let adapter: IBrowserApiAdapter;
let getLocalizedMessageSpy: ReturnType<typeof vi.spyOn>;

function setupAdapter(): void {
  (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => messageMap[key] ?? '',
  );
  getLocalizedMessageSpy = vi.spyOn(localeMessages, 'getLocalizedMessage');
}

// ─── Tests ────────────────────────────────────────────────────────

describe('EventList', () => {
  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
    setupAdapter();
  });

  afterEach(() => {
    getLocalizedMessageSpy?.mockRestore();
  });

  describe('count indicator', () => {
    it('displays count indicator using getLocalizedMessage with substitutions', () => {
      const events = makeEvents(5);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="en" />);

      expect(screen.getByText('5 of 5')).toBeInTheDocument();
    });

    it('calls getLocalizedMessage with eventCountIndicator key, locale, and substitutions array', () => {
      const events = makeEvents(5);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="en" />);

      expect(getLocalizedMessageSpy).toHaveBeenCalledWith('eventCountIndicator', 'en', [
        '5',
        '5',
      ]);
    });

    it('displays count indicator showing 20 of total when list exceeds 20', () => {
      const events = makeEvents(35);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="en" />);

      expect(screen.getByText('20 of 35')).toBeInTheDocument();
    });

    it('passes correct substitutions array [displayed, total] to getLocalizedMessage', () => {
      const events = makeEvents(35);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="en" />);

      expect(getLocalizedMessageSpy).toHaveBeenCalledWith('eventCountIndicator', 'en', [
        '20',
        '35',
      ]);
    });

    it('count indicator has aria-live for accessibility', () => {
      const events = makeEvents(5);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="en" />);

      const indicator = screen.getByText('5 of 5');
      expect(indicator).toHaveAttribute('aria-live', 'polite');
    });

    it('renders correctly with Swedish locale', () => {
      const events = makeEvents(7);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="sv" />);

      expect(getLocalizedMessageSpy).toHaveBeenCalledWith('eventCountIndicator', 'sv', [
        '7',
        '7',
      ]);
      expect(screen.getByText('7 av 7')).toBeInTheDocument();
    });

    it('does not contain raw placeholder tokens in rendered output', () => {
      const events = makeEvents(12);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="en" />);

      const indicator = screen.getByText('12 of 12');
      expect(indicator.textContent).not.toContain('$1');
      expect(indicator.textContent).not.toContain('$2');
    });

    it('hides count indicator when no events are starred (0 total)', () => {
      render(<EventList events={[]} onUnstar={vi.fn()} adapter={adapter} locale="en" />);

      const ariaLiveElements = document.querySelectorAll('[aria-live="polite"]');
      expect(ariaLiveElements).toHaveLength(0);
    });

    it('shows count indicator when at least one event is starred', () => {
      const events = makeEvents(1);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="en" />);

      expect(screen.getByText('1 of 1')).toBeInTheDocument();
    });
  });

  describe('load-more button', () => {
    it('does not show load-more button when total <= 20', () => {
      const events = makeEvents(15);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="sv" />);

      expect(screen.queryByText('Load more')).not.toBeInTheDocument();
    });

    it('does not show load-more button when total is exactly 20', () => {
      const events = makeEvents(20);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="sv" />);

      expect(screen.queryByText('Load more')).not.toBeInTheDocument();
    });

    it('shows load-more button when total > 20', () => {
      const events = makeEvents(25);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="sv" />);

      expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument();
    });

    it('clicking load-more shows next 20 events', async () => {
      const user = userEvent.setup();
      const events = makeEvents(45);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="sv" />);

      // Initially 20 items
      expect(screen.getAllByRole('listitem')).toHaveLength(20);

      // Click load more
      await user.click(screen.getByRole('button', { name: 'Load more' }));

      // Now 40 items
      expect(screen.getAllByRole('listitem')).toHaveLength(40);
    });

    it('count indicator updates after load-more click', async () => {
      const user = userEvent.setup();
      const events = makeEvents(45);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="en" />);

      expect(screen.getByText('20 of 45')).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Load more' }));

      expect(screen.getByText('40 of 45')).toBeInTheDocument();
    });

    it('multiple load-more clicks eventually show all events', async () => {
      const user = userEvent.setup();
      const events = makeEvents(45);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="sv" />);

      // First click: 20 → 40
      await user.click(screen.getByRole('button', { name: 'Load more' }));
      expect(screen.getAllByRole('listitem')).toHaveLength(40);

      // Second click: 40 → 45 (all)
      await user.click(screen.getByRole('button', { name: 'Load more' }));
      expect(screen.getAllByRole('listitem')).toHaveLength(45);
    });

    it('load-more button disappears when all events are shown', async () => {
      const user = userEvent.setup();
      const events = makeEvents(25);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="sv" />);

      expect(screen.getByRole('button', { name: 'Load more' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: 'Load more' }));

      expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
    });

    it('uses getMessage for load-more button text', () => {
      const events = makeEvents(25);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="sv" />);

      expect(adapter.getMessage).toHaveBeenCalledWith('loadMore');
    });
  });

  describe('event display', () => {
    it('displays first 20 events initially when total > 20', () => {
      const events = makeEvents(30);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="sv" />);

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(20);
      expect(items[0]).toHaveTextContent('Event 1');
    });

    it('displays all events when total <= 20', () => {
      const events = makeEvents(10);
      render(<EventList events={events} onUnstar={vi.fn()} adapter={adapter} locale="sv" />);

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(10);
    });
  });
});
