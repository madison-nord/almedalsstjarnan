/**
 * Unit tests for popup App integration with HelpModal.
 *
 * Tests onboarding state management: first-run display, persistence of
 * dismissal via GET_ONBOARDING_STATE / SET_ONBOARDING_STATE, error fallbacks,
 * and help link re-opening behaviour.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type {
  IBrowserApiAdapter,
  MessagePayload,
  MessageResponse,
} from '#core/types';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';

import { App } from '#ui/popup/App';

// ─── Helpers ──────────────────────────────────────────────────────

const messageMap: Record<string, string> = {
  popupTitle: 'Starred events',
  openFullList: 'Open full list',
  exportToCalendar: 'Export to calendar',
  emptyStateTitle: 'No starred events',
  emptyStateMessage: 'Visit the programme and click the star.',
  sortChronological: 'Chronological',
  sortReverseChronological: 'Reverse chronological',
  sortAlphabeticalTitle: 'Title A–Z',
  sortStarredDesc: 'Recently starred',
  sortLabel: 'Sort by',
  helpLink: 'How does it work?',
  helpModalTitle: 'How it works',
  helpModalDismiss: 'Close',
  goToProgramme: 'Go to programme',
  languageLabel: 'Language',
  languageVisibleLabel: 'Language:',
  languageAuto: 'Auto (browser)',
  languageSv: 'Svenska',
  languageEn: 'English',
  eventCountIndicator: '{count} of {total}',
  loadMore: 'Load more',
  helpGroupStarEventsHeading: 'Star Events',
  helpGroupStarEventsDesc: 'Click the star icon to save events.',
  helpGroupPopupViewHeading: 'Popup View',
  helpGroupPopupViewDesc: 'See your starred events in the popup.',
  helpGroupStarsPageHeading: 'Stars Page',
  helpGroupStarsPageDesc: 'Full list of starred events.',
  helpGroupSortingHeading: 'Sorting',
  helpGroupSortingDesc: 'Sort events by time or title.',
  helpGroupConflictHeading: 'Conflict Detection',
  helpGroupConflictDesc: 'See overlapping events.',
  helpGroupSearchFilterHeading: 'Search & Filter',
  helpGroupSearchFilterDesc: 'Find events quickly.',
  helpGroupBulkActionsHeading: 'Bulk Actions',
  helpGroupBulkActionsDesc: 'Select and manage multiple events.',
  helpGroupIcsExportHeading: 'ICS Export',
  helpGroupIcsExportDesc: 'Export to your calendar app.',
  helpGroupLanguageHeading: 'Language Toggle',
  helpGroupLanguageDesc: 'Switch between Swedish and English.',
};

let adapter: IBrowserApiAdapter;

interface SetupOptions {
  readonly onboardingDismissed?: boolean;
  readonly onboardingFails?: boolean;
  readonly setOnboardingFails?: boolean;
}

function setupAdapter(options: SetupOptions = {}): void {
  const { onboardingDismissed = false, onboardingFails = false, setOnboardingFails = false } = options;

  (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => messageMap[key] ?? '',
  );

  (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (message: MessagePayload): Promise<MessageResponse<unknown>> => {
      switch (message.command) {
        case 'GET_ALL_STARRED_EVENTS':
          return Promise.resolve({ success: true as const, data: [] });
        case 'GET_SORT_ORDER':
          return Promise.resolve({ success: true as const, data: 'chronological' });
        case 'GET_ONBOARDING_STATE':
          if (onboardingFails) {
            return Promise.resolve({ success: false as const, error: 'Storage error' });
          }
          return Promise.resolve({ success: true as const, data: onboardingDismissed });
        case 'SET_ONBOARDING_STATE':
          if (setOnboardingFails) {
            return Promise.resolve({ success: false as const, error: 'Storage error' });
          }
          return Promise.resolve({ success: true as const, data: undefined });
        case 'GET_LANGUAGE_PREFERENCE':
          return Promise.resolve({ success: true as const, data: null });
        default:
          return Promise.resolve({ success: true as const, data: undefined });
      }
    },
  );

  (adapter.onStorageChanged as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
}

function waitForAppLoaded(): Promise<void> {
  return waitFor(() => {
    expect(screen.queryByText('…')).not.toBeInTheDocument();
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Popup App — HelpModal integration', () => {
  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
  });

  describe('First-run onboarding (Requirement 2.1)', () => {
    it('shows HelpModal when GET_ONBOARDING_STATE returns false (not dismissed)', async () => {
      setupAdapter({ onboardingDismissed: false });
      render(<App adapter={adapter} />);
      await waitForAppLoaded();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });
  });

  describe('Already dismissed (Requirement 2.3)', () => {
    it('does NOT show HelpModal when GET_ONBOARDING_STATE returns true (dismissed)', async () => {
      setupAdapter({ onboardingDismissed: true });
      render(<App adapter={adapter} />);
      await waitForAppLoaded();

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('GET_ONBOARDING_STATE failure (Requirement 2.4)', () => {
    it('defaults to showing HelpModal when GET_ONBOARDING_STATE fails', async () => {
      setupAdapter({ onboardingFails: true });
      render(<App adapter={adapter} />);
      await waitForAppLoaded();

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });
  });

  describe('Dismiss persists state (Requirement 2.2)', () => {
    it('hides modal and calls SET_ONBOARDING_STATE with dismissed: true on dismiss', async () => {
      setupAdapter({ onboardingDismissed: false });
      render(<App adapter={adapter} />);
      await waitForAppLoaded();

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // Click dismiss button (aria-label = 'Close')
      const dismissButton = screen.getByLabelText('Close');
      fireEvent.click(dismissButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      expect(adapter.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          command: 'SET_ONBOARDING_STATE',
          dismissed: true,
        }),
      );
    });
  });

  describe('SET_ONBOARDING_STATE failure (Requirement 2.5)', () => {
    it('still hides modal for current session even when SET_ONBOARDING_STATE fails', async () => {
      setupAdapter({ onboardingDismissed: false, setOnboardingFails: true });
      render(<App adapter={adapter} />);
      await waitForAppLoaded();

      expect(screen.getByRole('dialog')).toBeInTheDocument();

      const dismissButton = screen.getByLabelText('Close');
      fireEvent.click(dismissButton);

      // Modal should still hide regardless of SET failure
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Help link re-opens modal (Requirement 2.6)', () => {
    it('re-opens HelpModal without calling SET_ONBOARDING_STATE', async () => {
      setupAdapter({ onboardingDismissed: true });
      render(<App adapter={adapter} />);
      await waitForAppLoaded();

      // Modal should not be shown initially (already dismissed)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

      // Clear call history so we can verify no SET_ONBOARDING_STATE is sent
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockClear();

      // Re-setup mock to still respond to messages but track calls
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
        (message: MessagePayload): Promise<MessageResponse<unknown>> => {
          switch (message.command) {
            default:
              return Promise.resolve({ success: true as const, data: undefined });
          }
        },
      );

      // Click the help link
      const helpLink = screen.getByText('How does it work?');
      fireEvent.click(helpLink);

      // Modal should now be open
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      // SET_ONBOARDING_STATE should NOT have been called
      const setCalls = (adapter.sendMessage as ReturnType<typeof vi.fn>).mock.calls.filter(
        (call: unknown[]) => (call[0] as MessagePayload).command === 'SET_ONBOARDING_STATE',
      );
      expect(setCalls).toHaveLength(0);
    });
  });
});
