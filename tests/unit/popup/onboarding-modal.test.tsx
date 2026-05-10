/**
 * Unit tests for OnboardingView modal overlay and focus trapping.
 *
 * Verifies that OnboardingView renders as a fixed overlay with proper
 * ARIA attributes, keyboard dismiss, and focus trapping behavior.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter } from '#core/types';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';

import { OnboardingView } from '#ui/popup/components/OnboardingView';

// ─── Helpers ──────────────────────────────────────────────────────

const messageMap: Record<string, string> = {
  onboardingTitle: 'How it works',
  onboardingStep1: 'Visit the programme page',
  onboardingStep2: 'Click the star on events you like',
  onboardingStep3: 'Open this popup to see your starred events',
  onboardingStep4: 'Export to your calendar',
  onboardingDismiss: 'Got it!',
};

let adapter: IBrowserApiAdapter;

function setupAdapter(): void {
  (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => messageMap[key] ?? '',
  );
}

// ─── Tests: Modal Overlay ─────────────────────────────────────────

describe('OnboardingView — modal overlay', () => {
  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
    setupAdapter();
  });

  it('renders overlay with fixed inset-0 z-50 classes', () => {
    const { container } = render(
      <OnboardingView adapter={adapter} onDismiss={vi.fn()} />,
    );

    const overlay = container.firstElementChild as HTMLElement;
    expect(overlay.className).toContain('fixed');
    expect(overlay.className).toContain('inset-0');
    expect(overlay.className).toContain('z-50');
  });

  it('has role="dialog" attribute', () => {
    render(<OnboardingView adapter={adapter} onDismiss={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
  });

  it('has aria-modal="true" attribute', () => {
    render(<OnboardingView adapter={adapter} onDismiss={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
  });

  it('has aria-labelledby="onboarding-title"', () => {
    render(<OnboardingView adapter={adapter} onDismiss={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'onboarding-title');
  });

  it('dismiss button calls onDismiss', () => {
    const onDismiss = vi.fn();
    render(<OnboardingView adapter={adapter} onDismiss={onDismiss} />);

    const dismissButton = screen.getByText('Got it!');
    fireEvent.click(dismissButton);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('Escape key closes the overlay', () => {
    const onDismiss = vi.fn();
    render(<OnboardingView adapter={adapter} onDismiss={onDismiss} />);

    const dialog = screen.getByRole('dialog');
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

// ─── Tests: Focus Trapping ────────────────────────────────────────

describe('OnboardingView — focus trapping', () => {
  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
    setupAdapter();
  });

  it('moves focus to first focusable element on mount', async () => {
    render(<OnboardingView adapter={adapter} onDismiss={vi.fn()} />);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      const focusableElements = dialog.querySelectorAll<HTMLElement>(
        'a[href], button, [tabindex]:not([tabindex="-1"])',
      );
      expect(focusableElements.length).toBeGreaterThan(0);
      expect(document.activeElement).toBe(focusableElements[0]);
    });
  });

  it('Tab at last focusable element cycles to first', async () => {
    render(<OnboardingView adapter={adapter} onDismiss={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'a[href], button, [tabindex]:not([tabindex="-1"])',
    );

    // Focus the last element
    const lastElement = focusableElements[focusableElements.length - 1]!;
    lastElement.focus();
    expect(document.activeElement).toBe(lastElement);

    // Press Tab
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: false });

    expect(document.activeElement).toBe(focusableElements[0]);
  });

  it('Shift+Tab at first focusable element cycles to last', async () => {
    render(<OnboardingView adapter={adapter} onDismiss={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'a[href], button, [tabindex]:not([tabindex="-1"])',
    );

    // Focus the first element
    const firstElement = focusableElements[0]!;
    firstElement.focus();
    expect(document.activeElement).toBe(firstElement);

    // Press Shift+Tab
    fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });

    const lastElement = focusableElements[focusableElements.length - 1]!;
    expect(document.activeElement).toBe(lastElement);
  });

  it('focus returns to trigger element on dismiss', async () => {
    // Create a trigger button in the DOM
    const triggerButton = document.createElement('button');
    triggerButton.textContent = 'Help';
    document.body.appendChild(triggerButton);
    triggerButton.focus();

    const triggerRef = { current: triggerButton };
    const onDismiss = vi.fn();

    const { unmount } = render(
      <OnboardingView adapter={adapter} onDismiss={onDismiss} triggerRef={triggerRef} />,
    );

    // Dismiss the overlay
    const dismissButton = screen.getByText('Got it!');
    fireEvent.click(dismissButton);

    // After dismiss, focus should return to trigger
    await waitFor(() => {
      expect(document.activeElement).toBe(triggerButton);
    });

    unmount();
    document.body.removeChild(triggerButton);
  });
});
