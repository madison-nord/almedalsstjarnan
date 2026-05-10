/**
 * Unit tests for BulkActions always-visible disabled state.
 *
 * Validates that the BulkActions component always renders (never returns null),
 * buttons are properly disabled/enabled based on selection state, and counts
 * are always displayed.
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter } from '#core/types';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';

import { BulkActions } from '#ui/stars/components/BulkActions';

// ─── Helpers ──────────────────────────────────────────────────────

function setupAdapter(): IBrowserApiAdapter {
  (mockBrowserApi.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => {
      const messages: Record<string, string> = {
        selectAll: 'Select all',
        unstarSelected: 'Unstar selected',
        exportSelected: 'Export selected',
      };
      return messages[key] ?? key;
    },
  );
  return mockBrowserApi;
}

interface RenderProps {
  readonly selectedCount: number;
  readonly totalCount: number;
  readonly allSelected?: boolean;
}

function renderBulkActions({ selectedCount, totalCount, allSelected = false }: RenderProps) {
  const adapter = setupAdapter();
  return render(
    <BulkActions
      selectedCount={selectedCount}
      totalCount={totalCount}
      onSelectAll={vi.fn()}
      onClearSelection={vi.fn()}
      onUnstarSelected={vi.fn()}
      onExportSelected={vi.fn()}
      allSelected={allSelected}
      adapter={adapter}
    />,
  );
}

// ─── Tests ────────────────────────────────────────────────────────

describe('BulkActions always-visible disabled state (Requirements 2.1, 2.2, 2.3, 2.4, 2.5)', () => {
  describe('component renders when selectedCount === 0 (Req 2.1)', () => {
    it('renders the toolbar when no events are selected', () => {
      renderBulkActions({ selectedCount: 0, totalCount: 10 });

      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toBeInTheDocument();
    });
  });

  describe('buttons have disabled attribute and opacity-50 cursor-not-allowed when selectedCount === 0 (Req 2.2)', () => {
    it('unstar selected button is disabled with reduced opacity', () => {
      const { container } = renderBulkActions({ selectedCount: 0, totalCount: 10 });

      const buttons = container.querySelectorAll('button');
      const unstarButton = Array.from(buttons).find(
        (btn) => btn.textContent === 'Unstar selected',
      );

      expect(unstarButton).toBeDefined();
      expect(unstarButton!).toBeDisabled();
      expect(unstarButton!).toHaveClass('opacity-50');
      expect(unstarButton!).toHaveClass('cursor-not-allowed');
    });

    it('export selected button is disabled with reduced opacity', () => {
      const { container } = renderBulkActions({ selectedCount: 0, totalCount: 10 });

      const buttons = container.querySelectorAll('button');
      const exportButton = Array.from(buttons).find(
        (btn) => btn.textContent === 'Export selected',
      );

      expect(exportButton).toBeDefined();
      expect(exportButton!).toBeDisabled();
      expect(exportButton!).toHaveClass('opacity-50');
      expect(exportButton!).toHaveClass('cursor-not-allowed');
    });
  });

  describe('buttons are enabled and fully opaque when selectedCount > 0 (Req 2.3)', () => {
    it('unstar selected button is enabled without opacity classes', () => {
      const { container } = renderBulkActions({ selectedCount: 3, totalCount: 10 });

      const buttons = container.querySelectorAll('button');
      const unstarButton = Array.from(buttons).find(
        (btn) => btn.textContent === 'Unstar selected',
      );

      expect(unstarButton).toBeDefined();
      expect(unstarButton!).not.toBeDisabled();
      expect(unstarButton!).not.toHaveClass('opacity-50');
      expect(unstarButton!).not.toHaveClass('cursor-not-allowed');
    });

    it('export selected button is enabled without opacity classes', () => {
      const { container } = renderBulkActions({ selectedCount: 3, totalCount: 10 });

      const buttons = container.querySelectorAll('button');
      const exportButton = Array.from(buttons).find(
        (btn) => btn.textContent === 'Export selected',
      );

      expect(exportButton).toBeDefined();
      expect(exportButton!).not.toBeDisabled();
      expect(exportButton!).not.toHaveClass('opacity-50');
      expect(exportButton!).not.toHaveClass('cursor-not-allowed');
    });
  });

  describe('select all button remains enabled when selectedCount === 0', () => {
    it('select all button is not disabled when nothing is selected', () => {
      const { container } = renderBulkActions({ selectedCount: 0, totalCount: 10 });

      const buttons = container.querySelectorAll('button');
      const selectAllButton = Array.from(buttons).find(
        (btn) => btn.textContent === 'Select all',
      );

      expect(selectAllButton).toBeDefined();
      expect(selectAllButton!).not.toBeDisabled();
      expect(selectAllButton!).not.toHaveClass('opacity-50');
      expect(selectAllButton!).not.toHaveClass('cursor-not-allowed');
    });
  });

  describe('count displays "0 / {totalCount}" when nothing selected (Req 2.4, 2.5)', () => {
    it('displays "0 / 10" when selectedCount is 0 and totalCount is 10', () => {
      renderBulkActions({ selectedCount: 0, totalCount: 10 });

      expect(screen.getByText('0 / 10')).toBeInTheDocument();
    });

    it('displays "0 / 0" when both counts are zero', () => {
      renderBulkActions({ selectedCount: 0, totalCount: 0 });

      expect(screen.getByText('0 / 0')).toBeInTheDocument();
    });

    it('displays "5 / 20" when selectedCount is 5 and totalCount is 20', () => {
      renderBulkActions({ selectedCount: 5, totalCount: 20 });

      expect(screen.getByText('5 / 20')).toBeInTheDocument();
    });
  });
});
