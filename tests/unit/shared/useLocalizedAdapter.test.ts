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

      expect(result.current.storageLocalGet).toBe(adapter.storageLocalGet);
      expect(result.current.storageLocalSet).toBe(adapter.storageLocalSet);
      expect(result.current.sendMessage).toBe(adapter.sendMessage);
      expect(result.current.download).toBe(adapter.download);
      expect(result.current.createTab).toBe(adapter.createTab);
      expect(result.current.onStorageChanged).toBe(adapter.onStorageChanged);
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
