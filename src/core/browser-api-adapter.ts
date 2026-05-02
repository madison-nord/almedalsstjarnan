import type {
  IBrowserApiAdapter,
  StorageSchema,
  MessagePayload,
  MessageResponse,
} from './types';

/**
 * Production implementation wrapping chrome.* APIs.
 * This is the SOLE module that directly references chrome.* globals.
 *
 * All async methods return Promises and reject with descriptive errors
 * that include the method name and the original error message.
 */
export class BrowserApiAdapter implements IBrowserApiAdapter {
  async storageLocalGet<K extends keyof StorageSchema>(
    keys: K[],
  ): Promise<Partial<Pick<StorageSchema, K>>> {
    try {
      return await chrome.storage.local.get(keys) as Partial<Pick<StorageSchema, K>>;
    } catch (error: unknown) {
      throw new Error(
        `storageLocalGet failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async storageLocalSet(items: Partial<StorageSchema>): Promise<void> {
    try {
      await chrome.storage.local.set(items);
    } catch (error: unknown) {
      throw new Error(
        `storageLocalSet failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async sendMessage<T>(message: MessagePayload): Promise<MessageResponse<T>> {
    try {
      return await chrome.runtime.sendMessage(message) as MessageResponse<T>;
    } catch (error: unknown) {
      throw new Error(
        `sendMessage failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  getMessage(key: string): string {
    try {
      return chrome.i18n.getMessage(key);
    } catch (error: unknown) {
      throw new Error(
        `getMessage failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async download(options: {
    readonly url: string;
    readonly filename: string;
  }): Promise<number> {
    try {
      return await chrome.downloads.download(options);
    } catch (error: unknown) {
      throw new Error(
        `download failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async createTab(options: { readonly url: string }): Promise<void> {
    try {
      await chrome.tabs.create(options);
    } catch (error: unknown) {
      throw new Error(
        `createTab failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  onStorageChanged(
    callback: (
      changes: Record<
        string,
        { readonly oldValue?: unknown; readonly newValue?: unknown }
      >,
    ) => void,
  ): () => void {
    const listener = (
      changes: Record<
        string,
        { readonly oldValue?: unknown; readonly newValue?: unknown }
      >,
      areaName: string,
    ): void => {
      if (areaName === 'local') {
        callback(changes);
      }
    };

    chrome.storage.onChanged.addListener(listener);

    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }
}

/**
 * Factory function for dependency injection.
 * Tests provide a mock; production uses the real adapter.
 */
export function createBrowserApiAdapter(): IBrowserApiAdapter {
  return new BrowserApiAdapter();
}
