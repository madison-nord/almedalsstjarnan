/**
 * Unit tests for Popup layout classes — scroll containment and sticky footer.
 *
 * Verifies that the popup App component uses the correct Tailwind classes
 * to achieve fixed height, overflow containment, and sticky header/footer.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type {
  IBrowserApiAdapter,
  MessagePayload,
  MessageResponse,
  StarredEvent,
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
  goToProgramme: 'Go to programme',
  languageLabel: 'Language',
  languageVisibleLabel: 'Language:',
  languageAuto: 'Auto (browser)',
  languageSv: 'Svenska',
  languageEn: 'English',
  eventCountIndicator: '{count} of {total}',
  loadMore: 'Load more',
};

const sampleEvents: StarredEvent[] = [
  {
    id: 'evt-1',
    title: 'Test Event',
    startDateTime: '2026-06-28T10:00:00+02:00',
    endDateTime: '2026-06-28T11:00:00+02:00',
    location: 'Visby',
    organiser: 'Org',
    topic: 'Topic',
    description: 'Desc',
    sourceUrl: 'https://example.com',
    icsDataUri: null,
    starred: true,
    starredAt: '2026-01-01T00:00:00Z',
  },
];

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
        case 'GET_ONBOARDING_STATE':
          return Promise.resolve({ success: true as const, data: true });
        case 'GET_LANGUAGE_PREFERENCE':
          return Promise.resolve({ success: true as const, data: null });
        default:
          return Promise.resolve({ success: true as const, data: undefined });
      }
    },
  );

  (adapter.onStorageChanged as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Popup layout — scroll containment and sticky footer', () => {
  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
  });

  describe('Root container', () => {
    it('has h-[560px] class for fixed height', async () => {
      setupAdapter();
      const { container } = render(<App adapter={adapter} />);
      await waitFor(() => {
        expect(screen.queryByText('…')).not.toBeInTheDocument();
      });

      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain('h-[560px]');
    });

    it('has min-h-[560px] class for minimum height', async () => {
      setupAdapter();
      const { container } = render(<App adapter={adapter} />);
      await waitFor(() => {
        expect(screen.queryByText('…')).not.toBeInTheDocument();
      });

      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain('min-h-[560px]');
    });

    it('has overflow-hidden to prevent popup-level scrolling', async () => {
      setupAdapter();
      const { container } = render(<App adapter={adapter} />);
      await waitFor(() => {
        expect(screen.queryByText('…')).not.toBeInTheDocument();
      });

      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain('overflow-hidden');
    });

    it('has flex flex-col for vertical layout', async () => {
      setupAdapter();
      const { container } = render(<App adapter={adapter} />);
      await waitFor(() => {
        expect(screen.queryByText('…')).not.toBeInTheDocument();
      });

      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain('flex');
      expect(root.className).toContain('flex-col');
    });
  });

  describe('Header', () => {
    it('has flex-shrink-0 class to prevent shrinking', async () => {
      setupAdapter();
      render(<App adapter={adapter} />);
      await waitFor(() => {
        expect(screen.queryByText('…')).not.toBeInTheDocument();
      });

      const header = document.querySelector('header');
      expect(header).not.toBeNull();
      expect(header!.className).toContain('flex-shrink-0');
    });
  });

  describe('Footer', () => {
    it('has flex-shrink-0 class to stay pinned at bottom', async () => {
      setupAdapter();
      render(<App adapter={adapter} />);
      await waitFor(() => {
        expect(screen.queryByText('…')).not.toBeInTheDocument();
      });

      const footer = document.querySelector('footer');
      expect(footer).not.toBeNull();
      expect(footer!.className).toContain('flex-shrink-0');
    });
  });

  describe('EventList area', () => {
    it('has flex-1 overflow-hidden wrapper around event content', async () => {
      setupAdapter(sampleEvents);
      const { container } = render(<App adapter={adapter} />);
      await waitFor(() => {
        expect(screen.queryByText('…')).not.toBeInTheDocument();
      });

      // The EventList is wrapped in a div with flex-1 overflow-hidden
      // Find the wrapper div that is a direct child of the root and has flex-1
      const root = container.firstElementChild as HTMLElement;
      const children = Array.from(root.children);
      const eventListWrapper = children.find(
        (el) => el.className.includes('flex-1') && el.className.includes('overflow-hidden'),
      );
      expect(eventListWrapper).toBeDefined();
      expect(eventListWrapper!.className).toContain('flex-1');
      expect(eventListWrapper!.className).toContain('overflow-hidden');
    });
  });

  describe('Loading state', () => {
    it('uses h-[560px] for fixed height', () => {
      // Don't resolve the sendMessage so loading state stays visible
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise(() => {}),
      );
      (adapter.getMessage as ReturnType<typeof vi.fn>).mockReturnValue('');
      (adapter.onStorageChanged as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());

      const { container } = render(<App adapter={adapter} />);

      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain('h-[560px]');
    });

    it('uses min-h-[560px] for minimum height', () => {
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise(() => {}),
      );
      (adapter.getMessage as ReturnType<typeof vi.fn>).mockReturnValue('');
      (adapter.onStorageChanged as ReturnType<typeof vi.fn>).mockReturnValue(vi.fn());

      const { container } = render(<App adapter={adapter} />);

      const root = container.firstElementChild as HTMLElement;
      expect(root.className).toContain('min-h-[560px]');
    });
  });
});
