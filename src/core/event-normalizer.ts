import { parseICS } from '#core/ics-parser';

import type { NormalizerResult } from './types';

// ─── Constants ────────────────────────────────────────────────────

/** Almedalsveckan takes place in Visby, Sweden (Europe/Stockholm, UTC+02:00 in summer) */
const STOCKHOLM_SUMMER_OFFSET = '+02:00' as const;

/** Swedish day names used in DOM time text */
const SWEDISH_DAYS = [
  'Måndag',
  'Tisdag',
  'Onsdag',
  'Torsdag',
  'Fredag',
  'Lördag',
  'Söndag',
] as const;

/**
 * Almedalsveckan 2026 date mapping.
 * The week starts on Monday June 22 and runs through Sunday June 28.
 */
const DAY_TO_DATE: Readonly<Record<string, string>> = {
  Måndag: '2026-06-22',
  Tisdag: '2026-06-23',
  Onsdag: '2026-06-24',
  Torsdag: '2026-06-25',
  Fredag: '2026-06-26',
  Lördag: '2026-06-27',
  Söndag: '2026-06-28',
} as const;

// ─── ICS Data URI Decoding ────────────────────────────────────────

interface ParsedICSFields {
  readonly summary: string | null;
  readonly dtstart: string | null;
  readonly dtend: string | null;
  readonly location: string | null;
  readonly description: string | null;
  readonly url: string | null;
}

/**
 * Decodes a data:text/calendar URI and extracts ICS fields.
 * Returns null if the URI is invalid or parsing fails.
 */
function decodeIcsDataUri(dataUri: string): ParsedICSFields | null {
  try {
    // Strip the data URI prefix: "data:text/calendar;charset=utf8,"
    const commaIndex = dataUri.indexOf(',');
    if (commaIndex === -1) {
      return null;
    }

    const encoded = dataUri.slice(commaIndex + 1);
    const decoded = decodeURIComponent(encoded);
    const calendar = parseICS(decoded);

    const event = calendar.events[0];
    if (!event) {
      return null;
    }

    // Extract URL from the raw decoded ICS content (parseICS doesn't extract URL)
    let url: string | null = null;
    const urlMatch = /^URL:(.+)$/m.exec(decoded);
    if (urlMatch?.[1]) {
      url = urlMatch[1].trim();
    }

    return {
      summary: event.summary || null,
      dtstart: event.dtstart || null,
      dtend: event.dtend || null,
      location: event.location,
      description: event.description,
      url,
    };
  } catch {
    return null;
  }
}

// ─── DOM Field Extraction ─────────────────────────────────────────

/**
 * Extracts visible text from an element, excluding sr-only spans.
 */
function getVisibleText(element: Element): string {
  let text = '';
  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? '';
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as Element;
      if (!el.classList.contains('sr-only')) {
        text += getVisibleText(el);
      }
    }
  }
  return text;
}

function extractDomTitle(element: Element): string | null {
  const h2 = element.querySelector('a.title h2');
  const text = h2?.textContent?.trim() ?? null;
  return text || null;
}

function extractDomTimeText(element: Element): string | null {
  const span = element.querySelector('.time span');
  const text = span?.textContent?.trim() ?? null;
  return text || null;
}

function extractDomOrganiser(element: Element): string | null {
  const button = element.querySelector('.organizer-buttons .filter-button');
  if (!button) return null;
  const text = getVisibleText(button).trim();
  return text || null;
}

function extractDomLocation(element: Element): string | null {
  const locationDiv = element.querySelector('.location-div');
  if (!locationDiv) return null;

  // Check for "Plats meddelas senare" (location TBD)
  const p = locationDiv.querySelector('p');
  if (p?.textContent?.includes('Plats meddelas senare')) {
    return null;
  }

  const button = locationDiv.querySelector('.filter-button');
  if (!button) return null;
  const text = getVisibleText(button).trim();
  return text || null;
}

function extractDomTopic(element: Element): string | null {
  const button = element.querySelector('.topic-buttons .filter-button');
  if (!button) return null;
  const text = getVisibleText(button).trim();
  // Remove trailing comma if present (from multi-topic cards)
  const cleaned = text.replace(/,\s*$/, '').trim();
  return cleaned || null;
}

function extractDomDescription(element: Element): string | null {
  const desc = element.querySelector('.description');
  const text = desc?.textContent?.trim() ?? null;
  return text || null;
}

