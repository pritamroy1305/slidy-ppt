/* ==========================================================
   Building the blocks of a slide

   A slide is a list of blocks. The same code draws them in the editor
   (editable = true) and in present mode (editable = false).
   ========================================================== */

/* ---- One piece of text inside a block ----
   block:       the block's data object
   key:         which field to show: 'html' (main text), 'body' (toggle), 'a' / 'b' (columns)
   editable:    true in the editor, false when presenting
   index:       the block's position in the slide
   placeholder: grey hint shown while empty                                        */
function createTextElement(block, key, editable, index, placeholder) {
  const element = document.createElement('div');
  const isCode = block.type === 'code';
  element.className = 'txt';

  /* Code is plain text; everything else may contain bold / italic / highlight. */
  if (isCode) element.textContent = block[key] || '';
  else element.innerHTML = block[key] || '';

  if (!editable) return element;

  element.contentEditable = 'true';
  element.dataset.ph = placeholder;
  const isMainText = key === 'html';

  /* Paste as plain text only. */
  element.onpaste = event => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text/plain').replace(/\n/g, isCode ? '\n' : ' ');
    document.execCommand('insertText', false, pasted);
  };

  element.oninput = () => {
    /* Typing "# ", "- ", "1. ", "[] " or "> " in an empty paragraph changes the block type. */
    if (isMainText && block.type === 'p') {
      const shortcut = element.textContent.match(SHORTCUT_PATTERN);
      if (shortcut) {
        block.type = SHORTCUT_TO_TYPE[shortcut[1]];
        block.html = '';
        save();
        renderEditor();
        focusBlock(index);
        return;
      }
    }

    block[key] = isCode ? element.textContent : element.innerHTML;
    save();
    renderSlideList();

    /* Typing "/" at the start of a paragraph opens the block menu. */
    if (isMainText && block.type === 'p' && element.textContent[0] === '/') {
      openSlashMenu(index, element, element.textContent.slice(1).toLowerCase());
    } else if (slashMenu) {
      closeMenu();
    }
  };

  element.onkeydown = event => {
    const blocks = currentSlide().blocks;
    const pressed = event.key;

    /* While the "/" menu is open on this block, the keyboard drives the menu. */
    if (slashMenu && slashMenu.i === index && isMainText) {
      if (pressed === 'ArrowDown' || pressed === 'ArrowUp') {
        event.preventDefault();
        const step = pressed === 'ArrowDown' ? 1 : -1;
        slashMenu.sel = (slashMenu.sel + step + slashMenu.items.length) % slashMenu.items.length;
        [...$('#menu').children].forEach((item, position) => {
          item.classList.toggle('on', position === slashMenu.sel);
        });
        return;
      }
      if (pressed === 'Enter') {
        event.preventDefault();
        pickBlockType(slashMenu.items[slashMenu.sel][0]);
        return;
      }
      if (pressed === 'Escape') {
        closeMenu();
        return;
      }
    }

    /* Ctrl/Cmd shortcuts: B, I, H format text; Ctrl+Enter leaves a code block. */
    if ((event.ctrlKey || event.metaKey) && !event.altKey) {
      const letter = pressed.toLowerCase();
      if ('bih'.includes(letter) && letter.length === 1) {
        event.preventDefault();
        applyFormat(letter);
      } else if (letter === 'enter' && isCode) {
        event.preventDefault();
        blocks.splice(index + 1, 0, makeBlock());
        save();
        renderEditor();
        focusBlock(index + 1);
      }
      return;
    }

    if (pressed === 'Enter' && !event.shiftKey) {
      event.preventDefault();

      if (isCode) {                       // new line inside the code block
        document.execCommand('insertText', false, '\n');
        return;
      }
      if (!isMainText) {                  // new line inside a toggle body or a column
        document.execCommand('insertLineBreak');
        return;
      }

      /* Enter in a list continues the list; Enter on an empty list item ends it. */
      const isList = ['bullet', 'num', 'todo'].includes(block.type);
      let focusIndex = index + 1;
      if (isList && !element.textContent) {
        block.type = 'p';
        focusIndex = index;
      } else {
        blocks.splice(index + 1, 0, makeBlock(isList ? block.type : 'p'));
      }
      save();
      renderEditor();
      focusBlock(focusIndex);

    } else if (pressed === 'Backspace' && isMainText && !element.textContent) {
      event.preventDefault();

      if (block.type !== 'p') {           // first Backspace turns the block back into text
        block.type = 'p';
        save();
        renderEditor();
        focusBlock(index);
      } else if (blocks.length > 1) {     // then it deletes the empty block
        blocks.splice(index, 1);
        save();
        renderEditor();
        focusBlock(Math.max(0, index - 1));
      }
    }
  };

  return element;
}

