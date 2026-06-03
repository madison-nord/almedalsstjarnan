// Feature: user-help-onboarding, Property 4: Decorative Icon Accessibility

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { render, cleanup } from '@testing-library/react';
import React from 'react';

import type { IBrowserApiAdapter } from '#core/types';
import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { HELP_FEATURE_GROUPS } from '#ui/shared/help-feature-groups';

import { HelpModal } from '#ui/shared/HelpModal';

/**
 * Property 4: Decorative Icon Accessibility
 *
 * For any SVG icon element rendered within the HelpModal's feature group list,
 * the element SHALL have the attribute `aria-hidden="true"`.
 *
 * **Validates: Requirements 8.2**
 */
describe('Property 4: Decorative Icon Accessibility', () => {
  function setupAdapter(): IBrowserApiAdapter {
    (mockBrowserApi.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => `msg_${key}`,
    );
    return mockBrowserApi;
  }

  const groupIndices = Array.from(
    { length: HELP_FEATURE_GROUPS.length },
    (_, i) => i,
  );

  it('every SVG icon at a randomly selected feature group index has aria-hidden="true"', () => {
    const adapter = setupAdapter();

    fc.assert(
      fc.property(
        fc.constantFrom(...groupIndices),
        (index) => {
          const { container } = render(
            React.createElement(HelpModal, {
              adapter,
              onDismiss: vi.fn(),
              layoutMode: 'popup',
            }),
          );

          // Query all SVG elements within the modal
          const svgs = container.querySelectorAll('svg');

          // The modal renders 9 feature group icons + 1 dismiss button icon = 10 SVGs
          // The feature group SVGs correspond to indices in HELP_FEATURE_GROUPS
          // All SVGs should have aria-hidden="true" regardless of which index we pick
          const targetSvg = svgs[index];
          expect(targetSvg).toBeDefined();
          expect(targetSvg!.getAttribute('aria-hidden')).toBe('true');

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('ALL SVG elements in the modal have aria-hidden="true"', () => {
    const adapter = setupAdapter();

    fc.assert(
      fc.property(
        fc.constantFrom('popup' as const, 'page' as const),
        (layoutMode) => {
          const { container } = render(
            React.createElement(HelpModal, {
              adapter,
              onDismiss: vi.fn(),
              layoutMode,
            }),
          );

          const svgs = container.querySelectorAll('svg');

          // There should be at least 9 feature group icons + 1 dismiss icon
          expect(svgs.length).toBeGreaterThanOrEqual(HELP_FEATURE_GROUPS.length);

          // Every single SVG must have aria-hidden="true"
          for (const svg of svgs) {
            expect(svg.getAttribute('aria-hidden')).toBe('true');
          }

          cleanup();
        },
      ),
      { numRuns: 100 },
    );
  });
});
