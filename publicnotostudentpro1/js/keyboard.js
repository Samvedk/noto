/* ================================================================
   KEYBOARD.JS — Noto On-Screen Keyboard v2
   Dark, minimal, premium — inspired by the best mobile keyboards.
   Usage: NotoKeyboard.show(inputElement) / NotoKeyboard.hide()
   ================================================================ */

const NotoKeyboard = (() => {

  let targetInput = null;
  let isShift = false;
  let isCaps = false;
  let isNums = false;
  let isSym = false;
  let isVisible = false;

  /* ── KEY LAYOUTS ── */
  const L = {
    lower: [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['SHIFT', 'z', 'x', 'c', 'v', 'b', 'n', 'm', 'DEL'],
      ['NUM', 'space', 'RETURN'],
    ],
    upper: [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
      ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'DEL'],
      ['NUM', 'space', 'RETURN'],
    ],
    num: [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['-', '/', ':', ';', '(', ')', '\u20b9', '&', '@', '"'],
      ['SYM', '.', ',', '?', '!', '\'', 'DEL'],
      ['ABC', 'space', 'RETURN'],
    ],
    sym: [
      ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='],
      ['_', '\\', '|', '~', '<', '>', '\u20ac', '\u00a3', '\u00a5', '\u00b7'],
      ['NUM', '.', ',', '?', '!', '\'', 'DEL'],
      ['ABC', 'space', 'RETURN'],
    ],
  };

  /* ── STYLES ── */
  const CSS = `
    #noto-osk {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 99999;
      background: rgba(18, 18, 22, 0.97);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border-top: 1px solid rgba(255,255,255,0.07);
      padding: 8px 6px env(safe-area-inset-bottom, 12px);
      transform: translateY(100%);
      transition: transform 0.3s cubic-bezier(0.32,0.72,0,1);
      will-change: transform;
      user-select: none;
      -webkit-user-select: none;
    }
    #noto-osk.osk-visible {
      transform: translateY(0);
    }

    /* Dismiss */
    .osk-bar {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      padding: 0 4px 6px;
    }
    .osk-dismiss-btn {
      background: rgba(255,255,255,0.07);
      border: none;
      border-radius: 8px;
      padding: 5px 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      color: rgba(255,255,255,0.45);
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-family: -apple-system, system-ui, sans-serif;
      -webkit-tap-highlight-color: transparent;
      transition: background 0.15s, color 0.15s;
    }
    .osk-dismiss-btn:active {
      background: rgba(255,255,255,0.14);
      color: rgba(255,255,255,0.7);
    }
    .osk-dismiss-btn svg {
      width: 12px; height: 12px;
      stroke: currentColor; fill: none;
      stroke-width: 2.2; stroke-linecap: round;
    }

    /* Row */
    .osk-row {
      display: flex;
      justify-content: center;
      gap: 5px;
      margin-bottom: 6px;
      padding: 0 2px;
    }
    .osk-row:last-child { margin-bottom: 0; }

    /* Base key */
    .osk-key {
      height: 42px;
      min-width: 30px;
      flex: 1;
      max-width: 46px;
      border: none;
      border-radius: 8px;
      font-size: 17px;
      font-weight: 400;
      color: #ffffff;
      background: rgba(255,255,255,0.12);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      font-family: -apple-system, 'SF Pro Text', system-ui, sans-serif;
      -webkit-tap-highlight-color: transparent;
      touch-action: manipulation;
      transition: transform 0.08s ease, background 0.08s ease;
      position: relative;
      overflow: hidden;
    }
    .osk-key:active {
      background: rgba(255,255,255,0.28);
      transform: scale(0.92);
    }

    /* Modifier keys */
    .osk-mod {
      background: rgba(255,255,255,0.07);
      color: rgba(255,255,255,0.7);
      font-size: 12px;
      font-weight: 600;
      max-width: 54px;
      letter-spacing: 0.02em;
    }
    .osk-mod:active {
      background: rgba(255,255,255,0.18);
    }
    .osk-mod-active {
      background: rgba(255,255,255,0.92) !important;
      color: #111 !important;
    }

    /* Space */
    .osk-space {
      flex: 3;
      max-width: unset;
      font-size: 12px;
      font-weight: 500;
      color: rgba(255,255,255,0.5);
      letter-spacing: 0.06em;
      text-transform: lowercase;
      background: rgba(255,255,255,0.10);
    }

    /* Return */
    .osk-return {
      flex: 1.4;
      max-width: unset;
      font-size: 12px;
      font-weight: 600;
      color: rgba(255,255,255,0.8);
      letter-spacing: 0.03em;
      background: rgba(255,255,255,0.09);
    }

    /* Delete */
    .osk-del {
      max-width: 52px;
    }
    .osk-del svg { pointer-events: none; }

    /* Ripple */
    .osk-key .osk-ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.2);
      transform: scale(0);
      animation: osk-rpl 0.4s ease forwards;
      pointer-events: none;
    }
    @keyframes osk-rpl {
      to { transform: scale(3); opacity: 0; }
    }

    /* Responsive */
    @media (max-width: 400px) {
      .osk-key { height: 38px; font-size: 15px; border-radius: 7px; }
      .osk-row { gap: 4px; margin-bottom: 5px; }
    }
    @media (min-width: 768px) {
      #noto-osk { padding: 10px 40px env(safe-area-inset-bottom, 16px); }
      .osk-key { height: 46px; max-width: 52px; }
    }
  `;

  function inject() {
    if (document.getElementById('noto-osk')) return;
    const s = document.createElement('style');
    s.id = 'noto-osk-style';
    s.textContent = CSS;
    document.head.appendChild(s);

    const osk = document.createElement('div');
    osk.id = 'noto-osk';
    osk.setAttribute('role', 'toolbar');
    osk.setAttribute('aria-label', 'Noto keyboard');

    // Dismiss bar
    const bar = document.createElement('div');
    bar.className = 'osk-bar';
    const dBtn = document.createElement('button');
    dBtn.className = 'osk-dismiss-btn';
    dBtn.innerHTML = `<svg viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>Done`;
    dBtn.addEventListener('pointerdown', e => { e.preventDefault(); hide(); });
    bar.appendChild(dBtn);
    osk.appendChild(bar);

    document.body.appendChild(osk);
  }

  /* ── BUILD ROWS ── */
  function buildRows() {
    const osk = document.getElementById('noto-osk');
    osk.querySelectorAll('.osk-row').forEach(r => r.remove());

    let layout;
    if (isSym) layout = L.sym;
    else if (isNums) layout = L.num;
    else if (isShift || isCaps) layout = L.upper;
    else layout = L.lower;

    layout.forEach(keys => {
      const row = document.createElement('div');
      row.className = 'osk-row';
      keys.forEach(k => row.appendChild(makeKey(k)));
      osk.appendChild(row);
    });
  }

  /* ── MAKE KEY ── */
  function makeKey(k) {
    const btn = document.createElement('button');
    btn.type = 'button';

    // Ripple on press
    btn.addEventListener('pointerdown', e => {
      const r = document.createElement('span');
      r.className = 'osk-ripple';
      const rect = btn.getBoundingClientRect();
      const s = Math.max(rect.width, rect.height);
      r.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - rect.left - s / 2}px;top:${e.clientY - rect.top - s / 2}px`;
      btn.appendChild(r);
      setTimeout(() => r.remove(), 450);
    });

    switch (k) {
      case 'space':
        btn.className = 'osk-key osk-space';
        btn.textContent = 'space';
        btn.addEventListener('pointerdown', e => { e.preventDefault(); insert(' '); });
        break;

      case 'RETURN':
        btn.className = 'osk-key osk-return';
        btn.textContent = 'return';
        btn.addEventListener('pointerdown', e => {
          e.preventDefault();
          if (targetInput && targetInput.tagName === 'TEXTAREA') insert('\n');
          else { targetInput && targetInput.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); hide(); }
        });
        break;

      case 'DEL': {
        btn.className = 'osk-key osk-mod osk-del';
        btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>`;
        let _iv = null;
        btn.addEventListener('pointerdown', e => { e.preventDefault(); del(); _iv = setInterval(del, 80); });
        btn.addEventListener('pointerup', () => clearInterval(_iv));
        btn.addEventListener('pointercancel', () => clearInterval(_iv));
        btn.addEventListener('pointerleave', () => clearInterval(_iv));
        break;
      }

      case 'SHIFT':
        btn.className = 'osk-key osk-mod' + ((isShift || isCaps) ? ' osk-mod-active' : '');
        btn.innerHTML = isCaps
          ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3l-8 9h5v8h6v-8h5z"/><rect x="7" y="20" width="10" height="2" rx="1"/></svg>`
          : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l-8 9h5v8h6v-8h5z"/></svg>`;
        btn.addEventListener('pointerdown', e => {
          e.preventDefault();
          if (isShift && !isCaps) { isCaps = true; isShift = false; }
          else if (isCaps) { isCaps = false; isShift = false; }
          else { isShift = true; }
          buildRows();
        });
        break;

      case 'NUM':
        btn.className = 'osk-key osk-mod';
        btn.textContent = '123';
        btn.addEventListener('pointerdown', e => { e.preventDefault(); isNums = true; isSym = false; buildRows(); });
        break;

      case 'SYM':
        btn.className = 'osk-key osk-mod';
        btn.textContent = '#+=';
        btn.addEventListener('pointerdown', e => { e.preventDefault(); isSym = true; buildRows(); });
        break;

      case 'ABC':
        btn.className = 'osk-key osk-mod';
        btn.textContent = 'ABC';
        btn.addEventListener('pointerdown', e => { e.preventDefault(); isNums = false; isSym = false; buildRows(); });
        break;

      default:
        btn.className = 'osk-key';
        btn.textContent = k;
        btn.addEventListener('pointerdown', e => {
          e.preventDefault();
          insert(k);
          if (isShift && !isCaps) { isShift = false; buildRows(); }
        });
    }
    return btn;
  }

  /* ── TEXT OPS ── */
  function insert(ch) {
    if (!targetInput) return;
    const s = targetInput.selectionStart, e = targetInput.selectionEnd;
    const v = targetInput.value;
    targetInput.value = v.slice(0, s) + ch + v.slice(e);
    targetInput.selectionStart = targetInput.selectionEnd = s + ch.length;
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function del() {
    if (!targetInput) return;
    const s = targetInput.selectionStart, e = targetInput.selectionEnd;
    const v = targetInput.value;
    if (s === e && s > 0) {
      targetInput.value = v.slice(0, s - 1) + v.slice(e);
      targetInput.selectionStart = targetInput.selectionEnd = s - 1;
    } else if (s !== e) {
      targetInput.value = v.slice(0, s) + v.slice(e);
      targetInput.selectionStart = targetInput.selectionEnd = s;
    }
    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /* ── PUBLIC API ── */
  function show(el) {
    inject();
    targetInput = el;
    isShift = false; isCaps = false; isNums = false; isSym = false;
    isVisible = true;
    buildRows();
    const osk = document.getElementById('noto-osk');
    osk.offsetHeight; // force reflow
    osk.classList.add('osk-visible');
  }

  function hide() {
    const osk = document.getElementById('noto-osk');
    if (osk) osk.classList.remove('osk-visible');
    targetInput = null;
    isVisible = false;
  }

  function toggle(el) { isVisible ? hide() : show(el); }
  function visible() { return isVisible; }

  /* ── AUTO-ATTACH ── */
  document.addEventListener('focusin', e => {
    const el = e.target;
    if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.dataset.osk === 'true') show(el);
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