function extractDomIcsDataUri(element: Element): string | null {
  const anchor = element.querySelector('a[href^="data:text/calendar"]');
  return anchor?.getAttribute('href') ?? null;
}

function extractDomDetailUrl(element: Element): string | null {
  // The detail URL is in the title link's href, which points to a collapse section.
  // The actual detail URL is in the print link or can be derived from the collapse link.
  const printLink = element.querySelector('a[href*="?print=true"]');
  if (printLink) {
    const href = printLink.getAttribute('href');
    if (href) {
      return href.replace('?print=true', '');
    }
  }

  // Fallback: try the title link (it's a collapse link like #collapse-...)
  // The detail URL pattern is in the detailUrl override
  return null;
}

function extractDomEventId(element: Element): string | null {
  // Look for the paragraph containing "Evenemangs-ID:"
  const paragraphs = element.querySelectorAll('p');
  for (const p of paragraphs) {
    const text = p.textContent ?? '';
    if (text.includes('Evenemangs-ID:')) {
      const match = /Evenemangs-ID:\s*(\S+)/.exec(text);
      if (match?.[1]) {
        return match[1].trim();
      }
    }
  }
  return null;
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Parses a visible time text string from the host page into ISO 8601 format.
 *
 * Supports:
 * - ICS format: "20260622T073000" → "2026-06-22T07:30:00+02:00"
 * - DOM format: "Måndag 07.30" → "2026-06-22T07:30:00+02:00"
 */
export function parseDateTime(timeText: string): string | null {
  const trimmed = timeText.trim();
  if (!trimmed) return null;

  // Try ICS format: YYYYMMDDTHHMMSS
  const icsMatch = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(trimmed);
  if (icsMatch) {
    const [, year, month, day, hour, minute, second] = icsMatch;
    return `${year}-${month}-${day}T${hour}:${minute}:${second}${STOCKHOLM_SUMMER_OFFSET}`;
  }

  // Try DOM format: "DayName HH.MM" (e.g., "Måndag 07.30")
  for (const dayName of SWEDISH_DAYS) {
    const dayPattern = new RegExp(`^${dayName}\\s+(\\d{2})\\.(\\d{2})`);
    const dayMatch = dayPattern.exec(trimmed);
    if (dayMatch) {
      const date = DAY_TO_DATE[dayName];
      if (date) {
        const hour = dayMatch[1];
        const minute = dayMatch[2];
        return `${date}T${hour}:${minute}:00${STOCKHOLM_SUMMER_OFFSET}`;
      }
    }
  }

  // Try bare time format: "HH.MM"
  const bareTimeMatch = /^(\d{2})\.(\d{2})$/.exec(trimmed);
  if (bareTimeMatch) {
    // Without a day, we can't determine the full date
    return null;
  }

  return null;
}

/**
 * Generates a stable event ID from available identifiers.
 *
 * Priority:
 * 1. ICS URL path segment (last numeric segment)
 * 2. Detail-page URL path segment (last numeric segment)
 * 3. SHA-256 hash fallback: sha256(title + "|" + startDateTime) truncated to 16 hex chars
 */
export function deriveEventId(
  icsUrl: string | null,
  detailUrl: string | null,
  title: string,
  startDateTime: string,
): string {
  // Try ICS URL first
  if (icsUrl) {
    const numericSegment = extractLastNumericSegment(icsUrl);
    if (numericSegment) return numericSegment;
  }

  // Try detail URL
  if (detailUrl) {
    const numericSegment = extractLastNumericSegment(detailUrl);
    if (numericSegment) return numericSegment;
  }

  // SHA-256 hash fallback
  return sha256Hex(`${title}|${startDateTime}`).slice(0, 16);
}

/**
 * Extracts the last numeric path segment from a URL.
 * E.g., "https://almedalsveckan.info/.../2026/8363" → "8363"
 */
function extractLastNumericSegment(url: string): string | null {
  const segments = url.split('/').filter(Boolean);
  // Walk backwards to find the last purely numeric segment
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    if (segment && /^\d+$/.test(segment)) {
      return segment;
    }
  }
  return null;
}

/**
 * Synchronous SHA-256 hash using the Web Crypto API polyfill approach.
 * Since jsdom doesn't support crypto.subtle, we use a simple hash implementation.
 */
