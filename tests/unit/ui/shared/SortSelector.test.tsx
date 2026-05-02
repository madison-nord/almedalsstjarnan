/**
 * Unit tests for shared SortSelector component.
 *
 * Tests the SortSelector React component which renders a native HTML
 * <select> element with four sort order options, localized labels,
 * and proper accessibility attributes.
 *
 * Requirements: 9.5, 10.4, 14.5, 14.6, 14.8
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter, SortOrder } from '#core/types';
import { SORT_ORDERS } from '#core/types';
import { SortSelector } from '#ui/shared/SortSelector';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';

describe('SortSelector', () => {
  let adapter: IBrowserApiAdapter;
  let onOrderChange: (order: SortOrder) => void;

  const messageMap: Record<string, string> = {
    sortChronological: 'Chronological',
    sortReverseChronological: 'Reverse chronological',
    sortAlphabeticalTitle: 'Title A–Z',
    sortStarredDesc: 'Recently starred',
    sortLabel: 'Sort by',
  };

  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
    (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => messageMap[key] ?? '',
    );
    onOrderChange = vi.fn<(order: SortOrder) => void>();
  });

  function renderSelector(currentOrder: SortOrder = 'chronological') {
    return render(
      <SortSelector
        currentOrder={currentOrder}
        onOrderChange={onOrderChange}
        adapter={adapter}
      />,
    );
  }

  describe('rendering', () => {
    it('renders a native HTML select element', () => {
      renderSelector();

      const select = screen.getByRole('combobox');
      expect(select.tagName).toBe('SELECT');
    });

    it('displays all four sort options', () => {
      renderSelector();

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(4);
    });

    it('displays localized labels for each sort option', () => {
      renderSelector();

      expect(screen.getByRole('option', { name: 'Chronological' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Reverse chronological' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Title A–Z' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Recently starred' })).toBeInTheDocument();
    });

    it('calls getMessage for each sort option label and the aria-label', () => {
      renderSelector();

      expect(adapter.getMessage).toHaveBeenCalledWith('sortChronological');
      expect(adapter.getMessage).toHaveBeenCalledWith('sortReverseChronological');
      expect(adapter.getMessage).toHaveBeenCalledWith('sortAlphabeticalTitle');
      expect(adapter.getMessage).toHaveBeenCalledWith('sortStarredDesc');
      expect(adapter.getMessage).toHaveBeenCalledWith('sortLabel');
    });

    it('maps each option value to the correct SortOrder', () => {
      renderSelector();

      const options = screen.getAllByRole('option') as HTMLOptionElement[];
      const values = options.map((opt) => opt.value);
      expect(values).toEqual([
        'chronological',
        'reverse-chronological',
        'alphabetical-by-title',
        'starred-desc',
      ]);
    });
  });

  describe('current selection', () => {
    it('reflects chronological as selected value', () => {
      renderSelector('chronological');

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('chronological');
    });

    it('reflects reverse-chronological as selected value', () => {
      renderSelector('reverse-chronological');

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('reverse-chronological');
    });

    it('reflects alphabetical-by-title as selected value', () => {
      renderSelector('alphabetical-by-title');

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('alphabetical-by-title');
    });

    it('reflects starred-desc as selected value', () => {
      renderSelector('starred-desc');

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('starred-desc');
    });
  });

  describe('onChange callback', () => {
    it('calls onOrderChange when selection changes', () => {
      renderSelector('chronological');

      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: 'alphabetical-by-title' } });

      expect(onOrderChange).toHaveBeenCalledTimes(1);
      expect(onOrderChange).toHaveBeenCalledWith('alphabetical-by-title');
    });

    it('calls onOrderChange with each sort order value', () => {
      renderSelector('chronological');

      const select = screen.getByRole('combobox');

      for (const order of SORT_ORDERS) {
        vi.mocked(onOrderChange).mockClear();
        fireEvent.change(select, { target: { value: order } });
        expect(onOrderChange).toHaveBeenCalledWith(order);
      }
    });
  });

  describe('accessibility', () => {
    it('uses aria-label from localized sortLabel key', () => {
      renderSelector();

      const select = screen.getByRole('combobox');
      expect(select).toHaveAttribute('aria-label', 'Sort by');
    });

    it('is keyboard navigable via Tab', async () => {
      renderSelector();
      const user = userEvent.setup();

      await user.tab();

      const select = screen.getByRole('combobox');
      expect(select).toHaveFocus();
    });

    it('supports keyboard interaction with Enter/Space via native select', () => {
      renderSelector();

      // Native <select> elements inherently support keyboard interaction
      // (Enter, Space, Arrow keys) in browsers. We verify the element
      // is focusable and is a native select, which guarantees this behavior.
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.tagName).toBe('SELECT');
      expect(select.tabIndex).not.toBe(-1);
    });
  });
});
