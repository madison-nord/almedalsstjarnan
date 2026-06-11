import { describe, it, expect } from 'vitest';

import {
  extractContentSections,
  CONTENT_SECTION_HEADINGS,
  MAX_DESCRIPTION_LENGTH,
} from '#core/event-normalizer';

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Creates an Event_Card element with a div.env-collapse containing
 * the specified sections. Each section has an h3 heading and paragraph elements.
 */
function buildEventCard(
  sections: ReadonlyArray<{ readonly heading: string; readonly paragraphs: readonly string[] }>,
): HTMLElement {
  const li = document.createElement('li');
  const collapseDiv = document.createElement('div');
  collapseDiv.className = 'env-collapse';

  for (const section of sections) {
    const h3 = document.createElement('h3');
    h3.textContent = section.heading;
    collapseDiv.appendChild(h3);

    for (const text of section.paragraphs) {
      const p = document.createElement('p');
      p.textContent = text;
      collapseDiv.appendChild(p);
    }
  }

  li.appendChild(collapseDiv);
  return li;
}

// ─── Tests ────────────────────────────────────────────────────────

describe('extractContentSections', () => {
  it('Event_Card with all 5 sections produces correct formatted output', () => {
    const card = buildEventCard([
      { heading: 'Beskrivning av samhällsfrågan', paragraphs: ['Samhällsfråga text'] },
      { heading: 'Utökad information om evenemanget', paragraphs: ['Utökad info'] },
      { heading: 'Medverkande', paragraphs: ['Person A', 'Person B'] },
      { heading: 'Evenemangsinformation', paragraphs: ['Evenemangstyp: Samtal'] },
      { heading: 'Arrangörsuppgifter', paragraphs: ['Org AB'] },
    ]);

    const result = extractContentSections(card);

    expect(result).not.toBeNull();
    expect(result).toBe(
      'Beskrivning av samhällsfrågan:\nSamhällsfråga text\n\n' +
        'Utökad information om evenemanget:\nUtökad info\n\n' +
        'Medverkande:\nPerson A\nPerson B\n\n' +
        'Evenemangsinformation:\nEvenemangstyp: Samtal\n\n' +
        'Arrangörsuppgifter:\nOrg AB',
    );
  });

  it('Event_Card with subset of sections produces only those sections', () => {
    const card = buildEventCard([
      { heading: 'Medverkande', paragraphs: ['Anna Svensson'] },
      { heading: 'Arrangörsuppgifter', paragraphs: ['Företag X'] },
    ]);

    const result = extractContentSections(card);

    expect(result).not.toBeNull();
    expect(result).toBe('Medverkande:\nAnna Svensson\n\nArrangörsuppgifter:\nFöretag X');
    // Should NOT contain the other headings
    expect(result).not.toContain('Beskrivning av samhällsfrågan');
    expect(result).not.toContain('Utökad information om evenemanget');
    expect(result).not.toContain('Evenemangsinformation');
  });

  it('Event_Card with no known sections returns null', () => {
    const card = buildEventCard([
      { heading: 'Okänd rubrik', paragraphs: ['Some text'] },
      { heading: 'Another unknown', paragraphs: ['More text'] },
    ]);

    const result = extractContentSections(card);

    expect(result).toBeNull();
  });

  it('whitespace-only paragraphs are excluded', () => {
    const card = buildEventCard([
      {
        heading: 'Beskrivning av samhällsfrågan',
        paragraphs: ['Real content', '   ', '\t\n', 'More content'],
      },
    ]);

    const result = extractContentSections(card);

    expect(result).not.toBeNull();
    expect(result).toBe('Beskrivning av samhällsfrågan:\nReal content\nMore content');
  });

  it('output is trimmed of leading/trailing whitespace', () => {
    // Create card where heading text has whitespace around it
    const li = document.createElement('li');
    const collapseDiv = document.createElement('div');
    collapseDiv.className = 'env-collapse';

    const h3 = document.createElement('h3');
    h3.textContent = '  Medverkande  ';
    collapseDiv.appendChild(h3);

    const p = document.createElement('p');
    p.textContent = '  Speaker Name  ';
    collapseDiv.appendChild(p);

    li.appendChild(collapseDiv);

    const result = extractContentSections(li);

    expect(result).not.toBeNull();
    // The heading text is trimmed by the function, and paragraphs are trimmed
    expect(result).toBe('Medverkande:\nSpeaker Name');
    // No leading/trailing whitespace in final output
    expect(result).toBe(result!.trim());
  });

  it('output longer than 10000 chars is truncated', () => {
    // Create a section with paragraphs that exceed MAX_DESCRIPTION_LENGTH
    const longParagraph = 'A'.repeat(3000);
    const card = buildEventCard([
      {
        heading: 'Beskrivning av samhällsfrågan',
        paragraphs: [longParagraph, longParagraph, longParagraph, longParagraph],
      },
    ]);

    const result = extractContentSections(card);

    expect(result).not.toBeNull();
    expect(result!.length).toBe(MAX_DESCRIPTION_LENGTH);
    expect(result!.length).toBeLessThanOrEqual(10000);
  });

  it('paragraphs within a section are joined with \\n', () => {
    const card = buildEventCard([
      {
        heading: 'Utökad information om evenemanget',
        paragraphs: ['First paragraph', 'Second paragraph', 'Third paragraph'],
      },
    ]);

    const result = extractContentSections(card);

    expect(result).not.toBeNull();
    expect(result).toBe(
      'Utökad information om evenemanget:\nFirst paragraph\nSecond paragraph\nThird paragraph',
    );
    // Verify paragraphs are joined with single \n (not \n\n)
    expect(result).not.toContain('First paragraph\n\nSecond paragraph');
  });

  it('returns null when element has no div.env-collapse', () => {
    const li = document.createElement('li');
    li.innerHTML = '<div class="some-other-class"><h3>Medverkande</h3><p>Text</p></div>';

    const result = extractContentSections(li);

    expect(result).toBeNull();
  });

  it('sections with only whitespace paragraphs are not included', () => {
    const card = buildEventCard([
      { heading: 'Medverkande', paragraphs: ['   ', '\t', ''] },
      { heading: 'Arrangörsuppgifter', paragraphs: ['Real content'] },
    ]);

    const result = extractContentSections(card);

    expect(result).not.toBeNull();
    // Medverkande has no valid paragraphs so it should be excluded
    expect(result).not.toContain('Medverkande');
    expect(result).toBe('Arrangörsuppgifter:\nReal content');
  });

  it('known headings constant contains all 5 expected headings', () => {
    expect(CONTENT_SECTION_HEADINGS).toHaveLength(5);
    expect(CONTENT_SECTION_HEADINGS).toContain('Beskrivning av samhällsfrågan');
    expect(CONTENT_SECTION_HEADINGS).toContain('Utökad information om evenemanget');
    expect(CONTENT_SECTION_HEADINGS).toContain('Medverkande');
    expect(CONTENT_SECTION_HEADINGS).toContain('Evenemangsinformation');
    expect(CONTENT_SECTION_HEADINGS).toContain('Arrangörsuppgifter');
  });
});