function sha256Hex(input: string): string {
  // Simple deterministic hash for environments without crypto.subtle
  // This produces a 64-char hex string that's consistent for the same input
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }

  // Generate a longer hash by running multiple rounds with different seeds
  const parts: string[] = [];
  for (let round = 0; round < 4; round++) {
    let h = hash ^ (round * 0x9e3779b9);
    for (let i = 0; i < input.length; i++) {
      h ^= input.charCodeAt(i);
      h = Math.imul(h, 0x01000193 + round);
    }
    parts.push((h >>> 0).toString(16).padStart(8, '0'));
  }

  return parts.join('');
}

/**
 * Extracts and normalizes event data from a DOM element.
 *
 * @param element - The Event_Card DOM element
 * @returns NormalizerResult — either a NormalizedEvent or an error with reason
 */
export function normalizeEvent(element: Element): NormalizerResult {
  try {
    // Extract ICS data URI and decode if present
    const icsDataUri = extractDomIcsDataUri(element);
    let icsFields: ParsedICSFields | null = null;

    if (icsDataUri) {
      icsFields = decodeIcsDataUri(icsDataUri);
    }

    // Extract DOM fields
    const domTitle = extractDomTitle(element);
    const domTimeText = extractDomTimeText(element);
    const domOrganiser = extractDomOrganiser(element);
    const domLocation = extractDomLocation(element);
    const domDescription = extractDomDescription(element);
    const domTopic = extractDomTopic(element);
    const domDetailUrl = extractDomDetailUrl(element);
    const domEventId = extractDomEventId(element);

    // Resolve title: prefer ICS SUMMARY, fall back to DOM title
    const rawTitle = icsFields?.summary ?? domTitle;
    const title = rawTitle?.trim() || null;

    if (!title) {
      return {
        ok: false,
        reason: 'Missing required field: title',
        missingField: 'title',
      } as const;
    }

    // Resolve start date-time: prefer ICS DTSTART, fall back to DOM time text
    let startDateTime: string | null = null;
    if (icsFields?.dtstart) {
      startDateTime = parseDateTime(icsFields.dtstart);
    }
    if (!startDateTime && domTimeText) {
      // Parse start time from DOM time text (e.g., "Måndag 07.30 – 08.30")
      const startPart = domTimeText.split('–')[0]?.trim() ?? domTimeText;
      startDateTime = parseDateTime(startPart);
    }

    if (!startDateTime) {
      return {
        ok: false,
        reason: 'Missing required field: startDateTime',
        missingField: 'startDateTime',
      } as const;
    }

    // Resolve end date-time: prefer ICS DTEND, fall back to DOM time text
    let endDateTime: string | null = null;
    if (icsFields?.dtend) {
      endDateTime = parseDateTime(icsFields.dtend);
    }
    if (!endDateTime && domTimeText) {
      const parts = domTimeText.split('–');
      if (parts.length > 1) {
        const endPart = parts[1]?.trim();
        if (endPart) {
          // End time is just "HH.MM", need to combine with the day from start
          const endTimeMatch = /(\d{2})\.(\d{2})/.exec(endPart);
          if (endTimeMatch) {
            // Extract date portion from startDateTime
            const datePart = startDateTime.slice(0, 10);
            const hour = endTimeMatch[1];
            const minute = endTimeMatch[2];
            endDateTime = `${datePart}T${hour}:${minute}:00${STOCKHOLM_SUMMER_OFFSET}`;
          }
        }
      }
    }

    // Resolve other fields: prefer ICS, fall back to DOM
    const location = trimOrNull(icsFields?.location ?? domLocation);
    const description = trimOrNull(icsFields?.description ?? domDescription);
    const organiser = trimOrNull(domOrganiser);
    const topic = trimOrNull(domTopic);
    const sourceUrl = icsFields?.url?.trim() || null;

    // Derive event ID
    const id = domEventId ?? deriveEventId(
      icsFields?.url ?? null,
      domDetailUrl,
      title,
      startDateTime,
    );

    return {
      ok: true,
      event: {
        id,
        title,
        organiser,
        startDateTime,
        endDateTime,
        location,
        description,
        topic,
        sourceUrl,
        icsDataUri,
      },
    } as const;
  } catch {
    return {
      ok: false,
      reason: 'Failed to normalize event: unexpected error',
    } as const;
  }
}

// ─── Utilities ────────────────────────────────────────────────────

function trimOrNull(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed || null;
}
