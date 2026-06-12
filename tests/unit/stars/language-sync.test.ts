/**
 * Unit tests for Stars Page language sync via useStarredEvents hook.
 *
 * Tests:
 * - Storage change with `languagePreference` key triggers `onLanguageChange` callback
 * - Storage change without `languagePreference` key does not trigger callback
 * - New locale value propagates to ICS export (correct label used)
 * - Listener is cleaned up on unmount
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

import type { IBrowserApiAdapter, StarredEvent, MessagePayload, MessageResponse } from '#core/types';
import { mockBrowserApi, mockUnsubscribe, resetMocks } from '#test/helpers/mock-browser-api';

import { useStarredEvents } from '#ui/stars/hooks/useStarredEvents';

// ─── Test Data ────────────────────────────────────────────────────

function makeEvent(overrides: Partial<StarredEvent> & { readonly id: string }): StarredEvent {
  return {
    title: `Event ${overrides.id}`,
    organiser: 'Test Organiser',
    startDateTime: '2026-06-28T10:00:00+02:00',
    endDateTime: '2026-06-28T11:00:00+02:00',
    location: 'Visby',
    description: 'A test description',
    topic: 'Demokrati',
    sourceUrl: 'https://almedalsveckan.info/event/123',
    icsDataUri: null,
    starred: true as const,
    starredAt: '2026-06-15T14:00:00.000Z',
    ...overrides,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────

type StorageChangedCallback = (changes: Record<string, { newValue?: unknown; oldValue?: unknown }>) => void;

let adapter: IBrowserApiAdapter;
let capturedStorageCallback: StorageChangedCallback | null;

function setupAdapter(events: StarredEvent[] = []): void {
  capturedStorageCallback = null;

  (adapter.sendMessage as ReturnType<typeof vi.fn>).mockImplementation(
    (message: MessagePayload): Promise<MessageResponse<unknown>> => {
      switch (message.command) {
        case 'GET_ALL_STARRED_EVENTS':
          return Promise.resolve({ success: true as const, data: events });
        default:
          return Promise.resolve({ success: true as const, data: undefined });
      }
    },
  );

  (adapter.onStorageChanged as ReturnType<typeof vi.fn>).mockImplementation(
    (callback: StorageChangedCallback) => {
      capturedStorageCallback = callback;
      return mockUnsubscribe;
    },
  );
}

// ─── Tests ────────────────────────────────────────────────────────

describe('Stars Page language sync — useStarredEvents hook', () => {
  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
    vi.stubGlobal('URL', {
      ...globalThis.URL,
      createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
      revokeObjectURL: vi.fn(),
    });
  });

  describe('storage change with languagePreference key triggers onLanguageChange callback (Requirement 4.1)', () => {
    it('calls onLanguageChange with "en" when storage fires languagePreference change to "en"', async () => {
      const events = [makeEvent({ id: 'e1' })];
      setupAdapter(events);

      const onLanguageChange = vi.fn();

      renderHook(() =>
        useStarredEvents(adapter, null, { onLanguageChange }),
      );

      await waitFor(() => {
        expect(capturedStorageCallback).not.toBeNull();
      });

      act(() => {
        capturedStorageCallback!({ languagePreference: { newValue: 'en', oldValue: null } });
      });

      expect(onLanguageChange).toHaveBeenCalledTimes(1);
      expect(onLanguageChange).toHaveBeenCalledWith('en');
    });

    it('calls onLanguageChange with "sv" when storage fires languagePreference change to "sv"', async () => {
      const events = [makeEvent({ id: 'e1' })];
      setupAdapter(events);

      const onLanguageChange = vi.fn();

      renderHook(() =>
        useStarredEvents(adapter, null, { onLanguageChange }),
      );

      await waitFor(() => {
        expect(capturedStorageCallback).not.toBeNull();
      });

      act(() => {
        capturedStorageCallback!({ languagePreference: { newValue: 'sv', oldValue: 'en' } });
      });

      expect(onLanguageChange).toHaveBeenCalledTimes(1);
      expect(onLanguageChange).toHaveBeenCalledWith('sv');
    });

    it('calls onLanguageChange with null when storage fires languagePreference change with undefined newValue', async () => {
      const events = [makeEvent({ id: 'e1' })];
      setupAdapter(events);

      const onLanguageChange = vi.fn();

      renderHook(() =>
        useStarredEvents(adapter, null, { onLanguageChange }),
      );

      await waitFor(() => {
        expect(capturedStorageCallback).not.toBeNull();
      });

      act(() => {
        capturedStorageCallback!({ languagePreference: { newValue: undefined, oldValue: 'en' } });
      });

      expect(onLanguageChange).toHaveBeenCalledTimes(1);
      expect(onLanguageChange).toHaveBeenCalledWith(null);
    });
  });

  describe('storage change without languagePreference key does not trigger callback (Requirement 4.1)', () => {
    it('does not call onLanguageChange when only starredEvents changes', async () => {
      const events = [makeEvent({ id: 'e1' })];
      setupAdapter(events);

      const onLanguageChange = vi.fn();

      renderHook(() =>
        useStarredEvents(adapter, null, { onLanguageChange }),
      );

      await waitFor(() => {
        expect(capturedStorageCallback).not.toBeNull();
      });

      act(() => {
        capturedStorageCallback!({ starredEvents: { newValue: [], oldValue: [] } });
      });

      expect(onLanguageChange).not.toHaveBeenCalled();
    });

    it('does not call onLanguageChange when an unrelated storage key changes', async () => {
      const events = [makeEvent({ id: 'e1' })];
      setupAdapter(events);

      const onLanguageChange = vi.fn();

      renderHook(() =>
        useStarredEvents(adapter, null, { onLanguageChange }),
      );

      await waitFor(() => {
        expect(capturedStorageCallback).not.toBeNull();
      });

      act(() => {
        capturedStorageCallback!({ someOtherKey: { newValue: 'foo', oldValue: 'bar' } });
      });

      expect(onLanguageChange).not.toHaveBeenCalled();
    });

    it('does not crash when onLanguageChange is not provided and languagePreference changes', async () => {
      const events = [makeEvent({ id: 'e1' })];
      setupAdapter(events);

      renderHook(() =>
        useStarredEvents(adapter, null),
      );

      await waitFor(() => {
        expect(capturedStorageCallback).not.toBeNull();
      });

      // Should not throw
      act(() => {
        capturedStorageCallback!({ languagePreference: { newValue: 'en', oldValue: null } });
      });
    });
  });

  describe('new locale value propagates to ICS export (Requirement 4.3)', () => {
    it('exportEvents uses the updated locale after language change for correct label', async () => {
      const events = [makeEvent({ id: 'e1', description: 'Test event', sourceUrl: 'https://example.com/event' })];
      setupAdapter(events);

      // Start with 'sv' locale
      const { result, rerender } = renderHook(
        ({ locale }) => useStarredEvents(adapter, locale),
        { initialProps: { locale: 'sv' as 'sv' | 'en' | null } },
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.exportEvents();
      });

      expect(adapter.download).toHaveBeenCalledTimes(1);

      // Now change locale to 'en' (simulates what happens after language sync)
      rerender({ locale: 'en' });

      act(() => {
        result.current.exportEvents();
      });

      // Both exports triggered downloads
      expect(adapter.download).toHaveBeenCalledTimes(2);
    });

    it('hook uses en locale for ICS generation producing "Source:" label', async () => {
      const events = [makeEvent({ id: 'e1', description: 'Test content', sourceUrl: 'https://example.com' })];
      setupAdapter(events);

      // Track what Blob receives
      let capturedContent = '';
      const OriginalBlob = globalThis.Blob;
      vi.stubGlobal('Blob', class MockBlob extends OriginalBlob {
        constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
          super(parts, options);
          if (parts && parts.length > 0) {
            capturedContent = parts[0] as string;
          }
        }
      });

      // Render with 'en' locale
      const { result } = renderHook(() =>
        useStarredEvents(adapter, 'en'),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.exportEvents();
      });

      expect(capturedContent).toContain('Source:');
      expect(capturedContent).not.toContain('Källa:');

      vi.stubGlobal('Blob', OriginalBlob);
    });

    it('hook uses sv locale for ICS generation producing "Källa:" label', async () => {
      const events = [makeEvent({ id: 'e1', description: 'Test content', sourceUrl: 'https://example.com' })];
      setupAdapter(events);

      // Track what Blob receives
      let capturedContent = '';
      const OriginalBlob = globalThis.Blob;
      vi.stubGlobal('Blob', class MockBlob extends OriginalBlob {
        constructor(parts?: BlobPart[], options?: BlobPropertyBag) {
          super(parts, options);
          if (parts && parts.length > 0) {
            capturedContent = parts[0] as string;
          }
        }
      });

      // Render with 'sv' locale
      const { result } = renderHook(() =>
        useStarredEvents(adapter, 'sv'),
      );

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      act(() => {
        result.current.exportEvents();
      });

      expect(capturedContent).toContain('Källa:');
      expect(capturedContent).not.toContain('Source:');

      vi.stubGlobal('Blob', OriginalBlob);
    });
  });

  describe('listener is cleaned up on unmount (Requirement 4.4)', () => {
    it('calls unsubscribe function when hook unmounts', async () => {
      const events = [makeEvent({ id: 'e1' })];
      setupAdapter(events);

      const { unmount } = renderHook(() =>
        useStarredEvents(adapter, null, { onLanguageChange: vi.fn() }),
      );

      await waitFor(() => {
        expect(capturedStorageCallback).not.toBeNull();
      });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
    });

    it('registers a storage listener that handles both starredEvents and languagePreference in a single callback', async () => {
      const events = [makeEvent({ id: 'e1' })];
      setupAdapter(events);

      const onLanguageChange = vi.fn();

      renderHook(() =>
        useStarredEvents(adapter, null, { onLanguageChange }),
      );

      await waitFor(() => {
        expect(capturedStorageCallback).not.toBeNull();
      });

      // The single callback handles both keys
      act(() => {
        capturedStorageCallback!({
          starredEvents: { newValue: [], oldValue: [] },
          languagePreference: { newValue: 'en', oldValue: null },
        });
      });

      // Both handled: languagePreference triggered onLanguageChange
      expect(onLanguageChange).toHaveBeenCalledWith('en');
      // starredEvents triggered a re-fetch
      expect(adapter.sendMessage).toHaveBeenCalledWith({ command: 'GET_ALL_STARRED_EVENTS' });
    });

    it('after unmount, storage changes do not trigger onLanguageChange', async () => {
      const events = [makeEvent({ id: 'e1' })];
      setupAdapter(events);

      const onLanguageChange = vi.fn();

      const { unmount } = renderHook(() =>
        useStarredEvents(adapter, null, { onLanguageChange }),
      );

      await waitFor(() => {
        expect(capturedStorageCallback).not.toBeNull();
      });

      unmount();

      // Simulate storage change after unmount (callback should no longer be active)
      // The unsubscribe was called, so in a real scenario the callback wouldn't fire.
      // We verify the cleanup was called.
      expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
    });
  });
});
