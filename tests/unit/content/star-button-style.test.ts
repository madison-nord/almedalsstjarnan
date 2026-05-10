/**
 * Unit tests for Star Button style — branded filled state colors and positioning.
 *
 * Tests that the star button uses the correct branded colors:
 * - Starred (filled): amber fill #f59e0b with navy stroke #1e3a5f
 * - Unstarred (empty): no fill, gray stroke #6b7280
 * - stroke-linejoin: round on filled state
 *
 * Requirements: 5.1, 5.2
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { IBrowserApiAdapter } from '#core/types';
import { createStarButton } from '#extension/star-button';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';

function getStyleContent(host: HTMLElement): string {
  const shadow = host.shadowRoot;
  if (!shadow) throw new Error('No shadow root found');
  const style = shadow.querySelector('style');
  if (!style) throw new Error('No style element found in shadow root');
  return style.textContent ?? '';
}

describe('Star Button Style — Branded Colors', () => {
  let hostElement: HTMLElement;
  let adapter: IBrowserApiAdapter;
  const eventId = 'style-test-event';

  beforeEach(() => {
    hostElement = document.createElement('div');
    document.body.appendChild(hostElement);
    adapter = mockBrowserApi;
    (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => {
        if (key === 'starEvent') return 'Star event';
        if (key === 'unstarEvent') return 'Unstar event';
        return '';
      },
    );
  });

  afterEach(() => {
    hostElement.remove();
  });

  describe('starred (filled) state colors', () => {
    it('uses amber fill #f59e0b for starred state', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: true,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const css = getStyleContent(hostElement);
      // The CSS for aria-pressed="true" should contain fill: #f59e0b
      expect(css).toContain('fill: #f59e0b');
    });

    it('uses navy stroke #1e3a5f for starred state', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: true,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const css = getStyleContent(hostElement);
      // The CSS for aria-pressed="true" should contain stroke: #1e3a5f
      expect(css).toContain('stroke: #1e3a5f');
    });

    it('uses stroke-linejoin: round for starred state', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: true,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const css = getStyleContent(hostElement);
      expect(css).toContain('stroke-linejoin: round');
    });
  });

  describe('unstarred (empty) state colors', () => {
    it('uses fill: none for unstarred state', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const css = getStyleContent(hostElement);
      expect(css).toContain('fill: none');
    });

    it('uses gray stroke #6b7280 for unstarred state', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const css = getStyleContent(hostElement);
      expect(css).toContain('stroke: #6b7280');
    });

    it('uses stroke-width: 1.5 for unstarred state', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const css = getStyleContent(hostElement);
      expect(css).toContain('stroke-width: 1.5');
    });
  });
});
