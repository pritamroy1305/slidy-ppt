/* ==========================================================
   Small helpers with no knowledge of the rest of the app
   ========================================================== */

/* $('#id') is a short way to say document.querySelector('#id'). */
const $ = selector => document.querySelector(selector);

/* Short random id for blocks, e.g. "k3x9ab". */
const uid = () => Math.random().toString(36).slice(2, 8);

/* Turn plain text into safe HTML (only & and < need escaping inside an element). */
const escapeHtml = text => (text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

/* New empty block. "p" is a plain paragraph. */
const makeBlock = (type = 'p', html = '') => ({ id: uid(), type, html });

/* New 3x3 table block with a header row. */
const makeTable = () => ({
  id: uid(),
  type: 'table',
  rows: [['Header', 'Header', 'Header'], ['', '', ''], ['', '', '']]
});

/* Move the item at index `from` so it ends up at index `to` (changes the array). */
const moveItem = (array, from, to) => array.splice(to, 0, array.splice(from, 1)[0]);

/* Deep copy of a slide or block where every "id" gets a fresh value. */
const cloneWithNewIds = original =>
  JSON.parse(JSON.stringify(original), (key, value) => (key === 'id' ? uid() : value));

/* The visible text of a block's html (used for slide titles in the left list). */
const htmlToText = block => {
  const holder = document.createElement('div');
  holder.innerHTML = block.html || '';
  return holder.textContent;
};
