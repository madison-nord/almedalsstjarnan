import type { ICSCalendar, ICSEvent } from './types';

/**
 * Unfolds continuation lines per RFC 5545.
 * A CRLF followed by a single whitespace character (space or tab) is a line fold
 * and should be removed to reconstruct the logical line.
 */
export function unfoldLines(content: string): string {
  return content.replace(/\r\n[ \t]/g, '');
}

/**
 * Unescapes ICS text values per RFC 5545.
 * Escaped characters: backslash, comma, semicolon, and newline (\\n or \\N).
 *
 * Order matters: backslashes must be unescaped first to avoid double-processing.
 */
export function unescapeICSText(text: string): string {
  return text
    .replace(/\\\\/g, '\x00') // temporarily replace escaped backslashes
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\[nN]/g, '\n')
    .replace(/\x00/g, '\\'); // restore backslashes
}

/**
 * Extracts the value from a property line.
 * Handles both simple properties (KEY:VALUE) and properties with parameters (KEY;PARAM=X:VALUE).
 */
function extractPropertyValue(line: string): string {
  const colonIndex = line.indexOf(':');
  if (colonIndex === -1) {
    return '';
  }
  return line.slice(colonIndex + 1);
}

/**
 * Extracts the property name from a line (before any parameters or colon).
 */
function extractPropertyName(line: string): string {
  const colonIndex = line.indexOf(':');
  const semiIndex = line.indexOf(';');

  if (colonIndex === -1) {
    return line;
  }

  if (semiIndex !== -1 && semiIndex < colonIndex) {
    return line.slice(0, semiIndex).toUpperCase();
  }

  return line.slice(0, colonIndex).toUpperCase();
}

/**
 * Parses a single VEVENT block (array of unfolded lines) into an ICSEvent.
 */
function parseVEVENT(lines: readonly string[]): ICSEvent {
  let uid = '';
  let dtstart = '';
  let dtend: string | null = null;
  let summary = '';
  let location: string | null = null;
  let description: string | null = null;
  let organizer: string | null = null;

  for (const line of lines) {
    const propName = extractPropertyName(line);
    const value = extractPropertyValue(line);

    switch (propName) {
      case 'UID':
        uid = value;
        break;
      case 'DTSTART':
        dtstart = value;
        break;
      case 'DTEND':
        dtend = value;
        break;
      case 'SUMMARY':
        summary = unescapeICSText(value);
        break;
      case 'LOCATION':
        location = unescapeICSText(value);
        break;
      case 'DESCRIPTION':
        description = unescapeICSText(value);
        break;
      case 'ORGANIZER':
        organizer = unescapeICSText(value);
        break;
    }
  }

  return {
    uid,
    dtstart,
    dtend,
    summary,
    location,
    description,
    organizer,
  };
}

/**
 * Parses an ICS string into a structured ICSCalendar object.
 * Used for round-trip validation in property-based tests.
 *
 * @param icsContent - Raw ICS file content
 * @returns Parsed calendar with events
 * @throws Error if the ICS content is malformed (missing BEGIN:VCALENDAR)
 */
export function parseICS(icsContent: string): ICSCalendar {
  if (!icsContent.trim()) {
    throw new Error('Malformed ICS: content is empty');
  }

  // Unfold continuation lines first
  const unfolded = unfoldLines(icsContent);

  // Split into lines, handling both CRLF and LF
  const lines = unfolded.split(/\r\n|\n/);

  // Validate VCALENDAR wrapper
  const trimmedLines = lines.map((l) => l.trim()).filter((l) => l.length > 0);

  if (!trimmedLines.includes('BEGIN:VCALENDAR')) {
    throw new Error('Malformed ICS: missing BEGIN:VCALENDAR');
  }

  // Extract VCALENDAR-level properties
  let version = '';
  let prodid = '';
  let calscale = '';
  let method = '';

  let inCalendar = false;
  let inEvent = false;
  let currentEventLines: string[] = [];
  const events: ICSEvent[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === 'BEGIN:VCALENDAR') {
      inCalendar = true;
      continue;
    }

    if (trimmed === 'END:VCALENDAR') {
      inCalendar = false;
      continue;
    }

    if (!inCalendar) {
      continue;
    }

    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      currentEventLines = [];
      continue;
    }

    if (trimmed === 'END:VEVENT') {
      inEvent = false;
      events.push(parseVEVENT(currentEventLines));
      continue;
    }

    if (inEvent) {
      currentEventLines.push(trimmed);
    } else {
      // Calendar-level property
      const propName = extractPropertyName(trimmed);
      const value = extractPropertyValue(trimmed);

      switch (propName) {
        case 'VERSION':
          version = value;
          break;
        case 'PRODID':
          prodid = value;
          break;
        case 'CALSCALE':
          calscale = value;
          break;
        case 'METHOD':
          method = value;
          break;
      }
    }
  }

  return {
    version,
    prodid,
    calscale,
    method,
    events,
  };
}
