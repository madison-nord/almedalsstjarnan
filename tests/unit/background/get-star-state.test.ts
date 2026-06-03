/**
 * Unit tests for enhanced GET_STAR_STATE handler.
 *
 * Tests that the handler returns starred state along with stored mutable fields
 * for starred events, and { starred: false, storedFields: null } for non-starred events.
 *
 * Requirements: 4.1, 4.2
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

// ─── GET_STAR_STATE — Starred Event ──────────────────────────────

describe('handleMessage — GET_STAR_STATE (enhanced)', () => {
  it('returns starred: true with storedFields containing all 9 mutable field values for a starred event', async () => {
    (mockBrowserApi.storageLocalGet as Mock).mockResolvedValue({
      starredEvents: { 'event-1': starredEvent },
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_STAR_STATE',
      eventId: 'event-1',
    });

    expect(result).toEqual({
      success: true,
      data: {
        starred: true,
        storedFields: {
          title: 'Klimatpolitik 2026',
          organiser: 'Naturskyddsföreningen',
          startDateTime: '2026-06-29T09:00:00+02:00',
          endDateTime: '2026-06-29T10:30:00+02:00',
          location: 'Donners plats, Visby',
          description: 'Panelsamtal om klimatåtgärder',
          topic: 'Miljö & Klimat',
          sourceUrl: 'https://almedalsveckan.info/event/event-1',
          icsDataUri: 'data:text/calendar;base64,abc123',
        },
      },
    });
  });

  it('returns storedFields that exclude immutable fields (id, starred, starredAt)', async () => {
    (mockBrowserApi.storageLocalGet as Mock).mockResolvedValue({
      starredEvents: { 'event-1': starredEvent },
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_STAR_STATE',
      eventId: 'event-1',
    });

    expect(result.success).toBe(true);
    const data = (result as { readonly success: true; readonly data: { readonly starred: boolean; readonly storedFields: Record<string, unknown> | null } }).data;
    expect(data.storedFields).not.toHaveProperty('id');
    expect(data.storedFields).not.toHaveProperty('starred');
    expect(data.storedFields).not.toHaveProperty('starredAt');
  });

  // ─── GET_STAR_STATE — Non-Starred Event ──────────────────────────

  it('returns starred: false with storedFields: null for a non-starred event', async () => {
    (mockBrowserApi.storageLocalGet as Mock).mockResolvedValue({
      starredEvents: { 'event-1': starredEvent },
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_STAR_STATE',
      eventId: 'event-999',
    });

    expect(result).toEqual({
      success: true,
      data: { starred: false, storedFields: null },
    });
  });

  it('returns starred: false with storedFields: null when starredEvents is empty', async () => {
    (mockBrowserApi.storageLocalGet as Mock).mockResolvedValue({
      starredEvents: {},
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_STAR_STATE',
      eventId: 'event-1',
    });

    expect(result).toEqual({
      success: true,
      data: { starred: false, storedFields: null },
    });
  });

  it('returns starred: false with storedFields: null when starredEvents key is missing from storage', async () => {
    (mockBrowserApi.storageLocalGet as Mock).mockResolvedValue({});

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_STAR_STATE',
      eventId: 'event-1',
    });

    expect(result).toEqual({
      success: true,
      data: { starred: false, storedFields: null },
    });
  });

  // ─── GET_STAR_STATE — Null Field Values ────────────────────────────

  it('returns storedFields with null values preserved correctly', async () => {
    const eventWithNulls: StarredEvent = {
      id: 'event-2',
      title: 'Minimal Event',
      organiser: null,
      startDateTime: '2026-06-30T14:00:00+02:00',
      endDateTime: null,
      location: null,
      description: null,
      topic: null,
      sourceUrl: null,
      icsDataUri: null,
      starred: true,
      starredAt: '2026-06-21T08:00:00.000Z',
    };

    (mockBrowserApi.storageLocalGet as Mock).mockResolvedValue({
      starredEvents: { 'event-2': eventWithNulls },
    });

    const result = await handleMessage(mockBrowserApi, {
      command: 'GET_STAR_STATE',
      eventId: 'event-2',
    });

    expect(result).toEqual({
      success: true,
      data: {
        starred: true,
        storedFields: {
          title: 'Minimal Event',
          organiser: null,
          startDateTime: '2026-06-30T14:00:00+02:00',
          endDateTime: null,
          location: null,
          description: null,
          topic: null,
          sourceUrl: null,
          icsDataUri: null,
        },
      },
    });
  });
});
