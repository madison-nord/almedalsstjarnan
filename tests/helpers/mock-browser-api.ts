/**
 * Mock Browser API Adapter for Vitest.
 * Auto-loaded via vitest.config.ts setupFiles.
 *
 * Provides a mock IBrowserApiAdapter with vi.fn() stubs for all seven methods.
 * Resets all mocks between tests via beforeEach.
 */

import { vi, beforeEach } from 'vitest';

import type { IBrowserApiAdapter } from '#core/types';

const mockUnsubscribe = vi.fn();

export const mockBrowserApi: IBrowserApiAdapter = {
  storageLocalGet: vi.fn().mockResolvedValue({}),
  storageLocalSet: vi.fn().mockResolvedValue(undefined),
  sendMessage: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  getMessage: vi.fn().mockReturnValue(''),
  download: vi.fn().mockResolvedValue(1),
  createTab: vi.fn().mockResolvedValue(undefined),
  onStorageChanged: vi.fn().mockReturnValue(mockUnsubscribe),
};

/**
 * Resets all mock functions to their default implementations.
 * Called automatically via beforeEach, but can also be called manually.
 */
export function resetMocks(): void {
  mockUnsubscribe.mockClear();

  (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>)
    .mockReset()
    .mockResolvedValue({});
  (mockBrowserApi.storageLocalSet as ReturnType<typeof vi.fn>)
    .mockReset()
    .mockResolvedValue(undefined);
  (mockBrowserApi.sendMessage as ReturnType<typeof vi.fn>)
    .mockReset()
    .mockResolvedValue({ success: true, data: undefined });
  (mockBrowserApi.getMessage as ReturnType<typeof vi.fn>)
    .mockReset()
    .mockReturnValue('');
  (mockBrowserApi.download as ReturnType<typeof vi.fn>)
    .mockReset()
    .mockResolvedValue(1);
  (mockBrowserApi.createTab as ReturnType<typeof vi.fn>)
    .mockReset()
    .mockResolvedValue(undefined);
  (mockBrowserApi.onStorageChanged as ReturnType<typeof vi.fn>)
    .mockReset()
    .mockReturnValue(mockUnsubscribe);
}

export { mockUnsubscribe };

// Auto-reset mocks between tests when loaded as a setupFile
beforeEach(() => {
  resetMocks();
});
