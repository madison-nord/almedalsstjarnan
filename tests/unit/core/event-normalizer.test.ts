import { describe, it, expect } from 'vitest';

import { createMockEventCard } from '#test/helpers/dom-helpers';

import type { NormalizerResult, NormalizerSuccess, NormalizerError } from '#core/types';

// ─── Module under test (will be implemented in 9.3) ──────────────

import { normalizeEvent, deriveEventId, parseDateTime } from '#core/event-normalizer';

// ─── Helpers ──────────────────────────────────────────────────────

function expectSuccess(result: NormalizerResult): asserts result is NormalizerSuccess {
  expect(result.ok).toBe(true);
}

function expectError(result: NormalizerResult): asserts result is NormalizerError {
  expect(result.ok).toBe(false);
}

// ─── normalizeEvent ───────────────────────────────────────────────

describe('normalizeEvent', () => {
  describe('well-formed Event_Card with all fields', () => {
    it('extracts all fields from a default mock event card', () => {
      const card = createMockEventCard();
      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.id).toBe('8363');
      expect(result.event.title).toBe('Tillräcklighet krävs för att klara klimatkrisen');
      expect(result.event.organiser).toBe('Den gröna tankesmedjan Cogito');
      expect(result.event.startDateTime).toBe('2026-06-22T07:30:00+02:00');
      expect(result.event.endDateTime).toBe('2026-06-22T08:30:00+02:00');
      expect(result.event.location).toBe('Holmen 1');
      expect(result.event.description).toBe(
        'Efter en kort inledning bjuder vi in till ett samtal ombord på båten Vagabonde. Varmt välkommen!',
      );
      expect(result.event.topic).toBe('Hållbarhet');
      expect(result.event.sourceUrl).toBe(
        'https://almedalsveckan.info/rg/almedalsveckan/evenemang-almedalsveckan/2026/8363',
      );
      expect(result.event.icsDataUri).toContain('data:text/calendar');
    });

    it('returns ok: true for a valid card', () => {
      const card = createMockEventCard();
      const result = normalizeEvent(card);
      expect(result.ok).toBe(true);
    });
  });

  describe('ICS data URI decoding and parsing', () => {
    it('decodes the data:text/calendar URI and parses ICS content', () => {
      const card = createMockEventCard();
      const result = normalizeEvent(card);

      expectSuccess(result);
      // ICS SUMMARY should be used as title
      expect(result.event.title).toBe('Tillräcklighet krävs för att klara klimatkrisen');
      // ICS DTSTART/DTEND should be parsed to ISO 8601
      expect(result.event.startDateTime).toBe('2026-06-22T07:30:00+02:00');
      expect(result.event.endDateTime).toBe('2026-06-22T08:30:00+02:00');
      // ICS LOCATION
      expect(result.event.location).toBe('Holmen 1');
      // ICS DESCRIPTION
      expect(result.event.description).toBe(
        'Efter en kort inledning bjuder vi in till ett samtal ombord på båten Vagabonde. Varmt välkommen!',
      );
      // ICS URL → sourceUrl
      expect(result.event.sourceUrl).toBe(
        'https://almedalsveckan.info/rg/almedalsveckan/evenemang-almedalsveckan/2026/8363',
      );
    });

    it('prefers ICS SUMMARY as title over visible DOM title', () => {
      const icsUri =
        'data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0AURL:https://almedalsveckan.info/rg/almedalsveckan/evenemang-almedalsveckan/2026/8363%0ADTSTART:20260622T073000%0ADTEND:20260622T083000%0ASUMMARY:ICS%20Title%20Is%20Different%0ADESCRIPTION:Some%20description%0ALOCATION:Holmen%201%0AEND:VEVENT%0AEND:VCALENDAR';

      const card = createMockEventCard({
        title: 'DOM Title',
        icsDataUri: icsUri,
      });
      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.title).toBe('ICS Title Is Different');
    });

    it('falls back to DOM title when ICS SUMMARY is absent', () => {
      const icsUri =
        'data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0AURL:https://almedalsveckan.info/rg/almedalsveckan/evenemang-almedalsveckan/2026/8363%0ADTSTART:20260622T073000%0ADTEND:20260622T083000%0ALOCATION:Holmen%201%0AEND:VEVENT%0AEND:VCALENDAR';

      const card = createMockEventCard({
        title: 'DOM Fallback Title',
        icsDataUri: icsUri,
      });
      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.title).toBe('DOM Fallback Title');
    });
  });

  describe('missing required fields', () => {
    it('returns error when title is missing (no ICS, no DOM title)', () => {
      const card = createMockEventCard({
        title: '',
        icsDataUri: null,
      });
      const result = normalizeEvent(card);

      expectError(result);
      expect(result.reason).toContain('title');
    });

    it('returns error when startDateTime cannot be determined', () => {
      const card = createMockEventCard({
        timeText: '',
        icsDataUri: null,
      });
      const result = normalizeEvent(card);

      expectError(result);
      expect(result.reason).toContain('startDateTime');
    });
  });

  describe('null/empty values for missing optional fields', () => {
    it('sets location to null when "Plats meddelas senare"', () => {
      const card = createMockEventCard({ location: null });
      const result = normalizeEvent(card);

      expectSuccess(result);
      // ICS LOCATION still present in default ICS data URI, so it should be used
      // Let's test with no ICS data URI
      const cardNoIcs = createMockEventCard({ location: null, icsDataUri: null });
      const resultNoIcs = normalizeEvent(cardNoIcs);

      expectSuccess(resultNoIcs);
      expect(resultNoIcs.event.location).toBeNull();
    });

    it('sets description to null when description is empty', () => {
      const icsUri =
        'data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0AURL:https://almedalsveckan.info/rg/almedalsveckan/evenemang-almedalsveckan/2026/8363%0ADTSTART:20260622T073000%0ADTEND:20260622T083000%0ASUMMARY:Test%20Event%0AEND:VEVENT%0AEND:VCALENDAR';

      const card = createMockEventCard({
        description: '',
        icsDataUri: icsUri,
      });
      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.description).toBeNull();
    });

    it('sets organiser to null when organiser element is missing', () => {
      const card = createMockEventCard();
      // Remove organizer buttons
      const orgButtons = card.querySelector('.organizer-buttons');
      orgButtons?.remove();

      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.organiser).toBeNull();
    });

    it('sets topic to null when topic buttons are missing', () => {
      const card = createMockEventCard();
      // Remove topic buttons
      const topicButtons = card.querySelector('.topic-buttons');
      topicButtons?.remove();

      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.topic).toBeNull();
    });

    it('sets sourceUrl to null when no ICS URL and no detail URL', () => {
      const card = createMockEventCard({
        icsDataUri: null,
        includeDetails: false,
      });
      // Remove the title link href
      const titleLink = card.querySelector('a.title');
      titleLink?.removeAttribute('href');

      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.sourceUrl).toBeNull();
    });

    it('sets icsDataUri to null when no ICS link present', () => {
      const card = createMockEventCard({ icsDataUri: null });
      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.icsDataUri).toBeNull();
    });

    it('sets endDateTime to null when no end time available', () => {
      const icsUri =
        'data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0AURL:https://almedalsveckan.info/rg/almedalsveckan/evenemang-almedalsveckan/2026/8363%0ADTSTART:20260622T073000%0ASUMMARY:Test%20Event%0ALOCATION:Holmen%201%0AEND:VEVENT%0AEND:VCALENDAR';

      const card = createMockEventCard({
        timeText: 'Måndag 07.30',
        icsDataUri: icsUri,
      });
      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.endDateTime).toBeNull();
    });
  });

  describe('whitespace trimming', () => {
    it('trims whitespace from title', () => {
      const icsUri =
        'data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0AURL:https://almedalsveckan.info/rg/almedalsveckan/evenemang-almedalsveckan/2026/8363%0ADTSTART:20260622T073000%0ADTEND:20260622T083000%0ASUMMARY:%20%20Padded%20Title%20%20%0ALOCATION:Holmen%201%0AEND:VEVENT%0AEND:VCALENDAR';

      const card = createMockEventCard({
        title: '  Padded Title  ',
        icsDataUri: icsUri,
      });
      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.title).toBe('Padded Title');
    });

    it('trims whitespace from organiser', () => {
      const card = createMockEventCard({ organiser: '  Cogito  ' });
      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.organiser).toBe('Cogito');
    });

    it('trims whitespace from location', () => {
      const card = createMockEventCard({ location: '  Holmen 1  ' });
      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.location).toBe('Holmen 1');
    });

    it('trims whitespace from description', () => {
      // Use ICS URI without DESCRIPTION so DOM description is used
      const icsUri =
        'data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0AURL:https://almedalsveckan.info/rg/almedalsveckan/evenemang-almedalsveckan/2026/8363%0ADTSTART:20260622T073000%0ADTEND:20260622T083000%0ASUMMARY:Test%20Event%0ALOCATION:Holmen%201%0AEND:VEVENT%0AEND:VCALENDAR';

      const card = createMockEventCard({
        description: '  Some description  ',
        icsDataUri: icsUri,
      });
      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.description).toBe('Some description');
    });

    it('trims whitespace from topic', () => {
      const card = createMockEventCard({ primaryTopic: '  Hållbarhet  ' });
      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.topic).toBe('Hållbarhet');
    });
  });

  describe('date-time parsing to ISO 8601 with timezone', () => {
    it('parses ICS DTSTART to ISO 8601 with +02:00 timezone', () => {
      const card = createMockEventCard();
      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.startDateTime).toBe('2026-06-22T07:30:00+02:00');
    });

    it('parses ICS DTEND to ISO 8601 with +02:00 timezone', () => {
      const card = createMockEventCard();
      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.endDateTime).toBe('2026-06-22T08:30:00+02:00');
    });
  });

  describe('skip malformed cards without throwing', () => {
    it('returns error for a completely empty element', () => {
      const div = document.createElement('div');
      const result = normalizeEvent(div);

      expectError(result);
      expect(result.ok).toBe(false);
    });

    it('does not throw for malformed cards', () => {
      const div = document.createElement('div');
      div.innerHTML = '<p>Not an event card</p>';

      expect(() => normalizeEvent(div)).not.toThrow();
    });

    it('returns error with descriptive reason for malformed card', () => {
      const div = document.createElement('div');
      const result = normalizeEvent(div);

      expectError(result);
      expect(result.reason).toBeTruthy();
    });
  });

  describe('card without ICS data URI falls back to DOM extraction', () => {
    it('extracts fields from DOM when no ICS data URI', () => {
      const card = createMockEventCard({
        icsDataUri: null,
        eventId: '9999',
        title: 'DOM Only Event',
        timeText: 'Måndag 07.30 – 08.30',
        organiser: 'Test Org',
        location: 'Test Location',
        description: 'Test Description',
        primaryTopic: 'Demokrati',
      });
      const result = normalizeEvent(card);

      expectSuccess(result);
      expect(result.event.title).toBe('DOM Only Event');
      expect(result.event.organiser).toBe('Test Org');
      expect(result.event.location).toBe('Test Location');
      expect(result.event.description).toBe('Test Description');
      expect(result.event.topic).toBe('Demokrati');
      expect(result.event.icsDataUri).toBeNull();
    });
  });
});

