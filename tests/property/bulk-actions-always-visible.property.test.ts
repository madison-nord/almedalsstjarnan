// Feature: popup-ux-improvements, Property 1: BulkActions always renders with correct button state
// Feature: popup-ux-improvements, Property 2: BulkActions always displays counts

/**
 * Property-based tests verifying that the BulkActions component always renders
 * (never returns null) and correctly manages button disabled state and count display.
 *
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { render, cleanup } from '@testing-library/react';
import React from 'react';

import type { IBrowserApiAdapter } from '#core/types';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';

import { BulkActions } from '#ui/stars/components/BulkActions';

// ─── Helpers ──────────────────────────────────────────────────────

function setupAdapter(): IBrowserApiAdapter {
  (mockBrowserApi.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => key,
  );
  return mockBrowserApi;
}

// ─── Properties ───────────────────────────────────────────────────

describe('Property 1: BulkActions always renders with correct button state', () => {
  /**
   * **Validates: Requirements 2.1, 2.2, 2.3**
   *
   * For any selectedCount (0..totalCount) and any totalCount (0..100),
   * the BulkActions component SHALL render a non-null element, and the
   * "unstar selected" and "export selected" buttons SHALL be disabled
   * if and only if selectedCount === 0.
   */
  it('always renders and buttons are disabled iff selectedCount === 0', () => {
    const adapter = setupAdapter();

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }).chain((totalCount) =>
          fc.tuple(
            fc.integer({ min: 0, max: totalCount }),
            fc.constant(totalCount),
          ),
        ),
        ([selectedCount, totalCount]) => {
          const { container } = render(
            React.createElement(BulkActions, {
              selectedCount,
              totalCount,
              onSelectAll: vi.fn(),
              onClearSelection: vi.fn(),
              onUnstarSelected: vi.fn(),
              onExportSelected: vi.fn(),
              allSelected: selectedCount === totalCount && totalCount > 0,
              adapter,
            }),
          );

          // Assert component always renders a non-null element
          const toolbar = container.querySelector('[role="toolbar"]');
          expect(toolbar).not.toBeNull();

          // Find the "unstar selected" and "export selected" buttons by their text
          const buttons = container.querySelectorAll('button');
          // Buttons: select all/clear, unstar selected, export selected
          const unstarButton = Array.from(buttons).find(
            (btn) => btn.textContent === 'unstarSelected',
          );
          const exportButton = Array.from(buttons).find(
            (btn) => btn.textContent === 'exportSelected',
          );

          expect(unstarButton).toBeDefined();
          expect(exportButton).toBeDefined();

          if (selectedCount === 0) {
            // Buttons should be disabled
            expect(unstarButton!.disabled).toBe(true);
            expect(exportButton!.disabled).toBe(true);
          } else {
            // Buttons should be enabled
            expect(unstarButton!.disabled).toBe(false);
            expect(exportButton!.disabled).toBe(false);
          }

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 2: BulkActions always displays counts', () => {
  /**
   * **Validates: Requirements 2.4, 2.5**
   *
   * For any selectedCount and totalCount, the rendered BulkActions output
   * SHALL contain both the selectedCount value and the totalCount value
   * as visible text.
   */
  it('always displays both selectedCount and totalCount as visible text', () => {
    const adapter = setupAdapter();

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }).chain((totalCount) =>
          fc.tuple(
            fc.integer({ min: 0, max: totalCount }),
            fc.constant(totalCount),
          ),
        ),
        ([selectedCount, totalCount]) => {
          const { container } = render(
            React.createElement(BulkActions, {
              selectedCount,
              totalCount,
              onSelectAll: vi.fn(),
              onClearSelection: vi.fn(),
              onUnstarSelected: vi.fn(),
              onExportSelected: vi.fn(),
              allSelected: selectedCount === totalCount && totalCount > 0,
              adapter,
            }),
          );

          const textContent = container.textContent ?? '';

          // Assert both numbers appear as visible text
          expect(textContent).toContain(String(selectedCount));
          expect(textContent).toContain(String(totalCount));

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});
