/**
 * Shared UndoToast component.
 *
 * Displays a timer-based undo notification after an event is unstarred.
 * The toast shows the event title, a localized "Event removed" message,
 * and an "Undo" button. If the user clicks undo before the timer expires,
 * onUndo is called. If the timer expires, onExpire is called.
 *
 * Each toast manages its own timer via useEffect cleanup.
 *
 * Validates: Requirements 7.1, 7.2, 7.3
 */

import { useEffect, useRef, useCallback } from 'react';

import type { IBrowserApiAdapter } from '#core/types';

export interface UndoToastProps {
  readonly eventTitle: string;
  readonly onUndo: () => void;
  readonly onExpire: () => void;
  readonly durationMs?: number;
  readonly adapter: IBrowserApiAdapter;
}

const DEFAULT_DURATION_MS = 5000;

export function UndoToast({
  eventTitle,
  onUndo,
  onExpire,
  durationMs = DEFAULT_DURATION_MS,
  adapter,
}: UndoToastProps): React.JSX.Element {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const undoneRef = useRef(false);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      if (!undoneRef.current) {
        onExpire();
      }
    }, durationMs);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [durationMs, onExpire]);

  const handleUndo = useCallback(() => {
    undoneRef.current = true;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onUndo();
  }, [onUndo]);

  return (
    <div
      role="alert"
      className="flex items-center gap-2 rounded bg-gray-800 px-4 py-2 text-sm text-white shadow-lg"
    >
      <span className="flex-1">
        <span className="font-medium">{adapter.getMessage('eventRemoved')}</span>
        {' — '}
        <span>{eventTitle}</span>
      </span>
      <button
        type="button"
        onClick={handleUndo}
        className="rounded px-2 py-1 font-medium text-amber-300 hover:text-amber-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
      >
        {adapter.getMessage('undoAction')}
      </button>
    </div>
  );
}