// ─── deriveEventId ────────────────────────────────────────────────

describe('deriveEventId', () => {
  describe('priority chain', () => {
    it('prefers ICS URL path segment when available', () => {
      const result = deriveEventId(
        'https://almedalsveckan.info/rg/almedalsveckan/evenemang-almedalsveckan/2026/8363',
        '/rg/almedalsveckan/evenemang-almedalsveckan/2026/8363',
        'Some Title',
        '2026-06-22T07:30:00+02:00',
      );
      expect(result).toBe('8363');
    });

    it('falls back to detail URL when ICS URL is null', () => {
      const result = deriveEventId(
        null,
        '/rg/almedalsveckan/evenemang-almedalsveckan/2026/5555',
        'Some Title',
        '2026-06-22T07:30:00+02:00',
      );
      expect(result).toBe('5555');
    });

    it('falls back to SHA-256 hash when both URLs are null', () => {
      const result = deriveEventId(
        null,
        null,
        'Some Title',
        '2026-06-22T07:30:00+02:00',
      );
      // SHA-256 hash truncated to 16 hex characters
      expect(result).toMatch(/^[0-9a-f]{16}$/);
    });

    it('falls back to SHA-256 hash when URLs have no numeric segment', () => {
      const result = deriveEventId(
        'https://example.com/no-numeric-path',
        '/also/no/numeric/path',
        'Some Title',
        '2026-06-22T07:30:00+02:00',
      );
      expect(result).toMatch(/^[0-9a-f]{16}$/);
    });
  });

  describe('SHA-256 hash consistency', () => {
    it('produces the same hash for the same title and startDateTime', () => {
      const result1 = deriveEventId(null, null, 'Title A', '2026-06-22T07:30:00+02:00');
      const result2 = deriveEventId(null, null, 'Title A', '2026-06-22T07:30:00+02:00');
      expect(result1).toBe(result2);
    });

    it('produces different hashes for different inputs', () => {
      const result1 = deriveEventId(null, null, 'Title A', '2026-06-22T07:30:00+02:00');
      const result2 = deriveEventId(null, null, 'Title B', '2026-06-22T07:30:00+02:00');
      expect(result1).not.toBe(result2);
    });
  });

  describe('URL path segment extraction', () => {
    it('extracts last numeric segment from ICS URL', () => {
      const result = deriveEventId(
        'https://almedalsveckan.info/rg/almedalsveckan/evenemang-almedalsveckan/2026/12345',
        null,
        'Title',
        '2026-06-22T07:30:00+02:00',
      );
      expect(result).toBe('12345');
    });

    it('extracts last numeric segment from detail URL', () => {
      const result = deriveEventId(
        null,
        '/rg/almedalsveckan/evenemang-almedalsveckan/2026/67890',
        'Title',
        '2026-06-22T07:30:00+02:00',
      );
      expect(result).toBe('67890');
    });
  });
});

