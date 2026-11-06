/* ==========================================================
   Checking and cleaning a deck before it is saved

   Anyone on the internet can call the share endpoint, so nothing in
   the request is trusted. A brand new deck object is built from
   the input, keeping only known fields, limited sizes and the few
   harmless html tags slides are allowed to contain.

   js/sanitize.js in the website does the same checks when a shared
   deck is opened. Keep the two files in sync if you change one.
   ========================================================== */

export const MAX_BODY_BYTES = 256 * 1024;   // largest request accepted (256 KB)

export const LIMITS = {
  slides: 200,
  blocksPerSlide: 300,
  textLength: 20000,
  tableRows: 100,
  tableCols: 20,
  cellLength: 2000
};

const LOOKS = ['charcoal', 'ember', 'cream'];

const BLOCK_TYPES = [
  'p', 'h1', 'h2', 'h3', 'bullet', 'num', 'todo', 'toggle',
  'quote', 'callout', 'code', 'divider', 'cols', 'table'
];

/* A problem with what the visitor sent. Its message is safe to show them. */
export class ValidationError extends Error {}

/* Matches <b>, </b>, <i>, <strong>, <em>, <mark> and <br> with no attributes. */
const ALLOWED_TAG = /<(\/?)(b|i|strong|em|mark|br)\s*\/?>/gi;

const escapeAngles = text => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Keep the few allowed tags, turn every other < and > into plain text. */
export function sanitizeInlineHtml(value) {
  const text = typeof value === 'string' ? value.slice(0, LIMITS.textLength) : '';
  const pattern = new RegExp(ALLOWED_TAG.source, 'gi');
  let result = '';
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text))) {
    const closing = match[1];
    const tag = match[2].toLowerCase();
    result += escapeAngles(text.slice(lastIndex, match.index));
    result += tag === 'br' ? '<br>' : '<' + closing + tag + '>';
    lastIndex = match.index + match[0].length;
  }
  return result + escapeAngles(text.slice(lastIndex));
}

/* Plain text (code blocks, table cells): only the length is limited. */
const clipText = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');

function normalizeTableRows(rawRows) {
  const rows = Array.isArray(rawRows) ? rawRows.slice(0, LIMITS.tableRows) : [];
  const firstRow = Array.isArray(rows[0]) ? rows[0] : [];
  const width = Math.min(Math.max(firstRow.length, 1), LIMITS.tableCols);

  const clean = rows.map(row => {
    const cells = Array.isArray(row) ? row.slice(0, width) : [];
    while (cells.length < width) cells.push('');
    return cells.map(cell => clipText(cell, LIMITS.cellLength));
  });

  return clean.length ? clean : [Array(width).fill('Header'), Array(width).fill('')];
}

function normalizeBlock(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const type = BLOCK_TYPES.includes(source.type) ? source.type : 'p';

  if (type === 'divider') return { type };
  if (type === 'table') return { type, rows: normalizeTableRows(source.rows) };
  if (type === 'cols') {
    return { type, a: sanitizeInlineHtml(source.a), b: sanitizeInlineHtml(source.b) };
  }

  /* Code blocks hold raw text; every other block holds limited html. */
  const html = type === 'code'
    ? clipText(source.html, LIMITS.textLength)
    : sanitizeInlineHtml(source.html);
  const block = { type, html };

  if (type === 'todo') block.checked = !!source.checked;
  if (type === 'toggle') {
    block.open = !!source.open;
    block.body = sanitizeInlineHtml(source.body);
  }
  return block;
}

function normalizeSlide(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const blocks = Array.isArray(source.blocks)
    ? source.blocks.slice(0, LIMITS.blocksPerSlide).map(normalizeBlock)
    : [];
  if (!blocks.length) blocks.push({ type: 'p', html: '' });

  const slide = { blocks };
  if (typeof source.fs === 'number' && Number.isFinite(source.fs)) {
    slide.fs = Math.round(Math.max(0.6, Math.min(1.8, source.fs)) * 10) / 10;
  }
  return slide;
}

/* Returns the clean deck to store, or throws ValidationError. */
export function normalizeDeck(input) {
  if (!input || typeof input !== 'object' || !Array.isArray(input.slides)) {
    throw new ValidationError('That does not look like a slide deck.');
  }
  if (!input.slides.length) {
    throw new ValidationError('The deck has no slides.');
  }
  if (input.slides.length > LIMITS.slides) {
    throw new ValidationError('A shared deck can have up to ' + LIMITS.slides + ' slides.');
  }

  return {
    look: LOOKS.includes(input.look) ? input.look : 'charcoal',
    slides: input.slides.map(normalizeSlide)
  };
}
