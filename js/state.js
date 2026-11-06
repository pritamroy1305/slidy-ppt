/* ==========================================================
   App state, saving and undo

   `state` has the same shape that was always saved in the browser,
   so people's existing slides keep working:
     { cur: <index of the open slide>, look: 'charcoal'|'ember'|'cream',
       slides: [ { fs: <text size>, blocks: [ ...block objects ] } ] }
   ========================================================== */

let state = null;          // everything the user has made
let slashMenu = null;      // the open "/" menu: { i, items, sel }, or null
let dragState = null;      // what is being dragged: { k: 'b' | 's', i: index }
let isViewOnly = false;    // true when the page was opened from a share link

/* ---- Load from this browser (or start with the welcome deck) ---- */

function createWelcomeState() {
  return {
    cur: 0,
    slides: [
      {
        blocks: [
          makeBlock('h1', 'Welcome to Slidey'),
          makeBlock('h3', 'Slides built from simple blocks'),
          makeBlock('callout', 'Select text to make it <b>bold</b>, <i>italic</i> or <mark>highlighted</mark>.')
        ]
      },
      {
        blocks: [
          makeBlock('h2', 'Try these blocks'),
          makeBlock('todo', 'A checklist item'),
          makeBlock('quote', 'A quote worth sharing'),
          makeBlock('toggle', 'Click the arrow to reveal'),
          { id: uid(), type: 'code', html: 'console.log("hello")' },
          { id: uid(), type: 'cols', a: 'Left column', b: 'Right column' }
        ]
      }
    ]
  };
}

try {
  state = JSON.parse(localStorage.getItem('slidey'));
} catch (e) {
  /* Storage blocked or the saved text is damaged: fall back to the welcome deck. */
}
if (!state || !state.slides || !state.slides.length) state = createWelcomeState();

/* Very old saves stored plain text in "text". Convert it to "html". */
state.slides.forEach(slide => slide.blocks.forEach(block => {
  const keepsNoText = ['table', 'divider', 'cols'].includes(block.type);
  if (block.html === undefined && !keepsNoText) {
    block.html = escapeHtml(block.text);
    delete block.text;
  }
}));

state.cur = Math.min(state.cur || 0, state.slides.length - 1);

const currentSlide = () => state.slides[state.cur];

/* ---- Saving ---- */

/* Write everything to this browser. Never runs for a shared (view-only) deck,
   so opening somebody's link cannot overwrite the visitor's own slides. */
function persist() {
  if (isViewOnly) return;
  const savedLabel = $('#saved');
  try {
    localStorage.setItem('slidey', JSON.stringify(state));
    if (savedLabel) savedLabel.textContent = 'Saved ✓';
  } catch (e) {
    if (savedLabel) savedLabel.textContent = 'Not saved (storage blocked)';
  }
}

/* ---- Undo / redo ----
   Snapshots of `state.slides` are kept as JSON text. A snapshot is taken
   450 ms after the last change, so fast typing becomes a single undo step. */

let undoStack = [JSON.stringify(state.slides)];
let undoIndex = 0;
let snapshotTimer = 0;

function takeSnapshot() {
  clearTimeout(snapshotTimer);
  const snapshot = JSON.stringify(state.slides);
  if (snapshot === undoStack[undoIndex]) return;

  undoStack.splice(undoIndex + 1);   // drop any "redo" history
  undoStack.push(snapshot);
  undoIndex++;
  if (undoStack.length > 80) {
    undoStack.shift();
    undoIndex--;
  }
}

/* Call this after every change: saves now, snapshots shortly after. */
function save() {
  persist();
  clearTimeout(snapshotTimer);
  snapshotTimer = setTimeout(takeSnapshot, 450);
}

/* direction: -1 = undo, +1 = redo */
function undo(direction) {
  takeSnapshot();
  const target = undoIndex + direction;
  if (target < 0 || target >= undoStack.length) return;

  undoIndex = target;
  state.slides = JSON.parse(undoStack[undoIndex]);
  state.cur = Math.min(state.cur, state.slides.length - 1);
  persist();
  renderEditor();
}
