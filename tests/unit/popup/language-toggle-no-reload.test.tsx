/**
 * Unit tests for handleLocaleChange in Popup App.
 *
 * TDD — written BEFORE the fix. These tests verify:
 * - handleLocaleChange does NOT call window.location.reload()
 * - Changing locale triggers a React re-render with new locale state
 * - The popup App component re-renders children with updated locale key
 *
 * Expected to FAIL on unfixed code because the current implementation
 * calls window.location.reload() which closes the Chrome extension popup.
 *
 * Requirements: 1.3, 2.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import type {
  IBrowserApiAdapter,
  SortOrder,
  MessagePayload,
  MessageResponse,
} from '#core/types';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';

import { App } from '#ui/popup/App';

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
  languageLabel: 'Language',
  languageVisibleLabel: 'Language:',
  languageAuto: 'Auto (browser)',
  languageSv: 'Svenska',
  languageEn: 'English',
  reloadPopupHint: 'Reload to apply',
};

// ─── Helpers ──────────────────────────────────────────────────────

let adapter: IBrowserApiAdapter;
let reloadSpy: ReturnType<typeof vi.fn>;

function setupAdapter(sortOrder: SortOrder = 'chronological'): void {
  (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => messageMap[key] ?? '',
  );

  (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (message: MessagePayload): Promise<MessageResponse<unknown>> => {
      switch (message.command) {
        case 'GET_ALL_STARRED_EVENTS':
          return Promise.resolve({ success: true as const, data: [] });
        case 'GET_SORT_ORDER':
          return Promise.resolve({ success: true as const, data: sortOrder });
        case 'GET_ONBOARDING_STATE':
          return Promise.resolve({ success: true as const, data: true });
        case 'GET_LANGUAGE_PREFERENCE':
          return Promise.resolve({ success: true as const, data: 'sv' });
        case 'SET_LANGUAGE_PREFERENCE':
          return Promise.resolve({ success: true as const, data: undefined });
        default:
          return Promise.resolve({ success: true as const, data: undefined });
      }
    },
  );

  (adapter.onStorageChanged as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
}

async function renderApp(): Promise<void> {
  setupAdapter();
  render(<App adapter={adapter} />);
  await waitFor(() => {
    expect(screen.queryByText('…')).not.toBeInTheDocument();
  });
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Popup App — handleLocaleChange (no reload)', () => {
  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;

    // Mock window.location.reload to track calls
    reloadSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload: reloadSpy },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('does NOT call window.location.reload() when locale changes', async () => {
    const user = userEvent.setup();
    await renderApp();

    // Find the language select and change it
    const languageSelect = screen.getByRole('combobox', { name: /språk|language/i });
    await user.selectOptions(languageSelect, 'en');

    // The bug: current code calls window.location.reload()
    // After fix: reload should NOT be called
    expect(reloadSpy).not.toHaveBeenCalled();
  });

  it('re-renders the popup UI with new locale after language change', async () => {
    // Track getMessage calls to verify re-render with new locale
    let currentLocale: 'sv' | 'en' | null = 'sv';

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
            return Promise.resolve({ success: true as const, data: true });
          case 'GET_LANGUAGE_PREFERENCE':
            return Promise.resolve({ success: true as const, data: currentLocale });
          case 'SET_LANGUAGE_PREFERENCE':
            currentLocale = (message as unknown as { locale: 'sv' | 'en' | null }).locale;
            return Promise.resolve({ success: true as const, data: undefined });
          default:
            return Promise.resolve({ success: true as const, data: undefined });
        }
      },
    );

    (adapter.onStorageChanged as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());

    const user = userEvent.setup();
    render(<App adapter={adapter} />);
    await waitFor(() => {
      expect(screen.queryByText('…')).not.toBeInTheDocument();
    });

    // Verify initial render shows Swedish empty state (from bundled locale data)
    expect(screen.getByText('Inga stjärnmärkta evenemang')).toBeInTheDocument();

    // Change locale to English
    const languageSelect = screen.getByRole('combobox', { name: /språk|language/i });
    await user.selectOptions(languageSelect, 'en');

    // After fix: the component should re-render with English strings
    // without calling window.location.reload()
    await waitFor(() => {
      expect(screen.getByText('No starred events')).toBeInTheDocument();
    });
  });

  it('re-renders children with updated locale key when language changes', async () => {
    const user = userEvent.setup();
    await renderApp();

    // Get the initial empty state message (Swedish because locale is 'sv')
    expect(screen.getByText('Inga stjärnmärkta evenemang')).toBeInTheDocument();

    // Change locale — this should trigger a re-render (remount via key change)
    const languageSelect = screen.getByRole('combobox', { name: /språk|language/i });
    await user.selectOptions(languageSelect, 'en');

    // After fix: the component tree should be re-mounted with the new locale key
    // which causes children to re-fetch i18n strings from the adapter
    // The popup should still be open (no reload) and display content
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    });

    // Verify reload was never called
    expect(reloadSpy).not.toHaveBeenCalled();
  });
});
