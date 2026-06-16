/**
 * Shared type definitions for the Bulk Star feature.
 *
 * Requirements: 3.7, 4.1, 4.7
 */

import type { IBrowserApiAdapter } from '#core/types';
import type { SupportedLocale } from '#core/locale-messages';

export interface BulkStarOptions {
  readonly adapter: IBrowserApiAdapter;
  readonly onProgress: (state: BulkStarProgress) => void;
  readonly signal: AbortSignal;
  readonly locale: SupportedLocale;
}

export interface BulkStarProgress {
  readonly phase: 'loading' | 'starring' | 'complete' | 'cancelled' | 'error';
  readonly eventsLoaded: number;
  readonly eventsProcessed: number;
  readonly eventsTotal: number;
  readonly eventsNewlyStarred: number;
  readonly eventsAlreadyStarred: number;
  readonly eventsFailed: number;
  readonly eventsSkipped: number;
}

export interface BulkStarResult {
  readonly eventsFound: number;
  readonly eventsNewlyStarred: number;
  readonly eventsAlreadyStarred: number;
  readonly eventsFailed: number;
  readonly eventsSkipped: number;
  readonly aborted: boolean;
  readonly abortReason: 'user-cancel' | 'error-threshold' | null;
}
