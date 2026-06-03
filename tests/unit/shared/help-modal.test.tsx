/**
 * Unit tests for HelpModal shared component.
 *
 * Tests rendering of all 9 feature groups, accessibility attributes,
 * focus management, keyboard interaction, backdrop dismiss, layout modes,
 * and focus return to trigger element.
 *
 * Requirements: 1.1, 1.2, 1.3, 5.1, 5.2, 5.3, 5.5, 5.6, 6.1, 6.2, 9.5, 9.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { createRef } from 'react';

import type { IBrowserApiAdapter } from '#core/types';
import { HelpModal } from '#ui/shared/HelpModal';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';

const messageMap: Record<string, string> = {
  helpModalTitle: 'Funktionsöversikt',
  helpModalDismiss: 'Stäng',
  helpGroupStarEventsHeading: 'Stjärnmarkera evenemang',
  helpGroupStarEventsDesc: 'Klicka på stjärnan bredvid ett evenemang.',
  helpGroupPopupViewHeading: 'Popup-vy',
  helpGroupPopupViewDesc: 'Se dina stjärnmarkerade evenemang i popup-fönstret.',
  helpGroupStarsPageHeading: 'Stjärnsidan',
  helpGroupStarsPageDesc: 'En dedikerad sida med alla stjärnmarkerade evenemang.',
  helpGroupSortingHeading: 'Sortering',
  helpGroupSortingDesc: 'Sortera evenemang kronologiskt eller alfabetiskt.',
  helpGroupConflictHeading: 'Konflikter',
  helpGroupConflictDesc: 'Se varningar om tidskonflikter.',
  helpGroupSearchFilterHeading: 'Sök och filtrera',
  helpGroupSearchFilterDesc: 'Filtrera evenemang på stjärnsidan.',
  helpGroupBulkActionsHeading: 'Massåtgärder',
  helpGroupBulkActionsDesc: 'Markera flera och exportera eller ta bort.',
  helpGroupIcsExportHeading: 'ICS-export',
  helpGroupIcsExportDesc: 'Exportera till kalenderformat.',
  helpGroupLanguageHeading: 'Språkväljare',
  helpGroupLanguageDesc: 'Växla mellan svenska och engelska.',
};

describe('HelpModal', () => {
  let adapter: IBrowserApiAdapter;
  let onDismiss: ReturnType<typeof vi.fn> & (() => void);

  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
    (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => messageMap[key] ?? '',
    );
    onDismiss = vi.fn() as ReturnType<typeof vi.fn> & (() => void);
  });

  describe('feature group rendering', () => {
    it('renders all 9 feature groups with icon, heading, and description', () => {
      render(<HelpModal adapter={adapter} onDismiss={onDismiss} layoutMode="popup" />);

      // Verify all 9 headings are rendered
      expect(screen.getByText('Stjärnmarkera evenemang')).toBeInTheDocument();
      expect(screen.getByText('Popup-vy')).toBeInTheDocument();
      expect(screen.getByText('Stjärnsidan')).toBeInTheDocument();
      expect(screen.getByText('Sortering')).toBeInTheDocument();
      expect(screen.getByText('Konflikter')).toBeInTheDocument();
      expect(screen.getByText('Sök och filtrera')).toBeInTheDocument();
      expect(screen.getByText('Massåtgärder')).toBeInTheDocument();
      expect(screen.getByText('ICS-export')).toBeInTheDocument();
      expect(screen.getByText('Språkväljare')).toBeInTheDocument();

      // Verify all 9 descriptions are rendered
      expect(screen.getByText('Klicka på stjärnan bredvid ett evenemang.')).toBeInTheDocument();
      expect(
        screen.getByText('Se dina stjärnmarkerade evenemang i popup-fönstret.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('En dedikerad sida med alla stjärnmarkerade evenemang.'),
      ).toBeInTheDocument();
      expect(
        screen.getByText('Sortera evenemang kronologiskt eller alfabetiskt.'),
      ).toBeInTheDocument();
      expect(screen.getByText('Se varningar om tidskonflikter.')).toBeInTheDocument();
      expect(screen.getByText('Filtrera evenemang på stjärnsidan.')).toBeInTheDocument();
      expect(screen.getByText('Markera flera och exportera eller ta bort.')).toBeInTheDocument();
      expect(screen.getByText('Exportera till kalenderformat.')).toBeInTheDocument();
      expect(screen.getByText('Växla mellan svenska och engelska.')).toBeInTheDocument();

      // Verify SVG icons are rendered (9 feature group icons + 1 dismiss button icon)
      const svgs = document.querySelectorAll('svg[aria-hidden="true"]');
      expect(svgs.length).toBeGreaterThanOrEqual(9);
    });
  });

  describe('accessibility attributes', () => {
    it('has role="dialog" on the modal content', () => {
      render(<HelpModal adapter={adapter} onDismiss={onDismiss} layoutMode="popup" />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
    });

    it('has aria-modal="true" on the dialog', () => {
      render(<HelpModal adapter={adapter} onDismiss={onDismiss} layoutMode="popup" />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby referencing the modal title', () => {
      render(<HelpModal adapter={adapter} onDismiss={onDismiss} layoutMode="popup" />);

      const dialog = screen.getByRole('dialog');
      const labelledBy = dialog.getAttribute('aria-labelledby');
      expect(labelledBy).toBeTruthy();

      // The referenced element should contain the title text
      const titleElement = document.getElementById(labelledBy!);
      expect(titleElement).toBeInTheDocument();
      expect(titleElement).toHaveTextContent('Funktionsöversikt');
    });
  });

  describe('focus management', () => {
    it('moves initial focus to the dismiss button on mount', () => {
      render(<HelpModal adapter={adapter} onDismiss={onDismiss} layoutMode="popup" />);

      const dismissButton = screen.getByRole('button', { name: 'Stäng' });
      expect(dismissButton).toHaveFocus();
    });

    it('returns focus to triggerRef on close', async () => {
      const triggerRef = createRef<HTMLButtonElement>();

      function TestWrapper(): React.JSX.Element {
        return (
          <div>
            <button ref={triggerRef}>Open Help</button>
            <HelpModal
              adapter={adapter}
              onDismiss={onDismiss}
              triggerRef={triggerRef}
              layoutMode="popup"
            />
          </div>
        );
      }

      render(<TestWrapper />);

      // Click dismiss button
      const dismissButton = screen.getByRole('button', { name: 'Stäng' });
      fireEvent.click(dismissButton);

      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(triggerRef.current).toHaveFocus();
    });
  });

  describe('keyboard interaction', () => {
    it('closes modal when Escape key is pressed', async () => {
      render(<HelpModal adapter={adapter} onDismiss={onDismiss} layoutMode="popup" />);

      // Press Escape on the modal container
      const modalContainer = screen.getByRole('dialog').closest('[class*="fixed"]')!;
      fireEvent.keyDown(modalContainer, { key: 'Escape' });

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('closes modal when Enter is pressed on dismiss button', async () => {
      const user = userEvent.setup();

      render(<HelpModal adapter={adapter} onDismiss={onDismiss} layoutMode="popup" />);

      const dismissButton = screen.getByRole('button', { name: 'Stäng' });
      await user.type(dismissButton, '{Enter}');

      expect(onDismiss).toHaveBeenCalled();
    });

    it('closes modal when Space is pressed on dismiss button', async () => {
      const user = userEvent.setup();

      render(<HelpModal adapter={adapter} onDismiss={onDismiss} layoutMode="popup" />);

      const dismissButton = screen.getByRole('button', { name: 'Stäng' });
      await user.type(dismissButton, ' ');

      expect(onDismiss).toHaveBeenCalled();
    });
  });

  describe('backdrop dismiss', () => {
    it('triggers onDismiss when backdrop is clicked', () => {
      render(<HelpModal adapter={adapter} onDismiss={onDismiss} layoutMode="popup" />);

      // The backdrop is the element with bg-black/40
      const backdrop = document.querySelector('.bg-black\\/40')!;
      fireEvent.click(backdrop);

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does NOT trigger onDismiss when clicking inside modal content', () => {
      render(<HelpModal adapter={adapter} onDismiss={onDismiss} layoutMode="popup" />);

      // Click on the dialog content area
      const dialog = screen.getByRole('dialog');
      fireEvent.click(dialog);

      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  describe('layout modes', () => {
    it('uses single-column layout for layoutMode="popup"', () => {
      render(<HelpModal adapter={adapter} onDismiss={onDismiss} layoutMode="popup" />);

      const dialog = screen.getByRole('dialog');

      // Container should have popup-specific width constraints
      expect(dialog.className).toContain('max-w-[344px]');
      expect(dialog.className).toContain('max-h-[584px]');

      // Grid should be single column (no md:grid-cols-2)
      const grid = dialog.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid!.className).toContain('grid-cols-1');
      expect(grid!.className).not.toContain('md:grid-cols-2');
    });

    it('uses two-column grid layout for layoutMode="page"', () => {
      render(<HelpModal adapter={adapter} onDismiss={onDismiss} layoutMode="page" />);

      const dialog = screen.getByRole('dialog');

      // Container should have page-specific width constraints
      expect(dialog.className).toContain('max-w-[640px]');
      expect(dialog.className).toContain('max-h-[90vh]');

      // Grid should include two-column at md breakpoint
      const grid = dialog.querySelector('.grid');
      expect(grid).toBeInTheDocument();
      expect(grid!.className).toContain('md:grid-cols-2');
    });
  });
});
