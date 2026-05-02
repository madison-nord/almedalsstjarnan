/**
 * Unit tests for Stars Page App component.
 *
 * Tests the main Stars Page component including:
 * - Sends GET_ALL_STARRED_EVENTS and GET_SORT_ORDER on mount
 * - Displays all starred events in 6-column grid
 * - Column headers use localized labels
 * - Renders SortSelector with current sort order
 * - Changing sort order sends SET_SORT_ORDER and re-sorts
 * - Displays export button with localized "Export to calendar" label
 * - Clicking export triggers ICS generation and download
 * - Displays unstar action per event row
 * - Clicking unstar sends UNSTAR_EVENT and removes event from list
 * - Displays localized empty state when no events
 * - Uses Tailwind classes
 * - Keyboard navigable
 * - Registers an onStorageChanged listener via adapter that re-fetches
 *   and re-renders the event list when starredEvents changes externally
 *
 * Requirements: 10.1–10.12, 14.6
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

import { App } from '#ui/stars/App';

// ─── Test Data ────────────────────────────────────────────────────

function makeEvent(overrides: Partial<StarredEvent> & { readonly id: string }): StarredEvent {
  return {
    title: `Event ${overrides.id}`,
    organiser: 'Test Organiser',
    startDateTime: '2026-06-28T10:00:00+02:00',
    endDateTime: '2026-06-28T11:00:00+02:00',
    location: 'Visby',
    description: null,
    topic: 'Demokrati',
    sourceUrl: 'https://almedalsveckan.info/event/123',
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
  starsPageTitle: 'All starred events',
  exportToCalendar: 'Export to calendar',
  emptyStateTitle: 'No starred events',
  emptyStateMessage: 'Visit the Almedalsveckan programme and click the star to save events.',
  sortChronological: 'Chronological',
  sortReverseChronological: 'Reverse chronological',
  sortAlphabeticalTitle: 'Title A–Z',
  sortStarredDesc: 'Recently starred',
  sortLabel: 'Sort by',
  unstarAction: 'Remove',
  columnTitle: 'Title',
  columnOrganiser: 'Organiser',
  columnDateTime: 'Date & time',
  columnLocation: 'Location',
  columnTopic: 'Topic',
  columnActions: 'Actions',
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
        case 'UNSTAR_EVENT':
          return Promise.resolve({ success: true as const, data: undefined });
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

  (adapter.download as ReturnType<typeof vi.fn>).mockResolvedValue(1);
}

async function renderApp(events: StarredEvent[] = [], sortOrder: SortOrder = 'chronological'): Promise<void> {
  setupAdapter(events, sortOrder);
  render(<App adapter={adapter} />);
  await waitFor(() => {
    expect(screen.queryByText('…')).not.toBeInTheDocument();
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Stars Page App', () => {
  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
    // Mock URL.createObjectURL and URL.revokeObjectURL
    vi.stubGlobal('URL', {
      ...globalThis.URL,
      createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
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
      const commands = calls.map((call) => call[0].command);
      expect(commands).toContain('GET_ALL_STARRED_EVENTS');
      expect(commands).toContain('GET_SORT_ORDER');
    });
  });

  describe('6-column grid display', () => {
    it('displays all starred events (no cap)', async () => {
      const events = makeEvents(25);
      await renderApp(events);

      // All 25 events should be displayed (no 20-item cap like popup)
      for (let i = 1; i <= 25; i++) {
        expect(screen.getByText(`Event ${i}`)).toBeInTheDocument();
      }
    });

    it('displays column headers with localized labels', async () => {
      await renderApp(makeEvents(1));

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Organiser')).toBeInTheDocument();
      expect(screen.getByText('Date & time')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Topic')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('uses getMessage for column header labels', async () => {
      await renderApp(makeEvents(1));

      expect(adapter.getMessage).toHaveBeenCalledWith('columnTitle');
      expect(adapter.getMessage).toHaveBeenCalledWith('columnOrganiser');
      expect(adapter.getMessage).toHaveBeenCalledWith('columnDateTime');
      expect(adapter.getMessage).toHaveBeenCalledWith('columnLocation');
      expect(adapter.getMessage).toHaveBeenCalledWith('columnTopic');
      expect(adapter.getMessage).toHaveBeenCalledWith('columnActions');
    });

    it('displays event title in grid', async () => {
      const events = [makeEvent({ id: 'e1', title: 'Demokrati i förändring' })];
      await renderApp(events);

      expect(screen.getByText('Demokrati i förändring')).toBeInTheDocument();
    });

    it('displays event organiser in grid', async () => {
      const events = [makeEvent({ id: 'e1', organiser: 'Sveriges Riksdag' })];
      await renderApp(events);

      expect(screen.getByText('Sveriges Riksdag')).toBeInTheDocument();
    });

    it('displays event date-time in grid', async () => {
      const events = [makeEvent({ id: 'e1', startDateTime: '2026-06-28T10:00:00+02:00' })];
      await renderApp(events);

      expect(screen.getByText('2026-06-28T10:00:00+02:00')).toBeInTheDocument();
    });

    it('displays event location in grid', async () => {
      const events = [makeEvent({ id: 'e1', location: 'Donners plats, Visby' })];
      await renderApp(events);

      expect(screen.getByText('Donners plats, Visby')).toBeInTheDocument();
    });

    it('displays event topic in grid', async () => {
      const events = [makeEvent({ id: 'e1', topic: 'Demokrati' })];
      await renderApp(events);

      expect(screen.getByText('Demokrati')).toBeInTheDocument();
    });

    it('renders title as a link when sourceUrl is present', async () => {
      const events = [makeEvent({ id: 'e1', title: 'Linked Event', sourceUrl: 'https://almedalsveckan.info/event/e1' })];
      await renderApp(events);

      const link = screen.getByRole('link', { name: 'Linked Event' });
      expect(link).toHaveAttribute('href', 'https://almedalsveckan.info/event/e1');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders title as plain text when sourceUrl is null', async () => {
      const events = [makeEvent({ id: 'e1', title: 'Plain Event', sourceUrl: null })];
      await renderApp(events);

      expect(screen.getByText('Plain Event')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: 'Plain Event' })).not.toBeInTheDocument();
    });

    it('handles events with null optional fields', async () => {
      const events = [makeEvent({ id: 'e1', organiser: null, location: null, topic: null })];
      await renderApp(events);

      expect(screen.getByText(`Event e1`)).toBeInTheDocument();
    });
  });

  describe('SortSelector', () => {
    it('renders SortSelector with current sort order', async () => {
      await renderApp(makeEvents(3), 'reverse-chronological');

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('reverse-chronological');
    });

    it('changing sort order sends SET_SORT_ORDER', async () => {
      const user = userEvent.setup();
      await renderApp(makeEvents(3), 'chronological');

      const select = screen.getByRole('combobox');
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
      let rows = screen.getAllByRole('row');
      // First row is header, so data rows start at index 1
      expect(rows[1]).toHaveTextContent('Zebra event');
      expect(rows[2]).toHaveTextContent('Alpha event');

      // Change to alphabetical
      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'alphabetical-by-title');

      rows = screen.getAllByRole('row');
      expect(rows[1]).toHaveTextContent('Alpha event');
      expect(rows[2]).toHaveTextContent('Zebra event');
    });
  });

  describe('export button', () => {
    it('displays export button with localized label', async () => {
      await renderApp(makeEvents(1));

      expect(screen.getByRole('button', { name: 'Export to calendar' })).toBeInTheDocument();
    });

    it('uses getMessage for export button label', async () => {
      await renderApp(makeEvents(1));

      expect(adapter.getMessage).toHaveBeenCalledWith('exportToCalendar');
    });

    it('clicking export triggers ICS generation and download', async () => {
      const user = userEvent.setup();
      const events = makeEvents(2);
      await renderApp(events);

      const exportButton = screen.getByRole('button', { name: 'Export to calendar' });
      await user.click(exportButton);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(adapter.download).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'blob:mock-url',
          filename: expect.stringMatching(/^almedalsstjarnan-starred-events-\d{8}-\d{6}\.ics$/),
        }),
      );
    });

    it('revokes blob URL after download', async () => {
      const user = userEvent.setup();
      await renderApp(makeEvents(1));

      const exportButton = screen.getByRole('button', { name: 'Export to calendar' });
      await user.click(exportButton);

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  describe('unstar action', () => {
    it('displays unstar action per event row', async () => {
      await renderApp(makeEvents(3));

      const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
      expect(removeButtons).toHaveLength(3);
    });

    it('uses getMessage for unstar action label', async () => {
      await renderApp(makeEvents(1));

      expect(adapter.getMessage).toHaveBeenCalledWith('unstarAction');
    });

    it('clicking unstar sends UNSTAR_EVENT', async () => {
      const user = userEvent.setup();
      const events = [makeEvent({ id: 'e1', title: 'Event to remove' })];
      await renderApp(events);

      const removeButton = screen.getByRole('button', { name: 'Remove' });
      await user.click(removeButton);

      expect(adapter.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'UNSTAR_EVENT',
          eventId: 'e1',
        }),
      );
    });

    it('clicking unstar removes event from list', async () => {
      const user = userEvent.setup();
      const events = [
        makeEvent({ id: 'e1', title: 'Keep this' }),
        makeEvent({ id: 'e2', title: 'Remove this' }),
      ];
      await renderApp(events);

      expect(screen.getByText('Remove this')).toBeInTheDocument();

      const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
      // Click the second remove button (for 'Remove this')
      await user.click(removeButtons[1]!);

      await waitFor(() => {
        expect(screen.queryByText('Remove this')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Keep this')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('displays localized empty state when no events', async () => {
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

    it('does not display grid when no events', async () => {
      await renderApp([]);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('layout and styling', () => {
    it('displays stars page title heading', async () => {
      await renderApp();

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('All starred events');
    });

    it('uses getMessage for page title', async () => {
      await renderApp();

      expect(adapter.getMessage).toHaveBeenCalledWith('starsPageTitle');
    });

    it('uses Tailwind classes for styling', async () => {
      await renderApp(makeEvents(1));

      const heading = screen.getByRole('heading', { level: 1 });
      const container = heading.closest('div');
      expect(container).toHaveClass('bg-white');
    });
  });

  describe('keyboard navigation', () => {
    it('Tab navigates through interactive elements', async () => {
      const user = userEvent.setup();
      await renderApp(makeEvents(1));

      // Tab to sort selector
      await user.tab();
      const select = screen.getByRole('combobox');
      expect(select).toHaveFocus();

      // Tab to export button
      await user.tab();
      const exportButton = screen.getByRole('button', { name: 'Export to calendar' });
      expect(exportButton).toHaveFocus();
    });

    it('Shift+Tab navigates backwards', async () => {
      const user = userEvent.setup();
      await renderApp(makeEvents(1));

      // Tab forward twice
      await user.tab();
      await user.tab();
      const exportButton = screen.getByRole('button', { name: 'Export to calendar' });
      expect(exportButton).toHaveFocus();

      // Shift+Tab back to sort selector
      await user.tab({ shift: true });
      const select = screen.getByRole('combobox');
      expect(select).toHaveFocus();
    });

    it('Enter activates the export button', async () => {
      const user = userEvent.setup();
      await renderApp(makeEvents(1));

      const exportButton = screen.getByRole('button', { name: 'Export to calendar' });
      exportButton.focus();
      await user.keyboard('{Enter}');

      expect(adapter.download).toHaveBeenCalled();
    });

    it('Space activates the export button', async () => {
      const user = userEvent.setup();
      await renderApp(makeEvents(1));

      const exportButton = screen.getByRole('button', { name: 'Export to calendar' });
      exportButton.focus();
      await user.keyboard(' ');

      expect(adapter.download).toHaveBeenCalled();
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

      expect(adapter.getMessage).toHaveBeenCalledWith('starsPageTitle');
      expect(adapter.getMessage).toHaveBeenCalledWith('exportToCalendar');
      expect(adapter.getMessage).toHaveBeenCalledWith('sortLabel');
      expect(adapter.getMessage).toHaveBeenCalledWith('unstarAction');
      expect(adapter.getMessage).toHaveBeenCalledWith('columnTitle');
      expect(adapter.getMessage).toHaveBeenCalledWith('columnOrganiser');
      expect(adapter.getMessage).toHaveBeenCalledWith('columnDateTime');
      expect(adapter.getMessage).toHaveBeenCalledWith('columnLocation');
      expect(adapter.getMessage).toHaveBeenCalledWith('columnTopic');
      expect(adapter.getMessage).toHaveBeenCalledWith('columnActions');
    });
  });
});