/* ---- A table block ---- */
function appendTable(container, block, editable) {
  const table = document.createElement('table');

  block.rows.forEach((row, rowIndex) => {
    const tableRow = table.insertRow();
    row.forEach((cellText, colIndex) => {
      const cell = document.createElement(rowIndex ? 'td' : 'th');   // first row is the header
      cell.textContent = cellText;
      if (editable) {
        cell.contentEditable = 'true';
        cell.oninput = () => {
          block.rows[rowIndex][colIndex] = cell.textContent;
          save();
        };
      }
      tableRow.appendChild(cell);
    });
  });

  const scroller = document.createElement('div');
  scroller.className = 'tw';
  scroller.appendChild(table);
  container.appendChild(scroller);

  if (!editable) return;

  /* The "+ Row / + Col / − Row / − Col" buttons that show on hover. */
  const bar = document.createElement('div');
  bar.className = 'tbar';
  const actions = [
    ['+ Row', () => block.rows.push(block.rows[0].map(() => ''))],
    ['+ Col', () => block.rows.forEach(row => row.push(''))],
    ['− Row', () => block.rows.length > 2 && block.rows.pop()],
    ['− Col', () => block.rows[0].length > 1 && block.rows.forEach(row => row.pop())]
  ];
  actions.forEach(([label, run]) => {
    const button = document.createElement('button');
    button.textContent = label;
    button.onclick = () => {
      run();
      save();
      renderEditor();
    };
    bar.appendChild(button);
  });
  container.appendChild(bar);
}

/* ---- The ⋮⋮ handle: drag to move a block, tap for a menu ---- */
function appendBlockHandle(container, block, index) {
  const handle = document.createElement('button');
  handle.className = 'hd';
  handle.textContent = '⋮⋮';
  handle.draggable = true;
  handle.title = 'Drag to move · tap for options';

  handle.ondragstart = event => {
    dragState = { k: 'b', i: index };
    event.dataTransfer.setData('text/plain', 'b');
    event.dataTransfer.setDragImage(container, 10, 10);
  };

  handle.onclick = () => {
    const blocks = currentSlide().blocks;
    popMenu(handle.getBoundingClientRect(), [
      ['↑ Move up', () => index && moveItem(blocks, index, index - 1)],
      ['↓ Move down', () => moveItem(blocks, index, Math.min(index + 1, blocks.length - 1))],
      ['⧉ Duplicate', () => blocks.splice(index + 1, 0, cloneWithNewIds(block))],
      ['🗑 Delete', () => {
        blocks.splice(index, 1);
        if (!blocks.length) blocks.push(makeBlock());
      }]
    ], () => {
      save();
      renderEditor();
    });
  };

  /* Dropping another block on this one moves it here. */
  container.ondragover = event => {
    if (dragState && dragState.k === 'b') event.preventDefault();
  };
  container.ondrop = event => {
    if (dragState && dragState.k === 'b') {
      event.preventDefault();
      moveItem(currentSlide().blocks, dragState.i, index);
      dragState = null;
      save();
      renderEditor();
    }
  };

  container.appendChild(handle);
}

/* ---- One block, whatever its type ---- */
function createBlockElement(block, editable, index) {
  const container = document.createElement('div');
  const type = block.type;
  container.className = 'block ' + type + (block.checked ? ' done' : '') + (block.open ? ' open' : '');

  if (type === 'table') {
    appendTable(container, block, editable);

  } else if (type === 'divider') {
    container.appendChild(document.createElement('hr'));

  } else if (type === 'cols') {
    const wrapper = document.createElement('div');
    wrapper.className = 'colsw';
    [['a', 'Left column'], ['b', 'Right column']].forEach(([key, placeholder]) => {
      wrapper.appendChild(createTextElement(block, key, editable, index, placeholder));
    });
    container.appendChild(wrapper);

  } else {
    if (type === 'todo') {
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = !!block.checked;
      checkbox.onclick = event => event.stopPropagation();
      checkbox.onchange = () => {
        block.checked = checkbox.checked;
        container.classList.toggle('done', checkbox.checked);
        save();
      };
      container.appendChild(checkbox);
    }

    if (type === 'toggle') {
      const arrow = document.createElement('button');
      arrow.className = 'arr';
      arrow.textContent = '▸';
      arrow.onclick = event => {
        event.stopPropagation();
        block.open = !block.open;
        container.classList.toggle('open', block.open);
        save();
      };
      container.appendChild(arrow);
    }

    if (type === 'callout') {
      const icon = document.createElement('span');
      icon.className = 'ico';
      icon.textContent = '💡';
      container.appendChild(icon);
    }

    container.appendChild(createTextElement(block, 'html', editable, index, PLACEHOLDERS[type]));

    if (type === 'toggle') {
      const body = createTextElement(block, 'body', editable, index, 'Hidden content…');
      body.classList.add('body');
      container.appendChild(body);
    }
  }

  if (editable) appendBlockHandle(container, block, index);
  return container;
}

/* ---- Draw a whole slide into `host` (the editor area or the present stage) ---- */
function renderSlideInto(host, slide, editable) {
  host.innerHTML = '';
  host.style.setProperty('--fs', slide.fs || 1);

  let listNumber = 0;   // numbered lists count up until another block type interrupts
  slide.blocks.forEach((block, index) => {
    listNumber = block.type === 'num' ? listNumber + 1 : 0;
    const element = createBlockElement(block, editable, index);
    if (block.type === 'num') element.dataset.n = listNumber;
    host.appendChild(element);
  });
}

/* Put the cursor at the end of block `index` (or the nearest block that has text). */
function focusBlock(index) {
  const blockElements = [...document.querySelectorAll('#inner .block')];
  let target;

  for (let k = index; k < blockElements.length && !target; k++) {
    target = blockElements[k].querySelector('.txt');
  }
  for (let k = index - 1; k >= 0 && !target; k--) {
    target = blockElements[k].querySelector('.txt');
  }
  if (!target) return;

  target.focus();
  const range = document.createRange();
  range.selectNodeContents(target);
  range.collapse(false);
  const selection = getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}
