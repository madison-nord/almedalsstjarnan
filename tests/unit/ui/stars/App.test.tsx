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
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
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
  extensionName: 'Almedalsstjärnan',
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
  undoAction: 'Undo',
  eventRemoved: 'Event removed',
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
      // Actions header is visually hidden (sr-only) but still in the DOM for accessibility
      const actionsText = screen.getByText('Actions');
      expect(actionsText).toBeInTheDocument();
      expect(actionsText).toHaveClass('sr-only');
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
      const events = [makeEvent({ id: 'e1', startDateTime: '2026-06-28T10:00:00+02:00', endDateTime: '2026-06-28T11:00:00+02:00' })];
      await renderApp(events);

      expect(screen.getByText('Sön 28 juni 10:00\u201311:00')).toBeInTheDocument();
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
      // Row layout: [0] thead, [1] section header (June 28), [2] Zebra, [3] section header (June 29), [4] Alpha
      let rows = screen.getAllByRole('row');
      expect(rows[2]).toHaveTextContent('Zebra event');
      expect(rows[4]).toHaveTextContent('Alpha event');

      // Change to alphabetical
      const select = screen.getByRole('combobox');
      await user.selectOptions(select, 'alphabetical-by-title');

      // After alphabetical sort: Alpha (June 29) first, then Zebra (June 28)
      // Row layout: [0] thead, [1] section header (June 29), [2] Alpha, [3] section header (June 28), [4] Zebra
      rows = screen.getAllByRole('row');
      expect(rows[2]).toHaveTextContent('Alpha event');
      expect(rows[4]).toHaveTextContent('Zebra event');
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

    it('clicking unstar removes event from grid immediately (optimistic)', async () => {
      const events = [
        makeEvent({ id: 'e1', title: 'Keep this' }),
        makeEvent({ id: 'e2', title: 'Remove this' }),
      ];
      await renderApp(events);

      vi.useFakeTimers({ shouldAdvanceTime: true });

      const table = screen.getByRole('table');
      expect(table).toHaveTextContent('Remove this');

      const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
      // Click the second remove button (for 'Remove this')
      fireEvent.click(removeButtons[1]!);

      await waitFor(() => {
        // Event should no longer be in the table
        expect(screen.getByRole('table')).not.toHaveTextContent('Remove this');
      });
      expect(screen.getByRole('table')).toHaveTextContent('Keep this');

      // Cleanup: advance timer to avoid pending timers
      act(() => { vi.advanceTimersByTime(5000); });
      vi.useRealTimers();
    });

    it('clicking unstar sends UNSTAR_EVENT immediately for instant sync', async () => {
      const events = [makeEvent({ id: 'e1', title: 'Event to remove' })];
      await renderApp(events);

      vi.useFakeTimers({ shouldAdvanceTime: true });
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockClear();

      const removeButton = screen.getByRole('button', { name: 'Remove' });
      fireEvent.click(removeButton);

      // UNSTAR_EVENT should be sent immediately for instant cross-view sync
      expect(adapter.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'UNSTAR_EVENT',
          eventId: 'e1',
        }),
      );

      // Cleanup: advance timer to avoid pending timers
      act(() => { vi.advanceTimersByTime(5000); });
      vi.useRealTimers();
    });

    it('clicking unstar shows an undo toast', async () => {
      const events = [makeEvent({ id: 'e1', title: 'Event to remove' })];
      await renderApp(events);

      vi.useFakeTimers({ shouldAdvanceTime: true });

      const removeButton = screen.getByRole('button', { name: 'Remove' });
      fireEvent.click(removeButton);

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText('Event to remove')).toBeInTheDocument();

      // Cleanup: advance timer to avoid pending timers
      act(() => { vi.advanceTimersByTime(5000); });
      vi.useRealTimers();
    });

    it('sends UNSTAR_EVENT after undo toast timer expires', async () => {
      const events = [makeEvent({ id: 'e1', title: 'Event to remove' })];
      await renderApp(events);

      vi.useFakeTimers({ shouldAdvanceTime: true });
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockClear();

      const removeButton = screen.getByRole('button', { name: 'Remove' });
      fireEvent.click(removeButton);

      // Advance past the 5-second timer
      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(adapter.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'UNSTAR_EVENT',
          eventId: 'e1',
        }),
      );

      vi.useRealTimers();
    });

    it('clicking undo restores the event and sends STAR_EVENT', async () => {
      const events = [
        makeEvent({ id: 'e1', title: 'Event to restore' }),
        makeEvent({ id: 'e2', title: 'Another event' }),
      ];
      await renderApp(events);

      vi.useFakeTimers({ shouldAdvanceTime: true });

      const removeButtons = screen.getAllByRole('button', { name: 'Remove' });
      fireEvent.click(removeButtons[0]!);

      // Event should be gone from the table
      expect(screen.getByRole('table')).not.toHaveTextContent('Event to restore');

      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockClear();

      // Click the undo button
      const undoButton = screen.getByRole('button', { name: 'Undo' });
      fireEvent.click(undoButton);

      await waitFor(() => {
        expect(screen.getByRole('table')).toHaveTextContent('Event to restore');
      });

      expect(adapter.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'STAR_EVENT',
        }),
      );

      vi.useRealTimers();
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
    it('displays stars page branded header with extension name', async () => {
      await renderApp();

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Almedalsstjärnan');
    });

    it('uses getMessage for branded header title', async () => {
      await renderApp();

      expect(adapter.getMessage).toHaveBeenCalledWith('extensionName');
    });

    it('uses Tailwind classes for styling', async () => {
      await renderApp(makeEvents(1));

      const heading = screen.getByRole('heading', { level: 1 });
      const header = heading.closest('header');
      expect(header).toHaveClass('bg-brand-secondary');
    });

    it('page container uses bg-brand-surface background (Requirement 16.1)', async () => {
      await renderApp(makeEvents(1));

      const heading = screen.getByRole('heading', { level: 1 });
      const pageContainer = heading.closest('div.min-h-screen');
      expect(pageContainer).toHaveClass('bg-brand-surface');
    });

    it('does not constrain content with max-w-7xl class', async () => {
      await renderApp(makeEvents(1));

      const header = screen.getByRole('heading', { level: 1 }).closest('header');
      expect(header).not.toHaveClass('max-w-7xl');

      const table = screen.getByRole('table');
      const main = table.closest('main');
      expect(main).not.toHaveClass('max-w-7xl');
    });

    it('header and main containers use full width with padding', async () => {
      await renderApp(makeEvents(1));

      const header = screen.getByRole('heading', { level: 1 }).closest('header');
      expect(header).toHaveClass('px-4');

      const table = screen.getByRole('table');
      const main = table.closest('main');
      expect(main).toHaveClass('w-full');
      expect(main).toHaveClass('px-4');
    });

    it('branded header has bg-brand-secondary background (Requirement 17.1)', async () => {
      await renderApp(makeEvents(1));

      const header = screen.getByRole('heading', { level: 1 }).closest('header');
      expect(header).toHaveClass('bg-brand-secondary');
    });

    it('branded header has 3px amber bottom border (Requirement 17.3)', async () => {
      await renderApp(makeEvents(1));

      const header = screen.getByRole('heading', { level: 1 }).closest('header');
      expect(header).toHaveClass('border-b-[3px]');
      expect(header).toHaveClass('border-brand-primary');
    });

    it('branded header displays amber star icon (Requirement 17.2)', async () => {
      await renderApp(makeEvents(1));

      const header = screen.getByRole('heading', { level: 1 }).closest('header');
      const starIcon = header!.querySelector('[aria-hidden="true"]');
      expect(starIcon).toBeInTheDocument();
      expect(starIcon).toHaveTextContent('★');
      expect(starIcon).toHaveClass('text-brand-accent');
    });

    it('branded header title is white and bold (Requirement 7.5)', async () => {
      await renderApp(makeEvents(1));

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveClass('text-white');
      expect(heading).toHaveClass('font-bold');
    });

    it('branded header uses extensionName i18n key (Requirement 7.5)', async () => {
      await renderApp(makeEvents(1));

      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent('Almedalsstjärnan');
      expect(adapter.getMessage).toHaveBeenCalledWith('extensionName');
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

      // Tab to search filter input
      await user.tab();
      const filterInput = screen.getByRole('textbox');
      expect(filterInput).toHaveFocus();

      // Tab to export button
      await user.tab();
      const exportButton = screen.getByRole('button', { name: 'Export to calendar' });
      expect(exportButton).toHaveFocus();
    });

    it('Shift+Tab navigates backwards', async () => {
      const user = userEvent.setup();
      await renderApp(makeEvents(1));

      // Tab forward three times (sort → filter → export)
      await user.tab();
      await user.tab();
      await user.tab();
      const exportButton = screen.getByRole('button', { name: 'Export to calendar' });
      expect(exportButton).toHaveFocus();

      // Shift+Tab back to filter input
      await user.tab({ shift: true });
      const filterInput = screen.getByRole('textbox');
      expect(filterInput).toHaveFocus();

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

      expect(adapter.getMessage).toHaveBeenCalledWith('extensionName');
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
