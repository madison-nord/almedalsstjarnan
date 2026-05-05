/**
 * Unit tests for Background Service Worker message handler.
 *
 * Tests all six message commands (STAR_EVENT, UNSTAR_EVENT, GET_STAR_STATE,
 * GET_ALL_STARRED_EVENTS, GET_SORT_ORDER, SET_SORT_ORDER), default values,
 * error handling, and unknown command rejection.
 *
 * All tests use the mocked BrowserApiAdapter from tests/helpers/mock-browser-api.ts.
 */

import { describe, it, expect, vi } from 'vitest';

import type {
  NormalizedEvent,
  StarredEvent,
  MessagePayload,
  MessageResponseError,
  MessageResponseSuccess,
} from '#core/types';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';

import { handleMessage } from '#extension/background';

// ─── Test Fixtures ────────────────────────────────────────────────

const sampleEvent: NormalizedEvent = {
  id: 'evt-001',
  title: 'Demokrati i förändring',
  organiser: 'Sveriges Riksdag',
  startDateTime: '2026-06-28T10:00:00+02:00',
  endDateTime: '2026-06-28T11:30:00+02:00',
  location: 'Donners plats, Visby',
  description: 'Panelsamtal om demokratins framtid',
  topic: 'Demokrati',
  sourceUrl: 'https://almedalsveckan.info/event/evt-001',
  icsDataUri: null,
};

const sampleStarredEvent: StarredEvent = {
  ...sampleEvent,
  starred: true,
  starredAt: '2026-06-15T14:30:00.000Z',
};

// ─── STAR_EVENT ───────────────────────────────────────────────────

describe('handleMessage — STAR_EVENT', () => {
  it('adds event to storage with starred: true and a starredAt timestamp and responds success', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      starredEvents: {},
    });

    const fakeNow = new Date('2026-06-15T14:30:00.000Z');
    vi.setSystemTime(fakeNow);

    const result = await handleMessage(mockBrowserApi, {
      command: 'STAR_EVENT',
      event: sampleEvent,
    });

    expect(result).toEqual({ success: true, data: undefined });

    expect(mockBrowserApi.storageLocalSet).toHaveBeenCalledWith({
      starredEvents: {
        'evt-001': {
          ...sampleEvent,
          starred: true,
          starredAt: '2026-06-15T14:30:00.000Z',
        },
      },
    });

    vi.useRealTimers();
  });

  it('converts NormalizedEvent to StarredEvent by adding starred and starredAt fields', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      starredEvents: {},
    });

    const fakeNow = new Date('2026-07-01T08:00:00.000Z');
    vi.setSystemTime(fakeNow);

    await handleMessage(mockBrowserApi, {
      command: 'STAR_EVENT',
      event: sampleEvent,
    });

    const setCall = (mockBrowserApi.storageLocalSet as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      readonly starredEvents: Record<string, StarredEvent>;
    };
    const stored = setCall.starredEvents['evt-001'];

    expect(stored).toBeDefined();
    expect(stored?.starred).toBe(true);
    expect(stored?.starredAt).toBe('2026-07-01T08:00:00.000Z');
    // Verify all original fields are preserved
    expect(stored?.id).toBe(sampleEvent.id);
    expect(stored?.title).toBe(sampleEvent.title);
    expect(stored?.organiser).toBe(sampleEvent.organiser);

    vi.useRealTimers();
  });

  it('preserves existing starred events when adding a new one', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      starredEvents: { 'evt-001': sampleStarredEvent },
    });

    const fakeNow = new Date('2026-07-01T09:00:00.000Z');
    vi.setSystemTime(fakeNow);

    const newEvent: NormalizedEvent = {
      ...sampleEvent,
      id: 'evt-002',
      title: 'Hållbar utveckling',
    };

    await handleMessage(mockBrowserApi, {
      command: 'STAR_EVENT',
      event: newEvent,
    });

    expect(mockBrowserApi.storageLocalSet).toHaveBeenCalledWith({
      starredEvents: {
        'evt-001': sampleStarredEvent,
        'evt-002': {
          ...newEvent,
          starred: true,
          starredAt: '2026-07-01T09:00:00.000Z',
        },
      },
    });

    vi.useRealTimers();
  });
});

