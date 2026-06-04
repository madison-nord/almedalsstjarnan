/**
 * Unit tests for locale-messages module.
 *
 * Tests the getLocalizedMessage function which retrieves messages
 * from bundled locale files for runtime locale override.
 *
 * Requirements: 6.5, 6.6, 6.7
 */

import { describe, it, expect } from 'vitest';

import { getLocalizedMessage } from '#core/locale-messages';

describe('getLocalizedMessage', () => {
  describe('basic retrieval', () => {
    it('returns Swedish message for sv locale', () => {
      const result = getLocalizedMessage('popupTitle', 'sv');
      expect(result).toBe('Almedalsstjärnan');
    });

    it('returns English message for en locale', () => {
      const result = getLocalizedMessage('popupTitle', 'en');
      expect(result).toBe('Almedalsstjärnan');
    });

    it('returns empty string for unknown key', () => {
      const result = getLocalizedMessage('nonExistentKey', 'sv');
      expect(result).toBe('');
    });

    it('returns empty string for unknown key in en locale', () => {
      const result = getLocalizedMessage('nonExistentKey', 'en');
      expect(result).toBe('');
    });
  });

  describe('placeholder substitution', () => {
    it('substitutes $1 placeholder in conflictTooltip', () => {
      const result = getLocalizedMessage('conflictTooltip', 'en', ['Event A']);
      expect(result).toBe('Overlaps with: Event A');
    });

    it('substitutes $1 placeholder in Swedish conflictTooltip', () => {
      const result = getLocalizedMessage('conflictTooltip', 'sv', ['Event A']);
      expect(result).toBe('Överlappar med: Event A');
    });

    it('substitutes $1/$2 placeholders in eventCountIndicator', () => {
      const result = getLocalizedMessage('eventCountIndicator', 'en', ['5', '12']);
      expect(result).toBe('5 of 12');
    });

    it('substitutes $1/$2 placeholders in Swedish eventCountIndicator', () => {
      const result = getLocalizedMessage('eventCountIndicator', 'sv', ['5', '12']);
      expect(result).toBe('5 av 12');
    });

    it('handles missing substitution values gracefully', () => {
      const result = getLocalizedMessage('conflictTooltip', 'en', []);
      // $1 remains as-is when no substitution provided
      expect(result).toContain('Overlaps with:');
    });
  });

  describe('language toggle keys', () => {
    it('returns Swedish language label', () => {
      expect(getLocalizedMessage('languageLabel', 'sv')).toBe('Språk');
    });

    it('returns English language label', () => {
      expect(getLocalizedMessage('languageLabel', 'en')).toBe('Language');
    });

    it('returns Swedish auto option', () => {
      expect(getLocalizedMessage('languageAuto', 'sv')).toBe('Auto (webbläsare)');
    });

    it('returns English auto option', () => {
      expect(getLocalizedMessage('languageAuto', 'en')).toBe('Auto (browser)');
    });

    it('returns Svenska option in both locales', () => {
      expect(getLocalizedMessage('languageSv', 'sv')).toBe('Svenska');
      expect(getLocalizedMessage('languageSv', 'en')).toBe('Svenska');
    });

    it('returns English option in both locales', () => {
      expect(getLocalizedMessage('languageEn', 'sv')).toBe('English');
      expect(getLocalizedMessage('languageEn', 'en')).toBe('English');
    });
  });

  describe('locale consistency', () => {
    it('returns different messages for same key in different locales', () => {
      const sv = getLocalizedMessage('exportToCalendar', 'sv');
      const en = getLocalizedMessage('exportToCalendar', 'en');
      expect(sv).not.toBe(en);
      expect(sv).toBe('Exportera till kalender');
      expect(en).toBe('Export to calendar');
    });
  });
});
