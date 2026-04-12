/* ================================================================
   KEYBOARD.JS — Noto On-Screen Keyboard Component
   Shared across all screens: grade, subject, notebook, page.
   Usage: call NotoKeyboard.show(inputElement) to attach.
          call NotoKeyboard.hide() to dismiss.
   ================================================================ */

const NotoKeyboard = (() => {

  /* ================================================================
     KEYBOARD.JS > STATE
     ================================================================ */
  let targetInput  = null;   // the <input> or <textarea> currently bound
  let isShift      = false;
  let isCaps       = false;
  let isNumbers    = false;
  let isVisible    = false;

  /* ================================================================
     KEYBOARD.JS > KEY LAYOUT DEFINITIONS
     ================================================================ */
  const ROWS_ALPHA_LOWER = [
    ['q','w','e','r','t','y','u','i','o','p'],
    ['a','s','d','f','g','h','j','k','l'],
    ['⇧','z','x','c','v','b','n','m','⌫'],
    ['123','🌐','space','return'],
  ];

  const ROWS_ALPHA_UPPER = [
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L'],
    ['⇧','Z','X','C','V','B','N','M','⌫'],
    ['123','🌐','space','return'],
  ];

  const ROWS_NUMBERS = [
    ['1','2','3','4','5','6','7','8','9','0'],
    ['-','/',':',';','(',')','₹','&','@','"'],
    ['#+=','.', ',','?','!','\'','⌫'],
    ['ABC','🌐','space','return'],
  ];

  const ROWS_SYMBOLS = [
    ['[',']','{','}','#','%','^','*','+','='],
    ['_','\\','|','~','<','>','€','£','¥','·'],
    ['123','.', ',','?','!','\'','⌫'],
    ['ABC','🌐','space','return'],
  ];

  /* ================================================================
     KEYBOARD.JS > DOM INJECTION
     Injects the keyboard container into the document once.
     ================================================================ */
  function inject() {
    if (document.getElementById('noto-osk')) return;

    const style = document.createElement('style');
    style.textContent = `

      /* ============================================================
         KEYBOARD.JS > BASE CONTAINER
         ============================================================ */
      #noto-osk {
        position: fixed;
        bottom: 0; left: 0; right: 0;
        z-index: 99999;
        background: #d1d5db;
        border-top: 1px solid #b0b8c1;
        padding: 10px 6px 16px;
        transform: translateY(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        user-select: none;
        -webkit-user-select: none;
        font-family: -apple-system, 'DM Sans', system-ui, sans-serif;
        box-shadow: 0 -4px 24px rgba(0,0,0,0.12);
      }

      #noto-osk.osk-visible {
        transform: translateY(0);
      }

      /* ============================================================
         KEYBOARD.JS > KEYBOARD ROW
         ============================================================ */
      .osk-row {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
      }

      .osk-row:last-child { margin-bottom: 0; }

      /* ============================================================
         KEYBOARD.JS > BASE KEY STYLE
         ============================================================ */
      .osk-key {
        height: 46px;
        min-width: 36px;
        background: #ffffff;
        border: none;
        border-radius: 6px;
        font-size: 16px;
        font-weight: 400;
        color: #0a0a0a;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 4px;
        box-shadow: 0 2px 0 #9fa6af;
        transition: background 0.08s, transform 0.08s;
        -webkit-tap-highlight-color: transparent;
        touch-action: manipulation;
        font-family: -apple-system, 'DM Sans', system-ui, sans-serif;
        flex-shrink: 0;
      }

      .osk-key:active {
        background: #e0e0e0;
        transform: translateY(1px);
        box-shadow: 0 1px 0 #9fa6af;
      }

      /* ============================================================
         KEYBOARD.JS > KEY VARIANTS
         ============================================================ */

      /* Dark/modifier keys (shift, backspace, switch) */
      .osk-key-dark {
        background: #adb5bd;
        color: #0a0a0a;
        box-shadow: 0 2px 0 #7a8290;
        font-size: 14px;
      }

      .osk-key-dark:active {
        background: #9aa0a8;
      }

      /* Space bar */
      .osk-key-space {
        flex: 1;
        max-width: 340px;
        font-size: 13px;
        font-weight: 400;
        letter-spacing: 0.04em;
        color: #444;
      }

      /* Return / Enter key */
      .osk-key-return {
        background: #adb5bd;
        min-width: 80px;
        font-size: 13px;
        font-weight: 400;
        color: #0a0a0a;
        box-shadow: 0 2px 0 #7a8290;
      }

      .osk-key-return:active { background: #9aa0a8; }

      /* Shift active state */
      .osk-key-shift-active {
        background: #ffffff;
        box-shadow: 0 0 0 2px #0a0a0a, 0 2px 0 #0a0a0a;
      }

      /* Close button at top right */
      .osk-close-btn {
        position: absolute;
        top: 8px; right: 10px;
        width: 28px; height: 28px;
        background: #adb5bd;
        border: none;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        cursor: pointer;
        box-shadow: 0 1px 0 #7a8290;
        -webkit-tap-highlight-color: transparent;
      }

      .osk-close-btn svg {
        width: 13px; height: 13px;
        stroke: #444; fill: none;
        stroke-width: 2.5; stroke-linecap: round;
      }

      .osk-close-btn:active { background: #9aa0a8; }

      /* ============================================================
         KEYBOARD.JS > RESPONSIVE — SMALLER KEYS ON NARROW SCREENS
         ============================================================ */
      @media (max-width: 600px) {
        .osk-key      { height: 42px; min-width: 30px; font-size: 15px; }
        .osk-row      { gap: 5px; }
      }
    `;
    document.head.appendChild(style);

    const osk = document.createElement('div');
    osk.id = 'noto-osk';
    osk.setAttribute('role', 'toolbar');
    osk.setAttribute('aria-label', 'On-screen keyboard');

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'osk-close-btn';
    closeBtn.innerHTML = `<svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
    closeBtn.addEventListener('pointerdown', e => { e.preventDefault(); hide(); });
    osk.appendChild(closeBtn);

    document.body.appendChild(osk);
  }

  /* ================================================================
     KEYBOARD.JS > BUILD ROWS
     Renders key rows into the OSK container.
     ================================================================ */
  function buildRows() {
    const osk = document.getElementById('noto-osk');
    // Remove existing rows
    osk.querySelectorAll('.osk-row').forEach(r => r.remove());

    const rows = isNumbers
      ? ROWS_NUMBERS
      : (isShift || isCaps ? ROWS_ALPHA_UPPER : ROWS_ALPHA_LOWER);

    rows.forEach(rowKeys => {
      const rowEl = document.createElement('div');
      rowEl.className = 'osk-row';

      rowKeys.forEach(key => {
        const btn = buildKey(key);
        rowEl.appendChild(btn);
      });

      osk.appendChild(rowEl);
    });
  }

  /* ================================================================
     KEYBOARD.JS > BUILD SINGLE KEY
     ================================================================ */
  function buildKey(key) {
    const btn = document.createElement('button');
    btn.type = 'button';

    switch (key) {

      /* -- SPACE -------------------------------------------------- */
      case 'space':
        btn.className = 'osk-key osk-key-space';
        btn.textContent = 'space';
        btn.addEventListener('pointerdown', e => { e.preventDefault(); insertChar(' '); });
        break;

      /* -- RETURN ------------------------------------------------- */
      case 'return':
        btn.className = 'osk-key osk-key-return';
        btn.textContent = 'return';
        btn.addEventListener('pointerdown', e => {
          e.preventDefault();
          if (targetInput && targetInput.tagName === 'TEXTAREA') {
            insertChar('\n');
          } else {
            // Trigger form submission or blur on single-line inputs
            if (targetInput) {
              targetInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
              hide();
            }
          }
        });
        break;

      /* -- BACKSPACE ----------------------------------------------- */
      case '⌫':
        btn.className = 'osk-key osk-key-dark';
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>`;
        // Support hold-to-delete
        let backspaceInterval = null;
        btn.addEventListener('pointerdown', e => {
          e.preventDefault();
          deleteChar();
          backspaceInterval = setInterval(deleteChar, 100);
        });
        btn.addEventListener('pointerup',   () => clearInterval(backspaceInterval));
        btn.addEventListener('pointerout',  () => clearInterval(backspaceInterval));
        break;

      /* -- SHIFT -------------------------------------------------- */
      case '⇧':
        btn.className = 'osk-key osk-key-dark' + (isShift || isCaps ? ' osk-key-shift-active' : '');
        btn.innerHTML = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>`;
        btn.addEventListener('pointerdown', e => {
          e.preventDefault();
          // Double-tap = caps lock
          if (isShift && !isCaps) { isCaps = true; isShift = false; }
          else if (isCaps)        { isCaps = false; isShift = false; }
          else                    { isShift = true; }
          buildRows();
        });
        break;

      /* -- SWITCH TO NUMBERS -------------------------------------- */
      case '123':
        btn.className = 'osk-key osk-key-dark';
        btn.style.fontSize = '13px';
        btn.textContent = '123';
        btn.addEventListener('pointerdown', e => { e.preventDefault(); isNumbers = true;  buildRows(); });
        break;

      /* -- SWITCH TO ALPHA ---------------------------------------- */
      case 'ABC':
        btn.className = 'osk-key osk-key-dark';
        btn.style.fontSize = '13px';
        btn.textContent = 'ABC';
        btn.addEventListener('pointerdown', e => { e.preventDefault(); isNumbers = false; buildRows(); });
        break;

      /* -- GLOBE (PLACEHOLDER) ------------------------------------ */
      case '🌐':
        btn.className = 'osk-key osk-key-dark';
        btn.style.fontSize = '18px';
        btn.textContent = '🌐';
        btn.addEventListener('pointerdown', e => e.preventDefault());
        break;

      /* -- REGULAR CHARACTER -------------------------------------- */
      default:
        btn.className = 'osk-key';
        btn.textContent = key;
        btn.addEventListener('pointerdown', e => {
          e.preventDefault();
          insertChar(key);
          // Auto-cancel shift after one character (not caps lock)
          if (isShift && !isCaps) { isShift = false; buildRows(); }
        });
        break;
    }

    return btn;
  }

  /* ================================================================
     KEYBOARD.JS > CHARACTER INSERTION
     Works with any <input> or <textarea>.
     ================================================================ */
  function insertChar(char) {
    if (!targetInput) return;

    const start = targetInput.selectionStart;
    const end   = targetInput.selectionEnd;
    const val   = targetInput.value;

    targetInput.value = val.slice(0, start) + char + val.slice(end);
    targetInput.selectionStart = targetInput.selectionEnd = start + char.length;

    // Fire input event so any oninput handlers (like delete confirmation) respond
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* ================================================================
     KEYBOARD.JS > CHARACTER DELETION (BACKSPACE)
     ================================================================ */
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

  /* ================================================================
     KEYBOARD.JS > PUBLIC API — SHOW
     Call this with any input element to bind and display the keyboard.
     ================================================================ */
  function show(inputElement) {
    inject();
    targetInput = inputElement;
    isShift     = false;
    isCaps      = false;
    isNumbers   = false;
    isVisible   = true;
    buildRows();

    const osk = document.getElementById('noto-osk');
    osk.classList.add('osk-visible');

    // Push page content up so the active input is not hidden behind the keyboard
    nudgeLayout(true);
  }

  /* ================================================================
     KEYBOARD.JS > PUBLIC API — HIDE
     ================================================================ */
  function hide() {
    const osk = document.getElementById('noto-osk');
    if (osk) osk.classList.remove('osk-visible');
    nudgeLayout(false);
    targetInput = null;
    isVisible   = false;
  }

  /* ================================================================
     KEYBOARD.JS > PUBLIC API — TOGGLE
     ================================================================ */
  function toggle(inputElement) {
    isVisible ? hide() : show(inputElement);
  }

  /* ================================================================
     KEYBOARD.JS > PUBLIC API — IS VISIBLE
     ================================================================ */
  function visible() { return isVisible; }

  /* ================================================================
     KEYBOARD.JS > LAYOUT NUDGE
     Shifts the main content area upward when the keyboard is open
     so the focused input is never obscured.
     ================================================================ */
  function nudgeLayout(keyboardOpen) {
    const oskHeight = 240; // approximate keyboard height in px
    const targets   = [
      document.querySelector('.main-content'),
      document.querySelector('.modal'),
      document.querySelector('.modal-backdrop'),
    ];
    targets.forEach(el => {
      if (!el) return;
      el.style.transition = 'margin-bottom 0.3s cubic-bezier(0.4,0,0.2,1)';
      el.style.marginBottom = keyboardOpen ? oskHeight + 'px' : '';
    });
  }

  /* ================================================================
     KEYBOARD.JS > AUTO-ATTACH TO INPUTS
     Any <input> or <textarea> that carries the attribute
     data-osk="true" will automatically show the keyboard on focus
     and hide it on blur. Add this attribute in any HTML file to
     opt in without writing extra JavaScript.
     ================================================================ */
  document.addEventListener('focusin', e => {
    const el = e.target;
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.dataset.osk === 'true') {
      show(el);
    }
  });

  /* ================================================================
     KEYBOARD.JS > PREVENT NATIVE KEYBOARD ON TOUCH DEVICES
     Setting readOnly temporarily stops the native keyboard from
     appearing when an OSK-managed input is tapped, then immediately
     removes readOnly so the field still receives programmatic input.
     ================================================================ */
  document.addEventListener('touchstart', e => {
    const el = e.target;
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.dataset.osk === 'true') {
      el.setAttribute('readonly', true);
      setTimeout(() => el.removeAttribute('readonly'), 50);
    }
  }, { passive: true });

  /* ================================================================
     KEYBOARD.JS > PUBLIC INTERFACE
     ================================================================ */
  return { show, hide, toggle, visible };

})();