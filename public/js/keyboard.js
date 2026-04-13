/* ================================================================
   KEYBOARD.JS — Noto On-Screen Keyboard
   Apple-quality design with GPU-optimized 60fps animations.
   Usage: NotoKeyboard.show(inputElement) / NotoKeyboard.hide()
   ================================================================ */

const NotoKeyboard = (() => {

  let targetInput  = null;
  let isShift      = false;
  let isCaps       = false;
  let isNumbers    = false;
  let isSymbols    = false;
  let isVisible    = false;

  /* ── KEY LAYOUTS ── */
  const ROWS_LOWER = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['shift','z','x','c','v','b','n','m','backspace'],
    ['123','globe','space','return'],
  ];
  const ROWS_UPPER = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['shift','Z','X','C','V','B','N','M','backspace'],
    ['123','globe','space','return'],
  ];
  const ROWS_NUM = [
    ['1','2','3','4','5','6','7','8','9','0'],
    ['-','/',':',';','(',')','₹','&','@','"'],
    ['symbols','.',',','?','!','\'','backspace'],
    ['ABC','globe','space','return'],
  ];
  const ROWS_SYM = [
    ['[',']','{','}','#','%','^','*','+','='],
    ['_','\\','|','~','<','>','€','£','¥','·'],
    ['123','.',',','?','!','\'','backspace'],
    ['ABC','globe','space','return'],
  ];

  /* ── INJECT ONCE ── */
  function inject() {
    if (document.getElementById('noto-osk')) return;

    const s = document.createElement('style');
    s.textContent = `
      /* ═══════════════════════════════════════════
         NOTO KEYBOARD — Apple-style, GPU-optimized
         ═══════════════════════════════════════════ */

      #noto-osk {
        position: fixed;
        bottom: 0; left: 0; right: 0;
        z-index: 99999;
        background: #d0d3d9;
        padding: 8px 4px 14px;
        transform: translateY(100%);
        opacity: 0;
        transition: transform .32s cubic-bezier(.25,.1,.25,1),
                    opacity .2s ease;
        will-change: transform;
        user-select: none;
        -webkit-user-select: none;
        font-family: -apple-system, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif;
      }

      #noto-osk.osk-visible {
        transform: translateY(0);
        opacity: 1;
      }

      /* ── Row ── */
      .osk-row {
        display: flex;
        justify-content: center;
        align-items: stretch;
        gap: 5px;
        margin-bottom: 7px;
        padding: 0 2px;
      }
      .osk-row:last-child { margin-bottom: 0; }

      /* ── Base Key ── */
      .osk-key {
        height: 44px;
        min-width: 32px;
        flex: 0 1 auto;
        background: #ffffff;
        border: none;
        border-radius: 5px;
        font-size: 22px;
        font-weight: 400;
        letter-spacing: -0.01em;
        color: #000000;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        box-shadow: 0 1px 0 rgba(0,0,0,.35);
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        font-family: inherit;
        transform: scale(1);
        transition: transform .06s ease,
                    background .06s ease;
      }

      .osk-key:active {
        transform: scale(0.93);
        background: #c8c8cc;
      }

      /* ── Modifier Keys (dark) ── */
      .osk-key-mod {
        background: #a5a8b0;
        color: #000;
        box-shadow: 0 1px 0 rgba(0,0,0,.3);
        font-size: 14px;
        font-weight: 500;
        min-width: 42px;
      }
      .osk-key-mod:active {
        background: #8e919a;
        transform: scale(0.93);
      }

      /* Shift active */
      .osk-key-shift-on {
        background: #ffffff;
        box-shadow: 0 1px 0 rgba(0,0,0,.35);
      }

      /* ── Space ── */
      .osk-key-space {
        flex: 1;
        max-width: 55%;
        font-size: 15px;
        font-weight: 400;
        color: #000;
        letter-spacing: 0;
      }

      /* ── Return ── */
      .osk-key-return {
        background: #a5a8b0;
        min-width: 78px;
        font-size: 15px;
        font-weight: 400;
        color: #000;
        box-shadow: 0 1px 0 rgba(0,0,0,.3);
      }
      .osk-key-return:active {
        background: #8e919a;
        transform: scale(0.95);
      }

      /* ── Dismiss bar ── */
      .osk-dismiss {
        display: flex;
        justify-content: flex-end;
        padding: 0 6px 6px;
      }
      .osk-dismiss-btn {
        background: none;
        border: none;
        padding: 6px 12px;
        cursor: pointer;
        -webkit-tap-highlight-color: transparent;
        opacity: .5;
        transition: opacity .15s ease;
      }
      .osk-dismiss-btn:active { opacity: .8; }
      .osk-dismiss-btn svg {
        width: 18px; height: 18px;
        stroke: #000; fill: none;
        stroke-width: 2; stroke-linecap: round;
      }

      /* ── Responsive ── */
      @media (max-width: 600px) {
        .osk-key { height: 40px; min-width: 28px; font-size: 20px; }
        .osk-row { gap: 4px; margin-bottom: 6px; }
      }

      @media (min-width: 768px) {
        #noto-osk { padding: 10px 24px 18px; }
        .osk-key { height: 48px; min-width: 36px; font-size: 23px; border-radius: 6px; }
        .osk-row { gap: 6px; margin-bottom: 8px; }
      }
    `;
    document.head.appendChild(s);

    const osk = document.createElement('div');
    osk.id = 'noto-osk';
    osk.setAttribute('role', 'toolbar');
    osk.setAttribute('aria-label', 'On-screen keyboard');

    // Dismiss bar
    const dismiss = document.createElement('div');
    dismiss.className = 'osk-dismiss';
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'osk-dismiss-btn';
    dismissBtn.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="7 13 12 18 17 13"/><line x1="12" y1="18" x2="12" y2="6"/></svg>`;
    dismissBtn.addEventListener('pointerdown', e => { e.preventDefault(); hide(); });
    dismiss.appendChild(dismissBtn);
    osk.appendChild(dismiss);

    document.body.appendChild(osk);
  }

  /* ── BUILD ROWS ── */
  function buildRows() {
    const osk = document.getElementById('noto-osk');
    osk.querySelectorAll('.osk-row').forEach(r => r.remove());

    let rows;
    if (isSymbols) rows = ROWS_SYM;
    else if (isNumbers) rows = ROWS_NUM;
    else if (isShift || isCaps) rows = ROWS_UPPER;
    else rows = ROWS_LOWER;

    rows.forEach(rowKeys => {
      const rowEl = document.createElement('div');
      rowEl.className = 'osk-row';
      rowKeys.forEach(key => rowEl.appendChild(buildKey(key)));
      osk.appendChild(rowEl);
    });
  }

  /* ── BUILD KEY ── */
  function buildKey(key) {
    const btn = document.createElement('button');
    btn.type = 'button';

    switch (key) {
      case 'space':
        btn.className = 'osk-key osk-key-space';
        btn.textContent = 'space';
        btn.addEventListener('pointerdown', e => { e.preventDefault(); insertChar(' '); });
        break;

      case 'return':
        btn.className = 'osk-key osk-key-return';
        btn.textContent = 'return';
        btn.addEventListener('pointerdown', e => {
          e.preventDefault();
          if (targetInput && targetInput.tagName === 'TEXTAREA') {
            insertChar('\n');
          } else {
            if (targetInput) {
              targetInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
              hide();
            }
          }
        });
        break;

      case 'backspace': {
        btn.className = 'osk-key osk-key-mod';
        btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>`;
        let bsInterval = null;
        btn.addEventListener('pointerdown', e => {
          e.preventDefault();
          deleteChar();
          bsInterval = setInterval(deleteChar, 90);
        });
        btn.addEventListener('pointerup',     () => clearInterval(bsInterval));
        btn.addEventListener('pointercancel', () => clearInterval(bsInterval));
        btn.addEventListener('pointerleave',  () => clearInterval(bsInterval));
        break;
      }

      case 'shift':
        btn.className = 'osk-key osk-key-mod' + ((isShift || isCaps) ? ' osk-key-shift-on' : '');
        btn.innerHTML = isCaps
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><path d="M12 3l-8 9h5v8h6v-8h5z"/><rect x="7" y="20" width="10" height="2" rx="1"/></svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l-8 9h5v8h6v-8h5z"/></svg>`;
        btn.addEventListener('pointerdown', e => {
          e.preventDefault();
          if (isShift && !isCaps)  { isCaps = true; isShift = false; }
          else if (isCaps)         { isCaps = false; isShift = false; }
          else                     { isShift = true; }
          buildRows();
        });
        break;

      case '123':
        btn.className = 'osk-key osk-key-mod';
        btn.textContent = '123';
        btn.addEventListener('pointerdown', e => { e.preventDefault(); isNumbers = true; isSymbols = false; buildRows(); });
        break;

      case 'ABC':
        btn.className = 'osk-key osk-key-mod';
        btn.textContent = 'ABC';
        btn.addEventListener('pointerdown', e => { e.preventDefault(); isNumbers = false; isSymbols = false; buildRows(); });
        break;

      case 'symbols':
        btn.className = 'osk-key osk-key-mod';
        btn.textContent = '#+=';
        btn.addEventListener('pointerdown', e => { e.preventDefault(); isSymbols = true; buildRows(); });
        break;

      case 'globe':
        btn.className = 'osk-key osk-key-mod';
        btn.style.fontSize = '18px';
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
        btn.addEventListener('pointerdown', e => e.preventDefault());
        break;

      default:
        btn.className = 'osk-key';
        btn.textContent = key;
        btn.addEventListener('pointerdown', e => {
          e.preventDefault();
          insertChar(key);
          if (isShift && !isCaps) { isShift = false; buildRows(); }
        });
        break;
    }
    return btn;
  }

  /* ── TEXT OPERATIONS ── */
  function insertChar(char) {
    if (!targetInput) return;
    const start = targetInput.selectionStart;
    const end   = targetInput.selectionEnd;
    const val   = targetInput.value;
    targetInput.value = val.slice(0, start) + char + val.slice(end);
    targetInput.selectionStart = targetInput.selectionEnd = start + char.length;
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function deleteChar() {
    if (!targetInput) return;
    const start = targetInput.selectionStart;
    const end   = targetInput.selectionEnd;
    const val   = targetInput.value;
    if (start === end && start > 0) {
      targetInput.value = val.slice(0, start - 1) + val.slice(end);
      targetInput.selectionStart = targetInput.selectionEnd = start - 1;
    } else if (start !== end) {
      targetInput.value = val.slice(0, start) + val.slice(end);
      targetInput.selectionStart = targetInput.selectionEnd = start;
    }
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* ── PUBLIC API ── */
  function show(inputElement) {
    inject();
    targetInput = inputElement;
    isShift = false; isCaps = false; isNumbers = false; isSymbols = false;
    isVisible = true;
    buildRows();
    const osk = document.getElementById('noto-osk');
    // Force reflow before adding class for smooth animation
    osk.offsetHeight;
    osk.classList.add('osk-visible');
    nudgeLayout(true);
  }

  function hide() {
    const osk = document.getElementById('noto-osk');
    if (osk) osk.classList.remove('osk-visible');
    nudgeLayout(false);
    targetInput = null;
    isVisible = false;
  }

  function toggle(inputElement) {
    isVisible ? hide() : show(inputElement);
  }

  function visible() { return isVisible; }

  /* ── LAYOUT NUDGE ── */
  function nudgeLayout(open) {
    const h = 260;
    const targets = [
      document.querySelector('.main-content'),
      document.querySelector('.modal'),
      document.querySelector('.modal-backdrop'),
    ];
    targets.forEach(el => {
      if (!el) return;
      el.style.transition = 'margin-bottom .32s cubic-bezier(.25,.1,.25,1)';
      el.style.marginBottom = open ? h + 'px' : '';
    });
  }

  /* ── AUTO-ATTACH ── */
  document.addEventListener('focusin', e => {
    const el = e.target;
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.dataset.osk === 'true') {
      show(el);
    }
  });

  /* ── PREVENT NATIVE KEYBOARD ── */
  document.addEventListener('touchstart', e => {
    const el = e.target;
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.dataset.osk === 'true') {
      el.setAttribute('readonly', true);
      setTimeout(() => el.removeAttribute('readonly'), 50);
    }
  }, { passive: true });

  return { show, hide, toggle, visible };

})();