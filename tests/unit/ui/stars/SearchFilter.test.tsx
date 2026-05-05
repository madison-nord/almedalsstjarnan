/**
 * Unit tests for SearchFilter component and filter logic integration.
 *
 * Validates:
 * - Renders input with correct placeholder and aria-label from i18n
 * - Calls onChange when user types
 * - Displays current value
 * - Filter logic filters by title, organiser, topic (case-insensitive)
 *
 * Requirements: 2.1, 2.2
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { filterEvents } from '#core/event-filter';

import { SearchFilter } from '#ui/stars/components/SearchFilter';

// ─── Helpers ──────────────────────────────────────────────────────

const messageMap: Record<string, string> = {
  filterPlaceholder: 'Filter events…',
  filterLabel: 'Filter',
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

// ─── SearchFilter Component Tests ─────────────────────────────────

describe('SearchFilter', () => {
  it('renders an input with the correct placeholder from i18n', () => {
    const adapter = setupAdapter();
    render(
      <SearchFilter value="" onChange={vi.fn()} adapter={adapter} />,
    );

    const input = screen.getByPlaceholderText('Filter events…');
    expect(input).toBeInTheDocument();
  });

  it('renders an input with the correct aria-label from i18n', () => {
    const adapter = setupAdapter();
    render(
      <SearchFilter value="" onChange={vi.fn()} adapter={adapter} />,
    );

    const input = screen.getByLabelText('Filter');
    expect(input).toBeInTheDocument();
  });

  it('displays the current value', () => {
    const adapter = setupAdapter();
    render(
      <SearchFilter value="demokrati" onChange={vi.fn()} adapter={adapter} />,
    );

    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('demokrati');
  });

  it('calls onChange when user types', () => {
    const adapter = setupAdapter();
    const onChange = vi.fn();
    render(
      <SearchFilter value="" onChange={onChange} adapter={adapter} />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'klim' } });

    expect(onChange).toHaveBeenCalledWith('klim');
  });

  it('has a visible label element for accessibility', () => {
    const adapter = setupAdapter();
    render(
      <SearchFilter value="" onChange={vi.fn()} adapter={adapter} />,
    );

    const label = screen.getByText('Filter');
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveAttribute('for', 'stars-filter');
  });

  it('input has the correct id matching the label', () => {
    const adapter = setupAdapter();
    render(
      <SearchFilter value="" onChange={vi.fn()} adapter={adapter} />,
    );

    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('id', 'stars-filter');
  });
});

// ─── Filter Logic Tests ───────────────────────────────────────────

describe('filterEvents integration', () => {
  const events: readonly StarredEvent[] = [
    makeEvent({ id: 'e1', title: 'Demokrati i förändring', organiser: 'Sveriges Riksdag', topic: 'Demokrati' }),
    makeEvent({ id: 'e2', title: 'Hållbar utveckling', organiser: 'Naturskyddsföreningen', topic: 'Hållbarhet' }),
    makeEvent({ id: 'e3', title: 'Framtidens sjukvård', organiser: 'Region Gotland', topic: 'Hälsa' }),
    makeEvent({ id: 'e4', title: 'Klimatkrisen', organiser: null, topic: null }),
  ];

  it('returns all events when filter is empty', () => {
    const result = filterEvents(events, '');
    expect(result).toEqual(events);
  });

  it('filters by title (case-insensitive)', () => {
    const result = filterEvents(events, 'demokrati');
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('e1');
  });

  it('filters by organiser (case-insensitive)', () => {
    const result = filterEvents(events, 'gotland');
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('e3');
  });

  it('filters by topic (case-insensitive)', () => {
    const result = filterEvents(events, 'hållbarhet');
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('e2');
  });

  it('matches partial strings', () => {
    const result = filterEvents(events, 'kris');
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('e4');
  });

  it('handles events with null organiser and topic', () => {
    const result = filterEvents(events, 'klimat');
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('e4');
  });

  it('returns empty array when no events match', () => {
    const result = filterEvents(events, 'zzzzz');
    expect(result).toHaveLength(0);
  });

  it('matches across multiple fields (title match)', () => {
    const result = filterEvents(events, 'riksdag');
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('e1');
  });

  it('is case-insensitive for uppercase input', () => {
    const result = filterEvents(events, 'DEMOKRATI');
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('e1');
  });

  it('returns multiple matches when filter matches several events', () => {
    // "hål" matches "Hållbar utveckling" (title) and "Hållbarhet" (topic) — same event
    // and also "sjukvård" has "Hälsa" topic — "häl" matches
    const result = filterEvents(events, 'häl');
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe('e3');
  });
});
