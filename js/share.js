/* ==========================================================
   Sharing: turn the current slides into a link anyone can open

   Share button -> POST the slides to the backend -> get a short id
   back -> show a link like  https://your-site/?p=x7Kq2mPa
   ========================================================== */

const shareDialog = $('#share');
const shareCard = $('#share-card');
const shareMessage = $('#share-msg');
const shareLinkInput = $('#share-link');
const shareCopyButton = $('#share-copy');

function openShareDialog() {
  shareDialog.classList.add('on');
}

function closeShareDialog() {
  shareDialog.classList.remove('on');
}

/* Show a message, and the link row only when there is a link. */
function showShareState(message, link) {
  shareMessage.textContent = message;
  shareLinkInput.value = link || '';
  shareCard.classList.toggle('ready', !!link);
  shareCopyButton.textContent = 'Copy';
}

/* The link people open: this same page with ?p=<id> on the end. */
function buildShareUrl(id) {
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('p', id);
  return url.toString();
}

/* Save the slides on the backend and return the share link. */
async function createShareLink() {
  let response;
  try {
    response = await fetch(API_BASE + '/api/decks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ look: state.look || 'charcoal', slides: state.slides })
    });
  } catch (error) {
    throw new Error('Could not reach the sharing server. Check your connection and try again.');
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.id) {
    throw new Error(data.error || 'Sharing is not available right now.');
  }
  return buildShareUrl(data.id);
}

$('#share-btn').onclick = async () => {
  openShareDialog();
  showShareState('Creating your link…');
  try {
    const link = await createShareLink();
    showShareState('Your link is ready.', link);
    shareLinkInput.select();
  } catch (error) {
    showShareState(error.message);
  }
};

shareCopyButton.onclick = async () => {
  try {
    await navigator.clipboard.writeText(shareLinkInput.value);
  } catch (error) {
    shareLinkInput.select();            // older browsers: select it and use the old copy command
    document.execCommand('copy');
  }
  shareCopyButton.textContent = 'Copied ✓';
  setTimeout(() => shareCopyButton.textContent = 'Copy', 1500);
};

$('#share-close').onclick = closeShareDialog;

/* Click outside the card or press Esc to close. */
shareDialog.onclick = event => {
  if (event.target === shareDialog) closeShareDialog();
};
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && shareDialog.classList.contains('on')) closeShareDialog();
});