// ─── UNSTAR_EVENT ─────────────────────────────────────────────────

describe('handleMessage — UNSTAR_EVENT', () => {
  it('removes event from storage and responds success', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      starredEvents: { 'evt-001': sampleStarredEvent },
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'UNSTAR_EVENT',
      eventId: 'evt-001',
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockBrowserApi.storageLocalSet).toHaveBeenCalledWith({
      starredEvents: {},
    });
  });

  it('responds success even when event is not in storage', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      starredEvents: {},
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'UNSTAR_EVENT',
      eventId: 'nonexistent',
    });

    expect(result).toEqual({ success: true, data: undefined });
  });
});

// ─── GET_STAR_STATE ───────────────────────────────────────────────

describe('handleMessage — GET_STAR_STATE', () => {
  it('returns true for a starred event', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      starredEvents: { 'evt-001': sampleStarredEvent },
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_STAR_STATE',
      eventId: 'evt-001',
    });

    expect(result).toEqual({ success: true, data: true });
  });

  it('returns false for an unstarred event', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      starredEvents: {},
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_STAR_STATE',
      eventId: 'evt-001',
    });

    expect(result).toEqual({ success: true, data: false });
  });
});

// ─── GET_ALL_STARRED_EVENTS ──────────────────────────────────────

describe('handleMessage — GET_ALL_STARRED_EVENTS', () => {
  it('returns array of all starred events converted from object via Object.values', async () => {
    const secondEvent: StarredEvent = {
      ...sampleEvent,
      id: 'evt-002',
      title: 'Hållbar utveckling',
      starred: true,
      starredAt: '2026-06-16T10:00:00.000Z',
    };

    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      starredEvents: {
        'evt-001': sampleStarredEvent,
        'evt-002': secondEvent,
      },
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_ALL_STARRED_EVENTS',
    });

    expect(result.success).toBe(true);
    const data = (result as MessageResponseSuccess<StarredEvent[]>).data;
    expect(data).toHaveLength(2);
    expect(data).toContainEqual(sampleStarredEvent);
    expect(data).toContainEqual(secondEvent);
  });

  it('returns empty array when starredEvents key is missing', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_ALL_STARRED_EVENTS',
    });

    expect(result).toEqual({ success: true, data: [] });
  });
});

// ─── GET_SORT_ORDER ──────────────────────────────────────────────

describe('handleMessage — GET_SORT_ORDER', () => {
  it('returns current sort order from storage', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      sortOrder: 'alphabetical-by-title',
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_SORT_ORDER',
    });

    expect(result).toEqual({ success: true, data: 'alphabetical-by-title' });
  });

  it('returns "chronological" when sortOrder key is missing', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_SORT_ORDER',
    });

    expect(result).toEqual({ success: true, data: 'chronological' });
  });
});

// ─── SET_SORT_ORDER ──────────────────────────────────────────────

describe('handleMessage — SET_SORT_ORDER', () => {
  it('persists sort order and responds success', async () => {
    const result = await handleMessage(mockBrowserApi, {
      command: 'SET_SORT_ORDER',
      sortOrder: 'starred-desc',
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockBrowserApi.storageLocalSet).toHaveBeenCalledWith({
      sortOrder: 'starred-desc',
    });
  });
});

// ─── Defaults ────────────────────────────────────────────────────

describe('handleMessage — defaults', () => {
  it('starredEvents defaults to empty object when key missing (STAR_EVENT)', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const fakeNow = new Date('2026-06-15T14:30:00.000Z');
    vi.setSystemTime(fakeNow);

    const result = await handleMessage(mockBrowserApi, {
      command: 'STAR_EVENT',
      event: sampleEvent,
    });

    expect(result.success).toBe(true);
    expect(mockBrowserApi.storageLocalSet).toHaveBeenCalledWith({
      starredEvents: {
        'evt-001': {
          ...sampleEvent,
          starred: true,
          starredAt: '2026-06-15T14:30:00.000Z',
        },
      },
    });

    vi.useRealTimers();
  });

  it('starredEvents defaults to empty array when key missing (GET_ALL_STARRED_EVENTS)', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_ALL_STARRED_EVENTS',
    });

    expect(result).toEqual({ success: true, data: [] });
  });

  it('starredEvents defaults to empty object when key missing (GET_STAR_STATE)', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_STAR_STATE',
      eventId: 'evt-001',
    });

    expect(result).toEqual({ success: true, data: false });
  });
});

