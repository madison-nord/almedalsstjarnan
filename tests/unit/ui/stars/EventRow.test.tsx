/**
 * Unit tests for EventRow truncation on text cells.
 *
 * Validates that EventRow applies truncation classes and title attributes
 * to text cells (title, organiser, location, topic) for overflow handling.
 *
 * Requirements: 2.1, 2.2, 2.3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';

import { EventRow } from '#ui/stars/components/EventRow';

// ─── Helpers ──────────────────────────────────────────────────────

const messageMap: Record<string, string> = {
  unstarAction: 'Remove',
};

function setupAdapter(): IBrowserApiAdapter {
  (mockBrowserApi.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => messageMap[key] ?? '',
  );
  return mockBrowserApi;
}

function makeEvent(overrides: Partial<StarredEvent> = {}): StarredEvent {
  return {
    id: 'e1',
    title: 'Test Event',
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

function renderRow(event: StarredEvent): void {
  const adapter = setupAdapter();
  render(
    <table>
      <tbody>
        <EventRow event={event} onUnstar={vi.fn()} adapter={adapter} />
      </tbody>
    </table>,
  );
}

// ─── Tests ────────────────────────────────────────────────────────

describe('EventRow truncation', () => {
  describe('truncate class on text cells', () => {
    it('applies truncate class to the title cell', () => {
      const event = makeEvent({ title: 'Demokrati i förändring' });
      renderRow(event);

      const titleCell = screen.getByText('Demokrati i förändring').closest('td');
      expect(titleCell).toHaveClass('truncate');
    });

    it('applies truncate class to the organiser cell', () => {
      const event = makeEvent({ organiser: 'Org A, Org B' });
      renderRow(event);

      const cell = screen.getByText('Org A, Org B').closest('td');
      expect(cell).toHaveClass('truncate');
    });

    it('applies truncate class to the location cell', () => {
      const event = makeEvent({ location: 'Donners plats, Visby' });
      renderRow(event);

      const cell = screen.getByText('Donners plats, Visby').closest('td');
      expect(cell).toHaveClass('truncate');
    });

    it('applies truncate class to the topic cell', () => {
      const event = makeEvent({ topic: 'Hållbarhet' });
      renderRow(event);

      const cell = screen.getByText('Hållbarhet').closest('td');
      expect(cell).toHaveClass('truncate');
    });

    it('applies truncate class to title cell with comma-containing text', () => {
      const event = makeEvent({ title: 'Event A, Event B, Event C' });
      renderRow(event);

      const cell = screen.getByText('Event A, Event B, Event C').closest('td');
      expect(cell).toHaveClass('truncate');
    });

    it('applies truncate class to organiser cell with long text', () => {
      const longOrganiser = 'A'.repeat(100);
      const event = makeEvent({ organiser: longOrganiser });
      renderRow(event);

      const cell = screen.getByText(longOrganiser).closest('td');
      expect(cell).toHaveClass('truncate');
    });
  });

  describe('title attribute for hover tooltip', () => {
    it('adds title attribute to the title cell with full text', () => {
      const event = makeEvent({ title: 'Demokrati i förändring' });
      renderRow(event);

      const titleCell = screen.getByText('Demokrati i förändring').closest('td');
      expect(titleCell).toHaveAttribute('title', 'Demokrati i förändring');
    });

    it('adds title attribute to the organiser cell', () => {
      const event = makeEvent({ organiser: 'Org A, Org B' });
      renderRow(event);

      const cell = screen.getByText('Org A, Org B').closest('td');
      expect(cell).toHaveAttribute('title', 'Org A, Org B');
    });

    it('adds title attribute to the location cell', () => {
      const event = makeEvent({ location: 'Donners plats, Visby' });
      renderRow(event);

      const cell = screen.getByText('Donners plats, Visby').closest('td');
      expect(cell).toHaveAttribute('title', 'Donners plats, Visby');
    });

    it('adds title attribute to the topic cell', () => {
      const event = makeEvent({ topic: 'Hållbarhet' });
      renderRow(event);

      const cell = screen.getByText('Hållbarhet').closest('td');
      expect(cell).toHaveAttribute('title', 'Hållbarhet');
    });
  });

  describe('link in title cell still works', () => {
    it('renders title as a link when sourceUrl is present', () => {
      const event = makeEvent({
        title: 'Linked Event',
        sourceUrl: 'https://almedalsveckan.info/event/e1',
      });
      renderRow(event);

      const link = screen.getByRole('link', { name: 'Linked Event' });
      expect(link).toHaveAttribute('href', 'https://almedalsveckan.info/event/e1');
    });

    it('truncate is on the td, not the a element', () => {
      const event = makeEvent({
        title: 'Linked Event',
        sourceUrl: 'https://almedalsveckan.info/event/e1',
      });
      renderRow(event);

      const link = screen.getByRole('link', { name: 'Linked Event' });
      const td = link.closest('td');
      expect(td).toHaveClass('truncate');
      // The <a> itself should not have the truncate class
      expect(link).not.toHaveClass('truncate');
    });
  });
});
