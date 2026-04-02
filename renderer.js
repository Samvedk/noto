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

// ── IndexedDB Engine (The "1GB+ Capacity" Upgrade) ────────────
const _DB_NAME = 'NotoDB';
const _DB_STORE = 'notebooks';
const _DB_VER = 1;

const notoDb = {
  _db: null,
  async open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(_DB_NAME, _DB_VER);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(_DB_STORE)) {
          db.createObjectStore(_DB_STORE);
        }
      };
      req.onsuccess = e => { this._db = e.target.result; resolve(this._db); };
      req.onerror = e => reject(e.target.error);
    });
  },
  async get(key, def) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(_DB_STORE, 'readonly');
      const req = tx.objectStore(_DB_STORE).get(key);
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : def);
      req.onerror = () => reject(req.error);
    });
  },
  async set(key, val) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(_DB_STORE, 'readwrite');
      tx.objectStore(_DB_STORE).put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  async remove(key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(_DB_STORE, 'readwrite');
      tx.objectStore(_DB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
  async clear() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(_DB_STORE, 'readwrite');
      tx.objectStore(_DB_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
};

// ── Migration Utility (localStorage -> IndexedDB) ─────────────
async function notoMigrateIfNeeded() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('noto_'));
  if (!keys.length) return;
  for (const k of keys) {
    try {
      const valText = localStorage.getItem(k);
      const val = JSON.parse(valText);
      await notoDb.set(k, val);
      localStorage.removeItem(k);
    } catch(e) { console.error('Migration failed for key:', k, e); }
  }
}

// ── Session ──────────────────────────────────────────────────
function notoGetCurrentGrade()     { return sessionStorage.getItem(NOTO_KEYS.session.grade)    || ''; }
function notoGetCurrentSubject()   { return sessionStorage.getItem(NOTO_KEYS.session.subject)  || ''; }
function notoGetCurrentNb()        { return sessionStorage.getItem(NOTO_KEYS.session.notebook) || ''; }
function notoSetCurrentGrade(id)   { sessionStorage.setItem(NOTO_KEYS.session.grade,    id); }
function notoSetCurrentSubject(id) { sessionStorage.setItem(NOTO_KEYS.session.subject,  id); }
function notoSetCurrentNb(id)      { sessionStorage.setItem(NOTO_KEYS.session.notebook, id); }

// ── Grades ────────────────────────────────────────────────────
async function notoLoadGrades()         { return await notoDb.get(NOTO_KEYS.grades, []); }
async function notoSaveGrades(g)        { await notoDb.set(NOTO_KEYS.grades, g); }

async function notoAddGrade(name, emoji, extra) {
  const grades = await notoLoadGrades();
  const grade = {
    id:         notoId(),
    name:       name,
    emoji:      emoji || '📖',
    extra:      !!extra,
    subjects:   0,
    lastEdited: notoToday(),
    created:    notoTodayISO()
  };
  grades.push(grade);
  await notoSaveGrades(grades);
  return grade;
}

async function notoUpdateGrade(gradeId, updates) {
  const grades = await notoLoadGrades();
  const idx = grades.findIndex(g => g.id === gradeId);
  if (idx === -1) return null;
  Object.assign(grades[idx], updates, { lastEdited: notoToday() });
  await notoSaveGrades(grades);
  return grades[idx];
}

async function notoDeleteGrade(gradeId) {
  let grades = await notoLoadGrades();
  const subjects = await notoLoadSubjects(gradeId);
  for (const s of subjects) {
    const notebooks = await notoLoadNotebooks(s.id);
    for (const nb of notebooks) {
      await notoDb.remove(NOTO_KEYS.pages(nb.id));
    }
    await notoDb.remove(NOTO_KEYS.notebooks(s.id));
  }
  await notoDb.remove(NOTO_KEYS.subjects(gradeId));
  grades = grades.filter(g => g.id !== gradeId);
  await notoSaveGrades(grades);
}

// ── Subjects ──────────────────────────────────────────────────
async function notoLoadSubjects(gid)    { return await notoDb.get(NOTO_KEYS.subjects(gid), []); }
async function notoSaveSubjects(gid, s) { await notoDb.set(NOTO_KEYS.subjects(gid), s); }

async function notoAddSubject(gradeId, name, emoji) {
  const subjects = await notoLoadSubjects(gradeId);
  const subject = {
    id:         notoId(),
    name:       name,
    emoji:      emoji || '📖',
    notebooks:  0,
    lastEdited: notoToday(),
    created:    notoTodayISO()
  };
  subjects.push(subject);
  await notoSaveSubjects(gradeId, subjects);
  const grades = await notoLoadGrades();
  const gIdx = grades.findIndex(g => g.id === gradeId);
  if (gIdx !== -1) {
    grades[gIdx].subjects = subjects.length;
    grades[gIdx].lastEdited = notoToday();
    await notoSaveGrades(grades);
  }
  return subject;
}

async function notoUpdateSubject(gradeId, subjectId, updates) {
  const subjects = await notoLoadSubjects(gradeId);
  const idx = subjects.findIndex(s => s.id === subjectId);
  if (idx === -1) return null;
  Object.assign(subjects[idx], updates, { lastEdited: notoToday() });
  await notoSaveSubjects(gradeId, subjects);
  return subjects[idx];
}

