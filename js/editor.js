/* ==========================================================
   The editor screen: slide list on the left, the open slide in the
   middle, and the toolbar buttons above it
   ========================================================== */

/* ---- Slide list (left side) ---- */

/* The ⋯ menu of one slide in the list. */
function openSlideMenu(slideIndex, anchorElement) {
  const slides = state.slides;
  const openSlide = currentSlide();
  /* After moving slides around, keep the same slide open. */
  const keepOpenSlide = () => {
    state.cur = Math.max(0, slides.indexOf(openSlide));
  };

  popMenu(anchorElement.getBoundingClientRect(), [
    ['⧉ Duplicate', () => {
      slides.splice(slideIndex + 1, 0, cloneWithNewIds(slides[slideIndex]));
      state.cur = slideIndex + 1;
    }],
    ['↑ Move up', () => {
      slideIndex && moveItem(slides, slideIndex, slideIndex - 1);
      keepOpenSlide();
    }],
    ['↓ Move down', () => {
      slideIndex < slides.length - 1 && moveItem(slides, slideIndex, slideIndex + 1);
      keepOpenSlide();
    }],
    ['🗑 Delete', () => {
      if (slides.length > 1) {
        slides.splice(slideIndex, 1);
        state.cur = Math.min(state.cur, slides.length - 1);
      }
    }]
  ], () => {
    save();
    renderEditor();
  });
}

function renderSlideList() {
  const list = $('#list');
  list.innerHTML = '';

  state.slides.forEach((slide, slideIndex) => {
    const item = document.createElement('div');
    item.className = 'th' + (slideIndex === state.cur ? ' on' : '');
    item.draggable = true;
    item.innerHTML = '<i>' + (slideIndex + 1) + '</i><span></span><button title="Slide options">⋯</button>';

    /* The slide's title is the text of its first block that has any. */
    const titleBlock = slide.blocks.find(block => block.html && htmlToText(block).trim());
    item.children[1].textContent = titleBlock ? htmlToText(titleBlock) : 'Untitled';

    item.onclick = () => {
      state.cur = slideIndex;
      persist();
      renderEditor();
    };

    /* Drag one slide onto another to reorder. */
    item.ondragstart = event => {
      dragState = { k: 's', i: slideIndex };
      event.dataTransfer.setData('text/plain', 's');
    };
    item.ondragover = event => {
      if (dragState && dragState.k === 's') event.preventDefault();
    };
    item.ondrop = event => {
      if (dragState && dragState.k === 's') {
        event.preventDefault();
        const openSlide = currentSlide();
        moveItem(state.slides, dragState.i, slideIndex);
        state.cur = state.slides.indexOf(openSlide);
        dragState = null;
        save();
        renderEditor();
      }
    };

    item.lastChild.onclick = event => {      // the ⋯ button
      event.stopPropagation();
      openSlideMenu(slideIndex, event.target);
    };

    list.appendChild(item);
  });
}

/* ---- Draw everything in the editor ---- */

function renderEditor() {
  closeMenu();
  renderSlideList();

  const host = $('#inner');
  renderSlideInto(host, currentSlide(), true);
  $('#fl').textContent = Math.round((currentSlide().fs || 1) * 100) + '%';

  /* The "＋ Click here or type / to add a block" strip under the last block. */
  const addZone = document.createElement('div');
  addZone.className = 'addzone';
  addZone.onclick = () => {
    currentSlide().blocks.push(makeBlock());
    save();
    renderEditor();
    focusBlock(currentSlide().blocks.length - 1);
  };
  host.appendChild(addZone);
}

/* ---- Toolbar buttons ---- */

$('#add').onclick = () => {                 // + New slide
  state.slides.splice(state.cur + 1, 0, { blocks: [makeBlock('h2', '')] });
  state.cur++;
  save();
  renderEditor();
  focusBlock(0);
};

$('#dup').onclick = () => {                 // ⧉ Duplicate (the open slide)
  state.slides.splice(state.cur + 1, 0, cloneWithNewIds(currentSlide()));
  state.cur++;
  save();
  renderEditor();
};

$('#un').onclick = () => undo(-1);
$('#re').onclick = () => undo(1);

/* Aa− / Aa+ : text size of the open slide, between 60% and 180%, in steps of 10%. */
const changeTextSize = delta => {
  const current = currentSlide().fs || 1;
  currentSlide().fs = Math.round(Math.max(0.6, Math.min(1.8, current + delta)) * 10) / 10;
  save();
  renderEditor();
};
$('#fm').onclick = () => changeTextSize(-0.1);
$('#fp').onclick = () => changeTextSize(0.1);

$('#ab').onclick = () => {                  // ＋ Block: add a block and open the "/" menu
  const blocks = currentSlide().blocks;
  blocks.push(makeBlock());
  save();
  renderEditor();

  const newIndex = blocks.length - 1;
  focusBlock(newIndex);
  openSlashMenu(newIndex, document.querySelectorAll('#inner .block')[newIndex].querySelector('.txt'), '');
};