// ─── Error Handling ──────────────────────────────────────────────

describe('handleMessage — error handling', () => {
  it('returns MessageResponseError with descriptive message on storage failure', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('storage quota exceeded'),
    );

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_ALL_STARRED_EVENTS',
    });

    expect(result.success).toBe(false);
    const errorResult = result as MessageResponseError;
    expect(errorResult.error).toContain('storage quota exceeded');
  });

  it('returns MessageResponseError on storageLocalSet failure', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      starredEvents: {},
    });
    (mockBrowserApi.storageLocalSet as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('write failed'),
    );

    const result = await handleMessage(mockBrowserApi, {
      command: 'STAR_EVENT',
      event: sampleEvent,
    });

    expect(result.success).toBe(false);
    const errorResult = result as MessageResponseError;
    expect(errorResult.error).toContain('write failed');
  });

  it('returns error response for unknown command', async () => {
    const result = await handleMessage(mockBrowserApi, {
      command: 'UNKNOWN_COMMAND',
    } as unknown as MessagePayload);

    expect(result.success).toBe(false);
    const errorResult = result as MessageResponseError;
    expect(errorResult.error).toMatch(/unknown|unsupported|unrecognized/i);
  });
});

// ─── GET_LANGUAGE_PREFERENCE ─────────────────────────────────────

describe('handleMessage — GET_LANGUAGE_PREFERENCE', () => {
  it('returns null when no language preference is stored', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_LANGUAGE_PREFERENCE',
    } as MessagePayload);

    expect(result).toEqual({ success: true, data: null });
  });

  it('returns sv when Swedish preference is stored', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      languagePreference: 'sv',
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_LANGUAGE_PREFERENCE',
    } as MessagePayload);

    expect(result).toEqual({ success: true, data: 'sv' });
  });

  it('returns en when English preference is stored', async () => {
    (mockBrowserApi.storageLocalGet as ReturnType<typeof vi.fn>).mockResolvedValue({
      languagePreference: 'en',
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_LANGUAGE_PREFERENCE',
    } as MessagePayload);

    expect(result).toEqual({ success: true, data: 'en' });
  });
});

// ─── SET_LANGUAGE_PREFERENCE ─────────────────────────────────────

describe('handleMessage — SET_LANGUAGE_PREFERENCE', () => {
  it('persists sv locale and responds success', async () => {
    const result = await handleMessage(mockBrowserApi, {
      command: 'SET_LANGUAGE_PREFERENCE',
      locale: 'sv',
    } as MessagePayload);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockBrowserApi.storageLocalSet).toHaveBeenCalledWith({
      languagePreference: 'sv',
    });
  });

  it('persists en locale and responds success', async () => {
    const result = await handleMessage(mockBrowserApi, {
      command: 'SET_LANGUAGE_PREFERENCE',
      locale: 'en',
    } as MessagePayload);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockBrowserApi.storageLocalSet).toHaveBeenCalledWith({
      languagePreference: 'en',
    });
  });

  it('persists null (auto) and responds success', async () => {
    const result = await handleMessage(mockBrowserApi, {
      command: 'SET_LANGUAGE_PREFERENCE',
      locale: null,
    } as MessagePayload);

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockBrowserApi.storageLocalSet).toHaveBeenCalledWith({
      languagePreference: null,
    });
  });
});
