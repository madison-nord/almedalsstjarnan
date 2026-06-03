/**
 * Unit tests for UPDATE_STARRED_EVENT handler.
 *
 * Tests that the handler overwrites mutable fields while preserving immutable
 * fields (id, starred, starredAt), handles non-existent events gracefully,
 * returns proper error responses on storage failures, and has the correct
 * response shape.
 *
 * Requirements: 2.1, 2.4, 2.5, 3.4, 3.5
 */

import { describe, it, expect } from 'vitest';
import type { Mock } from 'vitest';

import type { StarredEvent } from '#core/types';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';

import { handleMessage } from '#extension/background';

// ─── Test Fixtures ────────────────────────────────────────────────

const starredEvent: StarredEvent = {
  id: 'event-1',
  title: 'Klimatpolitik 2026',
  organiser: 'Naturskyddsföreningen',
  startDateTime: '2026-06-29T09:00:00+02:00',
  endDateTime: '2026-06-29T10:30:00+02:00',
  location: 'Donners plats, Visby',
  description: 'Panelsamtal om klimatåtgärder',
  topic: 'Miljö & Klimat',
  sourceUrl: 'https://almedalsveckan.info/event/event-1',
  icsDataUri: 'data:text/calendar;base64,abc123',
  starred: true,
  starredAt: '2026-06-20T12:00:00.000Z',
};

// ─── UPDATE_STARRED_EVENT — Successful Update ────────────────────

describe('handleMessage — UPDATE_STARRED_EVENT', () => {
  it('overwrites mutable fields while preserving id, starred, and starredAt', async () => {
    (mockBrowserApi.storageLocalGet as Mock).mockResolvedValue({
      starredEvents: { 'event-1': starredEvent },
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'UPDATE_STARRED_EVENT',
      eventId: 'event-1',
      title: 'Uppdaterad klimatpolitik',
      organiser: 'Greenpeace',
      startDateTime: '2026-06-30T10:00:00+02:00',
      endDateTime: '2026-06-30T12:00:00+02:00',
      location: 'Almedalsparken',
      description: 'Nytt panelsamtal',
      topic: 'Hållbarhet',
      sourceUrl: 'https://almedalsveckan.info/event/event-1-updated',
      icsDataUri: 'data:text/calendar;base64,xyz789',
    });

    expect(result).toEqual({ success: true, data: undefined });

    expect(mockBrowserApi.storageLocalSet).toHaveBeenCalledWith({
      starredEvents: {
        'event-1': {
          id: 'event-1',
          starred: true,
          starredAt: '2026-06-20T12:00:00.000Z',
          title: 'Uppdaterad klimatpolitik',
          organiser: 'Greenpeace',
          startDateTime: '2026-06-30T10:00:00+02:00',
          endDateTime: '2026-06-30T12:00:00+02:00',
          location: 'Almedalsparken',
          description: 'Nytt panelsamtal',
          topic: 'Hållbarhet',
          sourceUrl: 'https://almedalsveckan.info/event/event-1-updated',
          icsDataUri: 'data:text/calendar;base64,xyz789',
        },
      },
    });
  });

  // ─── UPDATE_STARRED_EVENT — Non-Existent Event ───────────────────

  it('returns success with no storage modification when event is not starred', async () => {
    (mockBrowserApi.storageLocalGet as Mock).mockResolvedValue({
      starredEvents: { 'event-1': starredEvent },
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'UPDATE_STARRED_EVENT',
      eventId: 'event-999',
      title: 'Ej befintlig',
      organiser: null,
      startDateTime: '2026-07-01T08:00:00+02:00',
      endDateTime: null,
      location: null,
      description: null,
      topic: null,
      sourceUrl: null,
      icsDataUri: null,
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockBrowserApi.storageLocalSet).not.toHaveBeenCalled();
  });

  it('returns success with no storage modification when starredEvents is empty', async () => {
    (mockBrowserApi.storageLocalGet as Mock).mockResolvedValue({
      starredEvents: {},
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'UPDATE_STARRED_EVENT',
      eventId: 'event-1',
      title: 'Test',
      organiser: null,
      startDateTime: '2026-07-01T08:00:00+02:00',
      endDateTime: null,
      location: null,
      description: null,
      topic: null,
      sourceUrl: null,
      icsDataUri: null,
    });

    expect(result).toEqual({ success: true, data: undefined });
    expect(mockBrowserApi.storageLocalSet).not.toHaveBeenCalled();
  });

  // ─── UPDATE_STARRED_EVENT — Storage Error ────────────────────────

  it('returns MessageResponseError when storageLocalGet throws', async () => {
    (mockBrowserApi.storageLocalGet as Mock).mockRejectedValue(
      new Error('Storage quota exceeded'),
    );

    const result = await handleMessage(mockBrowserApi, {
      command: 'UPDATE_STARRED_EVENT',
      eventId: 'event-1',
      title: 'Test',
      organiser: null,
      startDateTime: '2026-07-01T08:00:00+02:00',
      endDateTime: null,
      location: null,
      description: null,
      topic: null,
      sourceUrl: null,
      icsDataUri: null,
    });

    expect(result).toEqual({ success: false, error: 'Storage quota exceeded' });
  });

  it('returns MessageResponseError when storageLocalSet throws', async () => {
    (mockBrowserApi.storageLocalGet as Mock).mockResolvedValue({
      starredEvents: { 'event-1': starredEvent },
    });
    (mockBrowserApi.storageLocalSet as Mock).mockRejectedValue(
      new Error('Write failed'),
    );

    const result = await handleMessage(mockBrowserApi, {
      command: 'UPDATE_STARRED_EVENT',
      eventId: 'event-1',
      title: 'Uppdaterad',
      organiser: null,
      startDateTime: '2026-07-01T08:00:00+02:00',
      endDateTime: null,
      location: null,
      description: null,
      topic: null,
      sourceUrl: null,
      icsDataUri: null,
    });

    expect(result).toEqual({ success: false, error: 'Write failed' });
  });

  // ─── UPDATE_STARRED_EVENT — Response Shape ───────────────────────

  it('response shape is exactly { success: true, data: undefined } on success', async () => {
    (mockBrowserApi.storageLocalGet as Mock).mockResolvedValue({
      starredEvents: { 'event-1': starredEvent },
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'UPDATE_STARRED_EVENT',
      eventId: 'event-1',
      title: 'Ny titel',
      organiser: 'Ny organisatör',
      startDateTime: '2026-06-29T09:00:00+02:00',
      endDateTime: '2026-06-29T10:30:00+02:00',
      location: 'Donners plats, Visby',
      description: 'Panelsamtal om klimatåtgärder',
      topic: 'Miljö & Klimat',
      sourceUrl: 'https://almedalsveckan.info/event/event-1',
      icsDataUri: 'data:text/calendar;base64,abc123',
    });

    expect(result).toStrictEqual({ success: true, data: undefined });
    expect(Object.keys(result)).toHaveLength(2);
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('data', undefined);
  });
});
