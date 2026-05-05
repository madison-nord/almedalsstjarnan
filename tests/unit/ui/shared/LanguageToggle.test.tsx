/**
 * Unit tests for shared LanguageToggle component.
 *
 * Tests the LanguageToggle React component which renders a native HTML
 * <select> element with Auto/Svenska/English options, persists the
 * selection via message passing, and provides proper accessibility.
 *
 * Requirements: 6.5, 6.6, 6.7
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

import type { IBrowserApiAdapter } from '#core/types';
import { LanguageToggle } from '#ui/shared/LanguageToggle';
import { mockBrowserApi, resetMocks } from '#test/helpers/mock-browser-api';

describe('LanguageToggle', () => {
  let adapter: IBrowserApiAdapter;
  let onLocaleChange: (locale: 'sv' | 'en' | null) => void;

  const messageMap: Record<string, string> = {
    languageLabel: 'Language',
    languageAuto: 'Auto (browser)',
    languageSv: 'Svenska',
    languageEn: 'English',
  };

  beforeEach(() => {
    resetMocks();
    adapter = mockBrowserApi;
    (adapter.getMessage as ReturnType<typeof vi.fn>).mockImplementation(
      (key: string) => messageMap[key] ?? '',
    );
    (adapter.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      data: null,
    });
    onLocaleChange = vi.fn();
  });

  function renderToggle() {
    return render(
      <LanguageToggle adapter={adapter} onLocaleChange={onLocaleChange} />,
    );
  }

  describe('rendering', () => {
    it('renders a native HTML select element after loading', async () => {
      renderToggle();

      const select = await screen.findByRole('combobox');
      expect(select.tagName).toBe('SELECT');
    });

    it('displays all three language options', async () => {
      renderToggle();

      await screen.findByRole('combobox');
      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(3);
    });

    it('displays localized labels for each option', async () => {
      renderToggle();

      await screen.findByRole('combobox');
      expect(screen.getByRole('option', { name: 'Auto (browser)' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'Svenska' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument();
    });

    it('calls getMessage for each option label and the aria-label', async () => {
      renderToggle();

      await screen.findByRole('combobox');
      expect(adapter.getMessage).toHaveBeenCalledWith('languageLabel');
      expect(adapter.getMessage).toHaveBeenCalledWith('languageAuto');
      expect(adapter.getMessage).toHaveBeenCalledWith('languageSv');
      expect(adapter.getMessage).toHaveBeenCalledWith('languageEn');
    });

    it('maps option values to correct locale identifiers', async () => {
      renderToggle();

      await screen.findByRole('combobox');
      const options = screen.getAllByRole('option') as HTMLOptionElement[];
      const values = options.map((opt) => opt.value);
      expect(values).toEqual(['auto', 'sv', 'en']);
    });

    it('shows loading indicator before preference is fetched', () => {
      // Make sendMessage never resolve
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockReturnValue(
        new Promise(() => {}),
      );
      renderToggle();

      expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
      expect(screen.getByText('…')).toBeInTheDocument();
    });
  });

  describe('initial state', () => {
    it('defaults to auto when no preference is stored (null)', async () => {
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: null,
      });
      renderToggle();

      const select = await screen.findByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('auto');
    });

    it('reflects stored Swedish preference', async () => {
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: 'sv',
      });
      renderToggle();

      const select = await screen.findByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('sv');
    });

    it('reflects stored English preference', async () => {
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: 'en',
      });
      renderToggle();

      const select = await screen.findByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('en');
    });

    it('fetches preference via GET_LANGUAGE_PREFERENCE on mount', async () => {
      renderToggle();

      await screen.findByRole('combobox');
      expect(adapter.sendMessage).toHaveBeenCalledWith({
        command: 'GET_LANGUAGE_PREFERENCE',
      });
    });

    it('defaults to auto when sendMessage fails', async () => {
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: false,
        error: 'Storage error',
      });
      renderToggle();

      const select = await screen.findByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('auto');
    });
  });

  describe('persistence', () => {
    it('sends SET_LANGUAGE_PREFERENCE with sv when Svenska is selected', async () => {
      renderToggle();

      const select = await screen.findByRole('combobox');
      fireEvent.change(select, { target: { value: 'sv' } });

      expect(adapter.sendMessage).toHaveBeenCalledWith({
        command: 'SET_LANGUAGE_PREFERENCE',
        locale: 'sv',
      });
    });

    it('sends SET_LANGUAGE_PREFERENCE with en when English is selected', async () => {
      renderToggle();

      const select = await screen.findByRole('combobox');
      fireEvent.change(select, { target: { value: 'en' } });

      expect(adapter.sendMessage).toHaveBeenCalledWith({
        command: 'SET_LANGUAGE_PREFERENCE',
        locale: 'en',
      });
    });

    it('sends SET_LANGUAGE_PREFERENCE with null when Auto is selected', async () => {
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: 'sv',
      });
      renderToggle();

      const select = await screen.findByRole('combobox');
      fireEvent.change(select, { target: { value: 'auto' } });

      expect(adapter.sendMessage).toHaveBeenCalledWith({
        command: 'SET_LANGUAGE_PREFERENCE',
        locale: null,
      });
    });

    it('calls onLocaleChange callback with the new locale', async () => {
      renderToggle();

      const select = await screen.findByRole('combobox');
      fireEvent.change(select, { target: { value: 'en' } });

      expect(onLocaleChange).toHaveBeenCalledWith('en');
    });

    it('calls onLocaleChange with null when Auto is selected', async () => {
      (adapter.sendMessage as ReturnType<typeof vi.fn>).mockResolvedValue({
        success: true,
        data: 'en',
      });
      renderToggle();

      const select = await screen.findByRole('combobox');
      fireEvent.change(select, { target: { value: 'auto' } });

      expect(onLocaleChange).toHaveBeenCalledWith(null);
    });
  });

  describe('accessibility', () => {
    it('uses aria-label from localized languageLabel key', async () => {
      renderToggle();

      const select = await screen.findByRole('combobox');
      expect(select).toHaveAttribute('aria-label', 'Language');
    });

    it('is keyboard navigable via Tab', async () => {
      renderToggle();
      const user = userEvent.setup();

      await screen.findByRole('combobox');
      await user.tab();

      const select = screen.getByRole('combobox');
      expect(select).toHaveFocus();
    });

    it('is a native select element supporting keyboard interaction', async () => {
      renderToggle();

      const select = await screen.findByRole('combobox') as HTMLSelectElement;
      expect(select.tagName).toBe('SELECT');
      expect(select.tabIndex).not.toBe(-1);
    });
  });
});
