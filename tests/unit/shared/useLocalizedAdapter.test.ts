/**
 * Unit tests for useLocalizedAdapter shared hook.
 *
 * Tests that the hook:
 * - Overrides getMessage to use getLocalizedMessage when locale is set (7.2)
 * - Returns the original adapter unchanged when locale is null (7.3)
 *
 * Requirements: 10.1, 10.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import type { IBrowserApiAdapter } from '#core/types';
import { useLocalizedAdapter } from '#ui/shared/hooks/useLocalizedAdapter';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';

// Mock the locale-messages module
vi.mock('#core/locale-messages', () => ({
  getLocalizedMessage: vi.fn(),
}));

import { getLocalizedMessage } from '#core/locale-messages';

const mockedGetLocalizedMessage = getLocalizedMessage as ReturnType<typeof vi.fn>;

describe('useLocalizedAdapter', () => {
  let adapter: IBrowserApiAdapter;

  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
    mockedGetLocalizedMessage.mockReset();
  });

  describe('when locale is set', () => {
    it('overrides getMessage to use getLocalizedMessage', () => {
      mockedGetLocalizedMessage.mockReturnValue('Localized text');

      const { result } = renderHook(() => useLocalizedAdapter(adapter, 'en'));

      const message = result.current.getMessage('popupTitle');

      expect(mockedGetLocalizedMessage).toHaveBeenCalledWith('popupTitle', 'en');
      expect(message).toBe('Localized text');
    });

    it('falls back to original adapter getMessage when getLocalizedMessage returns empty string', () => {
      mockedGetLocalizedMessage.mockReturnValue('');
      (adapter.getMessage as ReturnType<typeof vi.fn>).mockReturnValue('Fallback text');

      const { result } = renderHook(() => useLocalizedAdapter(adapter, 'sv'));

      const message = result.current.getMessage('unknownKey');

      expect(mockedGetLocalizedMessage).toHaveBeenCalledWith('unknownKey', 'sv');
      expect(message).toBe('Fallback text');
    });

    it('preserves all other adapter methods unchanged', () => {
      mockedGetLocalizedMessage.mockReturnValue('Localized');

      const { result } = renderHook(() => useLocalizedAdapter(adapter, 'en'));

      // The hook uses explicit delegation, so methods are wrappers that delegate
      // to the adapter. Verify they call through correctly.
      expect(result.current.storageLocalGet).toBeDefined();
      expect(result.current.storageLocalSet).toBeDefined();
      expect(result.current.sendMessage).toBeDefined();
      expect(result.current.download).toBeDefined();
      expect(result.current.createTab).toBeDefined();
      expect(result.current.onStorageChanged).toBeDefined();

      // Verify delegation by calling a method and checking it reaches the adapter
      const mockResult = { starredEvents: {} };
      (adapter.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue(mockResult);
      const promise = result.current.storageLocalGet(['starredEvents']);
      expect(adapter.storageLocalGet).toHaveBeenCalledWith(['starredEvents']);
      expect(promise).resolves.toEqual(mockResult);
    });

    it('returns a memoized result for same inputs', () => {
      mockedGetLocalizedMessage.mockReturnValue('Localized');

      const { result, rerender } = renderHook(
        ({ locale }) => useLocalizedAdapter(adapter, locale),
        { initialProps: { locale: 'en' as const } },
      );

      const first = result.current;
      rerender({ locale: 'en' as const });
      const second = result.current;

      expect(first).toBe(second);
    });
  });

  describe('when locale is null', () => {
    it('returns the original adapter unchanged', () => {
      const { result } = renderHook(() => useLocalizedAdapter(adapter, null));

      expect(result.current).toBe(adapter);
    });

    it('does not call getLocalizedMessage', () => {
      const { result } = renderHook(() => useLocalizedAdapter(adapter, null));

      (adapter.getMessage as ReturnType<typeof vi.fn>).mockReturnValue('Original');
      const message = result.current.getMessage('someKey');

      expect(mockedGetLocalizedMessage).not.toHaveBeenCalled();
      expect(message).toBe('Original');
    });
  });
});
