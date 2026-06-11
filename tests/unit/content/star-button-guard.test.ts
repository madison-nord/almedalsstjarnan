/**
 * Unit tests for Star Button update guard.
 *
 * Verifies that `update(newStarred)` skips redundant DOM mutations when
 * the button is already in the target state, and correctly renders when
 * transitioning between states.
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { IBrowserApiAdapter } from '#core/types';
import { createStarButton } from '#extension/star-button';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';

describe('Star Button Update Guard', () => {
  let hostElement: HTMLElement;
  let adapter: IBrowserApiAdapter;
  const eventId = 'guard-test-event';

  beforeEach(() => {
    hostElement = document.createElement('div');
    document.body.appendChild(hostElement);
    adapter = mockBrowserApi;
    (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation((key: string) => {
      if (key === 'starEvent') return 'Star event';
      if (key === 'unstarEvent') return 'Unstar event';
      return '';
    });
  });

  afterEach(() => {
    hostElement.remove();
  });

  describe('redundant update guard — no DOM changes', () => {
    it('calling update(true) on an already-starred button does not re-assign innerHTML', () => {
      const { update } = createStarButton(hostElement, {
        eventId,
        initialStarred: true,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const shadow = hostElement.shadowRoot!;
      const button = shadow.querySelector('button')!;

      // Capture initial innerHTML after initial render
      const initialInnerHTML = button.innerHTML;

      // Spy on innerHTML setter to detect any assignment
      const innerHTMLSpy = vi.spyOn(button, 'innerHTML', 'set');

      // Call update with same state — should be a no-op
      update(true);

      expect(innerHTMLSpy).not.toHaveBeenCalled();
      expect(button.innerHTML).toBe(initialInnerHTML);

      innerHTMLSpy.mockRestore();
    });

    it('calling update(false) on an unstarred button does not re-assign innerHTML', () => {
      const { update } = createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const shadow = hostElement.shadowRoot!;
      const button = shadow.querySelector('button')!;

      // Capture initial innerHTML after initial render
      const initialInnerHTML = button.innerHTML;

      // Spy on innerHTML setter to detect any assignment
      const innerHTMLSpy = vi.spyOn(button, 'innerHTML', 'set');

      // Call update with same state — should be a no-op
      update(false);

      expect(innerHTMLSpy).not.toHaveBeenCalled();
      expect(button.innerHTML).toBe(initialInnerHTML);

      innerHTMLSpy.mockRestore();
    });
  });

  describe('state transition — DOM updates correctly', () => {
    it('calling update(true) on an unstarred button renders filled SVG with aria-pressed="true"', () => {
      const { update } = createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const shadow = hostElement.shadowRoot!;
      const button = shadow.querySelector('button')!;

      // Transition from unstarred to starred
      update(true);

      expect(button.getAttribute('aria-pressed')).toBe('true');
      expect(button.getAttribute('aria-label')).toBe('Unstar event');
      // Filled SVG has fill="currentColor" on the path
      const svg = button.querySelector('svg');
      expect(svg).not.toBeNull();
      const path = svg!.querySelector('path');
      expect(path).not.toBeNull();
      expect(path!.getAttribute('fill')).toBe('currentColor');
    });

    it('calling update(false) on a starred button renders outlined SVG with aria-pressed="false"', () => {
      const { update } = createStarButton(hostElement, {
        eventId,
        initialStarred: true,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const shadow = hostElement.shadowRoot!;
      const button = shadow.querySelector('button')!;

      // Transition from starred to unstarred
      update(false);

      expect(button.getAttribute('aria-pressed')).toBe('false');
      expect(button.getAttribute('aria-label')).toBe('Star event');
      // Outlined SVG has no fill attribute on the path
      const svg = button.querySelector('svg');
      expect(svg).not.toBeNull();
      const path = svg!.querySelector('path');
      expect(path).not.toBeNull();
      expect(path!.hasAttribute('fill')).toBe(false);
    });
  });
});
