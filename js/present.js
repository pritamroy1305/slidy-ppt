/* ==========================================================
   Present mode: full screen slides, next / previous, laser pointer
   and the fading pen
   ========================================================== */

const presentEl = $('#present');
const inkCanvas = $('#ink');
const inkContext = inkCanvas.getContext('2d');
const laserEl = $('#laser');

const PEN_HOLD_MS = 1800;   // a pen stroke stays fully visible this long...
const PEN_FADE_MS = 900;    // ...then fades away over this long

let presentIndex = 0;       // slide being shown
let tool = null;            // null, 'laser' or 'pen'
let strokes = [];           // pen strokes still on screen
let drawing = null;         // the stroke being drawn right now
let animationFrame = 0;
let isFullscreen = false;
let justSwiped = false;     // stops a swipe from also counting as a tap
let touchStartX = 0;
let touchStartY = 0;

/* ---- Showing slides ---- */

function resizeCanvas() {
  const ratio = devicePixelRatio || 1;
  inkCanvas.width = innerWidth * ratio;
  inkCanvas.height = innerHeight * ratio;
  inkContext.setTransform(ratio, 0, 0, ratio, 0, 0);
}
addEventListener('resize', () => {
  if (presentEl.classList.contains('on')) resizeCanvas();
});

function showPresentSlide() {
  renderSlideInto($('#pinner'), state.slides[presentIndex], false);
  $('#pc').textContent = (presentIndex + 1) + ' / ' + state.slides.length;
  strokes = [];
  inkContext.clearRect(0, 0, innerWidth, innerHeight);
}

/* delta: +1 = next slide, -1 = previous slide */
function goToSlide(delta) {
  presentIndex = Math.max(0, Math.min(state.slides.length - 1, presentIndex + delta));
  showPresentSlide();
}

/* Pick the laser or the pen. Picking the active tool again switches it off. */
function setTool(name) {
  tool = name && tool !== name ? name : null;
  presentEl.dataset.tool = tool || '';
  $('#bl').classList.toggle('on', tool === 'laser');
  $('#bp').classList.toggle('on', tool === 'pen');
  if (tool !== 'laser') laserEl.style.display = 'none';
}

function startPresentation() {
  presentIndex = state.cur;
  resizeCanvas();
  presentEl.classList.add('on');
  showPresentSlide();
  if (presentEl.requestFullscreen) {
    presentEl.requestFullscreen().then(() => isFullscreen = true).catch(() => {});
  }
}

function exitPresentation() {
  presentEl.classList.remove('on');
  setTool(null);
  strokes = [];
  state.cur = presentIndex;
  persist();
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  isFullscreen = false;

  /* Somebody who opened a share link goes to the app's own home page.
     Everyone else goes back to the editor. */
  if (isViewOnly) {
    location.href = location.pathname;
  } else {
    renderEditor();
  }
}

/* Leaving full screen with Esc or the browser also ends the presentation. */
document.addEventListener('fullscreenchange', () => {
  if (isFullscreen && !document.fullscreenElement && presentEl.classList.contains('on')) {
    exitPresentation();
  }
});

/* ---- The fading pen ---- */

function animateStrokes() {
  cancelAnimationFrame(animationFrame);

  const drawFrame = () => {
    const now = performance.now();
    inkContext.clearRect(0, 0, innerWidth, innerHeight);
    strokes = strokes.filter(stroke => !stroke.end || now - stroke.end < PEN_HOLD_MS + PEN_FADE_MS);

    const penColor = getComputedStyle(document.documentElement).getPropertyValue('--pen').trim() || '#e94f37';

    strokes.forEach(stroke => {
      const age = stroke.end ? now - stroke.end : 0;
      inkContext.globalAlpha = age < PEN_HOLD_MS ? 1 : 1 - (age - PEN_HOLD_MS) / PEN_FADE_MS;
      inkContext.strokeStyle = penColor;
      inkContext.lineWidth = 5;
      inkContext.lineCap = inkContext.lineJoin = 'round';
      inkContext.shadowColor = penColor;
      inkContext.shadowBlur = 8;

      inkContext.beginPath();
      stroke.pts.forEach((point, k) => {
        if (k) inkContext.lineTo(point[0], point[1]);
        else inkContext.moveTo(point[0], point[1]);
      });
      if (stroke.pts.length === 1) inkContext.lineTo(stroke.pts[0][0] + 0.1, stroke.pts[0][1]);   // a tap makes a dot
      inkContext.stroke();
    });

    if (strokes.length) animationFrame = requestAnimationFrame(drawFrame);
  };

  animationFrame = requestAnimationFrame(drawFrame);
}