async function notoDeleteSubject(gradeId, subjectId) {
  let subjects = await notoLoadSubjects(gradeId);
  const notebooks = await notoLoadNotebooks(subjectId);
  for (const nb of notebooks) {
    await notoDb.remove(NOTO_KEYS.pages(nb.id));
  }
  await notoDb.remove(NOTO_KEYS.notebooks(subjectId));
  subjects = subjects.filter(s => s.id !== subjectId);
  await notoSaveSubjects(gradeId, subjects);
  const grades = await notoLoadGrades();
  const gIdx = grades.findIndex(g => g.id === gradeId);
  if (gIdx !== -1) {
    grades[gIdx].subjects = subjects.length;
    grades[gIdx].lastEdited = notoToday();
    await notoSaveGrades(grades);
  }
}

// ── Notebooks ─────────────────────────────────────────────────
async function notoLoadNotebooks(sid)   { return await notoDb.get(NOTO_KEYS.notebooks(sid), []); }
async function notoSaveNotebooks(sid,n) { await notoDb.set(NOTO_KEYS.notebooks(sid), n); }

async function notoAddNotebook(subjectId, gradeId, name, emoji, type) {
  const notebooks = await notoLoadNotebooks(subjectId);
  const notebook = {
    id:         notoId(),
    name:       name,
    emoji:      emoji || '📓',
    type:       type || 'theory',
    pageCount:  1,
    lastEdited: notoToday(),
    created:    notoTodayISO()
  };
  notebooks.push(notebook);
  await notoSaveNotebooks(subjectId, notebooks);
  const subjects = await notoLoadSubjects(gradeId);
  const sIdx = subjects.findIndex(s => s.id === subjectId);
  if (sIdx !== -1) {
    subjects[sIdx].notebooks = notebooks.length;
    subjects[sIdx].lastEdited = notoToday();
    await notoSaveSubjects(gradeId, subjects);
  }
  return notebook;
}

async function notoUpdateNotebook(subjectId, notebookId, updates) {
  const notebooks = await notoLoadNotebooks(subjectId);
  const idx = notebooks.findIndex(n => n.id === notebookId);
  if (idx === -1) return null;
  Object.assign(notebooks[idx], updates, { lastEdited: notoToday() });
  await notoSaveNotebooks(subjectId, notebooks);
  return notebooks[idx];
}

async function notoDeleteNotebook(subjectId, gradeId, notebookId) {
  let notebooks = await notoLoadNotebooks(subjectId);
  await notoDb.remove(NOTO_KEYS.pages(notebookId));
  notebooks = notebooks.filter(n => n.id !== notebookId);
  await notoSaveNotebooks(subjectId, notebooks);
  const subjects = await notoLoadSubjects(gradeId);
  const sIdx = subjects.findIndex(s => s.id === subjectId);
  if (sIdx !== -1) {
    subjects[sIdx].notebooks = notebooks.length;
    subjects[sIdx].lastEdited = notoToday();
    await notoSaveSubjects(gradeId, subjects);
  }
}

// ── Pages ─────────────────────────────────────────────────────
async function notoLoadPages(nid)       { return await notoDb.get(NOTO_KEYS.pages(nid), {}); }
async function notoSavePages(nid, p)    { await notoDb.set(NOTO_KEYS.pages(nid), p); }

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

async function notoLoadSettings() {
  try {
    const s = await notoDb.get(NOTO_KEYS.settings, {});
    return Object.assign({}, NOTO_DEFAULTS, s);
  } catch(e) { return Object.assign({}, NOTO_DEFAULTS); }
}
async function notoSaveSettings(s)       { await notoDb.set(NOTO_KEYS.settings, s); }
async function notoUpdateSetting(k, v)   { const s = await notoLoadSettings(); s[k] = v; await notoSaveSettings(s); notoApplyTheme(s.theme); }
function notoApplyTheme(theme)     { document.documentElement.removeAttribute('data-theme'); if (theme && theme !== 'light') document.documentElement.setAttribute('data-theme', theme); }

// ── Diagnostics & Utility ───────────────────────────────────────
async function notoStorageUsage() { 
  if (!window.navigator || !window.navigator.storage || !window.navigator.storage.estimate) return 0;
  const est = await window.navigator.storage.estimate();
  return est.usage || 0;
}

function notoFormatBytes(b) {
  if (b<1024) return b+' B';
  if (b<1048576) return (b/1024).toFixed(1)+' KB';
  return (b/1048576).toFixed(2)+' MB';
}

async function notoExportAllData() {
  const db = await notoDb.open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(_DB_STORE, 'readonly');
    const store = tx.objectStore(_DB_STORE);
    const req = store.getAll();
    const keysReq = store.getAllKeys();
    req.onsuccess = () => {
      const data = {};
      const items = req.result;
      keysReq.onsuccess = () => {
        const keys = keysReq.result;
        keys.forEach((k, i) => data[k] = items[i]);
        resolve(data);
      };
    };
    req.onerror = () => reject(req.error);
  });
}

async function notoFactoryReset() {
  await notoDb.clear();
  sessionStorage.clear();
  localStorage.clear();
}

// Apply theme & run migration on startup
(async function startup() { 
  try {
    await notoMigrateIfNeeded();
    const s = await notoLoadSettings();
    notoApplyTheme(s.theme);
  } catch(e) { console.error('Startup failed:', e); }
})();

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
  if (d) d.className = 'sv-dot saving';
  if (l) l.textContent = 'Saving...';
}
function notoSaveDone() {
  const d = document.getElementById('saveDot'), l = document.getElementById('saveLabel');
  if (d) d.className = 'sv-dot saved';
  if (l) l.textContent = 'Saved';
  setTimeout(() => { if (d) d.className = 'sv-dot'; }, 2200);
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
function notoEsc(s)      { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function notoId()        { return 'noto_' + Math.random().toString(36).substr(2, 9); }
