/**
 * Unit tests for OnboardingView component.
 *
 * Tests:
 * - Renders onboarding title and all four steps
 * - Dismiss button calls onDismiss callback
 * - Uses adapter.getMessage for all strings
 * - Proper heading hierarchy (h2)
 * - Steps rendered as ordered list
 * - Dismiss button is keyboard accessible
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter } from '#core/types';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';

import { OnboardingView } from '#ui/popup/components/OnboardingView';

// ─── i18n Message Map ─────────────────────────────────────────────

const messageMap: Record<string, string> = {
  onboardingTitle: 'Welcome to Almedalsstjärnan',
  onboardingStep1: 'Visit the Almedalsveckan programme',
  onboardingStep2: 'Click the star to save events',
  onboardingStep3: 'Open the extension to see saved events',
  onboardingStep4: 'Export to your calendar',
  onboardingDismiss: 'Close',
  helpLink: 'How does it work?',
};

// ─── Helpers ──────────────────────────────────────────────────────

let adapter: IBrowserApiAdapter;

function setupAdapter(): void {
  (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => messageMap[key] ?? '',
  );
}

// ─── Tests ────────────────────────────────────────────────────────

describe('OnboardingView', () => {
  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
    setupAdapter();
  });

  describe('rendering', () => {
    it('renders the onboarding title as h2', () => {
      render(<OnboardingView adapter={adapter} onDismiss={vi.fn()} />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Welcome to Almedalsstjärnan');
    });

    it('renders all four onboarding steps', () => {
      render(<OnboardingView adapter={adapter} onDismiss={vi.fn()} />);

      expect(screen.getByText('Visit the Almedalsveckan programme')).toBeInTheDocument();
      expect(screen.getByText('Click the star to save events')).toBeInTheDocument();
      expect(screen.getByText('Open the extension to see saved events')).toBeInTheDocument();
      expect(screen.getByText('Export to your calendar')).toBeInTheDocument();
    });

    it('renders steps as an ordered list', () => {
      render(<OnboardingView adapter={adapter} onDismiss={vi.fn()} />);

      const list = screen.getByRole('list');
      expect(list.tagName).toBe('OL');

      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(4);
    });

    it('renders dismiss button', () => {
      render(<OnboardingView adapter={adapter} onDismiss={vi.fn()} />);

      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    it('has aria-labelledby pointing to the title', () => {
      render(<OnboardingView adapter={adapter} onDismiss={vi.fn()} />);

      const section = screen.getByRole('region', { hidden: false }) ??
        document.querySelector('section[aria-labelledby="onboarding-title"]');
      expect(section).not.toBeNull();
    });
  });

  describe('i18n', () => {
    it('uses getMessage for all strings', () => {
      render(<OnboardingView adapter={adapter} onDismiss={vi.fn()} />);

      expect(adapter.getMessage).toHaveBeenCalledWith('onboardingTitle');
      expect(adapter.getMessage).toHaveBeenCalledWith('onboardingStep1');
      expect(adapter.getMessage).toHaveBeenCalledWith('onboardingStep2');
      expect(adapter.getMessage).toHaveBeenCalledWith('onboardingStep3');
      expect(adapter.getMessage).toHaveBeenCalledWith('onboardingStep4');
      expect(adapter.getMessage).toHaveBeenCalledWith('onboardingDismiss');
    });
  });

  describe('dismissal', () => {
    it('calls onDismiss when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      render(<OnboardingView adapter={adapter} onDismiss={onDismiss} />);

      const button = screen.getByRole('button', { name: 'Close' });
      await user.click(button);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('dismiss button is keyboard accessible via Enter', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      render(<OnboardingView adapter={adapter} onDismiss={onDismiss} />);

      const button = screen.getByRole('button', { name: 'Close' });
      button.focus();
      await user.keyboard('{Enter}');

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('dismiss button is keyboard accessible via Space', async () => {
      const user = userEvent.setup();
      const onDismiss = vi.fn();
      render(<OnboardingView adapter={adapter} onDismiss={onDismiss} />);

      const button = screen.getByRole('button', { name: 'Close' });
      button.focus();
      await user.keyboard(' ');

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });
});
