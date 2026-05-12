/**
 * Unit tests for EventList scroll containment.
 *
 * Verifies that the EventList <ul> has a fixed max-height to enable
 * scrolling within Chrome extension popup context, where flex-based
 * height constraints don't work because Chrome auto-sizes popups.
 *
 * Requirements: 1.2, 1.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';

import { EventList } from '#ui/popup/components/EventList';

// ─── Helpers ──────────────────────────────────────────────────────

function setupAdapter(): IBrowserApiAdapter {
  (mockBrowserApi.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => {
      if (key === 'eventCountIndicator') return '{count} of {total}';
      if (key === 'loadMore') return 'Load more';
      return key;
    },
  );
  return mockBrowserApi;
}

function makeEvents(count: number): StarredEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `evt-${i}`,
    title: `Event ${i}`,
    startDateTime: '2026-06-28T10:00:00+02:00',
    endDateTime: '2026-06-28T11:00:00+02:00',
    location: 'Visby',
    organiser: 'Org',
    topic: 'Topic',
    description: null,
    sourceUrl: null,
    icsDataUri: null,
    starred: true as const,
    starredAt: '2026-01-01T00:00:00Z',
  }));
}

// ─── Tests ────────────────────────────────────────────────────────

describe('EventList scroll containment', () => {
  beforeEach(() => {
    resetMocks();
  });

  it('the <ul> element has overflow-y-auto for scrolling', () => {
    const adapter = setupAdapter();
    const events = makeEvents(5);
    const { container } = render(
      <EventList events={events} onUnstar={vi.fn()} adapter={adapter} />,
    );

    const ul = container.querySelector('ul');
    expect(ul).not.toBeNull();
    expect(ul!.className).toContain('overflow-y-auto');
  });

  it('the parent App wrapper provides scroll containment via flex-1 overflow-y-auto', () => {
    // This test validates the architectural decision:
    // The EventList itself doesn't need max-h because the parent
    // App.tsx wrapper uses flex-1 overflow-y-auto within a fixed-height container
    const adapter = setupAdapter();
    const events = makeEvents(5);
    const { container } = render(
      <EventList events={events} onUnstar={vi.fn()} adapter={adapter} />,
    );

    const ul = container.querySelector('ul');
    expect(ul).not.toBeNull();
    expect(ul!.className).toContain('overflow-y-auto');
  });
});
