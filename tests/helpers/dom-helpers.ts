/**
 * DOM test helpers for creating mock event cards and loading fixtures.
 *
 * The mock event card structure matches the REAL almedalsveckan.info DOM
 * as captured in fixtures/almedalsveckan-program-2026.html.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Types ────────────────────────────────────────────────────────

export interface MockEventCardOverrides {
  /** The li element id, e.g. "item_4_3fcad20519d04843eac183c" */
  readonly liId?: string;
  /** The inner div id, e.g. "item4_3fcad20519d04843eac183c" */
  readonly divId?: string;
  /** Event title */
  readonly title?: string;
  /** Time text, e.g. "Måndag 07.30 – 08.30" */
  readonly timeText?: string;
  /** Primary topic */
  readonly primaryTopic?: string;
  /** Secondary topic (null to omit) */
  readonly secondaryTopic?: string | null;
  /** Organiser name */
  readonly organiser?: string;
  /** Location text (null for "Plats meddelas senare") */
  readonly location?: string | null;
  /** Event description */
  readonly description?: string;
  /** Event ID number (used in URLs) */
  readonly eventId?: string;
  /** ICS data URI (null to omit the calendar link) */
  readonly icsDataUri?: string | null;
  /** Detail URL path */
  readonly detailUrl?: string;
  /** Main color CSS variable */
  readonly mainColor?: string;
  /** Whether to include the expand/collapse sections */
  readonly includeDetails?: boolean;
}

// ─── Defaults ─────────────────────────────────────────────────────

const DEFAULTS: Required<MockEventCardOverrides> = {
  liId: 'item_4_3fcad20519d04843eac183c',
  divId: 'item4_3fcad20519d04843eac183c',
  title: 'Tillräcklighet krävs för att klara klimatkrisen',
  timeText: 'Måndag 07.30 – 08.30',
  primaryTopic: 'Hållbarhet',
  secondaryTopic: 'Ekonomi',
  organiser: 'Den gröna tankesmedjan Cogito',
  location: 'Holmen 1',
  description: 'Efter en kort inledning bjuder vi in till ett samtal ombord på båten Vagabonde. Varmt välkommen!',
  eventId: '8363',
  icsDataUri: buildDefaultIcsDataUri(),
  detailUrl: '/rg/almedalsveckan/evenemang-almedalsveckan/2026/8363',
  mainColor: '#F8651F',
  includeDetails: true,
};

function buildDefaultIcsDataUri(): string {
  return 'data:text/calendar;charset=utf8,BEGIN:VCALENDAR%0AVERSION:2.0%0ABEGIN:VEVENT%0AURL:https://almedalsveckan.info/rg/almedalsveckan/evenemang-almedalsveckan/2026/8363%0ADTSTART:20260622T073000%0ADTEND:20260622T083000%0ASUMMARY:Tillr%C3%A4cklighet%20kr%C3%A4vs%20f%C3%B6r%20att%20klara%20klimatkrisen%0ADESCRIPTION:Efter%20en%20kort%20inledning%20bjuder%20vi%20in%20till%20ett%20samtal%20ombord%20p%C3%A5%20b%C3%A5ten%20Vagabonde.%20Varmt%20v%C3%A4lkommen!%0ALOCATION:Holmen%201%0AEND:VEVENT%0AEND:VCALENDAR';
}

// ─── Mock Event Card Builder ──────────────────────────────────────

/**
 * Creates a DOM element matching the real almedalsveckan.info event card structure.
 *
 * Structure:
 * <li id="item_4_...">
 *   <div id="item4_..." class="event-information item-eosqj">
 *     <div class="event-information-inner item-eosqj">
 *       <div class="col-reverse item-eosqj">
 *         <a class="title env-button env-button--link item-eosqj" ...>
 *           <h2 class="item-eosqj">Title</h2>
 *         </a>
 *         <div class="time item-eosqj">
 *           <i class="bi bi-calendar-event item-eosqj"></i>
 *           <span class="item-eosqj">Time text</span>
 *         </div>
 *       </div>
 *       <div class="topic-buttons item-eosqj">...</div>
 *       <div class="organizer-buttons item-eosqj">...</div>
 *       <div class="location-div item-eosqj">...</div>
 *       <div id="collapse-..." class="env-collapse">
 *         ... functions, description, event info ...
 *       </div>
 *       <div class="expand item-eosqj">...</div>
 *     </div>
 *   </div>
 * </li>
 */
