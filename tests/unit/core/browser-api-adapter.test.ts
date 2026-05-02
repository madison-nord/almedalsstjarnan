import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Unit tests for BrowserApiAdapter.
 *
 * IMPORTANT: These tests mock the global `chrome` object directly because
 * BrowserApiAdapter is the sole module that calls chrome.* APIs.
 * We do NOT use the mockBrowserApi from the setup file here — that mocks
 * the IBrowserApiAdapter interface itself, which is what we're testing.
 */

// ─── Chrome API Mocks ─────────────────────────────────────────────

function createChromeMock() {
  return {
    storage: {
      local: {
        get: vi.fn(),
        set: vi.fn(),
      },
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
    runtime: {
      sendMessage: vi.fn(),
      lastError: null as { message: string } | null,
    },
    i18n: {
      getMessage: vi.fn(),
    },
    downloads: {
      download: vi.fn(),
    },
    tabs: {
      create: vi.fn(),
    },
  };
}

let chromeMock: ReturnType<typeof createChromeMock>;

beforeEach(() => {
  chromeMock = createChromeMock();
  // Assign to globalThis so the adapter picks it up
  (globalThis as unknown as Record<string, unknown>).chrome = chromeMock;
});

// ─── Lazy import to ensure chrome mock is set before module loads ──

async function getAdapter() {
  // Clear module cache so each test gets a fresh import with the current chrome mock
  // vitest re-imports are handled via dynamic import + cache busting
  const mod = await import('#core/browser-api-adapter');
  return mod.createBrowserApiAdapter();
}

describe('BrowserApiAdapter', () => {
  // ─── storageLocalGet ──────────────────────────────────────────

  describe('storageLocalGet', () => {
    it('delegates to chrome.storage.local.get and returns the result', async () => {
      const expected = { sortOrder: 'chronological' as const };
      chromeMock.storage.local.get.mockResolvedValue(expected);

      const adapter = await getAdapter();
      const result = await adapter.storageLocalGet(['sortOrder']);

      expect(chromeMock.storage.local.get).toHaveBeenCalledWith(['sortOrder']);
      expect(result).toEqual(expected);
    });

    it('rejects with a descriptive error including method name on failure', async () => {
      chromeMock.storage.local.get.mockRejectedValue(new Error('quota exceeded'));

      const adapter = await getAdapter();

      await expect(adapter.storageLocalGet(['starredEvents'])).rejects.toThrow(
        /storageLocalGet/,
      );
    });

    it('returns a Promise', async () => {
      chromeMock.storage.local.get.mockResolvedValue({});

      const adapter = await getAdapter();
      const result = adapter.storageLocalGet(['sortOrder']);

      expect(result).toBeInstanceOf(Promise);
    });
  });

  // ─── storageLocalSet ──────────────────────────────────────────

  describe('storageLocalSet', () => {
    it('delegates to chrome.storage.local.set', async () => {
      chromeMock.storage.local.set.mockResolvedValue(undefined);

      const adapter = await getAdapter();
      await adapter.storageLocalSet({ sortOrder: 'chronological' });

      expect(chromeMock.storage.local.set).toHaveBeenCalledWith({
        sortOrder: 'chronological',
      });
    });

    it('rejects with a descriptive error including method name on failure', async () => {
      chromeMock.storage.local.set.mockRejectedValue(new Error('write failed'));

      const adapter = await getAdapter();

      await expect(
        adapter.storageLocalSet({ sortOrder: 'chronological' }),
      ).rejects.toThrow(/storageLocalSet/);
    });

    it('returns a Promise that resolves to void', async () => {
      chromeMock.storage.local.set.mockResolvedValue(undefined);

      const adapter = await getAdapter();
      const result = await adapter.storageLocalSet({ sortOrder: 'chronological' });

      expect(result).toBeUndefined();
    });
  });

  // ─── sendMessage ──────────────────────────────────────────────

  describe('sendMessage', () => {
    it('delegates to chrome.runtime.sendMessage', async () => {
      const response = { success: true, data: true };
      chromeMock.runtime.sendMessage.mockResolvedValue(response);

      const adapter = await getAdapter();
      const payload = { command: 'GET_STAR_STATE' as const, eventId: 'abc123' };
      const result = await adapter.sendMessage(payload);

      expect(chromeMock.runtime.sendMessage).toHaveBeenCalledWith(payload);
      expect(result).toEqual(response);
    });

    it('rejects with a descriptive error including method name on failure', async () => {
      chromeMock.runtime.sendMessage.mockRejectedValue(
        new Error('extension context invalidated'),
      );

      const adapter = await getAdapter();

      await expect(
        adapter.sendMessage({ command: 'GET_ALL_STARRED_EVENTS' as const }),
      ).rejects.toThrow(/sendMessage/);
    });

    it('returns a Promise', async () => {
      chromeMock.runtime.sendMessage.mockResolvedValue({ success: true, data: [] });

      const adapter = await getAdapter();
      const result = adapter.sendMessage({ command: 'GET_ALL_STARRED_EVENTS' as const });

      expect(result).toBeInstanceOf(Promise);
    });
  });

  // ─── getMessage ───────────────────────────────────────────────

  describe('getMessage', () => {
    it('delegates to chrome.i18n.getMessage', async () => {
      chromeMock.i18n.getMessage.mockReturnValue('Stjärnmärk evenemang');

      const adapter = await getAdapter();
      const result = adapter.getMessage('starEvent');

      expect(chromeMock.i18n.getMessage).toHaveBeenCalledWith('starEvent');
      expect(result).toBe('Stjärnmärk evenemang');
    });

    it('returns a string synchronously', async () => {
      chromeMock.i18n.getMessage.mockReturnValue('test');

      const adapter = await getAdapter();
      const result = adapter.getMessage('someKey');

      expect(typeof result).toBe('string');
    });

    it('wraps errors with a descriptive message including method name', async () => {
      chromeMock.i18n.getMessage.mockImplementation(() => {
        throw new Error('invalid key');
      });

      const adapter = await getAdapter();

      expect(() => adapter.getMessage('badKey')).toThrow(/getMessage/);
    });
  });

  // ─── download ─────────────────────────────────────────────────

  describe('download', () => {
    it('delegates to chrome.downloads.download', async () => {
      chromeMock.downloads.download.mockResolvedValue(42);

      const adapter = await getAdapter();
      const options = { url: 'blob:http://example.com/abc', filename: 'test.ics' };
      const result = await adapter.download(options);

      expect(chromeMock.downloads.download).toHaveBeenCalledWith(options);
      expect(result).toBe(42);
    });

    it('rejects with a descriptive error including method name on failure', async () => {
      chromeMock.downloads.download.mockRejectedValue(
        new Error('download blocked'),
      );

      const adapter = await getAdapter();

      await expect(
        adapter.download({ url: 'blob:x', filename: 'f.ics' }),
      ).rejects.toThrow(/download/);
    });

    it('returns a Promise', async () => {
      chromeMock.downloads.download.mockResolvedValue(1);

      const adapter = await getAdapter();
      const result = adapter.download({ url: 'blob:x', filename: 'f.ics' });

      expect(result).toBeInstanceOf(Promise);
    });
  });

  // ─── createTab ────────────────────────────────────────────────

  describe('createTab', () => {
    it('delegates to chrome.tabs.create', async () => {
      chromeMock.tabs.create.mockResolvedValue({ id: 1 });

      const adapter = await getAdapter();
      await adapter.createTab({ url: 'chrome-extension://id/stars.html' });

      expect(chromeMock.tabs.create).toHaveBeenCalledWith({
        url: 'chrome-extension://id/stars.html',
      });
    });

    it('rejects with a descriptive error including method name on failure', async () => {
      chromeMock.tabs.create.mockRejectedValue(new Error('tab limit'));

      const adapter = await getAdapter();

      await expect(
        adapter.createTab({ url: 'chrome-extension://id/stars.html' }),
      ).rejects.toThrow(/createTab/);
    });

    it('returns a Promise that resolves to void', async () => {
      chromeMock.tabs.create.mockResolvedValue({ id: 1 });

      const adapter = await getAdapter();
      const result = await adapter.createTab({ url: 'chrome-extension://id/stars.html' });

      expect(result).toBeUndefined();
    });
  });

  // ─── onStorageChanged ─────────────────────────────────────────

  describe('onStorageChanged', () => {
    it('registers a listener on chrome.storage.onChanged.addListener', async () => {
      const adapter = await getAdapter();
      const callback = vi.fn();

      adapter.onStorageChanged(callback);

      expect(chromeMock.storage.onChanged.addListener).toHaveBeenCalledTimes(1);
      // The adapter should pass a wrapper or the callback itself to addListener
      expect(chromeMock.storage.onChanged.addListener).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('returns an unsubscribe function', async () => {
      const adapter = await getAdapter();
      const callback = vi.fn();

      const unsubscribe = adapter.onStorageChanged(callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('unsubscribe calls chrome.storage.onChanged.removeListener with the same listener', async () => {
      const adapter = await getAdapter();
      const callback = vi.fn();

      const unsubscribe = adapter.onStorageChanged(callback);

      // Get the listener that was passed to addListener
      const registeredListener =
        chromeMock.storage.onChanged.addListener.mock.calls[0]![0] as (...args: unknown[]) => void;

      unsubscribe();

      expect(chromeMock.storage.onChanged.removeListener).toHaveBeenCalledTimes(1);
      expect(chromeMock.storage.onChanged.removeListener).toHaveBeenCalledWith(
        registeredListener,
      );
    });

    it('forwards storage change events to the callback', async () => {
      const adapter = await getAdapter();
      const callback = vi.fn();

      adapter.onStorageChanged(callback);

      // Get the listener that was registered
      const registeredListener =
        chromeMock.storage.onChanged.addListener.mock.calls[0]![0] as (
          changes: Record<string, unknown>,
          areaName: string,
        ) => void;

      // Simulate a storage change event
      const changes = {
        starredEvents: { oldValue: {}, newValue: { abc: {} } },
      };
      registeredListener(changes, 'local');

      expect(callback).toHaveBeenCalledWith(changes);
    });

    it('does not forward changes from non-local storage areas', async () => {
      const adapter = await getAdapter();
      const callback = vi.fn();

      adapter.onStorageChanged(callback);

      const registeredListener =
        chromeMock.storage.onChanged.addListener.mock.calls[0]![0] as (
          changes: Record<string, unknown>,
          areaName: string,
        ) => void;

      // Simulate a sync storage change (not local)
      registeredListener({ key: { newValue: 'val' } }, 'sync');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  // ─── Error wrapping ───────────────────────────────────────────

  describe('error wrapping', () => {
    it('includes the original error message in the rejection', async () => {
      chromeMock.storage.local.get.mockRejectedValue(
        new Error('original error message'),
      );

      const adapter = await getAdapter();

      await expect(adapter.storageLocalGet(['sortOrder'])).rejects.toThrow(
        /original error message/,
      );
    });

    it('includes the method name in the rejection for storageLocalSet', async () => {
      chromeMock.storage.local.set.mockRejectedValue(new Error('disk full'));

      const adapter = await getAdapter();

      await expect(
        adapter.storageLocalSet({ sortOrder: 'chronological' }),
      ).rejects.toThrow(/storageLocalSet.*disk full|disk full.*storageLocalSet/);
    });

    it('includes the method name in the rejection for sendMessage', async () => {
      chromeMock.runtime.sendMessage.mockRejectedValue(new Error('no receiver'));

      const adapter = await getAdapter();

      await expect(
        adapter.sendMessage({ command: 'GET_ALL_STARRED_EVENTS' as const }),
      ).rejects.toThrow(/sendMessage.*no receiver|no receiver.*sendMessage/);
    });

    it('includes the method name in the rejection for download', async () => {
      chromeMock.downloads.download.mockRejectedValue(new Error('blocked'));

      const adapter = await getAdapter();

      await expect(
        adapter.download({ url: 'blob:x', filename: 'f.ics' }),
      ).rejects.toThrow(/download.*blocked|blocked.*download/);
    });

    it('includes the method name in the rejection for createTab', async () => {
      chromeMock.tabs.create.mockRejectedValue(new Error('limit reached'));

      const adapter = await getAdapter();

      await expect(
        adapter.createTab({ url: 'chrome-extension://id/stars.html' }),
      ).rejects.toThrow(/createTab.*limit reached|limit reached.*createTab/);
    });
  });

  // ─── Factory function ─────────────────────────────────────────

  describe('createBrowserApiAdapter', () => {
    it('returns an object implementing IBrowserApiAdapter', async () => {
      const mod = await import('#core/browser-api-adapter');
      const adapter = mod.createBrowserApiAdapter();

      expect(typeof adapter.storageLocalGet).toBe('function');
      expect(typeof adapter.storageLocalSet).toBe('function');
      expect(typeof adapter.sendMessage).toBe('function');
      expect(typeof adapter.getMessage).toBe('function');
      expect(typeof adapter.download).toBe('function');
      expect(typeof adapter.createTab).toBe('function');
      expect(typeof adapter.onStorageChanged).toBe('function');
    });
  });
});
