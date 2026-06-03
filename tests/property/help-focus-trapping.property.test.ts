// Feature: user-help-onboarding, Property 3: Focus Trapping Invariant

/**
 * Property-based test verifying that keyboard focus remains trapped within
 * the HelpModal container for any number of Tab presses (1–100).
 *
 * **Validates: Requirements 5.1**
 */

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { render, cleanup, fireEvent } from '@testing-library/react';
import React from 'react';

import type { IBrowserApiAdapter } from '#core/types';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';

import { HelpModal } from '#ui/shared/HelpModal';

// ─── Helpers ──────────────────────────────────────────────────────

function setupAdapter(): IBrowserApiAdapter {
  (mockBrowserApi.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (key: string) => `msg_${key}`,
  );
  return mockBrowserApi;
}

// ─── Properties ───────────────────────────────────────────────────

describe('Property 3: Focus Trapping Invariant', () => {
  /**
   * **Validates: Requirements 5.1**
   *
   * For any sequence of N Tab key presses (where N ranges from 1 to 100)
   * while the HelpModal is open, the currently focused element SHALL remain
   * within the modal container's DOM subtree.
   */
  it('focus remains within modal container for any number of Tab presses', () => {
    const adapter = setupAdapter();

    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (tabCount: number) => {
          const { container } = render(
            React.createElement(HelpModal, {
              adapter,
              onDismiss: vi.fn(),
              layoutMode: 'popup',
            }),
          );

          // The modal container is the outermost div with class containing "fixed"
          const modalContainer = container.querySelector('[class*="fixed"]');
          expect(modalContainer).not.toBeNull();

          // Simulate N Tab presses by dispatching keydown on the modal container
          for (let i = 0; i < tabCount; i++) {
            fireEvent.keyDown(modalContainer!, {
              key: 'Tab',
              code: 'Tab',
              charCode: 9,
            });
          }

          // After all Tab presses, activeElement must be within the modal container
          const activeElement = document.activeElement;
          expect(modalContainer!.contains(activeElement)).toBe(true);

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});
