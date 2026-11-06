/* ==========================================================
   Bold / italic / highlight on selected text, and the small
   floating toolbar that appears when text is selected
   ========================================================== */

/* command: 'b' = bold, 'i' = italic, 'h' = highlight (toggles a <mark>) */
function applyFormat(command) {
  const selection = getSelection();
  if (!selection.rangeCount) return;

  const node = selection.anchorNode;
  const element = node.nodeType === 1 ? node : node.parentElement;
  const textElement = element.closest('.txt');

  if (command === 'b') {
    document.execCommand('bold');
  } else if (command === 'i') {
    document.execCommand('italic');
  } else {
    const range = selection.getRangeAt(0);
    const existingMark = element.closest('mark');

    if (existingMark) {
      existingMark.replaceWith(...existingMark.childNodes);   // remove highlight
    } else if (!range.collapsed) {
      const highlight = document.createElement('mark');
      highlight.appendChild(range.extractContents());
      range.insertNode(highlight);
    }
    if (textElement) textElement.dispatchEvent(new Event('input'));   // so the change is saved
  }
}

const formatToolbar = $('#fmt');

/* mousedown would clear the text selection, so stop it. */
formatToolbar.onmousedown = event => event.preventDefault();
formatToolbar.onclick = event => {
  const button = event.target.closest('button');
  if (button) applyFormat(button.dataset.c);
};

/* Show the toolbar above the selection (below it on touch screens or near the top). */
document.addEventListener('selectionchange', () => {
  const selection = getSelection();

  if (!selection.rangeCount || selection.isCollapsed) {
    formatToolbar.classList.remove('on');
    return;
  }

  const node = selection.anchorNode;
  const element = node && (node.nodeType === 1 ? node : node.parentElement);
  const textElement = element && element.closest('.txt');

  /* Only for editable slide text, never inside code blocks. */
  if (!textElement || !textElement.isContentEditable || textElement.closest('.code')) {
    formatToolbar.classList.remove('on');
    return;
  }

  const rect = selection.getRangeAt(0).getBoundingClientRect();
  const isTouch = matchMedia('(hover:none)').matches;

  formatToolbar.classList.add('on');
  formatToolbar.style.left = Math.max(8, Math.min(rect.left, innerWidth - 130)) + 'px';
  formatToolbar.style.top = (
    isTouch ? rect.bottom + 30 :
    rect.top > 56 ? rect.top - 46 :
    rect.bottom + 10
  ) + 'px';
});