// ─── parseDateTime ────────────────────────────────────────────────

describe('parseDateTime', () => {
  describe('ICS format (YYYYMMDDTHHMMSS)', () => {
    it('parses ICS date-time to ISO 8601 with +02:00', () => {
      const result = parseDateTime('20260622T073000');
      expect(result).toBe('2026-06-22T07:30:00+02:00');
    });

    it('parses another ICS date-time', () => {
      const result = parseDateTime('20260628T100000');
      expect(result).toBe('2026-06-28T10:00:00+02:00');
    });

    it('parses midnight ICS date-time', () => {
      const result = parseDateTime('20260622T000000');
      expect(result).toBe('2026-06-22T00:00:00+02:00');
    });
  });

  describe('DOM time text format', () => {
    it('parses "Måndag 07.30 – 08.30" start time', () => {
      const result = parseDateTime('Måndag 07.30');
      expect(result).toMatch(/T07:30:00\+02:00$/);
    });

    it('parses "Tisdag 14.00" time', () => {
      const result = parseDateTime('Tisdag 14.00');
      expect(result).toMatch(/T14:00:00\+02:00$/);
    });

    it('parses time with leading zero', () => {
      const result = parseDateTime('Onsdag 09.15');
      expect(result).toMatch(/T09:15:00\+02:00$/);
    });
  });

  describe('edge cases', () => {
    it('returns null for empty string', () => {
      expect(parseDateTime('')).toBeNull();
    });

    it('returns null for unparseable text', () => {
      expect(parseDateTime('not a date')).toBeNull();
    });

    it('returns null for whitespace-only string', () => {
      expect(parseDateTime('   ')).toBeNull();
    });
  });
});
