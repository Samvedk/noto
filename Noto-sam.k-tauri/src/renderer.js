cat > /mnt/user-data/outputs/renderer.js << 'EOF'
// ============================================================
// RENDERER.JS — Noto v1.0 — Central Brain
// Storage, Navigation, Settings, Toast, Clock, Utilities
// ============================================================

const NOTO_KEYS = {
  grades:    'noto_grades',
  subjects:  id  => 'noto_subjects_'  + id,
  notebooks: id  => 'noto_notebooks_' + id,
  pages:     id  => 'noto_pages_'     + id,
  settings:  'noto_settings',
  session: {
    grade:    'noto_cur_grade',
    subject:  'noto_cur_subject',
    notebook: 'noto_cur_notebook',
  }
};

// ── Session ──────────────────────────────────────────────────
function notoGetCurrentGrade()     { return sessionStorage.getItem(NOTO_KEYS.session.grade)    || ''; }
function notoGetCurrentSubject()   { return sessionStorage.getItem(NOTO_KEYS.session.subject)  || ''; }
function notoGetCurrentNb()        { return sessionStorage.getItem(NOTO_KEYS.session.notebook) || ''; }
function notoSetCurrentGrade(id)   { sessionStorage.setItem(NOTO_KEYS.session.grade,    id); }
function notoSetCurrentSubject(id) { sessionStorage.setItem(NOTO_KEYS.session.subject,  id); }
function notoSetCurrentNb(id)      { sessionStorage.setItem(NOTO_KEYS.session.notebook, id); }

// ── Grades ────────────────────────────────────────────────────
function notoLoadGrades()         { try { return JSON.parse(localStorage.getItem(NOTO_KEYS.grades) || '[]'); } catch(e) { return []; } }
function notoSaveGrades(g)        { localStorage.setItem(NOTO_KEYS.grades, JSON.stringify(g)); }

// ── Subjects ──────────────────────────────────────────────────
function notoLoadSubjects(gid)    { try { return JSON.parse(localStorage.getItem(NOTO_KEYS.subjects(gid))  || '[]'); } catch(e) { return []; } }
function notoSaveSubjects(gid, s) { localStorage.setItem(NOTO_KEYS.subjects(gid), JSON.stringify(s)); }

// ── Notebooks ─────────────────────────────────────────────────
function notoLoadNotebooks(sid)   { try { return JSON.parse(localStorage.getItem(NOTO_KEYS.notebooks(sid)) || '[]'); } catch(e) { return []; } }
function notoSaveNotebooks(sid,n) { localStorage.setItem(NOTO_KEYS.notebooks(sid), JSON.stringify(n)); }

// ── Pages ─────────────────────────────────────────────────────
function notoLoadPages(nid)       { try { return JSON.parse(localStorage.getItem(NOTO_KEYS.pages(nid)) || '{}'); } catch(e) { return {}; } }
function notoSavePages(nid, p)    { localStorage.setItem(NOTO_KEYS.pages(nid), JSON.stringify(p)); }

// ── Settings ──────────────────────────────────────────────────
const NOTO_DEFAULTS = {
  theme:               'light',
  uiFontSize:          'medium',
  defaultTextSize:     'medium',
  pressureSensitivity: true,
  palmRejection:       true,
  handedness:          'right',
  defaultPageType:     'lined',
  autoDateStamp:       false,
  defaultPenSize:      3,
  defaultPenColor:     '#000000',
  autosaveInterval:    30,
  deviceName:          'Noto Device',
  screenTimeout:       5,
  highContrast:        false,
  reducedMotion:       false,
};

function notoLoadSettings() {
  try {
    return Object.assign({}, NOTO_DEFAULTS, JSON.parse(localStorage.getItem(NOTO_KEYS.settings) || '{}'));
  } catch(e) { return Object.assign({}, NOTO_DEFAULTS); }
}
function notoSaveSettings(s)       { localStorage.setItem(NOTO_KEYS.settings, JSON.stringify(s)); }
function notoUpdateSetting(k, v)   { const s = notoLoadSettings(); s[k] = v; notoSaveSettings(s); notoApplyTheme(s.theme); }
function notoApplyTheme(theme)     { document.documentElement.removeAttribute('data-theme'); if (theme && theme !== 'light') document.documentElement.setAttribute('data-theme', theme); }

// Apply theme on load
(function(){ notoApplyTheme(notoLoadSettings().theme); })();

// ── Navigation ────────────────────────────────────────────────
function notoNavigate(page) {
  const o = document.getElementById('transitionOverlay');
  if (o) { o.classList.add('active'); setTimeout(() => { window.location.href = page; }, 440); }
  else window.location.href = page;
}

window.addEventListener('load', () => {
  const o = document.getElementById('transitionOverlay');
  if (!o) return;
  o.style.transform = 'translateY(-100%)'; o.style.transition = 'none';
  setTimeout(() => { o.style.transition = 'transform 0.44s cubic-bezier(0.7,0,0.3,1)'; o.style.transform = 'translateY(-200%)'; }, 40);
});

// ── Toast ─────────────────────────────────────────────────────
let _toastTimer = null;
function notoToast(msg, ms) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg; el.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), ms || 2000);
}

// ── Autosave indicator ────────────────────────────────────────
function notoSaveStart() {
  const d = document.getElementById('saveDot'), l = document.getElementById('saveLabel');
  if (d) d.className = 'save-dot saving';
  if (l) l.textContent = 'Saving...';
}
function notoSaveDone() {
  const d = document.getElementById('saveDot'), l = document.getElementById('saveLabel');
  if (d) d.className = 'save-dot saved';
  if (l) l.textContent = 'Saved';
  setTimeout(() => { if (d) d.className = 'save-dot'; }, 2200);
}

// ── Clock ─────────────────────────────────────────────────────
function notoStartClock(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const tick = () => { const n = new Date(); el.textContent = String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0'); };
  tick(); setInterval(tick, 1000);
}

// ── Date helpers ──────────────────────────────────────────────
function notoToday()     { return new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }); }
function notoTodayISO()  { const n = new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'); }
function notoFormatDate(iso) { if (!iso) return ''; const [y,m,d] = iso.split('-'); return d+' '+['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]+' '+y; }

// ── Utilities ─────────────────────────────────────────────────
function notoId()        { return 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2,6); }
function notoEsc(s)      { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function notoStorageUsage() { let t=0; for (let k in localStorage) if (localStorage.hasOwnProperty(k)) t+=(localStorage[k].length+k.length)*2; return t; }
function notoFormatBytes(b) { if (b<1024) return b+' B'; if (b<1048576) return (b/1024).toFixed(1)+' KB'; return (b/1048576).toFixed(2)+' MB'; }
function notoFactoryReset() { Object.keys(localStorage).filter(k=>k.startsWith('noto_')).forEach(k=>localStorage.removeItem(k)); sessionStorage.clear(); }
EOF
echo "renderer.js: $(wc -l < /mnt/user-data/outputs/renderer.js) lines"