/* ==========================================================
   The floating menu: the "/" block picker and the small
   option menus (⋮⋮ on a block, ⋯ on a slide)
   ========================================================== */

/* Position the menu next to `rect`, keeping it inside the window. */
function placeMenu(rect) {
  const menu = $('#menu');
  menu.classList.add('on');
  menu.style.left = Math.max(8, Math.min(rect.left, innerWidth - 240)) + 'px';
  menu.style.top = Math.max(8, Math.min(rect.bottom + 4, innerHeight - 300)) + 'px';
}

/* The "/" menu. `query` is what was typed after the slash and filters the list. */
function openSlashMenu(blockIndex, element, query) {
  const items = BLOCK_TYPES.filter(entry => entry[1].toLowerCase().includes(query));
  if (!items.length) {
    closeMenu();
    return;
  }

  slashMenu = { i: blockIndex, items, sel: 0 };
  const menu = $('#menu');
  menu.innerHTML = '';

  items.forEach((entry, position) => {
    const row = document.createElement('div');
    row.className = 'mi' + (position ? '' : ' on');
    row.innerHTML = '<b>' + entry[1] + '</b><span>' + entry[2] + '</span>';
    row.onmousedown = event => event.preventDefault();   // keep the cursor in the text
    row.onclick = () => pickBlockType(entry[0]);
    menu.appendChild(row);
  });

  placeMenu(element.getBoundingClientRect());
}

/* A simple menu. `items` is a list of [label, action]; `after` runs once an action has run. */
function popMenu(rect, items, after) {
  closeMenu();
  const menu = $('#menu');
  menu.innerHTML = '';

  items.forEach(([label, action]) => {
    const row = document.createElement('div');
    row.className = 'mi';
    row.textContent = label;
    row.onmousedown = event => event.preventDefault();
    row.onclick = () => {
      closeMenu();
      action();
      after();
    };
    menu.appendChild(row);
  });

  placeMenu(rect);
}

function closeMenu() {
  slashMenu = null;
  $('#menu').classList.remove('on');
}

/* Clicking anywhere else closes the menu. */
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('#menu,.hd,.th button')) closeMenu();
});

/* Turn the block that holds the "/" into the chosen type. */
function pickBlockType(type) {
  const blocks = currentSlide().blocks;
  const index = slashMenu.i;
  closeMenu();

  /* Tables, columns and dividers replace the block; the others just change its type. */
  const replacement =
    type === 'table' ? makeTable() :
    type === 'cols' ? { id: uid(), type: 'cols', a: '', b: '' } :
    type === 'divider' ? { id: uid(), type: 'divider' } :
    null;

  if (replacement) {
    blocks[index] = replacement;
    if (index === blocks.length - 1) blocks.push(makeBlock());   // keep an empty block to type in
  } else {
    blocks[index].type = type;
    blocks[index].html = '';
  }

  save();
  renderEditor();
  focusBlock(replacement ? index + 1 : index);
}
