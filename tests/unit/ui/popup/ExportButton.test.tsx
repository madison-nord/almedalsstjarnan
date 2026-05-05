/**
 * Unit tests for Popup ExportButton component.
 *
 * Tests:
 * - Renders with localized label from adapter.getMessage('exportToCalendar')
 * - Clicking the button calls onExport
 * - Button is disabled when disabled prop is true
 * - Button is keyboard-accessible (Enter and Space activate)
 *
 * Requirements: 1.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter } from '#core/types';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';

import { ExportButton } from '#ui/popup/components/ExportButton';

describe('Popup ExportButton', () => {
  let adapter: IBrowserApiAdapter;

  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
    (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => {
        if (key === 'exportToCalendar') return 'Export to calendar';
        return '';
      },
    );
  });

  it('renders with localized label', () => {
    const onExport = vi.fn();
    render(<ExportButton onExport={onExport} adapter={adapter} />);

    expect(screen.getByRole('button', { name: 'Export to calendar' })).toBeInTheDocument();
    expect(adapter.getMessage).toHaveBeenCalledWith('exportToCalendar');
  });

  it('calls onExport when clicked', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(<ExportButton onExport={onExport} adapter={adapter} />);

    const button = screen.getByRole('button', { name: 'Export to calendar' });
    await user.click(button);

    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('is disabled when disabled prop is true', () => {
    const onExport = vi.fn();
    render(<ExportButton onExport={onExport} adapter={adapter} disabled={true} />);

    const button = screen.getByRole('button', { name: 'Export to calendar' });
    expect(button).toBeDisabled();
  });

  it('does not call onExport when disabled', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(<ExportButton onExport={onExport} adapter={adapter} disabled={true} />);

    const button = screen.getByRole('button', { name: 'Export to calendar' });
    await user.click(button);

    expect(onExport).not.toHaveBeenCalled();
  });

  it('is activated by Enter key', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(<ExportButton onExport={onExport} adapter={adapter} />);

    const button = screen.getByRole('button', { name: 'Export to calendar' });
    button.focus();
    await user.keyboard('{Enter}');

    expect(onExport).toHaveBeenCalledTimes(1);
  });

  it('is activated by Space key', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(<ExportButton onExport={onExport} adapter={adapter} />);

    const button = screen.getByRole('button', { name: 'Export to calendar' });
    button.focus();
    await user.keyboard(' ');

    expect(onExport).toHaveBeenCalledTimes(1);
  });
});
