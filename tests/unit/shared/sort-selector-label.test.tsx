/**
 * Unit tests for SortSelector labelClassName prop.
 *
 * TDD — written BEFORE the prop exists to drive the implementation.
 * Tests that SortSelector accepts an optional labelClassName prop
 * to allow configurable label text color for contrast on dark backgrounds.
 *
 * Requirements: 1.4, 2.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter, SortOrder } from '#core/types';
import { SortSelector } from '#ui/shared/SortSelector';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';

describe('SortSelector labelClassName prop', () => {
  let adapter: IBrowserApiAdapter;
  let onOrderChange: (order: SortOrder) => void;

  const messageMap: Record<string, string> = {
    sortChronological: 'Chronological',
    sortReverseChronological: 'Reverse chronological',
    sortAlphabeticalTitle: 'Title A–Z',
    sortStarredDesc: 'Recently starred',
    sortLabel: 'Sort by',
    sortVisibleLabel: 'Sort:',
  };

  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
    (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => messageMap[key] ?? '',
    );
    onOrderChange = vi.fn<(order: SortOrder) => void>();
  });

  it('applies custom labelClassName when provided', () => {
    render(
      <SortSelector
        currentOrder="chronological"
        onOrderChange={onOrderChange}
        adapter={adapter}
        labelClassName="text-gray-200"
      />,
    );

    const label = screen.getByText('Sort:');
    expect(label).toHaveClass('text-gray-200');
  });

  it('defaults to text-gray-600 when no labelClassName is passed', () => {
    render(
      <SortSelector
        currentOrder="chronological"
        onOrderChange={onOrderChange}
        adapter={adapter}
      />,
    );

    const label = screen.getByText('Sort:');
    expect(label).toHaveClass('text-gray-600');
  });
});
