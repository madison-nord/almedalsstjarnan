/**
 * Unit tests for Stars Page App — HelpModal integration.
 *
 * Tests:
 * - Help trigger button is visible in header
 * - Clicking help trigger opens HelpModal (dialog role appears)
 * - Dismissing HelpModal closes it and returns focus to trigger
 * - Help trigger displays localized text from adapter.getMessage('helpModalTitle')
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import type {
  IBrowserApiAdapter,
  StarredEvent,
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
  columnTitle: 'Title',
  columnOrganiser: 'Organiser',
  columnDateTime: 'Date & time',
  columnLocation: 'Location',
  columnTopic: 'Topic',
  columnActions: 'Actions',
  helpModalTitle: 'Help & features',
  helpModalDismiss: 'Close',
  helpGroupStarEventsHeading: 'Star events',
  helpGroupStarEventsDesc: 'Click the star to save events.',
  helpGroupPopupViewHeading: 'Popup view',
  helpGroupPopupViewDesc: 'See starred events in the popup.',
  helpGroupStarsPageHeading: 'Stars page',
  helpGroupStarsPageDesc: 'View all starred events on a dedicated page.',
  helpGroupSortingHeading: 'Sorting',
  helpGroupSortingDesc: 'Sort events by different criteria.',
  helpGroupConflictHeading: 'Conflict detection',
  helpGroupConflictDesc: 'Detect time overlaps.',
  helpGroupSearchFilterHeading: 'Search & filter',
  helpGroupSearchFilterDesc: 'Filter events by keyword.',
  helpGroupBulkActionsHeading: 'Bulk actions',
  helpGroupBulkActionsDesc: 'Select and act on multiple events.',
  helpGroupIcsExportHeading: 'ICS export',
  helpGroupIcsExportDesc: 'Export to calendar format.',
  helpGroupLanguageHeading: 'Language toggle',
  helpGroupLanguageDesc: 'Switch between Swedish and English.',
  searchFilterPlaceholder: 'Filter events…',
};

// ─── Helpers ──────────────────────────────────────────────────────

let adapter: IBrowserApiAdapter;

function setupAdapter(events: StarredEvent[] = []): void {
  (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => messageMap[key] ?? '',
  );

  (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (message: MessagePayload): Promise<MessageResponse<unknown>> => {
      switch (message.command) {
        case 'GET_ALL_STARRED_EVENTS':
          return Promise.resolve({ success: true as const, data: events });
        case 'GET_SORT_ORDER':
          return Promise.resolve({ success: true as const, data: 'chronological' });
        case 'GET_LANGUAGE_PREFERENCE':
          return Promise.resolve({ success: true as const, data: null });
        default:
          return Promise.resolve({ success: true as const, data: undefined });
      }
    },
  );

  (adapter.onStorageChanged as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
}

async function renderApp(events: StarredEvent[] = []): Promise<void> {
  setupAdapter(events);
  render(<App adapter={adapter} />);
  await waitFor(() => {
    expect(screen.queryByText('…')).not.toBeInTheDocument();
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Stars Page App — HelpModal integration', () => {
  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
    vi.stubGlobal('URL', {
      ...globalThis.URL,
      createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  describe('help trigger button visibility (Requirement 4.1)', () => {
    it('renders a help trigger button in the header', async () => {
      await renderApp([makeEvent({ id: 'e1' })]);

      const helpButton = screen.getByRole('button', { name: 'Help & features' });
      expect(helpButton).toBeInTheDocument();
    });

    it('help trigger is inside the header element', async () => {
      await renderApp([makeEvent({ id: 'e1' })]);

      const helpButton = screen.getByRole('button', { name: 'Help & features' });
      const header = helpButton.closest('header');
      expect(header).not.toBeNull();
    });

    it('help trigger is visually consistent with header UI (Requirement 4.4)', async () => {
      await renderApp([makeEvent({ id: 'e1' })]);

      const helpButton = screen.getByRole('button', { name: 'Help & features' });
      expect(helpButton).toHaveClass('text-sm');
    });
  });

  describe('clicking help trigger opens HelpModal (Requirement 4.2)', () => {
    it('clicking help trigger opens a dialog', async () => {
      const user = userEvent.setup();
      await renderApp([makeEvent({ id: 'e1' })]);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      const helpButton = screen.getByRole('button', { name: 'Help & features' });
      await user.click(helpButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('opened dialog has aria-modal="true"', async () => {
      const user = userEvent.setup();
      await renderApp([makeEvent({ id: 'e1' })]);

      const helpButton = screen.getByRole('button', { name: 'Help & features' });
      await user.click(helpButton);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('opened dialog displays feature groups', async () => {
      const user = userEvent.setup();
      await renderApp([makeEvent({ id: 'e1' })]);

      const helpButton = screen.getByRole('button', { name: 'Help & features' });
      await user.click(helpButton);

      expect(screen.getByText('Star events')).toBeInTheDocument();
      expect(screen.getByText('ICS export')).toBeInTheDocument();
    });
  });

  describe('dismissing HelpModal closes it and returns focus (Requirement 4.3)', () => {
    it('pressing Escape closes the HelpModal', async () => {
      const user = userEvent.setup();
      await renderApp([makeEvent({ id: 'e1' })]);

      const helpButton = screen.getByRole('button', { name: 'Help & features' });
      await user.click(helpButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      await user.keyboard('{Escape}');

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('clicking the dismiss button closes the HelpModal', async () => {
      const user = userEvent.setup();
      await renderApp([makeEvent({ id: 'e1' })]);

      const helpButton = screen.getByRole('button', { name: 'Help & features' });
      await user.click(helpButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const dismissButton = screen.getByRole('button', { name: 'Close' });
      await user.click(dismissButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('after closing, focus returns to the help trigger button', async () => {
      const user = userEvent.setup();
      await renderApp([makeEvent({ id: 'e1' })]);

      const helpButton = screen.getByRole('button', { name: 'Help & features' });
      await user.click(helpButton);

      await user.keyboard('{Escape}');

      expect(helpButton).toHaveFocus();
    });

    it('clicking backdrop closes the HelpModal', async () => {
      const user = userEvent.setup();
      await renderApp([makeEvent({ id: 'e1' })]);

      const helpButton = screen.getByRole('button', { name: 'Help & features' });
      await user.click(helpButton);

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // The backdrop is the element with bg-black/40 class
      const backdrop = screen.getByRole('dialog').parentElement!.querySelector('.bg-black\\/40');
      expect(backdrop).not.toBeNull();
      await act(async () => {
        backdrop!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('help trigger displays localized text (Requirements 4.3, 4.4)', () => {
    it('help trigger text is retrieved via adapter.getMessage("helpModalTitle")', async () => {
      await renderApp([makeEvent({ id: 'e1' })]);

      expect(adapter.getMessage).toHaveBeenCalledWith('helpModalTitle');
      const helpButton = screen.getByRole('button', { name: 'Help & features' });
      expect(helpButton).toHaveTextContent('Help & features');
    });

    it('help trigger displays different text when getMessage returns different value', async () => {
      (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => {
          if (key === 'helpModalTitle') return 'Hjälp & funktioner';
          return messageMap[key] ?? '';
        },
      );

      setupAdapter([makeEvent({ id: 'e1' })]);
      // Override getMessage again after setupAdapter
      (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => {
          if (key === 'helpModalTitle') return 'Hjälp & funktioner';
          return messageMap[key] ?? '';
        },
      );

      render(<App adapter={adapter} />);
      await waitFor(() => {
        expect(screen.queryByText('…')).not.toBeInTheDocument();
      });

      const helpButton = screen.getByRole('button', { name: 'Hjälp & funktioner' });
      expect(helpButton).toBeInTheDocument();
    });
  });
});