export function createMockEventCard(overrides?: MockEventCardOverrides): HTMLLIElement {
  const opts = { ...DEFAULTS, ...overrides };
  const collapseId = `collapse-${opts.liId.replace('item_', '')}`;
  const shareId = `share-${opts.liId.replace('item_', '')}`;

  const li = document.createElement('li');
  li.id = opts.liId;

  // Build topic buttons HTML
  let topicButtonsHtml = `
    <i class="bi bi-tags item-eosqj"></i>
    <button class="filter-button item-eosqj">
      <span class="sr-only item-eosqj">Ämne:</span>
      ${opts.primaryTopic}${opts.secondaryTopic ? ',' : ''} <span class="sr-only item-eosqj">Visa alla evenemang med detta ämne</span>
    </button>`;

  if (opts.secondaryTopic) {
    topicButtonsHtml += `
    <button class="filter-button item-eosqj">
      <span class="sr-only item-eosqj">Sekundärt ämne:</span>
      ${opts.secondaryTopic} <span class="sr-only item-eosqj">Visa alla evenemang med detta ämne</span>
    </button>`;
  }

  // Build location HTML
  let locationHtml: string;
  if (opts.location) {
    locationHtml = `
      <div class="location-div item-eosqj">
        <button class="filter-button item-eosqj">
          <i class="bi bi-house-check item-eosqj"></i>
          <span class="sr-only item-eosqj">Plats:</span>
          ${opts.location} <span class="sr-only item-eosqj">Visa alla evenemang på denna plats</span>
        </button>
      </div>`;
  } else {
    locationHtml = `
      <div class="location-div item-eosqj">
        <p class="item-eosqj">
          <i class="bi bi-house-check item-eosqj"></i>
          Plats meddelas senare
        </p>
      </div>`;
  }

  // Build ICS link HTML
  let icsLinkHtml = '';
  if (opts.icsDataUri) {
    icsLinkHtml = `
      <a class="env-button env-button--link item-eosqj" download="${opts.title}" href="${opts.icsDataUri}">
        <i class="bi bi-calendar-plus item-eosqj"></i>
        Exportera till kalender
      </a>`;
  }

  // Build details section
  let detailsHtml = '';
  if (opts.includeDetails) {
    detailsHtml = `
      <div id="${collapseId}" class="env-collapse">
        <div class="functions item-eosqj">
          <a class="env-button env-button--link item-eosqj" aria-controls="map-${opts.liId.replace('item_', '')}" aria-expanded="false" data-env-collapse href="#map-${opts.liId.replace('item_', '')}" role="button">
            <i class="bi bi-geo-alt item-eosqj"></i>
            <span class="sr-only item-eosqj">Visa </span>
            Karta
          </a>
          <a class="env-button env-button--link item-eosqj" aria-controls="${shareId}" aria-expanded="false" data-env-collapse href="#${shareId}" role="button">
            <i class="bi bi-share item-eosqj"></i>
            Dela <span class="sr-only item-eosqj">evenemanget</span>
          </a>
          ${icsLinkHtml}
          <a class="env-button env-button--link item-eosqj" href="${opts.detailUrl}?print=true">
            <i class="bi bi-printer item-eosqj"></i>
            Skriv ut <span class="sr-only item-eosqj">evenemanget</span>
          </a>
        </div>
        <div id="${shareId}" class="share env-collapse item-eosqj">
          <h2 class="item-eosqj">Dela evenemanget</h2>
        </div>
        <h3 class="item-eosqj">Beskrivning av samhällsfrågan</h3>
        <p class="item-eosqj">Samhällsfrågebeskrivning</p>
        <h3 class="item-eosqj">Utökad information om evenemanget</h3>
        <p class="description item-eosqj">${opts.description}</p>
        <h3 class="item-eosqj">Evenemangsinformation</h3>
        <p class="item-eosqj">
          <strong>Evenemangstyp:</strong>
          Samtal
        </p>
        <p class="item-eosqj">
          <strong>Evenemangs-ID:</strong>
          ${opts.eventId}
        </p>
        <p class="item-eosqj">
          <strong>Språk:</strong>
          Svenska
        </p>
      </div>`;
  }

  li.innerHTML = `
    <div id="${opts.divId}" class="event-information   item-eosqj" style="--sol-main-color: ${opts.mainColor}; --sol-item-color: ${opts.mainColor}4D; --sol-item-color-secondary: #FFEDE5;">
      <div class="event-information-inner item-eosqj">
        <div class="col-reverse item-eosqj">
          <a class="title env-button env-button--link item-eosqj" aria-controls="${collapseId}" aria-expanded="false" data-env-collapse href="#${collapseId}" role="button">
            <h2 class="item-eosqj">${opts.title}</h2>
          </a>
          <div class="time item-eosqj">
            <i class="bi bi-calendar-event item-eosqj"></i>
            <span class="item-eosqj">${opts.timeText}</span>
          </div>
        </div>
        <div class="topic-buttons item-eosqj">
          ${topicButtonsHtml}
        </div>
        <div class="organizer-buttons item-eosqj">
          <i class="bi bi-buildings item-eosqj"></i>
          <button class="filter-button item-eosqj">
            <span class="sr-only item-eosqj">Arrangör:</span>
            ${opts.organiser} <span class="sr-only item-eosqj">Visa alla evenemang från denna arrangör</span>
          </button>
        </div>
        ${locationHtml}
        ${detailsHtml}
        <div class="expand item-eosqj">
          <a class="env-button env-button--link item-eosqj" aria-controls="${collapseId}" aria-expanded="false" data-env-collapse href="#${collapseId}" role="button">
            <span class="sr-only item-eosqj">Visa mer information</span>
            <i class="bi bi-chevron-down item-eosqj"></i>
          </a>
        </div>
      </div>
    </div>`;

  return li;
}

// ─── Fixture Loader ───────────────────────────────────────────────

/**
 * Reads and parses the real almedalsveckan.info fixture HTML.
 * Returns a parsed Document that can be queried with standard DOM APIs.
 */
export function loadFixture(): Document {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const fixturePath = resolve(currentDir, '../../fixtures/almedalsveckan-program-2026.html');
  const html = readFileSync(fixturePath, 'utf-8');
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}
