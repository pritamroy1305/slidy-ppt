/* ==========================================================
   Opening a share link

   https://your-site/?p=<id> loads the slides from the backend and
   starts presenting right away. No editor, no sign up. Nothing is
   written to the visitor's own saved slides (see persist() in state.js).
   ========================================================== */

/* Returns { present: false } for a normal visit, or { present: true, id } for a share link.
   `id` is null when the link is malformed. */
function readShareLink() {
  const params = new URLSearchParams(location.search);
  if (!params.has('p')) return { present: false, id: null };

  const id = params.get('p');
  return { present: true, id: /^[A-Za-z0-9]{6,16}$/.test(id) ? id : null };
}

async function fetchSharedDeck(id) {
  let response;
  try {
    response = await fetch(API_BASE + '/api/decks/' + id);
  } catch (error) {
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  if (response.status === 404) throw new Error('This link is not valid, or the slides have expired.');
  if (!response.ok) throw new Error('These slides could not be loaded. Please try again.');

  /* Never trust a shared deck: rebuild it through the safety checks first. */
  return normalizeSharedDeck(await response.json());
}

function showViewerMessage(message, isError) {
  $('#viewer-msg').textContent = message;
  $('#viewer').classList.toggle('error', !!isError);
}

async function openSharedDeck(id) {
  isViewOnly = true;
  document.body.dataset.view = 'viewer';

  if (!id) {
    showViewerMessage('This link is not valid.', true);
    return;
  }

  try {
    state = await fetchSharedDeck(id);
    applyLook();
    startPresentation();
  } catch (error) {
    showViewerMessage(error.message, true);
  }
}
