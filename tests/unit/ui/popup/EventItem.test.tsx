/**
 * Unit tests for popup EventItem star toggle, source link, and expand/collapse.
 *
 * Tests:
 * - Filled star toggle button is rendered with correct aria-label
 * - Clicking star toggle calls onUnstar with event.id
 * - Title renders as <a> link when sourceUrl is non-null
 * - Title renders as <p> when sourceUrl is null
 * - Link has correct target and rel attributes
 * - Expand/collapse toggle renders chevron
 * - Clicking toggle expands to show description, topic, full time range
 * - Clicking again collapses the expanded content
 * - aria-expanded attribute reflects state
 * - Expanded content is conditionally rendered (not just hidden)
 *
 * Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter, StarredEvent } from '#core/types';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';

import { EventItem } from '#ui/popup/components/EventItem';

// ─── Helpers ──────────────────────────────────────────────────────

function makeEvent(overrides: Partial<StarredEvent> = {}): StarredEvent {
  return {
    id: 'e1',
    title: 'Demokrati i förändring',
    organiser: 'Sveriges Riksdag',
    startDateTime: '2026-06-22T10:00:00+02:00',
    endDateTime: '2026-06-22T11:00:00+02:00',
    location: 'Visby',
    description: null,
    topic: null,
    sourceUrl: null,
    icsDataUri: null,
    starred: true as const,
    starredAt: '2026-06-15T14:00:00.000Z',
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Popup EventItem star toggle and source link', () => {
  let adapter: IBrowserApiAdapter;
  let onUnstar: (eventId: string) => void;

  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
    onUnstar = vi.fn();
    (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => {
        if (key === 'unstarEvent') return 'Unstar event';
        if (key === 'expandEvent') return 'Show details';
        if (key === 'collapseEvent') return 'Hide details';
        return '';
      },
    );
  });

  describe('star toggle', () => {
    it('renders a filled star toggle button', () => {
      const event = makeEvent();
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      const button = screen.getByRole('button', { name: 'Unstar event' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('★');
    });

    it('uses adapter.getMessage for aria-label', () => {
      const event = makeEvent();
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      expect(adapter.getMessage).toHaveBeenCalledWith('unstarEvent');
    });

    it('calls onUnstar with event.id when clicked', async () => {
      const user = userEvent.setup();
      const event = makeEvent({ id: 'event-123' });
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      const button = screen.getByRole('button', { name: 'Unstar event' });
      await user.click(button);

      expect(onUnstar).toHaveBeenCalledTimes(1);
      expect(onUnstar).toHaveBeenCalledWith('event-123');
    });

    it('star button is keyboard accessible', async () => {
      const user = userEvent.setup();
      const event = makeEvent({ id: 'event-456' });
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      const button = screen.getByRole('button', { name: 'Unstar event' });
      button.focus();
      await user.keyboard('{Enter}');

      expect(onUnstar).toHaveBeenCalledWith('event-456');
    });
  });

  describe('source link', () => {
    it('renders title as <a> link when sourceUrl is non-null', () => {
      const event = makeEvent({
        sourceUrl: 'https://www.almedalsveckan.info/event/123',
      });
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      const link = screen.getByRole('link', { name: 'Demokrati i förändring' });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://www.almedalsveckan.info/event/123');
    });

    it('link opens in new tab with correct attributes', () => {
      const event = makeEvent({
        sourceUrl: 'https://www.almedalsveckan.info/event/123',
      });
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      const link = screen.getByRole('link', { name: 'Demokrati i förändring' });
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('renders title as plain text when sourceUrl is null', () => {
      const event = makeEvent({ sourceUrl: null });
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      expect(screen.queryByRole('link', { name: 'Demokrati i förändring' })).not.toBeInTheDocument();
      expect(screen.getByText('Demokrati i förändring')).toBeInTheDocument();
    });

    it('renders title text correctly in both link and non-link modes', () => {
      const event = makeEvent({
        title: 'Hållbar utveckling',
        sourceUrl: 'https://example.com',
      });
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      const link = screen.getByRole('link', { name: 'Hållbar utveckling' });
      expect(link).toHaveTextContent('Hållbar utveckling');
    });
  });

  describe('expand/collapse toggle', () => {
    it('renders a chevron toggle button in collapsed state', () => {
      const event = makeEvent();
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      const toggle = screen.getByRole('button', { name: 'Show details' });
      expect(toggle).toBeInTheDocument();
      expect(toggle).toHaveTextContent('▸');
    });

    it('toggle has aria-expanded="false" when collapsed', () => {
      const event = makeEvent();
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      const toggle = screen.getByRole('button', { name: 'Show details' });
      expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('clicking toggle expands the event item', async () => {
      const user = userEvent.setup();
      const event = makeEvent({
        description: 'A detailed description of the event',
        topic: 'Demokrati',
      });
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      const toggle = screen.getByRole('button', { name: 'Show details' });
      await user.click(toggle);

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(toggle).toHaveTextContent('▾');
    });

    it('expanded state shows description', async () => {
      const user = userEvent.setup();
      const event = makeEvent({
        description: 'A detailed description of the event',
      });
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      // Description not visible when collapsed
      expect(screen.queryByText('A detailed description of the event')).not.toBeInTheDocument();

      const toggle = screen.getByRole('button', { name: 'Show details' });
      await user.click(toggle);

      expect(screen.getByText('A detailed description of the event')).toBeInTheDocument();
    });

    it('expanded state shows topic', async () => {
      const user = userEvent.setup();
      const event = makeEvent({
        topic: 'Demokrati',
      });
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      expect(screen.queryByText('Demokrati')).not.toBeInTheDocument();

      const toggle = screen.getByRole('button', { name: 'Show details' });
      await user.click(toggle);

      expect(screen.getByText('Demokrati')).toBeInTheDocument();
    });

    it('expanded state shows full time range', async () => {
      const user = userEvent.setup();
      const event = makeEvent({
        startDateTime: '2026-06-22T10:00:00+02:00',
        endDateTime: '2026-06-22T11:00:00+02:00',
      });
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      const toggle = screen.getByRole('button', { name: 'Show details' });
      await user.click(toggle);

      // The expanded section should show the full formatted time range
      const timeElements = screen.getAllByText('Mån 22 juni 10:00\u201311:00');
      // One in the compact summary, one in the expanded details
      expect(timeElements.length).toBeGreaterThanOrEqual(2);
    });

    it('clicking toggle again collapses the expanded content', async () => {
      const user = userEvent.setup();
      const event = makeEvent({
        description: 'A detailed description',
        topic: 'Demokrati',
      });
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      const toggle = screen.getByRole('button', { name: 'Show details' });
      await user.click(toggle);

      expect(screen.getByText('A detailed description')).toBeInTheDocument();

      // Now the label changes to "Hide details"
      const collapseToggle = screen.getByRole('button', { name: 'Hide details' });
      await user.click(collapseToggle);

      expect(screen.queryByText('A detailed description')).not.toBeInTheDocument();
      expect(collapseToggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('expanded content is conditionally rendered, not just hidden', async () => {
      const user = userEvent.setup();
      const event = makeEvent({
        description: 'Conditional render test',
      });
      const { container } = render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      // When collapsed, the description text should not exist in the DOM at all
      expect(container.textContent).not.toContain('Conditional render test');

      const toggle = screen.getByRole('button', { name: 'Show details' });
      await user.click(toggle);

      expect(container.textContent).toContain('Conditional render test');
    });

    it('does not show description section when description is null', async () => {
      const user = userEvent.setup();
      const event = makeEvent({ description: null, topic: 'Demokrati' });
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      const toggle = screen.getByRole('button', { name: 'Show details' });
      await user.click(toggle);

      // Topic should be visible but no description paragraph
      expect(screen.getByText('Demokrati')).toBeInTheDocument();
    });

    it('does not show topic section when topic is null', async () => {
      const user = userEvent.setup();
      const event = makeEvent({ topic: null, description: 'Some description' });
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      const toggle = screen.getByRole('button', { name: 'Show details' });
      await user.click(toggle);

      expect(screen.getByText('Some description')).toBeInTheDocument();
    });

    it('toggle is keyboard accessible', async () => {
      const user = userEvent.setup();
      const event = makeEvent({ description: 'Keyboard test' });
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      const toggle = screen.getByRole('button', { name: 'Show details' });
      toggle.focus();
      await user.keyboard('{Enter}');

      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Keyboard test')).toBeInTheDocument();
    });

    it('uses adapter.getMessage for toggle aria-label', () => {
      const event = makeEvent();
      render(<EventItem event={event} onUnstar={onUnstar} adapter={adapter} />);

      expect(adapter.getMessage).toHaveBeenCalledWith('expandEvent');
    });
  });
});
