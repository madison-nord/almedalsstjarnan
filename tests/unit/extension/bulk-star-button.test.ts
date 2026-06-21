/**
 * Unit tests for Bulk Star Button (Shadow DOM).
 *
 * Tests the createBulkStarButton function which renders an accessible
 * bulk-star action button inside a Shadow DOM for style isolation.
 *
 * Requirements: 1.1, 1.3, 1.5
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createBulkStarButton } from '#extension/bulk-star-button';

describe('Bulk Star Button', () => {
  let hostElement: HTMLElement;

  beforeEach(() => {
    hostElement = document.createElement('div');
    document.body.appendChild(hostElement);
  });

  afterEach(() => {
    hostElement.remove();
  });

  describe('Shadow DOM creation', () => {
    it('creates Shadow DOM with open mode', () => {
      createBulkStarButton(hostElement, {
        locale: 'sv',
        onActivate: vi.fn(),
      });

      expect(hostElement.shadowRoot).not.toBeNull();
      expect(hostElement.shadowRoot!.mode).toBe('open');
    });

    it('injects scoped CSS into shadow root', () => {
      createBulkStarButton(hostElement, {
        locale: 'sv',
        onActivate: vi.fn(),
      });

      const style = hostElement.shadowRoot!.querySelector('style');
      expect(style).not.toBeNull();
      expect(style!.textContent).toContain('.bulk-star-btn');
    });

    it('renders a button element inside shadow root', () => {
      createBulkStarButton(hostElement, {
        locale: 'sv',
        onActivate: vi.fn(),
      });

      const btn = hostElement.shadowRoot!.querySelector('button.bulk-star-btn');
      expect(btn).not.toBeNull();
    });
  });

  describe('locale label rendering', () => {
    it('renders button with "Stjärnmärk alla" label when locale is sv', () => {
      createBulkStarButton(hostElement, {
        locale: 'sv',
        onActivate: vi.fn(),
      });

      const btn = hostElement.shadowRoot!.querySelector('button.bulk-star-btn')!;
      expect(btn.textContent).toBe('Stjärnmärk alla');
    });

    it('renders button with "Star all" label when locale is en', () => {
      createBulkStarButton(hostElement, {
        locale: 'en',
        onActivate: vi.fn(),
      });

      const btn = hostElement.shadowRoot!.querySelector('button.bulk-star-btn')!;
      expect(btn.textContent).toBe('Star all');
    });
  });

  describe('accessibility attributes', () => {
    it('button has aria-label matching visible text for sv locale', () => {
      createBulkStarButton(hostElement, {
        locale: 'sv',
        onActivate: vi.fn(),
      });

      const btn = hostElement.shadowRoot!.querySelector('button.bulk-star-btn')!;
      expect(btn.getAttribute('aria-label')).toBe('Stjärnmärk alla');
    });

    it('button has aria-label matching visible text for en locale', () => {
      createBulkStarButton(hostElement, {
        locale: 'en',
        onActivate: vi.fn(),
      });

      const btn = hostElement.shadowRoot!.querySelector('button.bulk-star-btn')!;
      expect(btn.getAttribute('aria-label')).toBe('Star all');
    });

    it('button has minimum 44×44px touch target defined in CSS', () => {
      createBulkStarButton(hostElement, {
        locale: 'sv',
        onActivate: vi.fn(),
      });

      const style = hostElement.shadowRoot!.querySelector('style')!;
      const css = style.textContent!;
      expect(css).toContain('min-width: 44px');
      expect(css).toContain('min-height: 48px');
    });

    it('button has focus-visible indicator defined in CSS', () => {
      createBulkStarButton(hostElement, {
        locale: 'sv',
        onActivate: vi.fn(),
      });

      const style = hostElement.shadowRoot!.querySelector('style')!;
      const css = style.textContent!;
      expect(css).toContain('focus-visible');
      expect(css).toContain('2px solid #2563eb');
      expect(css).toContain('outline-offset: 2px');
    });

    it('button has type="button"', () => {
      createBulkStarButton(hostElement, {
        locale: 'sv',
        onActivate: vi.fn(),
      });

      const btn = hostElement.shadowRoot!.querySelector('button.bulk-star-btn')!;
      expect(btn.getAttribute('type')).toBe('button');
    });
  });

  describe('setVisible lifecycle', () => {
    it('setVisible(false) hides the host element via data-hidden attribute', () => {
      const handle = createBulkStarButton(hostElement, {
        locale: 'sv',
        onActivate: vi.fn(),
      });

      handle.setVisible(false);

      expect(hostElement.getAttribute('data-hidden')).toBe('true');
    });

    it('setVisible(true) shows the host element by removing data-hidden', () => {
      const handle = createBulkStarButton(hostElement, {
        locale: 'sv',
        onActivate: vi.fn(),
      });

      handle.setVisible(false);
      expect(hostElement.getAttribute('data-hidden')).toBe('true');

      handle.setVisible(true);
      expect(hostElement.hasAttribute('data-hidden')).toBe(false);
    });
  });

  describe('setDisabled lifecycle', () => {
    it('setDisabled(true) disables the button and sets aria-disabled', () => {
      const handle = createBulkStarButton(hostElement, {
        locale: 'sv',
        onActivate: vi.fn(),
      });

      handle.setDisabled(true);

      const btn = hostElement.shadowRoot!.querySelector(
        'button.bulk-star-btn',
      )! as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
      expect(btn.getAttribute('aria-disabled')).toBe('true');
    });

    it('setDisabled(false) re-enables the button and clears aria-disabled', () => {
      const handle = createBulkStarButton(hostElement, {
        locale: 'sv',
        onActivate: vi.fn(),
      });

      handle.setDisabled(true);
      handle.setDisabled(false);

      const btn = hostElement.shadowRoot!.querySelector(
        'button.bulk-star-btn',
      )! as HTMLButtonElement;
      expect(btn.disabled).toBe(false);
      expect(btn.getAttribute('aria-disabled')).toBe('false');
    });
  });

  describe('destroy lifecycle', () => {
    it('destroy() removes the host element from the DOM', () => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const host = document.createElement('div');
      container.appendChild(host);

      const handle = createBulkStarButton(host, {
        locale: 'sv',
        onActivate: vi.fn(),
      });

      expect(container.contains(host)).toBe(true);

      handle.destroy();

      expect(container.contains(host)).toBe(false);
      container.remove();
    });
  });

  describe('click interaction', () => {
    it('click triggers onActivate callback', () => {
      const onActivate = vi.fn();

      createBulkStarButton(hostElement, {
        locale: 'sv',
        onActivate,
      });

      const btn = hostElement.shadowRoot!.querySelector(
        'button.bulk-star-btn',
      )! as HTMLButtonElement;
      btn.click();

      expect(onActivate).toHaveBeenCalledTimes(1);
    });

    it('click does NOT trigger onActivate when disabled', () => {
      const onActivate = vi.fn();

      const handle = createBulkStarButton(hostElement, {
        locale: 'sv',
        onActivate,
      });

      handle.setDisabled(true);

      const btn = hostElement.shadowRoot!.querySelector(
        'button.bulk-star-btn',
      )! as HTMLButtonElement;
      btn.click();

      expect(onActivate).not.toHaveBeenCalled();
    });
  });
});
