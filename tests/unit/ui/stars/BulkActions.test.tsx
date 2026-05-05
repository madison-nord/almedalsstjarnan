/**
 * Unit tests for bulk selection, batch unstar, and batch export
 * on the Stars Page.
 *
 * Tests:
 * - BulkActions component rendering and interactions
 * - EventRow selection checkbox
 * - Batch unstar and batch export flows via the App
 *
 * Requirements: 2.5, 2.6
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
import { BulkActions } from '#ui/stars/components/BulkActions';
import { EventRow } from '#ui/stars/components/EventRow';

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
  undoAction: 'Undo',
  eventRemoved: 'Event removed',
  columnTitle: 'Title',
  columnOrganiser: 'Organiser',
  columnDateTime: 'Date & time',
  columnLocation: 'Location',
  columnTopic: 'Topic',
  columnActions: 'Actions',
  selectAll: 'Select all',
  unstarSelected: 'Unstar selected',
  exportSelected: 'Export selected',
  filterPlaceholder: 'Filter events…',
  filterLabel: 'Filter',
};

// ─── Helpers ──────────────────────────────────────────────────────

let adapter: IBrowserApiAdapter;

function setupAdapter(events: StarredEvent[] = [], sortOrder: SortOrder = 'chronological'): void {
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

  (adapter.onStorageChanged as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
  (adapter.download as ReturnType<typeof vi.fn>).mockResolvedValue(1);
}

async function renderApp(events: StarredEvent[] = []): Promise<void> {
  setupAdapter(events);
  render(<App adapter={adapter} />);
  await waitFor(() => {
    expect(screen.queryByText('…')).not.toBeInTheDocument();
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Bulk selection and batch actions', () => {
  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
    vi.stubGlobal('URL', {
      ...globalThis.URL,
      createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  describe('BulkActions component', () => {
    it('renders nothing when selectedCount is 0', () => {
      const { container } = render(
        <BulkActions
          selectedCount={0}
          totalCount={5}
          onSelectAll={vi.fn()}
          onClearSelection={vi.fn()}
          onUnstarSelected={vi.fn()}
          onExportSelected={vi.fn()}
          allSelected={false}
          adapter={adapter}
        />,
      );

      expect(container.innerHTML).toBe('');
    });

    it('renders action bar when selectedCount > 0', () => {
      setupAdapter();
      render(
        <BulkActions
          selectedCount={3}
          totalCount={5}
          onSelectAll={vi.fn()}
          onClearSelection={vi.fn()}
          onUnstarSelected={vi.fn()}
          onExportSelected={vi.fn()}
          allSelected={false}
          adapter={adapter}
        />,
      );

      expect(screen.getByRole('toolbar')).toBeInTheDocument();
      expect(screen.getByText('3 / 5')).toBeInTheDocument();
    });

    it('renders unstar selected button', () => {
      setupAdapter();
      render(
        <BulkActions
          selectedCount={2}
          totalCount={5}
          onSelectAll={vi.fn()}
          onClearSelection={vi.fn()}
          onUnstarSelected={vi.fn()}
          onExportSelected={vi.fn()}
          allSelected={false}
          adapter={adapter}
        />,
      );

      expect(screen.getByRole('button', { name: 'Unstar selected' })).toBeInTheDocument();
    });

    it('renders export selected button', () => {
      setupAdapter();
      render(
        <BulkActions
          selectedCount={2}
          totalCount={5}
          onSelectAll={vi.fn()}
          onClearSelection={vi.fn()}
          onUnstarSelected={vi.fn()}
          onExportSelected={vi.fn()}
          allSelected={false}
          adapter={adapter}
        />,
      );

      expect(screen.getByRole('button', { name: 'Export selected' })).toBeInTheDocument();
    });

    it('calls onUnstarSelected when unstar button is clicked', async () => {
      setupAdapter();
      const onUnstarSelected = vi.fn();
      const user = userEvent.setup();

      render(
        <BulkActions
          selectedCount={2}
          totalCount={5}
          onSelectAll={vi.fn()}
          onClearSelection={vi.fn()}
          onUnstarSelected={onUnstarSelected}
          onExportSelected={vi.fn()}
          allSelected={false}
          adapter={adapter}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Unstar selected' }));
      expect(onUnstarSelected).toHaveBeenCalledTimes(1);
    });

    it('calls onExportSelected when export button is clicked', async () => {
      setupAdapter();
      const onExportSelected = vi.fn();
      const user = userEvent.setup();

      render(
        <BulkActions
          selectedCount={2}
          totalCount={5}
          onSelectAll={vi.fn()}
          onClearSelection={vi.fn()}
          onUnstarSelected={vi.fn()}
          onExportSelected={onExportSelected}
          allSelected={false}
          adapter={adapter}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Export selected' }));
      expect(onExportSelected).toHaveBeenCalledTimes(1);
    });

    it('shows select all button when not all selected', () => {
      setupAdapter();
      render(
        <BulkActions
          selectedCount={2}
          totalCount={5}
          onSelectAll={vi.fn()}
          onClearSelection={vi.fn()}
          onUnstarSelected={vi.fn()}
          onExportSelected={vi.fn()}
          allSelected={false}
          adapter={adapter}
        />,
      );

      expect(screen.getByText('Select all')).toBeInTheDocument();
    });

    it('shows clear button when all are selected', () => {
      setupAdapter();
      render(
        <BulkActions
          selectedCount={5}
          totalCount={5}
          onSelectAll={vi.fn()}
          onClearSelection={vi.fn()}
          onUnstarSelected={vi.fn()}
          onExportSelected={vi.fn()}
          allSelected={true}
          adapter={adapter}
        />,
      );

      expect(screen.getByText('✕')).toBeInTheDocument();
    });
  });

  describe('EventRow selection checkbox', () => {
    it('renders a checkbox in the row', () => {
      setupAdapter();
      render(
        <table>
          <tbody>
            <EventRow
              event={makeEvent({ id: 'e1', title: 'Test Event' })}
              onUnstar={vi.fn()}
              adapter={adapter}
              isSelected={false}
              onToggleSelection={vi.fn()}
            />
          </tbody>
        </table>,
      );

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.length).toBeGreaterThanOrEqual(1);
    });

    it('checkbox is unchecked when isSelected is false', () => {
      setupAdapter();
      render(
        <table>
          <tbody>
            <EventRow
              event={makeEvent({ id: 'e1', title: 'Test Event' })}
              onUnstar={vi.fn()}
              adapter={adapter}
              isSelected={false}
              onToggleSelection={vi.fn()}
            />
          </tbody>
        </table>,
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('checkbox is checked when isSelected is true', () => {
      setupAdapter();
      render(
        <table>
          <tbody>
            <EventRow
              event={makeEvent({ id: 'e1', title: 'Test Event' })}
              onUnstar={vi.fn()}
              adapter={adapter}
              isSelected={true}
              onToggleSelection={vi.fn()}
            />
          </tbody>
        </table>,
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('calls onToggleSelection with event id when checkbox is clicked', async () => {
      setupAdapter();
      const onToggle = vi.fn();
      const user = userEvent.setup();

      render(
        <table>
          <tbody>
            <EventRow
              event={makeEvent({ id: 'e1', title: 'Test Event' })}
              onUnstar={vi.fn()}
              adapter={adapter}
              isSelected={false}
              onToggleSelection={onToggle}
            />
          </tbody>
        </table>,
      );

      const checkbox = screen.getByRole('checkbox');
      await user.click(checkbox);
      expect(onToggle).toHaveBeenCalledWith('e1');
    });

    it('checkbox has an accessible aria-label', () => {
      setupAdapter();
      render(
        <table>
          <tbody>
            <EventRow
              event={makeEvent({ id: 'e1', title: 'My Event' })}
              onUnstar={vi.fn()}
              adapter={adapter}
              isSelected={false}
              onToggleSelection={vi.fn()}
            />
          </tbody>
        </table>,
      );

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toHaveAttribute('aria-label');
    });
  });

  describe('Bulk selection integration via App', () => {
    it('renders select-all checkbox in the grid header', async () => {
      const events = [
        makeEvent({ id: 'e1', title: 'Event 1' }),
        makeEvent({ id: 'e2', title: 'Event 2' }),
      ];
      await renderApp(events);

      // The header row should have a checkbox
      const headerRow = screen.getAllByRole('row')[0]!;
      const headerCheckbox = headerRow.querySelector('input[type="checkbox"]');
      expect(headerCheckbox).toBeInTheDocument();
    });

    it('selecting an event shows the bulk actions bar', async () => {
      const events = [
        makeEvent({ id: 'e1', title: 'Event 1' }),
        makeEvent({ id: 'e2', title: 'Event 2' }),
      ];
      await renderApp(events);

      // Click the first event's checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      // checkboxes[0] is the header select-all, [1] and [2] are event rows
      fireEvent.click(checkboxes[1]!);

      await waitFor(() => {
        expect(screen.getByRole('toolbar')).toBeInTheDocument();
      });
    });

    it('select-all checkbox selects all events', async () => {
      const events = [
        makeEvent({ id: 'e1', title: 'Event 1' }),
        makeEvent({ id: 'e2', title: 'Event 2' }),
      ];
      await renderApp(events);

      // Click the select-all checkbox in the header
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]!);

      await waitFor(() => {
        expect(screen.getByRole('toolbar')).toBeInTheDocument();
        expect(screen.getByText('2 / 2')).toBeInTheDocument();
      });
    });

    it('batch unstar removes selected events from the grid', async () => {
      const events = [
        makeEvent({ id: 'e1', title: 'Event 1' }),
        makeEvent({ id: 'e2', title: 'Event 2' }),
        makeEvent({ id: 'e3', title: 'Event 3' }),
      ];
      await renderApp(events);

      vi.useFakeTimers({ shouldAdvanceTime: true });

      // Select first two events
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]!);
      fireEvent.click(checkboxes[2]!);

      await waitFor(() => {
        expect(screen.getByRole('toolbar')).toBeInTheDocument();
      });

      // Click unstar selected
      fireEvent.click(screen.getByRole('button', { name: 'Unstar selected' }));

      await waitFor(() => {
        expect(screen.getByRole('table')).not.toHaveTextContent('Event 1');
        expect(screen.getByRole('table')).not.toHaveTextContent('Event 2');
        expect(screen.getByRole('table')).toHaveTextContent('Event 3');
      });

      // Cleanup timers
      act(() => { vi.advanceTimersByTime(5000); });
      vi.useRealTimers();
    });

    it('batch export triggers ICS download for selected events only', async () => {
      const events = [
        makeEvent({ id: 'e1', title: 'Event 1' }),
        makeEvent({ id: 'e2', title: 'Event 2' }),
        makeEvent({ id: 'e3', title: 'Event 3' }),
      ];
      await renderApp(events);

      // Select first event only
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]!);

      await waitFor(() => {
        expect(screen.getByRole('toolbar')).toBeInTheDocument();
      });

      // Click export selected
      fireEvent.click(screen.getByRole('button', { name: 'Export selected' }));

      expect(adapter.download).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'blob:mock-url',
          filename: expect.stringMatching(/^almedalsstjarnan-starred-events-\d{8}-\d{6}\.ics$/),
        }),
      );
    });

    it('bulk actions bar disappears after batch unstar clears selection', async () => {
      const events = [
        makeEvent({ id: 'e1', title: 'Event 1' }),
        makeEvent({ id: 'e2', title: 'Event 2' }),
      ];
      await renderApp(events);

      vi.useFakeTimers({ shouldAdvanceTime: true });

      // Select all
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]!);

      await waitFor(() => {
        expect(screen.getByRole('toolbar')).toBeInTheDocument();
      });

      // Unstar selected
      fireEvent.click(screen.getByRole('button', { name: 'Unstar selected' }));

      await waitFor(() => {
        expect(screen.queryByRole('toolbar')).not.toBeInTheDocument();
      });

      // Cleanup timers
      act(() => { vi.advanceTimersByTime(5000); });
      vi.useRealTimers();
    });
  });
});
