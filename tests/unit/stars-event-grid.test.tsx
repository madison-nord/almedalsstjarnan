/**
 * Unit tests for EventGrid conditional rendering.
 *
 * Validates that the EventGrid component conditionally renders SectionHeader
 * elements based on the active sort order, and always renders column headers.
 *
 * Requirements: 2.3, 2.4, 2.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';

import { EventGrid } from '#ui/stars/components/EventGrid';

// ─── Helpers ──────────────────────────────────────────────────────

function setupAdapter(): IBrowserApiAdapter {
  (mockBrowserApi.getMessage as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
    const messages: Record<string, string> = {
      selectAll: 'Select all',
      columnTitle: 'Title',
      columnOrganiser: 'Organiser',
      columnDateTime: 'Date & Time',
      columnLocation: 'Location',
      columnTopic: 'Topic',
      columnActions: 'Actions',
    };
    return messages[key] ?? key;
  });
  return mockBrowserApi;
}

function createEvent(
  overrides: Partial<StarredEvent> & { readonly id: string; readonly startDateTime: string },
): StarredEvent {
  return {
    title: `Event ${overrides.id}`,
    organiser: null,
    endDateTime: null,
    location: null,
    description: null,
    topic: null,
    sourceUrl: null,
    icsDataUri: null,
    starred: true as const,
    starredAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/** Events on two different dates (2026-06-22 = Monday, 2026-06-23 = Tuesday). */
function createMultiDayEvents(): StarredEvent[] {
  return [
    createEvent({ id: 'aaa', startDateTime: '2026-06-22T09:00:00+02:00', title: 'Morning Talk' }),
    createEvent({
      id: 'bbb',
      startDateTime: '2026-06-22T14:00:00+02:00',
      title: 'Afternoon Panel',
    }),
    createEvent({
      id: 'ccc',
      startDateTime: '2026-06-23T10:00:00+02:00',
      title: 'Tuesday Keynote',
    }),
  ];
}

// ─── Tests ────────────────────────────────────────────────────────

describe('EventGrid conditional rendering (Requirements 2.3, 2.4, 2.5)', () => {
  describe('chronological sort renders SectionHeader elements (Req 2.4)', () => {
    it('renders date group headers when sortOrder is chronological', () => {
      const adapter = setupAdapter();
      const events = createMultiDayEvents();

      render(
        <EventGrid
          events={events}
          sortOrder="chronological"
          onUnstar={vi.fn()}
          adapter={adapter}
        />,
      );

      // SectionHeader renders a <th> with the date label
      expect(screen.getByText('Måndag 22 juni')).toBeInTheDocument();
      expect(screen.getByText('Tisdag 23 juni')).toBeInTheDocument();
    });

    it('renders date group headers when sortOrder is reverse-chronological', () => {
      const adapter = setupAdapter();
      const events = createMultiDayEvents();

      render(
        <EventGrid
          events={events}
          sortOrder="reverse-chronological"
          onUnstar={vi.fn()}
          adapter={adapter}
        />,
      );

      expect(screen.getByText('Måndag 22 juni')).toBeInTheDocument();
      expect(screen.getByText('Tisdag 23 juni')).toBeInTheDocument();
    });
  });

  describe('alphabetical sort renders no SectionHeader elements (Req 2.3)', () => {
    it('renders no date group headers when sortOrder is alphabetical-by-title', () => {
      const adapter = setupAdapter();
      const events = createMultiDayEvents();

      render(
        <EventGrid
          events={events}
          sortOrder="alphabetical-by-title"
          onUnstar={vi.fn()}
          adapter={adapter}
        />,
      );

      expect(screen.queryByText('Måndag 22 juni')).not.toBeInTheDocument();
      expect(screen.queryByText('Tisdag 23 juni')).not.toBeInTheDocument();
    });

    it('renders no date group headers when sortOrder is starred-desc', () => {
      const adapter = setupAdapter();
      const events = createMultiDayEvents();

      render(
        <EventGrid events={events} sortOrder="starred-desc" onUnstar={vi.fn()} adapter={adapter} />,
      );

      expect(screen.queryByText('Måndag 22 juni')).not.toBeInTheDocument();
      expect(screen.queryByText('Tisdag 23 juni')).not.toBeInTheDocument();
    });
  });

  describe('column headers always rendered for all sort orders (Req 2.5)', () => {
    it.each([
      'chronological',
      'reverse-chronological',
      'alphabetical-by-title',
      'starred-desc',
    ] as const)('renders column headers for sortOrder "%s"', (sortOrder) => {
      const adapter = setupAdapter();
      const events = createMultiDayEvents();

      render(
        <EventGrid events={events} sortOrder={sortOrder} onUnstar={vi.fn()} adapter={adapter} />,
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Organiser')).toBeInTheDocument();
      expect(screen.getByText('Date & Time')).toBeInTheDocument();
      expect(screen.getByText('Location')).toBeInTheDocument();
      expect(screen.getByText('Topic')).toBeInTheDocument();
    });
  });

  describe('switching sort order dynamically updates rendering (Req 2.3, 2.4)', () => {
    it('removes SectionHeaders when switching from chronological to alphabetical', () => {
      const adapter = setupAdapter();
      const events = createMultiDayEvents();

      const { rerender } = render(
        <EventGrid
          events={events}
          sortOrder="chronological"
          onUnstar={vi.fn()}
          adapter={adapter}
        />,
      );

      // Initially, section headers are present
      expect(screen.getByText('Måndag 22 juni')).toBeInTheDocument();

      // Switch to alphabetical
      rerender(
        <EventGrid
          events={events}
          sortOrder="alphabetical-by-title"
          onUnstar={vi.fn()}
          adapter={adapter}
        />,
      );

      // Section headers should be gone
      expect(screen.queryByText('Måndag 22 juni')).not.toBeInTheDocument();
      expect(screen.queryByText('Tisdag 23 juni')).not.toBeInTheDocument();
    });

    it('restores SectionHeaders when switching from alphabetical back to chronological', () => {
      const adapter = setupAdapter();
      const events = createMultiDayEvents();

      const { rerender } = render(
        <EventGrid
          events={events}
          sortOrder="alphabetical-by-title"
          onUnstar={vi.fn()}
          adapter={adapter}
        />,
      );

      // Initially, no section headers
      expect(screen.queryByText('Måndag 22 juni')).not.toBeInTheDocument();

      // Switch to chronological
      rerender(
        <EventGrid
          events={events}
          sortOrder="chronological"
          onUnstar={vi.fn()}
          adapter={adapter}
        />,
      );

      // Section headers should reappear
      expect(screen.getByText('Måndag 22 juni')).toBeInTheDocument();
      expect(screen.getByText('Tisdag 23 juni')).toBeInTheDocument();
    });
  });
});
