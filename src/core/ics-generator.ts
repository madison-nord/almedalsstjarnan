import type { StarredEvent } from './types';

const CRLF = '\r\n';
const MAX_OCTETS = 75;

/**
 * Escapes special characters in ICS text values per RFC 5545.
 * Order matters: backslashes must be escaped first to avoid double-processing.
 */
export function escapeICSText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
}

/**
 * Folds a single ICS content line to 75-octet maximum per RFC 5545.
 *
 * Lines longer than 75 octets are split: the first chunk is 75 octets,
 * and each continuation line starts with a single space character
 * (which counts toward the 75-octet limit of that continuation line).
 */
export function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);

  if (bytes.length <= MAX_OCTETS) {
    return line;
  }

  const parts: string[] = [];
  let offset = 0;
  let isFirst = true;

  while (offset < bytes.length) {
    // First line: up to 75 octets. Continuation lines: space + up to 74 octets of content.
    const limit = isFirst ? MAX_OCTETS : MAX_OCTETS - 1;

    // Find the right cut point that doesn't split a multi-byte character.
    // We take `limit` bytes from the current offset, then decode to find
    // the last valid character boundary.
    const end = Math.min(offset + limit, bytes.length);
    let chunk = bytes.slice(offset, end);

    // Decode and re-encode to ensure we don't split a multi-byte character.
    // If the last character was split, the decoder will produce a replacement
    // character. We trim one byte at a time until we get a clean decode.
    let decoded = new TextDecoder().decode(chunk);
    let reEncoded = encoder.encode(decoded);

    // If re-encoding produces different bytes, we may have split a character.
    // Walk back until we get a clean boundary.
    while (reEncoded.length > limit && chunk.length > 0) {
      chunk = chunk.slice(0, chunk.length - 1);
      decoded = new TextDecoder().decode(chunk);
      reEncoded = encoder.encode(decoded);
    }

    // Also check for replacement characters (U+FFFD) which indicate a split
    if (decoded.includes('\uFFFD') && chunk.length > 0) {
      // Walk back past the incomplete multi-byte sequence
      while (decoded.includes('\uFFFD') && chunk.length > 0) {
        chunk = chunk.slice(0, chunk.length - 1);
        decoded = new TextDecoder().decode(chunk);
      }
      reEncoded = encoder.encode(decoded);
    }

    if (isFirst) {
      parts.push(decoded);
    } else {
      parts.push(' ' + decoded);
    }

    offset += reEncoded.length;
    isFirst = false;
  }

  return parts.join(CRLF);
}

/**
 * Converts an ISO 8601 date-time string to ICS local time format.
 * Example: "2026-06-22T07:30:00+02:00" → "20260622T073000"
 *
 * Strips the timezone offset for local time representation.
 */
function toICSDateTime(iso: string): string {
  // Remove dashes, colons, and timezone offset
  return iso
    .replace(/[-:]/g, '')
    .replace(/\+.*$/, '')
    .slice(0, 15);
}

/**
 * Formats a Date as a UTC timestamp in YYYYMMDDTHHMMSSZ format for DTSTAMP.
 */
function toICSTimestamp(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${h}${min}${s}Z`;
}

/**
 * Builds the DESCRIPTION field value from event description and source URL.
 * Returns null if both are absent.
 */
function buildDescription(
  description: string | null,
  sourceUrl: string | null,
  locale: 'sv' | 'en',
): string | null {
  const sourceLabel = locale === 'sv' ? 'Källa' : 'Source';
  const parts: string[] = [];

  if (description !== null) {
    parts.push(description);
  }

  if (sourceUrl !== null) {
    parts.push(`${sourceLabel}: ${sourceUrl}`);
  }

  if (parts.length === 0) {
    return null;
  }

  return parts.join('\n');
}

/**
 * Generates an RFC 5545-compliant ICS string from starred events.
 *
 * @param events - Array of starred events to include
 * @param locale - 'sv' or 'en' for source label localization
 * @returns Complete ICS file content as a string
 */
export function generateICS(
  events: readonly StarredEvent[],
  locale: 'sv' | 'en',
): string {
  const now = new Date();
  const dtstamp = toICSTimestamp(now);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Almedalsstjärnan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  for (const event of events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}@almedalsstjarnan`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART:${toICSDateTime(event.startDateTime)}`);

    if (event.endDateTime !== null) {
      lines.push(`DTEND:${toICSDateTime(event.endDateTime)}`);
    }

    lines.push(`SUMMARY:${escapeICSText(event.title)}`);

    if (event.location !== null) {
      lines.push(`LOCATION:${escapeICSText(event.location)}`);
    }

    const desc = buildDescription(event.description, event.sourceUrl, locale);
    if (desc !== null) {
      lines.push(`DESCRIPTION:${escapeICSText(desc)}`);
    }

    if (event.organiser !== null) {
      lines.push(`ORGANIZER:${escapeICSText(event.organiser)}`);
    }

    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  // Fold each line and join with CRLF
  const folded = lines.map((line) => foldLine(line));
  return folded.join(CRLF) + CRLF;
}

/**
 * Generates the export filename with current timestamp.
 * Pattern: almedalsstjarnan-starred-events-YYYYMMDD-HHMMSS.ics
 */
export function generateExportFilename(now?: Date): string {
  const date = now ?? new Date();
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const h = String(date.getUTCHours()).padStart(2, '0');
  const min = String(date.getUTCMinutes()).padStart(2, '0');
  const s = String(date.getUTCSeconds()).padStart(2, '0');
  return `almedalsstjarnan-starred-events-${y}${m}${d}-${h}${min}${s}.ics`;
}
