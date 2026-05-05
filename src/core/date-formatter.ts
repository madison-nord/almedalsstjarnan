/**
 * Date Formatter module.
 *
 * Converts ISO 8601 date-time strings into locale-appropriate
 * human-readable format for display in the extension UI.
 *
 * Implementation approach: Parse the ISO string manually (split on T, -, :)
 * rather than using Date constructor, to avoid timezone conversion issues.
 * The offset is already embedded in the ISO string.
 */

export type DateFormatterLocale = 'sv' | 'en';

// ─── Lookup Tables ────────────────────────────────────────────────

/** Abbreviated Swedish day names indexed by day-of-week (0 = Monday, 6 = Sunday) */
const SV_DAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'] as const;

/** Abbreviated English day names indexed by day-of-week (0 = Monday, 6 = Sunday) */
const EN_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

/** Full Swedish month names indexed by month (0 = January, 11 = December) */
const SV_MONTHS = [
  'januari', 'februari', 'mars', 'april', 'maj', 'juni',
  'juli', 'augusti', 'september', 'oktober', 'november', 'december',
] as const;

/** Abbreviated English month names indexed by month (0 = January, 11 = December) */
const EN_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

// ─── Internal Helpers ─────────────────────────────────────────────

interface ParsedDateTime {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
}

/**
 * Parses an ISO 8601 date-time string into its numeric components.
 * Returns null if the string cannot be parsed.
 *
 * Expected format: YYYY-MM-DDTHH:MM:SS+HH:MM (or similar offset)
 */
function parseISO(isoString: string): ParsedDateTime | null {
  // Split on T to get date and time parts
  const tIndex = isoString.indexOf('T');
  if (tIndex === -1) return null;

  const datePart = isoString.slice(0, tIndex);
  const timePart = isoString.slice(tIndex + 1);

  // Parse date: YYYY-MM-DD
  const datePieces = datePart.split('-');
  if (datePieces.length !== 3) return null;

  const year = Number(datePieces[0]);
  const month = Number(datePieces[1]);
  const day = Number(datePieces[2]);

  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Parse time: HH:MM:SS+HH:MM or HH:MM:SS-HH:MM or HH:MM:SSZ
  // We only need HH:MM, ignore seconds and offset
  const timePieces = timePart.split(':');
  if (timePieces.length < 2) return null;

  const hour = Number(timePieces[0]);
  const minute = Number(timePieces[1]);

  if (isNaN(hour) || isNaN(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return { year, month, day, hour, minute };
}

/**
 * Computes the day of week for a given date using Zeller-like formula.
 * Returns 0 = Monday, 1 = Tuesday, ..., 6 = Sunday.
 *
 * Uses a known reference: 2026-06-22 is a Monday.
 * We compute using a standard algorithm instead.
 */
function dayOfWeek(year: number, month: number, day: number): number {
  // Tomohiko Sakamoto's algorithm (returns 0=Sunday, 1=Monday, ..., 6=Saturday)
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4] as const;
  let y = year;
  if (month < 3) y -= 1;
  const dow = (y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) + (t[month - 1] ?? 0) + day) % 7;
  // Convert from 0=Sunday to 0=Monday
  return (dow + 6) % 7;
}

/**
 * Extracts the date portion (YYYY-MM-DD) from an ISO string for comparison.
 */
function extractDatePart(isoString: string): string | null {
  const tIndex = isoString.indexOf('T');
  if (tIndex === -1) return null;
  return isoString.slice(0, tIndex);
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Formats an event's date-time range for display.
 *
 * @param startDateTime - ISO 8601 string (e.g., "2026-06-22T07:30:00+02:00")
 * @param endDateTime - ISO 8601 string or null
 * @param locale - 'sv' or 'en'
 * @returns Formatted string, e.g., "Mån 22 juni 07:30–08:30" (sv) or "Mon 22 Jun 07:30–08:30" (en)
 */
export function formatEventDateTime(
  startDateTime: string,
  endDateTime: string | null,
  locale: DateFormatterLocale,
): string {
  const start = parseISO(startDateTime);
  if (!start) return startDateTime;

  const days = locale === 'sv' ? SV_DAYS : EN_DAYS;
  const months = locale === 'sv' ? SV_MONTHS : EN_MONTHS;

  const dow = dayOfWeek(start.year, start.month, start.day);
  const dayName = days[dow] ?? '';
  const monthName = months[start.month - 1] ?? '';
  const startTime = `${String(start.hour).padStart(2, '0')}:${String(start.minute).padStart(2, '0')}`;

  // Determine if we should show a time range
  let showRange = false;
  let endTime = '';

  if (endDateTime !== null) {
    const startDate = extractDatePart(startDateTime);
    const endDate = extractDatePart(endDateTime);

    if (startDate !== null && endDate !== null && startDate === endDate) {
      const end = parseISO(endDateTime);
      if (end) {
        showRange = true;
        endTime = `${String(end.hour).padStart(2, '0')}:${String(end.minute).padStart(2, '0')}`;
      }
    }
  }

  // Build the formatted string
  const timeStr = showRange ? `${startTime}\u2013${endTime}` : startTime;
  return `${dayName} ${start.day} ${monthName} ${timeStr}`;
}
