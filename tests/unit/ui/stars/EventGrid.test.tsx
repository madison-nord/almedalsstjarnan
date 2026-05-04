/**
 * Unit tests for EventGrid table-fixed layout and column widths.
 *
 * Validates that the EventGrid component uses table-fixed layout
 * and assigns proportional width classes to column headers.
 *
 * Requirements: 2.1, 2.2, 2.3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';

import { EventGrid } from '#ui/stars/components/EventGrid';

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

// ─── Tests ────────────────────────────────────────────────────────

describe('EventGrid table-fixed layout', () => {
  it('applies table-fixed class to the table element', () => {
    const adapter = setupAdapter();
    const events = [makeEvent({ id: 'e1' })];

    render(
      <EventGrid events={events} onUnstar={vi.fn()} adapter={adapter} />,
    );

    const table = screen.getByRole('table');
    expect(table).toHaveClass('table-fixed');
  });

  it('assigns width class to Title column header (~25%)', () => {
    const adapter = setupAdapter();
    render(
      <EventGrid events={[makeEvent({ id: 'e1' })]} onUnstar={vi.fn()} adapter={adapter} />,
    );

    const titleHeader = screen.getByText('Title').closest('th');
    expect(titleHeader).toBeTruthy();
    expect(titleHeader!.className).toMatch(/w-1\/4|w-\[25%\]/);
  });

  it('assigns width class to Organiser column header (~20%)', () => {
    const adapter = setupAdapter();
    render(
      <EventGrid events={[makeEvent({ id: 'e1' })]} onUnstar={vi.fn()} adapter={adapter} />,
    );

    const header = screen.getByText('Organiser').closest('th');
    expect(header).toBeTruthy();
    expect(header!.className).toMatch(/w-1\/5|w-\[20%\]/);
  });

  it('assigns width class to Date & time column header (~20%)', () => {
    const adapter = setupAdapter();
    render(
      <EventGrid events={[makeEvent({ id: 'e1' })]} onUnstar={vi.fn()} adapter={adapter} />,
    );

    const header = screen.getByText('Date & time').closest('th');
    expect(header).toBeTruthy();
    expect(header!.className).toMatch(/w-1\/5|w-\[20%\]/);
  });

  it('assigns width class to Location column header (~15%)', () => {
    const adapter = setupAdapter();
    render(
      <EventGrid events={[makeEvent({ id: 'e1' })]} onUnstar={vi.fn()} adapter={adapter} />,
    );

    const header = screen.getByText('Location').closest('th');
    expect(header).toBeTruthy();
    expect(header!.className).toMatch(/w-\[15%\]/);
  });

  it('assigns width class to Topic column header (~10%)', () => {
    const adapter = setupAdapter();
    render(
      <EventGrid events={[makeEvent({ id: 'e1' })]} onUnstar={vi.fn()} adapter={adapter} />,
    );

    const header = screen.getByText('Topic').closest('th');
    expect(header).toBeTruthy();
    expect(header!.className).toMatch(/w-\[10%\]/);
  });

  it('assigns width class to Actions column header (~10%)', () => {
    const adapter = setupAdapter();
    render(
      <EventGrid events={[makeEvent({ id: 'e1' })]} onUnstar={vi.fn()} adapter={adapter} />,
    );

    const header = screen.getByText('Actions').closest('th');
    expect(header).toBeTruthy();
    expect(header!.className).toMatch(/w-\[10%\]/);
  });
});
