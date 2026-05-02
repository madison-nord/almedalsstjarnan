/**
 * Unit tests for Star Button (Shadow DOM).
 *
 * Tests the createStarButton function which renders an accessible
 * star toggle button inside a Shadow DOM for style isolation.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 14.1, 14.2, 14.3, 14.4
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import type { IBrowserApiAdapter } from '#core/types';
import {
  createStarButton,
  STAR_OUTLINED_SVG,
  STAR_FILLED_SVG,
} from '#extension/star-button';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';

function getButton(host: HTMLElement): HTMLButtonElement {
  const shadow = host.shadowRoot;
  if (!shadow) throw new Error('No shadow root found');
  const btn = shadow.querySelector('button.star-btn');
  if (!btn) throw new Error('No button found in shadow root');
  return btn as HTMLButtonElement;
}

function getSvg(host: HTMLElement): SVGElement {
  const btn = getButton(host);
  const svg = btn.querySelector('svg');
  if (!svg) throw new Error('No SVG found in button');
  return svg;
}

describe('Star Button', () => {
  let hostElement: HTMLElement;
  let adapter: IBrowserApiAdapter;
  const eventId = 'test-event-123';

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

  describe('Shadow DOM creation', () => {
    it('creates Shadow DOM on host element', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      expect(hostElement.shadowRoot).not.toBeNull();
      expect(hostElement.shadowRoot!.mode).toBe('open');
    });

    it('injects scoped CSS into shadow root', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const style = hostElement.shadowRoot!.querySelector('style');
      expect(style).not.toBeNull();
      expect(style!.textContent).toContain('.star-btn');
    });
  });

  describe('initial rendering — unstarred', () => {
    it('renders button with aria-pressed="false" when unstarred', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const btn = getButton(hostElement);
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    });

    it('renders outlined SVG when unstarred', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const svg = getSvg(hostElement);
      expect(svg.getAttribute('viewBox')).toBe('0 0 16 16');
      // Outlined SVG should NOT have fill="currentColor" on the path
      const path = svg.querySelector('path');
      expect(path).not.toBeNull();
      expect(path!.getAttribute('fill')).toBeNull();
    });

    it('sets aria-label to localized "Star event" when unstarred', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const btn = getButton(hostElement);
      expect(btn.getAttribute('aria-label')).toBe('Star event');
      expect(adapter.getMessage).toHaveBeenCalledWith('starEvent');
    });
  });

  describe('initial rendering — starred', () => {
    it('renders button with aria-pressed="true" when starred', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: true,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const btn = getButton(hostElement);
      expect(btn.getAttribute('aria-pressed')).toBe('true');
    });

    it('renders filled SVG when starred', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: true,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const svg = getSvg(hostElement);
      expect(svg.getAttribute('viewBox')).toBe('0 0 16 16');
      // Filled SVG should have fill="currentColor" on the path
      const path = svg.querySelector('path');
      expect(path).not.toBeNull();
      expect(path!.getAttribute('fill')).toBe('currentColor');
    });

    it('sets aria-label to localized "Unstar event" when starred', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: true,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const btn = getButton(hostElement);
      expect(btn.getAttribute('aria-label')).toBe('Unstar event');
      expect(adapter.getMessage).toHaveBeenCalledWith('unstarEvent');
    });
  });

  describe('click interactions', () => {
    it('calls onStar callback with eventId when clicking unstarred button', () => {
      const onStar = vi.fn().mockResolvedValue(undefined);
      const onUnstar = vi.fn().mockResolvedValue(undefined);

      createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar,
        onUnstar,
      });

      const btn = getButton(hostElement);
      btn.click();

      expect(onStar).toHaveBeenCalledWith(eventId);
      expect(onUnstar).not.toHaveBeenCalled();
    });

    it('calls onUnstar callback with eventId when clicking starred button', () => {
      const onStar = vi.fn().mockResolvedValue(undefined);
      const onUnstar = vi.fn().mockResolvedValue(undefined);

      createStarButton(hostElement, {
        eventId,
        initialStarred: true,
        adapter,
        onStar,
        onUnstar,
      });

      const btn = getButton(hostElement);
      btn.click();

      expect(onUnstar).toHaveBeenCalledWith(eventId);
      expect(onStar).not.toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('update(true) switches to starred visual state', () => {
      const { update } = createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const btn = getButton(hostElement);
      expect(btn.getAttribute('aria-pressed')).toBe('false');

      update(true);

      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(btn.getAttribute('aria-label')).toBe('Unstar event');
      // Filled SVG should have fill="currentColor" on the path
      const path = btn.querySelector('svg path');
      expect(path).not.toBeNull();
      expect(path!.getAttribute('fill')).toBe('currentColor');
    });

    it('update(false) switches to unstarred visual state', () => {
      const { update } = createStarButton(hostElement, {
        eventId,
        initialStarred: true,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const btn = getButton(hostElement);
      expect(btn.getAttribute('aria-pressed')).toBe('true');

      update(false);

      expect(btn.getAttribute('aria-pressed')).toBe('false');
      expect(btn.getAttribute('aria-label')).toBe('Star event');
      // Outlined SVG should NOT have fill="currentColor" on the path
      const path = btn.querySelector('svg path');
      expect(path).not.toBeNull();
      expect(path!.getAttribute('fill')).toBeNull();
    });

    it('update changes click behavior to match new state', () => {
      const onStar = vi.fn().mockResolvedValue(undefined);
      const onUnstar = vi.fn().mockResolvedValue(undefined);

      const { update } = createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar,
        onUnstar,
      });

      // Initially unstarred, clicking should call onStar
      update(true);

      const btn = getButton(hostElement);
      btn.click();

      // Now starred, clicking should call onUnstar
      expect(onUnstar).toHaveBeenCalledWith(eventId);
      expect(onStar).not.toHaveBeenCalled();
    });
  });

  describe('destroy()', () => {
    it('removes the Shadow DOM host element', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const host = document.createElement('div');
      container.appendChild(host);

      const { destroy } = createStarButton(host, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      expect(container.contains(host)).toBe(true);

      destroy();

      expect(container.contains(host)).toBe(false);
      container.remove();
    });
  });

  describe('accessibility and sizing', () => {
    it('button has type="button"', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const btn = getButton(hostElement);
      expect(btn.getAttribute('type')).toBe('button');
    });

    it('button has star-btn class for 32px minimum clickable area', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const btn = getButton(hostElement);
      expect(btn.classList.contains('star-btn')).toBe(true);

      // Verify the CSS defines 32px dimensions
      const style = hostElement.shadowRoot!.querySelector('style');
      expect(style!.textContent).toContain('width: 32px');
      expect(style!.textContent).toContain('height: 32px');
    });

    it('SVG icon has 16px viewBox', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const svg = getSvg(hostElement);
      expect(svg.getAttribute('viewBox')).toBe('0 0 16 16');
    });

    it('CSS defines 16px SVG dimensions', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const style = hostElement.shadowRoot!.querySelector('style');
      const css = style!.textContent!;
      // CSS should define svg width and height as 16px
      expect(css).toContain('16px');
    });

    it('CSS defines focus-visible outline', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      const style = hostElement.shadowRoot!.querySelector('style');
      const css = style!.textContent!;
      expect(css).toContain('focus-visible');
      expect(css).toContain('2px solid #2563eb');
      expect(css).toContain('outline-offset: 2px');
    });
  });

  describe('SVG constants', () => {
    it('STAR_OUTLINED_SVG contains an SVG element with viewBox', () => {
      expect(STAR_OUTLINED_SVG).toContain('<svg');
      expect(STAR_OUTLINED_SVG).toContain('viewBox="0 0 16 16"');
      expect(STAR_OUTLINED_SVG).toContain('<path');
    });

    it('STAR_FILLED_SVG contains an SVG element with viewBox', () => {
      expect(STAR_FILLED_SVG).toContain('<svg');
      expect(STAR_FILLED_SVG).toContain('viewBox="0 0 16 16"');
      expect(STAR_FILLED_SVG).toContain('<path');
    });

    it('STAR_OUTLINED_SVG and STAR_FILLED_SVG are different', () => {
      expect(STAR_OUTLINED_SVG).not.toBe(STAR_FILLED_SVG);
    });
  });

  describe('all tests use mocked BrowserApiAdapter', () => {
    it('adapter.getMessage is called for localization', () => {
      createStarButton(hostElement, {
        eventId,
        initialStarred: false,
        adapter,
        onStar: vi.fn().mockResolvedValue(undefined),
        onUnstar: vi.fn().mockResolvedValue(undefined),
      });

      expect(adapter.getMessage).toHaveBeenCalled();
    });
  });
});
