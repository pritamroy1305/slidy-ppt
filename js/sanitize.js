/* ==========================================================
   Safety checks for slides that arrive from a share link.

   A shared deck was written by somebody else, so it must never be
   trusted. Text is only allowed to contain a few harmless tags
   (bold, italic, highlight, line break). Everything else is turned
   into plain text, and the deck's structure is rebuilt from scratch.

   The Worker (worker/deck.js) runs the same checks before saving.
   Keep the two files in sync if you change one.
   ========================================================== */

const SHARE_LIMITS = {
  slides: 200,
  blocksPerSlide: 300,
  textLength: 20000,
  tableRows: 100,
  tableCols: 20,
  cellLength: 2000
};

const VALID_BLOCK_TYPES = BLOCK_TYPES.map(entry => entry[0]);

/* Matches <b>, </b>, <i>, <strong>, <em>, <mark> and <br> with no attributes. */
const ALLOWED_TAG = /<(\/?)(b|i|strong|em|mark|br)\s*\/?>/gi;

const escapeAngles = text => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Keep the few allowed tags, turn every other < and > into plain text. */
function sanitizeInlineHtml(value) {
  const text = typeof value === 'string' ? value.slice(0, SHARE_LIMITS.textLength) : '';
  let result = '';
  let lastIndex = 0;
  let match;

  ALLOWED_TAG.lastIndex = 0;
  while ((match = ALLOWED_TAG.exec(text))) {
    const closing = match[1];
    const tag = match[2].toLowerCase();
    result += escapeAngles(text.slice(lastIndex, match.index));
    result += tag === 'br' ? '<br>' : '<' + closing + tag + '>';
    lastIndex = match.index + match[0].length;
  }
  return result + escapeAngles(text.slice(lastIndex));
}

/* Plain text (used for code blocks and table cells), just length-limited. */
const clipText = (value, max) => (typeof value === 'string' ? value.slice(0, max) : '');

function normalizeTableRows(rawRows) {
  const rows = Array.isArray(rawRows) ? rawRows.slice(0, SHARE_LIMITS.tableRows) : [];
  const firstRow = Array.isArray(rows[0]) ? rows[0] : [];
  const width = Math.min(Math.max(firstRow.length, 1), SHARE_LIMITS.tableCols);
  const clean = rows.map(row => {
    const cells = Array.isArray(row) ? row.slice(0, width) : [];
    while (cells.length < width) cells.push('');
    return cells.map(cell => clipText(cell, SHARE_LIMITS.cellLength));
  });
  return clean.length ? clean : [Array(width).fill('Header'), Array(width).fill('')];
}

function normalizeBlock(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const type = VALID_BLOCK_TYPES.includes(source.type) ? source.type : 'p';

  if (type === 'divider') return { id: uid(), type };
  if (type === 'table') return { id: uid(), type, rows: normalizeTableRows(source.rows) };
  if (type === 'cols') {
    return { id: uid(), type, a: sanitizeInlineHtml(source.a), b: sanitizeInlineHtml(source.b) };
  }

  /* Code blocks hold raw text; every other block holds limited html. */
  const html = type === 'code'
    ? clipText(source.html, SHARE_LIMITS.textLength)
    : sanitizeInlineHtml(source.html);
  const block = { id: uid(), type, html };

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
    ? source.blocks.slice(0, SHARE_LIMITS.blocksPerSlide).map(normalizeBlock)
    : [];
  if (!blocks.length) blocks.push(makeBlock());

  const slide = { blocks };
  if (typeof source.fs === 'number' && isFinite(source.fs)) {
    slide.fs = Math.round(Math.max(0.6, Math.min(1.8, source.fs)) * 10) / 10;
  }
  return slide;
}

/* Turn whatever the server sent into a deck the app can safely show. */
function normalizeSharedDeck(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.slides) || !raw.slides.length) {
    throw new Error('These slides could not be read.');
  }
  return {
    cur: 0,
    look: LOOKS.includes(raw.look) ? raw.look : 'charcoal',
    slides: raw.slides.slice(0, SHARE_LIMITS.slides).map(normalizeSlide)
  };
}
