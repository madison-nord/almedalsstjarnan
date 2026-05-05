/**
 * Unit tests for Popup App component.
 *
 * Tests the main Popup UI component including:
 * - Sends GET_ALL_STARRED_EVENTS and GET_SORT_ORDER on mount
 * - Displays up to 20 starred events
 * - Displays each event with title/organiser/date-time/location
 * - Renders SortSelector with current sort order
 * - Changing sort order sends SET_SORT_ORDER and re-sorts list
 * - Displays "Open full list" button
 * - Clicking "Open full list" calls createTab with stars.html URL
 * - Displays localized empty state when no starred events
 * - Renders at 360px width
 * - Uses Tailwind classes for styling
 * - Keyboard navigable (Tab, Shift+Tab, Enter, Space)
 * - Registers an onStorageChanged listener via adapter that re-fetches
 *   and re-renders the event list when starredEvents changes externally
 *
 * Requirements: 9.1–9.11, 14.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import type {
  IBrowserApiAdapter,
  StarredEvent,
  SortOrder,
  MessagePayload,
  MessageResponse,
} from '#core/types';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';

import { App } from '#ui/popup/App';

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
      startDateTime: `2026-06-${String(28 - i).padStart(2, '0')}T10:00:00+02:00`,
      starredAt: `2026-06-${String(15 + i).padStart(2, '0')}T14:00:00.000Z`,
    }),
  );
}

// ─── i18n Message Map ─────────────────────────────────────────────

const messageMap: Record<string, string> = {
  popupTitle: 'Starred events',
  openFullList: 'Open full list',
  exportToCalendar: 'Export to calendar',
  emptyStateTitle: 'No starred events',
  emptyStateMessage: 'Visit the Almedalsveckan programme and click the star to save events.',
  sortChronological: 'Chronological',
  sortReverseChronological: 'Reverse chronological',
  sortAlphabeticalTitle: 'Title A–Z',
  sortStarredDesc: 'Recently starred',
  sortLabel: 'Sort by',
  helpLink: 'How does it work?',
  goToProgramme: 'Go to programme',
};

// ─── Helpers ──────────────────────────────────────────────────────

let adapter: IBrowserApiAdapter;
let storageChangedCallback: ((changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => void) | null;

function setupAdapter(events: StarredEvent[] = [], sortOrder: SortOrder = 'chronological'): void {
  storageChangedCallback = null;

  (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => messageMap[key] ?? '',
  );

  (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (message: MessagePayload): Promise<MessageResponse<unknown>> => {
      switch (message.command) {
        case 'GET_ALL_STARRED_EVENTS':
          return Promise.resolve({ success: true as const, data: events });
        case 'GET_SORT_ORDER':
          return Promise.resolve({ success: true as const, data: sortOrder });
        case 'SET_SORT_ORDER':
          return Promise.resolve({ success: true as const, data: undefined });
        case 'GET_ONBOARDING_STATE':
          return Promise.resolve({ success: true as const, data: true });
        default:
          return Promise.resolve({ success: true as const, data: undefined });
      }
    },
  );

  (adapter.onStorageChanged as ReturnType<typeof vi.fn>).mockImplementation(
    (cb: (changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => void) => {
      storageChangedCallback = cb;
      return vi.fn();
    },
  );
}

async function renderApp(events: StarredEvent[] = [], sortOrder: SortOrder = 'chronological'): Promise<void> {
  setupAdapter(events, sortOrder);
  render(<App adapter={adapter} />);
  await waitFor(() => {
    expect(screen.queryByText('…')).not.toBeInTheDocument();
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Popup App', () => {
  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
  });

  describe('mount behavior', () => {
    it('sends GET_ALL_STARRED_EVENTS on mount', async () => {
      await renderApp();

      expect(adapter.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: 'GET_ALL_STARRED_EVENTS' }),
      );
    });

    it('sends GET_SORT_ORDER on mount', async () => {
      await renderApp();

      expect(adapter.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({ command: 'GET_SORT_ORDER' }),
      );
    });

    it('sends both messages concurrently on mount', async () => {
      await renderApp();

      const calls = (adapter.sendMessage as ReturnType<typeof vi.fn>).mock.calls as [MessagePayload][];
      const commands = calls.map(
        (call) => call[0].command,
      );
      expect(commands).toContain('GET_ALL_STARRED_EVENTS');
      expect(commands).toContain('GET_SORT_ORDER');
    });
  });

  describe('event display', () => {
    it('displays starred events', async () => {
      const events = makeEvents(3);
      await renderApp(events);

      expect(screen.getByText('Event 1')).toBeInTheDocument();
      expect(screen.getByText('Event 2')).toBeInTheDocument();
      expect(screen.getByText('Event 3')).toBeInTheDocument();
    });

    it('displays up to 20 starred events', async () => {
      const events = makeEvents(25);
      await renderApp(events);

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(20);
    });

    it('displays each event with title', async () => {
      const events = [makeEvent({ id: 'e1', title: 'Demokrati i förändring' })];
      await renderApp(events);

      expect(screen.getByText('Demokrati i förändring')).toBeInTheDocument();
    });

    it('displays each event with organiser', async () => {
      const events = [makeEvent({ id: 'e1', organiser: 'Sveriges Riksdag' })];
      await renderApp(events);

      expect(screen.getByText('Sveriges Riksdag')).toBeInTheDocument();
    });

    it('displays each event with date-time', async () => {
      const events = [makeEvent({ id: 'e1', startDateTime: '2026-06-28T10:00:00+02:00', endDateTime: '2026-06-28T11:00:00+02:00' })];
      await renderApp(events);

      expect(screen.getByText('Sön 28 juni 10:00\u201311:00')).toBeInTheDocument();
    });

    it('displays each event with location', async () => {
      const events = [makeEvent({ id: 'e1', location: 'Donners plats, Visby' })];
      await renderApp(events);

      expect(screen.getByText('Donners plats, Visby')).toBeInTheDocument();
    });

    it('handles events with null organiser', async () => {
      const events = [makeEvent({ id: 'e1', organiser: null })];
      await renderApp(events);

      expect(screen.getByText('Event e1')).toBeInTheDocument();
    });

    it('handles events with null location', async () => {
      const events = [makeEvent({ id: 'e1', location: null })];
      await renderApp(events);

      expect(screen.getByText('Event e1')).toBeInTheDocument();
    });
  });

  describe('SortSelector', () => {
    it('renders SortSelector with current sort order', async () => {
      await renderApp(makeEvents(3), 'reverse-chronological');

      const select = screen.getByRole('combobox', { name: 'Sort by' }) as HTMLSelectElement;
      expect(select.value).toBe('reverse-chronological');
    });

    it('changing sort order sends SET_SORT_ORDER', async () => {
      const user = userEvent.setup();
      await renderApp(makeEvents(3), 'chronological');

      const select = screen.getByRole('combobox', { name: 'Sort by' });
      await user.selectOptions(select, 'alphabetical-by-title');

      expect(adapter.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'SET_SORT_ORDER',
          sortOrder: 'alphabetical-by-title',
        }),
      );
    });

    it('changing sort order re-sorts the displayed list', async () => {
      const events = [
        makeEvent({ id: 'e1', title: 'Zebra event', startDateTime: '2026-06-28T10:00:00+02:00' }),
        makeEvent({ id: 'e2', title: 'Alpha event', startDateTime: '2026-06-29T10:00:00+02:00' }),
      ];
      const user = userEvent.setup();
      await renderApp(events, 'chronological');

      // Initially chronological: e1 (June 28) before e2 (June 29)
      let items = screen.getAllByRole('listitem');
      expect(items[0]).toHaveTextContent('Zebra event');
      expect(items[1]).toHaveTextContent('Alpha event');

      // Change to alphabetical
      const select = screen.getByRole('combobox', { name: 'Sort by' });
      await user.selectOptions(select, 'alphabetical-by-title');

      items = screen.getAllByRole('listitem');
      expect(items[0]).toHaveTextContent('Alpha event');
      expect(items[1]).toHaveTextContent('Zebra event');
    });
  });

  describe('Open full list button', () => {
    it('displays "Open full list" button', async () => {
      await renderApp();

      expect(screen.getByRole('button', { name: 'Open full list' })).toBeInTheDocument();
    });

    it('clicking "Open full list" calls createTab with stars.html URL', async () => {
      const user = userEvent.setup();
      await renderApp();

      const button = screen.getByRole('button', { name: 'Open full list' });
      await user.click(button);

      expect(adapter.createTab).toHaveBeenCalledWith({ url: 'src/ui/stars/stars.html' });
    });
  });

  describe('empty state', () => {
    it('displays localized empty state when no starred events', async () => {
      await renderApp([]);

      expect(screen.getByText('No starred events')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Visit the Almedalsveckan programme and click the star to save events.',
        ),
      ).toBeInTheDocument();
    });

    it('uses getMessage for empty state strings', async () => {
      await renderApp([]);

      expect(adapter.getMessage).toHaveBeenCalledWith('emptyStateTitle');
      expect(adapter.getMessage).toHaveBeenCalledWith('emptyStateMessage');
    });
  });

  describe('layout and styling', () => {
    it('renders at 360px width', async () => {
      await renderApp();

      const heading = screen.getByRole('heading', { level: 1 });
      const container = heading.closest('.w-\\[360px\\]');
      expect(container).toHaveClass('w-[360px]');
    });

    it('renders with min-height 480px', async () => {
      await renderApp();

      const heading = screen.getByRole('heading', { level: 1 });
      const container = heading.closest('.min-h-\\[480px\\]');
      expect(container).toHaveClass('min-h-[480px]');
    });

    it('uses Tailwind classes for styling', async () => {
      await renderApp(makeEvents(1));

      const heading = screen.getByRole('heading', { level: 1 });
      const container = heading.closest('.w-\\[360px\\]');
      expect(container).toHaveClass('flex', 'flex-col', 'bg-white');
    });

    it('displays popup title heading', async () => {
      await renderApp();

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Starred events');
    });

    it('uses getMessage for popup title', async () => {
      await renderApp();

      expect(adapter.getMessage).toHaveBeenCalledWith('popupTitle');
    });

    it('displays branded header with dark background', async () => {
      await renderApp();

      const header = screen.getByRole('heading', { level: 1 }).closest('header');
      expect(header).toHaveClass('bg-brand-secondary');
    });

    it('displays accent-colored star icon in header', async () => {
      await renderApp();

      const header = screen.getByRole('heading', { level: 1 }).closest('header');
      const starIcon = header?.querySelector('.text-brand-accent');
      expect(starIcon).toBeInTheDocument();
    });

    it('displays primary-colored bottom border on header', async () => {
      await renderApp();

      const header = screen.getByRole('heading', { level: 1 }).closest('header');
      expect(header).toHaveClass('border-b-[3px]', 'border-brand-primary');
    });
  });

  describe('keyboard navigation', () => {
    it('Tab navigates through interactive elements', async () => {
      const user = userEvent.setup();
      await renderApp(makeEvents(1));

      // Tab to sort selector
      await user.tab();
      const select = screen.getByRole('combobox', { name: 'Sort by' });
      expect(select).toHaveFocus();

      // Tab through star toggle button(s) in the event list
      await user.tab();

      // Tab through expand/collapse toggle
      await user.tab();

      // Tab to export button
      await user.tab();
      const exportBtn = screen.getByRole('button', { name: 'Export to calendar' });
      expect(exportBtn).toHaveFocus();

      // Tab to programme link
      await user.tab();
      const programmeLink = screen.getByRole('link', { name: 'Go to programme' });
      expect(programmeLink).toHaveFocus();

      // Tab to "Open full list" button
      await user.tab();
      const button = screen.getByRole('button', { name: 'Open full list' });
      expect(button).toHaveFocus();

      // Tab to "How it works" help link
      await user.tab();
      const helpLink = screen.getByRole('button', { name: 'How does it work?' });
      expect(helpLink).toHaveFocus();
    });

    it('Shift+Tab navigates backwards', async () => {
      const user = userEvent.setup();
      await renderApp(makeEvents(1));

      // Tab forward to reach "How it works" help link
      await user.tab(); // sort selector
      await user.tab(); // star toggle
      await user.tab(); // expand/collapse toggle
      await user.tab(); // export button
      await user.tab(); // programme link
      await user.tab(); // open full list
      await user.tab(); // help link
      const helpLink = screen.getByRole('button', { name: 'How does it work?' });
      expect(helpLink).toHaveFocus();

      // Shift+Tab back to "Open full list"
      await user.tab({ shift: true });
      const button = screen.getByRole('button', { name: 'Open full list' });
      expect(button).toHaveFocus();

      // Shift+Tab back to programme link
      await user.tab({ shift: true });
      const programmeLink = screen.getByRole('link', { name: 'Go to programme' });
      expect(programmeLink).toHaveFocus();

      // Shift+Tab back to export button
      await user.tab({ shift: true });
      const exportBtn = screen.getByRole('button', { name: 'Export to calendar' });
      expect(exportBtn).toHaveFocus();

      // Shift+Tab back to expand/collapse toggle
      await user.tab({ shift: true });

      // Shift+Tab back to star toggle
      await user.tab({ shift: true });

      // Shift+Tab back to sort selector
      await user.tab({ shift: true });
      const select = screen.getByRole('combobox', { name: 'Sort by' });
      expect(select).toHaveFocus();
    });

    it('Enter activates the "Open full list" button', async () => {
      const user = userEvent.setup();
      await renderApp();

      const button = screen.getByRole('button', { name: 'Open full list' });
      button.focus();
      await user.keyboard('{Enter}');

      expect(adapter.createTab).toHaveBeenCalledWith({ url: 'src/ui/stars/stars.html' });
    });

    it('Space activates the "Open full list" button', async () => {
      const user = userEvent.setup();
      await renderApp();

      const button = screen.getByRole('button', { name: 'Open full list' });
      button.focus();
      await user.keyboard(' ');

      expect(adapter.createTab).toHaveBeenCalledWith({ url: 'src/ui/stars/stars.html' });
    });
  });

  describe('onStorageChanged live updates', () => {
    it('registers an onStorageChanged listener on mount', async () => {
      await renderApp(makeEvents(1));

      expect(adapter.onStorageChanged).toHaveBeenCalledTimes(1);
      expect(adapter.onStorageChanged).toHaveBeenCalledWith(expect.any(Function));
    });

    it('re-fetches events when starredEvents changes externally', async () => {
      const initialEvents = makeEvents(2);
      await renderApp(initialEvents);

      // Clear previous sendMessage calls
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockClear();

      // Update the mock to return new events
      const updatedEvents = makeEvents(3);
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        (message: MessagePayload): Promise<MessageResponse<unknown>> => {
          if (message.command === 'GET_ALL_STARRED_EVENTS') {
            return Promise.resolve({ success: true as const, data: updatedEvents });
          }
          return Promise.resolve({ success: true as const, data: 'chronological' });
        },
      );

      // Trigger storage change
      await act(async () => {
        storageChangedCallback?.({ starredEvents: { newValue: {} } });
      });

      await waitFor(() => {
        expect(adapter.sendMessage).toHaveBeenCalledWith(
          expect.objectContaining({ command: 'GET_ALL_STARRED_EVENTS' }),
        );
      });
    });

    it('re-renders the event list after storage change', async () => {
      const initialEvents = [makeEvent({ id: 'e1', title: 'Initial Event' })];
      await renderApp(initialEvents);

      expect(screen.getByText('Initial Event')).toBeInTheDocument();

      // Update mock to return new events
      const updatedEvents = [
        makeEvent({ id: 'e1', title: 'Initial Event' }),
        makeEvent({ id: 'e2', title: 'New Event' }),
      ];
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        (message: MessagePayload): Promise<MessageResponse<unknown>> => {
          if (message.command === 'GET_ALL_STARRED_EVENTS') {
            return Promise.resolve({ success: true as const, data: updatedEvents });
          }
          return Promise.resolve({ success: true as const, data: 'chronological' });
        },
      );

      // Trigger storage change
      await act(async () => {
        storageChangedCallback?.({ starredEvents: { newValue: {} } });
      });

      await waitFor(() => {
        expect(screen.getByText('New Event')).toBeInTheDocument();
      });
    });

    it('does not re-fetch when non-starredEvents storage changes', async () => {
      await renderApp(makeEvents(1));

      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockClear();

      // Trigger storage change for a different key
      await act(async () => {
        storageChangedCallback?.({ sortOrder: { newValue: 'alphabetical-by-title' } });
      });

      // Should NOT have re-fetched
      expect(adapter.sendMessage).not.toHaveBeenCalledWith(
        expect.objectContaining({ command: 'GET_ALL_STARRED_EVENTS' }),
      );
    });

    it('cleans up onStorageChanged listener on unmount', async () => {
      const mockUnsubscribe = vi.fn();
      setupAdapter(makeEvents(1));
      (adapter.onStorageChanged as ReturnType<typeof vi.fn>).mockImplementation(
        (cb: (changes: Record<string, { readonly oldValue?: unknown; readonly newValue?: unknown }>) => void) => {
          storageChangedCallback = cb;
          return mockUnsubscribe;
        },
      );

      const { unmount } = render(<App adapter={adapter} />);
      await waitFor(() => {
        expect(screen.queryByText('…')).not.toBeInTheDocument();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });

  describe('i18n', () => {
    it('uses getMessage for all user-facing strings', async () => {
      await renderApp(makeEvents(1));

      expect(adapter.getMessage).toHaveBeenCalledWith('popupTitle');
      expect(adapter.getMessage).toHaveBeenCalledWith('openFullList');
      expect(adapter.getMessage).toHaveBeenCalledWith('sortLabel');
    });
  });
});