function penPoint(event) {
  const rect = inkCanvas.getBoundingClientRect();
  return [
    (event.clientX - rect.left) * inkCanvas.clientWidth / rect.width,
    (event.clientY - rect.top) * inkCanvas.clientHeight / rect.height
  ];
}

inkCanvas.onpointerdown = event => {
  if (tool !== 'pen') return;
  inkCanvas.setPointerCapture(event.pointerId);
  drawing = { pts: [penPoint(event)], end: 0 };
  strokes.push(drawing);
  animateStrokes();
};
inkCanvas.onpointermove = event => {
  if (drawing) drawing.pts.push(penPoint(event));
};
inkCanvas.onpointerup = inkCanvas.onpointercancel = () => {
  if (drawing) {
    drawing.end = performance.now();
    drawing = null;
  }
};

/* ---- Laser, tapping and swiping ---- */

presentEl.onpointermove = presentEl.onpointerdown = event => {
  if (tool === 'laser') {
    laserEl.style.display = 'block';
    laserEl.style.transform = 'translate(' + event.clientX + 'px,' + event.clientY + 'px)';
  }
};

/* Tap or click anywhere (with no tool active) to go to the next slide. */
presentEl.onclick = event => {
  if (!tool && !justSwiped && !event.target.closest('#ptb')) goToSlide(1);
};

/* Swipe left for next, right for previous. */
presentEl.addEventListener('touchstart', event => {
  touchStartX = event.touches[0].clientX;
  touchStartY = event.touches[0].clientY;
}, { passive: true });

presentEl.addEventListener('touchend', event => {
  if (tool) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    goToSlide(dx < 0 ? 1 : -1);
    justSwiped = true;
    setTimeout(() => justSwiped = false, 400);
  }
}, { passive: true });

/* ---- Buttons and keyboard ---- */

$('#go').onclick = startPresentation;
$('#bx').onclick = exitPresentation;
$('#pp').onclick = () => goToSlide(-1);
$('#pn').onclick = () => goToSlide(1);
$('#bl').onclick = () => setTool('laser');
$('#bp').onclick = () => setTool('pen');

document.addEventListener('keydown', event => {
  const pressed = event.key;

  /* While presenting: arrows / space / page keys move, L = laser, P = pen, Esc = exit. */
  if (presentEl.classList.contains('on')) {
    if (pressed === 'ArrowRight' || pressed === ' ' || pressed === 'PageDown') {
      event.preventDefault();
      goToSlide(1);
    } else if (pressed === 'ArrowLeft' || pressed === 'PageUp') {
      event.preventDefault();
      goToSlide(-1);
    } else if (pressed === 'l' || pressed === 'L') {
      setTool('laser');
    } else if (pressed === 'p' || pressed === 'P') {
      setTool('pen');
    } else if (pressed === 'Escape' && !isViewOnly) {
      exitPresentation();
    }
    return;
  }

  /* In the editor: Ctrl/Cmd+Z undo, Ctrl/Cmd+Shift+Z or Ctrl/Cmd+Y redo.
     Skipped while the share dialog is open so typing there cannot undo slides. */
  const shareIsOpen = $('#share').classList.contains('on');
  if ((event.ctrlKey || event.metaKey) && !event.altKey && document.body.dataset.view === 'app' && !shareIsOpen) {
    const letter = pressed.toLowerCase();
    if (letter === 'z') {
      event.preventDefault();
      undo(event.shiftKey ? 1 : -1);
    } else if (letter === 'y') {
      event.preventDefault();
      undo(1);
    }
  }
});
