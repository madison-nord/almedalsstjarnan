/**
 * Unit tests for date grouping in the Stars Page EventGrid.
 *
 * Validates that:
 * - Events are grouped by date with section headers
 * - Section headers display the correct formatted date
 * - Events within a group appear in the correct order
 * - Empty events array renders no section headers
 *
 * Requirements: 2.3, 2.4
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';

import { EventGrid, groupEventsByDate } from '#ui/stars/components/EventGrid';
import { SectionHeader } from '#ui/stars/components/SectionHeader';

// ─── Helpers ──────────────────────────────────────────────────────

const messageMap: Record<string, string> = {
  columnTitle: 'Title',
  columnOrganiser: 'Organiser',
  columnDateTime: 'Date & time',
  columnLocation: 'Location',
  columnTopic: 'Topic',
  columnActions: 'Actions',
  unstarAction: 'Remove',
};

function setupAdapter(): IBrowserApiAdapter {
  (mockBrowserApi.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => messageMap[key] ?? '',
  );
  return mockBrowserApi;
}

function makeEvent(overrides: Partial<StarredEvent> & { readonly id: string }): StarredEvent {
  return {
    title: `Event ${overrides.id}`,
    organiser: 'Test Organiser',
    startDateTime: '2026-06-22T10:00:00+02:00',
    endDateTime: '2026-06-22T11:00:00+02:00',
    location: 'Visby',
    description: null,
    topic: 'Demokrati',
    sourceUrl: null,
    icsDataUri: null,
    starred: true as const,
    starredAt: '2026-06-15T14:00:00.000Z',
    ...overrides,
  };
}

// ─── groupEventsByDate unit tests ─────────────────────────────────

describe('groupEventsByDate', () => {
  it('groups events by date extracted from startDateTime', () => {
    const events: StarredEvent[] = [
      makeEvent({ id: 'e1', startDateTime: '2026-06-22T08:00:00+02:00' }),
      makeEvent({ id: 'e2', startDateTime: '2026-06-22T10:00:00+02:00' }),
      makeEvent({ id: 'e3', startDateTime: '2026-06-23T09:00:00+02:00' }),
    ];

    const groups = groupEventsByDate(events);

    expect(groups).toHaveLength(2);
    expect(groups[0]!.dateKey).toBe('2026-06-22');
    expect(groups[0]!.events).toHaveLength(2);
    expect(groups[1]!.dateKey).toBe('2026-06-23');
    expect(groups[1]!.events).toHaveLength(1);
  });

  it('returns empty array for empty events', () => {
    const groups = groupEventsByDate([]);
    expect(groups).toHaveLength(0);
  });

  it('preserves event order within each group', () => {
    const events: StarredEvent[] = [
      makeEvent({ id: 'e1', startDateTime: '2026-06-22T08:00:00+02:00' }),
      makeEvent({ id: 'e2', startDateTime: '2026-06-22T10:00:00+02:00' }),
      makeEvent({ id: 'e3', startDateTime: '2026-06-22T14:00:00+02:00' }),
    ];

    const groups = groupEventsByDate(events);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.events[0]!.id).toBe('e1');
    expect(groups[0]!.events[1]!.id).toBe('e2');
    expect(groups[0]!.events[2]!.id).toBe('e3');
  });

  it('formats section header label correctly for a Monday in June', () => {
    const events: StarredEvent[] = [
      makeEvent({ id: 'e1', startDateTime: '2026-06-22T08:00:00+02:00' }),
    ];

    const groups = groupEventsByDate(events);

    expect(groups[0]!.label).toBe('Måndag 22 juni');
  });

  it('formats section header label correctly for a Tuesday in June', () => {
    const events: StarredEvent[] = [
      makeEvent({ id: 'e1', startDateTime: '2026-06-23T08:00:00+02:00' }),
    ];

    const groups = groupEventsByDate(events);

    expect(groups[0]!.label).toBe('Tisdag 23 juni');
  });

  it('handles single event producing one group', () => {
    const events: StarredEvent[] = [
      makeEvent({ id: 'e1', startDateTime: '2026-06-25T12:00:00+02:00' }),
    ];

    const groups = groupEventsByDate(events);

    expect(groups).toHaveLength(1);
    expect(groups[0]!.dateKey).toBe('2026-06-25');
    expect(groups[0]!.events).toHaveLength(1);
  });
});

// ─── SectionHeader rendering tests ───────────────────────────────

describe('SectionHeader', () => {
  it('renders the label text', () => {
    render(
      <table>
        <tbody>
          <SectionHeader label="Måndag 22 juni" columnCount={6} />
        </tbody>
      </table>,
    );

    expect(screen.getByText('Måndag 22 juni')).toBeInTheDocument();
  });

  it('spans the correct number of columns', () => {
    render(
      <table>
        <tbody>
          <SectionHeader label="Tisdag 23 juni" columnCount={6} />
        </tbody>
      </table>,
    );

    const th = screen.getByText('Tisdag 23 juni');
    expect(th).toHaveAttribute('colspan', '6');
  });

  it('has scope="colgroup" for accessibility', () => {
    render(
      <table>
        <tbody>
          <SectionHeader label="Onsdag 24 juni" columnCount={6} />
        </tbody>
      </table>,
    );

    const th = screen.getByText('Onsdag 24 juni');
    expect(th).toHaveAttribute('scope', 'colgroup');
  });
});

// ─── EventGrid with date grouping rendering tests ─────────────────

describe('EventGrid date grouping rendering', () => {
  it('renders section headers for each date group', () => {
    const adapter = setupAdapter();
    const events: StarredEvent[] = [
      makeEvent({ id: 'e1', startDateTime: '2026-06-22T08:00:00+02:00' }),
      makeEvent({ id: 'e2', startDateTime: '2026-06-23T09:00:00+02:00' }),
    ];

    render(
      <EventGrid events={events} onUnstar={vi.fn()} adapter={adapter} />,
    );

    expect(screen.getByText('Måndag 22 juni')).toBeInTheDocument();
    expect(screen.getByText('Tisdag 23 juni')).toBeInTheDocument();
  });

  it('renders events within their respective date groups', () => {
    const adapter = setupAdapter();
    const events: StarredEvent[] = [
      makeEvent({ id: 'e1', title: 'Morning Event', startDateTime: '2026-06-22T08:00:00+02:00' }),
      makeEvent({ id: 'e2', title: 'Afternoon Event', startDateTime: '2026-06-22T14:00:00+02:00' }),
      makeEvent({ id: 'e3', title: 'Next Day Event', startDateTime: '2026-06-23T09:00:00+02:00' }),
    ];

    render(
      <EventGrid events={events} onUnstar={vi.fn()} adapter={adapter} />,
    );

    expect(screen.getByText('Morning Event')).toBeInTheDocument();
    expect(screen.getByText('Afternoon Event')).toBeInTheDocument();
    expect(screen.getByText('Next Day Event')).toBeInTheDocument();
  });

  it('renders no section headers for empty events array', () => {
    const adapter = setupAdapter();

    render(
      <EventGrid events={[]} onUnstar={vi.fn()} adapter={adapter} />,
    );

    // Only the table header row should exist, no section headers
    const rows = screen.getAllByRole('row');
    expect(rows).toHaveLength(1); // Just the thead row
  });
});
