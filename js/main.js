/* ==========================================================
   Start-up: colour look, home page vs editor, share links
   (this file runs last, once everything else is defined)
   ========================================================== */

/* ---- Colour look (Charcoal / Ember / Cream) ---- */

const lookSelect = $('#look');

function applyLook() {
  document.documentElement.dataset.look = state.look || 'charcoal';
  lookSelect.value = state.look || 'charcoal';
}

lookSelect.onchange = () => {
  state.look = lookSelect.value;
  persist();
  applyLook();
};
applyLook();

/* ---- Home page and editor ---- */

function setView(view) {
  document.body.dataset.view = view;          // 'home' or 'app' (CSS shows one of them)
  if (view === 'app') renderEditor();
}

$('#use').onclick = () => setView('app');

if (!DIRECT) $('#logo').onclick = () => setView('home');
else $('#logo').style.cursor = 'default';

/* ---- Decide what to show first ---- */

const shareLink = readShareLink();

if (shareLink.present) {
  openSharedDeck(shareLink.id);                // somebody opened a share link
} else {
  setView(DIRECT || location.hash === '#app' ? 'app' : 'home');
}
