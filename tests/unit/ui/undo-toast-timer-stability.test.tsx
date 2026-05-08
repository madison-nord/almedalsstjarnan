/**
 * Unit test: UndoToast timer stability.
 *
 * Verifies that the UndoToast timer does NOT reset when the parent
 * re-renders with a new onExpire callback reference. This is critical
 * for bulk unstar: when one toast expires and triggers a re-render,
 * remaining toasts should NOT have their timers reset.
 *
 * // Feature: unstar-revert-bug, UndoToast timer stability
 *
 * Validates: Requirements 7.1, 7.2, 7.3
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

import { mockBrowserApi } from '#test/helpers/mock-browser-api';
import { UndoToast } from '#ui/shared/UndoToast';

describe('UndoToast timer stability', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('timer does NOT reset when onExpire prop changes (parent re-render)', () => {
    const onExpire1 = vi.fn();
    const onUndo = vi.fn();

    const { rerender } = render(
      <UndoToast
        eventTitle="Test Event"
        onUndo={onUndo}
        onExpire={onExpire1}
        durationMs={5000}
        adapter={mockBrowserApi}
      />,
    );

    // Advance 3 seconds
    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Parent re-renders with a new onExpire reference (simulating state change)
    const onExpire2 = vi.fn();
    rerender(
      <UndoToast
        eventTitle="Test Event"
        onUndo={onUndo}
        onExpire={onExpire2}
        durationMs={5000}
        adapter={mockBrowserApi}
      />,
    );

    // Advance 2 more seconds (total 5s from mount)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // The LATEST onExpire should be called (not the original one)
    // And it should fire at the original 5s mark, not reset to 5s from re-render
    expect(onExpire2).toHaveBeenCalledTimes(1);
    expect(onExpire1).not.toHaveBeenCalled();
  });

  it('timer does NOT reset when re-rendered multiple times', () => {
    const onExpire = vi.fn();
    const onUndo = vi.fn();

    const { rerender } = render(
      <UndoToast
        eventTitle="Test Event"
        onUndo={onUndo}
        onExpire={onExpire}
        durationMs={5000}
        adapter={mockBrowserApi}
      />,
    );

    // Simulate 5 re-renders at 500ms intervals (like other toasts expiring)
    for (let i = 0; i < 5; i++) {
      act(() => {
        vi.advanceTimersByTime(500);
      });
      rerender(
        <UndoToast
          eventTitle="Test Event"
          onUndo={vi.fn()}
          onExpire={onExpire}
          durationMs={5000}
          adapter={mockBrowserApi}
        />,
      );
    }

    // At this point 2.5s have passed. Timer should NOT have fired yet.
    expect(onExpire).not.toHaveBeenCalled();

    // Advance remaining 2.5s
    act(() => {
      vi.advanceTimersByTime(2500);
    });

    // Now it should fire (5s total from mount)
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('multiple toasts expire independently without cascading delays', () => {
    const onExpireA = vi.fn();
    const onExpireB = vi.fn();
    const onExpireC = vi.fn();
    const onUndo = vi.fn();

    // Render 3 toasts (simulating bulk unstar)
    const { rerender } = render(
      <div>
        <UndoToast
          eventTitle="Event A"
          onUndo={onUndo}
          onExpire={onExpireA}
          durationMs={5000}
          adapter={mockBrowserApi}
        />
        <UndoToast
          eventTitle="Event B"
          onUndo={onUndo}
          onExpire={onExpireB}
          durationMs={5000}
          adapter={mockBrowserApi}
        />
        <UndoToast
          eventTitle="Event C"
          onUndo={onUndo}
          onExpire={onExpireC}
          durationMs={5000}
          adapter={mockBrowserApi}
        />
      </div>,
    );

    // Advance 5 seconds — ALL toasts should expire at the same time
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(onExpireA).toHaveBeenCalledTimes(1);
    expect(onExpireB).toHaveBeenCalledTimes(1);
    expect(onExpireC).toHaveBeenCalledTimes(1);

    // Simulate parent re-render after first toast expires (removing it from list)
    // Remaining toasts should NOT get new timers
    rerender(
      <div>
        <UndoToast
          eventTitle="Event B"
          onUndo={onUndo}
          onExpire={onExpireB}
          durationMs={5000}
          adapter={mockBrowserApi}
        />
        <UndoToast
          eventTitle="Event C"
          onUndo={onUndo}
          onExpire={onExpireC}
          durationMs={5000}
          adapter={mockBrowserApi}
        />
      </div>,
    );

    // Advance another 5 seconds — should NOT fire again
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Each should have been called exactly once (not twice)
    expect(onExpireB).toHaveBeenCalledTimes(1);
    expect(onExpireC).toHaveBeenCalledTimes(1);
  });
});
