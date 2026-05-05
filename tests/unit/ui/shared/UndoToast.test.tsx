/**
 * Unit tests for shared UndoToast component.
 *
 * Tests the UndoToast React component which displays a timer-based
 * undo notification after an event is unstarred. Covers appearance,
 * undo click behavior, and timer expiry.
 *
 * Validates: Requirement 7.1, 7.2, 7.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter } from '#core/types';
import { UndoToast } from '#ui/shared/UndoToast';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';

describe('UndoToast', () => {
  let adapter: IBrowserApiAdapter;
  let onUndo: () => void;
  let onExpire: () => void;

  const messageMap: Record<string, string> = {
    undoAction: 'Undo',
    eventRemoved: 'Event removed',
  };

  beforeEach(() => {
    resetMocks();
    vi.useFakeTimers();
    adapter = mockBrowserApi;
    (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => messageMap[key] ?? '',
    );
    onUndo = vi.fn();
    onExpire = vi.fn();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderToast(durationMs?: number) {
    return render(
      <UndoToast
        eventTitle="Demokrati i förändring"
        onUndo={onUndo}
        onExpire={onExpire}
        durationMs={durationMs}
        adapter={adapter}
      />,
    );
  }

  describe('appearance', () => {
    it('renders the event removed message', () => {
      renderToast();

      expect(screen.getByText('Event removed')).toBeInTheDocument();
    });

    it('renders the event title', () => {
      renderToast();

      expect(screen.getByText('Demokrati i förändring')).toBeInTheDocument();
    });

    it('renders an undo button with localized label', () => {
      renderToast();

      const button = screen.getByRole('button', { name: 'Undo' });
      expect(button).toBeInTheDocument();
    });

    it('calls getMessage for undoAction and eventRemoved keys', () => {
      renderToast();

      expect(adapter.getMessage).toHaveBeenCalledWith('undoAction');
      expect(adapter.getMessage).toHaveBeenCalledWith('eventRemoved');
    });

    it('has role="alert" for accessibility', () => {
      renderToast();

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('undo click', () => {
    it('calls onUndo when undo button is clicked', () => {
      renderToast();

      const button = screen.getByRole('button', { name: 'Undo' });
      fireEvent.click(button);

      expect(onUndo).toHaveBeenCalledTimes(1);
    });

    it('does not call onExpire when undo is clicked', () => {
      renderToast();

      const button = screen.getByRole('button', { name: 'Undo' });
      fireEvent.click(button);

      expect(onExpire).not.toHaveBeenCalled();
    });

    it('cancels the timer when undo is clicked (no expiry after duration)', () => {
      renderToast(5000);

      const button = screen.getByRole('button', { name: 'Undo' });
      fireEvent.click(button);

      act(() => {
        vi.advanceTimersByTime(6000);
      });

      expect(onExpire).not.toHaveBeenCalled();
    });
  });

  describe('timer expiry', () => {
    it('calls onExpire after default 5000ms', () => {
      renderToast();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('calls onExpire after custom duration', () => {
      renderToast(3000);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('does not call onExpire before duration elapses', () => {
      renderToast(5000);

      act(() => {
        vi.advanceTimersByTime(4999);
      });

      expect(onExpire).not.toHaveBeenCalled();
    });

    it('does not call onUndo on timer expiry', () => {
      renderToast();

      act(() => {
        vi.advanceTimersByTime(5000);
      });

      expect(onUndo).not.toHaveBeenCalled();
    });

    it('cleans up timer on unmount', () => {
      const { unmount } = renderToast(5000);

      unmount();

      act(() => {
        vi.advanceTimersByTime(6000);
      });

      expect(onExpire).not.toHaveBeenCalled();
    });
  });
});
