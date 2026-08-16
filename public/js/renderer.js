// ============================================================
// RENDERER.JS — Noto v1.0 — Central Brain
// Storage, Navigation, Settings, Toast, Clock, Utilities
// ============================================================

// ── iPad/Safari Native App Behavior ──────────────────────────
// Block all browser-level touch behaviors that break the
// native-app feel on iPad Safari and Electron.
(function notoNativeBehavior() {
  // 1. Block context menu (right-click / long-press menu)
  document.addEventListener('contextmenu', e => e.preventDefault(), { passive: false });

  // 2. Block text selection via selectstart
  document.addEventListener('selectstart', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    e.preventDefault();
  }, { passive: false });

  // 3. Block drag on images, links, and other elements
  document.addEventListener('dragstart', e => e.preventDefault(), { passive: false });

  // 4. Block double-tap zoom on iOS Safari (except on drawing canvas)
  let lastTouchEnd = 0;
  document.addEventListener('touchend', e => {
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'canvas' || e.target.closest && (e.target.closest('.ca') || e.target.closest('.ps'))) return;
    const now = Date.now();
    if (now - lastTouchEnd <= 300) e.preventDefault();
    lastTouchEnd = now;
  }, { passive: false });

  // 5. Block iOS Safari magnifying glass on long-press
  document.addEventListener('touchstart', e => {}, { passive: true });
})();

// ── notoConfirm() — Custom modal replacement for confirm() ──
// Returns a Promise<boolean>. Works in kiosk mode unlike confirm().
function notoConfirm(message, opts = {}) {
  return new Promise(resolve => {
    const confirmText = opts.confirm || 'Confirm';
    const cancelText  = opts.cancel  || 'Cancel';

    // Create backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'pg-modal-backdrop visible';
    backdrop.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:99999;display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s ease;';

    // Create modal
    const modal = document.createElement('div');
    modal.style.cssText = 'background:var(--paper-surface,#fff);border-radius:16px;padding:28px 24px 20px;max-width:380px;width:90%;box-shadow:0 24px 72px rgba(0,0,0,0.18);transform:scale(0.92);transition:transform .25s cubic-bezier(0.34,1.56,0.64,1);';

    modal.innerHTML = `
      <div style="font-size:16px;font-weight:600;color:var(--ink-primary,#222);margin-bottom:12px;line-height:1.45;">${message}</div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px;">
        <button id="_nc_cancel" style="padding:8px 20px;border:1.5px solid var(--glass-border,#ddd);border-radius:9999px;background:transparent;font-size:13px;font-weight:500;cursor:pointer;color:var(--ink-secondary,#666);transition:all .15s;">${cancelText}</button>
        <button id="_nc_confirm" style="padding:8px 20px;border:none;border-radius:9999px;background:var(--ink-primary,#222);color:#fff;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;">${confirmText}</button>
      </div>
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    // Animate in
    requestAnimationFrame(() => {
      backdrop.style.opacity = '1';
      modal.style.transform = 'scale(1)';
    });

    function cleanup(result) {
      backdrop.style.opacity = '0';
      modal.style.transform = 'scale(0.92)';
      setTimeout(() => { backdrop.remove(); resolve(result); }, 200);
    }

    modal.querySelector('#_nc_cancel').addEventListener('click', () => cleanup(false));
    modal.querySelector('#_nc_confirm').addEventListener('click', () => cleanup(true));
    backdrop.addEventListener('click', e => { if (e.target === backdrop) cleanup(false); });
  });
}

const NOTO_KEYS = {
  grades: 'noto_grades',
  subjects: id => 'noto_subjects_' + id,
  notebooks: id => 'noto_notebooks_' + id,
  pages: id => 'noto_pages_' + id,
  settings: 'noto_settings',
  habitDefs: 'noto_habit_defs',
  habitLogs: 'noto_habit_logs',
  todos: id => 'noto_todos_' + id,
  focusLogs: 'noto_focus_logs',
  achievements: 'noto_achievements',
  session: {
    grade: 'noto_cur_grade',
    subject: 'noto_cur_subject',
    notebook: 'noto_cur_notebook',
  },
  exams: [],
  adminPin: null, // B2B default
  exam: 'noto_exam'
};

// ── IndexedDB Engine (The "1GB+ Capacity" Upgrade) ────────────
const _DB_NAME = 'NotoDB_v2';
const _DB_STORE = 'notebooks';
const _DB_VER = 1;

// ── IndexedDB Recovery Screen ─────────────────────────────────
function showRecoveryScreen(errorMessage) {
  // Remove existing overlay if any
  const existing = document.getElementById('noto-recovery-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'noto-recovery-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:999999;background:#111118;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';

  overlay.innerHTML = `
    <div style="text-align:center;max-width:440px;padding:32px 24px;">
      <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 8px;">Storage Error</h1>
      <p style="color:#ff6b6b;font-size:14px;line-height:1.6;margin:0 0 24px;word-break:break-word;">${errorMessage || 'An unknown database error occurred.'}</p>
      <p style="color:#888;font-size:13px;line-height:1.5;margin:0 0 28px;">Noto could not access its local database. This can happen if storage is full, permissions were denied, or the database is corrupted.</p>
      <div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap;">
        <button id="noto-recovery-retry" style="padding:10px 28px;border:none;border-radius:9999px;background:#4a6cf7;color:#fff;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .15s;">Retry</button>
        <button id="noto-recovery-reset" style="padding:10px 28px;border:2px solid #ff6b6b;border-radius:9999px;background:transparent;color:#ff6b6b;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .15s;">Force Reset</button>
      </div>
      <p id="noto-recovery-reset-warn" style="color:#ff6b6b;font-size:11px;margin-top:16px;display:none;">⚠ Force Reset will delete ALL your notebooks and data. This cannot be undone.</p>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#noto-recovery-retry').addEventListener('click', () => {
    location.reload();
  });

  const resetBtn = overlay.querySelector('#noto-recovery-reset');
  const resetWarn = overlay.querySelector('#noto-recovery-reset-warn');
  let resetConfirmed = false;

  resetBtn.addEventListener('click', () => {
    if (!resetConfirmed) {
      // First click: show warning, require second click
      resetConfirmed = true;
      resetWarn.style.display = 'block';
      resetBtn.textContent = 'Confirm Reset';
      resetBtn.style.background = '#ff6b6b';
      resetBtn.style.color = '#fff';
      return;
    }
    // Second click: delete database and reload
    try {
      const delReq = indexedDB.deleteDatabase(_DB_NAME);
      delReq.onsuccess = () => location.reload();
      delReq.onerror = () => location.reload();
      delReq.onblocked = () => location.reload();
    } catch (_e) {
      location.reload();
    }
  });
}

const notoDb = {
  _db: null,
  async open() {
    if (this._db) return this._db;
    return new Promise((resolve, reject) => {
      let req;
      try {
        req = indexedDB.open(_DB_NAME, _DB_VER);
      } catch (e) {
        showRecoveryScreen('Failed to open database: ' + (e.message || e));
        return reject(e);
      }
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(_DB_STORE)) {
          db.createObjectStore(_DB_STORE);
        }
      };
      req.onsuccess = e => { this._db = e.target.result; resolve(this._db); };
      req.onerror = e => {
        const err = e.target.error;
        showRecoveryScreen('Database error: ' + (err ? err.message || err.name : 'Unknown error'));
        reject(err);
      };
      req.onblocked = () => {
        showRecoveryScreen('Database is blocked by another tab or window. Please close other Noto tabs and retry.');
      };
    });
  },
  async get(key, def) {
    try {
      const db = await this.open();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(_DB_STORE, 'readonly');
        const req = tx.objectStore(_DB_STORE).get(key);
        req.onsuccess = () => resolve(req.result !== undefined ? req.result : def);
        req.onerror = () => reject(req.error);
      });
    } catch (e) {
      console.error('[NotoDb] get() failed for key "' + key + '":', e);
      if (typeof notoToast === 'function') notoToast('Storage read failed — using defaults', 2500);
      return def;
    }
  },
  async set(key, val) {
    try {
      const db = await this.open();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(_DB_STORE, 'readwrite');
        tx.objectStore(_DB_STORE).put(val, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) {
      console.error('[NotoDb] set() failed for key "' + key + '":', e);
      if (typeof notoToast === 'function') notoToast('Storage write failed — changes may not be saved', 2500);
    }
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
    } catch (e) { console.error('Migration failed for key:', k, e); }
  }
}

// ── Session ──────────────────────────────────────────────────
// ── Session (persistent across page loads on Android) ─────────
function notoGetCurrentGrade() { return localStorage.getItem(NOTO_KEYS.session.grade) || ''; }
function notoGetCurrentSubject() { return localStorage.getItem(NOTO_KEYS.session.subject) || ''; }
function notoGetCurrentNb() { return localStorage.getItem(NOTO_KEYS.session.notebook) || ''; }
function notoSetCurrentGrade(id) { localStorage.setItem(NOTO_KEYS.session.grade, id); }
function notoSetCurrentSubject(id) { localStorage.setItem(NOTO_KEYS.session.subject, id); }
function notoSetCurrentNb(id) { localStorage.setItem(NOTO_KEYS.session.notebook, id); }

// ── Grades ────────────────────────────────────────────────────
async function notoLoadGrades() { return await notoDb.get(NOTO_KEYS.grades, []); }
async function notoSaveGrades(g) { await notoDb.set(NOTO_KEYS.grades, g); }

async function notoAddGrade(name, emoji, extra) {
  const grades = await notoLoadGrades();
  const grade = {
    id: notoId(),
    name: name,
    emoji: emoji || '📖',
    extra: !!extra,
    subjects: 0,
    lastEdited: notoToday(),
    created: notoTodayISO()
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
    await notoDeleteMaterial(s.id);
  }
  await notoDb.remove(NOTO_KEYS.subjects(gradeId));
  grades = grades.filter(g => g.id !== gradeId);
  await notoSaveGrades(grades);
}

// ── Subjects ──────────────────────────────────────────────────
async function notoLoadSubjects(gid) { return await notoDb.get(NOTO_KEYS.subjects(gid), []); }
async function notoSaveSubjects(gid, s) { await notoDb.set(NOTO_KEYS.subjects(gid), s); }

async function notoAddSubject(gradeId, name, emoji) {
  const subjects = await notoLoadSubjects(gradeId);
  const subject = {
    id: notoId(),
    name: name,
    emoji: emoji || '📖',
    notebooks: 0,
    lastEdited: notoToday(),
    created: notoTodayISO()
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
  await notoDeleteMaterial(subjectId);
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
async function notoLoadNotebooks(sid) { return await notoDb.get(NOTO_KEYS.notebooks(sid), []); }
async function notoSaveNotebooks(sid, n) { await notoDb.set(NOTO_KEYS.notebooks(sid), n); }

async function notoAddNotebook(subjectId, gradeId, name, emoji, type, coverTheme) {
  const notebooks = await notoLoadNotebooks(subjectId);
  const notebook = {
    id: notoId(),
    name: name,
    emoji: emoji || '📓',
    type: type || 'theory',
    coverTheme: coverTheme || 'midnight',
    pageCount: 1,
    lastEdited: notoToday(),
    created: notoTodayISO()
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
async function notoLoadPages(nid) { return await notoDb.get(NOTO_KEYS.pages(nid), {}); }
async function notoSavePages(nid, p) { await notoDb.set(NOTO_KEYS.pages(nid), p); }

// ── Habits ────────────────────────────────────────────────────
async function notoLoadHabitDefs() { return await notoDb.get(NOTO_KEYS.habitDefs, []); }
async function notoSaveHabitDefs(d) { await notoDb.set(NOTO_KEYS.habitDefs, d); }
async function notoLoadHabitLogs() { return await notoDb.get(NOTO_KEYS.habitLogs, {}); }
async function notoSaveHabitLogs(l) { await notoDb.set(NOTO_KEYS.habitLogs, l); }

async function notoAddHabitDef(name, emoji) {
  const defs = await notoLoadHabitDefs();
  const habit = { id: notoId(), name, emoji: emoji || '✅', created: notoTodayISO() };
  defs.push(habit);
  await notoSaveHabitDefs(defs);
  return habit;
}

async function notoDeleteHabitDef(id) {
  let defs = await notoLoadHabitDefs();
  defs = defs.filter(d => d.id !== id);
  await notoSaveHabitDefs(defs);
  let logs = await notoLoadHabitLogs();
  delete logs[id];
  await notoSaveHabitLogs(logs);
}

async function notoToggleHabitLog(habitId, isoDate) {
  const logs = await notoLoadHabitLogs();
  if (!logs[habitId]) logs[habitId] = {};
  logs[habitId][isoDate] = !logs[habitId][isoDate];
  await notoSaveHabitLogs(logs);
  return logs[habitId][isoDate];
}

// ── To-Dos ────────────────────────────────────────────────────
async function notoLoadTodos(ctxId) { return await notoDb.get(NOTO_KEYS.todos(ctxId), []); }
async function notoSaveTodos(ctxId, t) { await notoDb.set(NOTO_KEYS.todos(ctxId), t); }

// ── Deep Work Engine: Focus Sessions ──────────────────────────
async function notoLoadFocusLogs() { return await notoDb.get(NOTO_KEYS.focusLogs, []); }
async function notoSaveFocusLogs(l) { await notoDb.set(NOTO_KEYS.focusLogs, l); }

async function notoSaveFocusSession(session) {
  const logs = await notoLoadFocusLogs();
  logs.push(session);
  await notoSaveFocusLogs(logs);
  // After saving, process achievements
  await notoProcessAchievements(logs);
  return logs;
}

// ── Achievement Engine ────────────────────────────────────────
const NOTO_BADGE_DEFS = [
  { id: 'first_focus', name: 'First Focus', desc: 'Complete your first focus session', icon: '🔥', xp: 50, check: logs => logs.length >= 1 },
  { id: 'focus_5', name: 'Getting Warmed Up', desc: 'Complete 5 focus sessions', icon: '⚡', xp: 100, check: logs => logs.length >= 5 },
  { id: 'focus_25', name: 'Focus Warrior', desc: 'Complete 25 focus sessions', icon: '⚔️', xp: 250, check: logs => logs.length >= 25 },
  { id: 'focus_100', name: 'Deep Work Legend', desc: 'Complete 100 focus sessions', icon: '👑', xp: 500, check: logs => logs.length >= 100 },
  { id: 'hour_1', name: 'Hour of Power', desc: 'Complete a 1-hour focus session', icon: '💪', xp: 150, check: logs => logs.some(l => l.duration >= 3600) },
  { id: 'hour_2', name: 'Unstoppable', desc: 'Complete a 2-hour focus session', icon: '🚀', xp: 300, check: logs => logs.some(l => l.duration >= 7200) },
  { id: 'streak_3', name: '3-Day Streak', desc: 'Focus 3 days in a row', icon: '🔗', xp: 200, check: logs => notoCalcStreak(logs) >= 3 },
  { id: 'streak_7', name: 'Week Warrior', desc: 'Focus 7 days in a row', icon: '💎', xp: 400, check: logs => notoCalcStreak(logs) >= 7 },
  { id: 'streak_30', name: 'Monthly Master', desc: 'Focus 30 days in a row', icon: '🏆', xp: 1000, check: logs => notoCalcStreak(logs) >= 30 },
  { id: 'total_10h', name: '10 Hours Deep', desc: 'Accumulate 10 hours of total focus', icon: '🧠', xp: 300, check: logs => logs.reduce((a, l) => a + l.duration, 0) >= 36000 },
  { id: 'total_50h', name: 'Scholar', desc: 'Accumulate 50 hours of total focus', icon: '📚', xp: 600, check: logs => logs.reduce((a, l) => a + l.duration, 0) >= 180000 },
  { id: 'total_100h', name: 'Centurion', desc: 'Accumulate 100 hours of total focus', icon: '🏛️', xp: 1000, check: logs => logs.reduce((a, l) => a + l.duration, 0) >= 360000 },
  { id: 'early_bird', name: 'Early Bird', desc: 'Start a focus session before 7 AM', icon: '🌅', xp: 150, check: logs => logs.some(l => { const h = new Date(l.startedAt).getHours(); return h < 7; }) },
  { id: 'night_owl', name: 'Night Owl', desc: 'Complete a focus session after 11 PM', icon: '🦉', xp: 150, check: logs => logs.some(l => { const h = new Date(l.endedAt).getHours(); return h >= 23; }) },
];

function notoCalcStreak(logs) {
  if (!logs.length) return 0;
  const days = new Set(logs.map(l => l.date));
  const sorted = [...days].sort().reverse();
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    prev.setDate(prev.getDate() - 1);
    if (prev.toISOString().split('T')[0] === sorted[i]) streak++;
    else break;
  }
  return streak;
}

function notoCalcLevel(xp) {
  // Level curve: each level needs progressively more XP
  // Level 1: 0, Level 2: 100, Level 3: 250, Level 4: 450...
  let level = 1, threshold = 0, step = 100;
  while (xp >= threshold + step) {
    threshold += step;
    level++;
    step = Math.round(step * 1.35);
  }
  return { level, currentXP: xp - threshold, nextLevelXP: step, totalXP: xp };
}

const NOTO_LEVEL_TITLES = [
  'Beginner',       // 1
  'Apprentice',     // 2
  'Focused',        // 3
  'Disciplined',    // 4
  'Scholar',        // 5
  'Strategist',     // 6
  'Prodigy',        // 7
  'Master',         // 8
  'Grandmaster',    // 9
  'Legend',         // 10+
];

async function notoLoadAchievements() { return await notoDb.get(NOTO_KEYS.achievements, { unlockedIds: [], xp: 0 }); }
async function notoSaveAchievements(a) { await notoDb.set(NOTO_KEYS.achievements, a); }

async function notoProcessAchievements(logs) {
  const ach = await notoLoadAchievements();
  const newlyUnlocked = [];
  for (const badge of NOTO_BADGE_DEFS) {
    if (ach.unlockedIds.includes(badge.id)) continue;
    try {
      if (badge.check(logs)) {
        ach.unlockedIds.push(badge.id);
        ach.xp += badge.xp;
        newlyUnlocked.push(badge);
      }
    } catch (e) { /* safety */ }
  }
  await notoSaveAchievements(ach);
  return newlyUnlocked;
}



// ── Settings ──────────────────────────────────────────────────
const NOTO_DEFAULTS = {
  theme: 'light',
  uiFontSize: 'medium',
  defaultTextSize: 'medium',
  pressureSensitivity: true,
  palmRejection: true,
  handedness: 'right',
  defaultPageType: 'lined',
  autoDateStamp: false,
  defaultPenSize: 3,
  defaultPenColor: '#000000',
  autosaveInterval: 30,
  deviceName: 'Noto Device',
  screenTimeout: 5,
  highContrast: false,
  reducedMotion: false,
};

async function notoLoadSettings() {
  try {
    const s = await notoDb.get(NOTO_KEYS.settings, {});
    return Object.assign({}, NOTO_DEFAULTS, s);
  } catch (e) { return Object.assign({}, NOTO_DEFAULTS); }
}
async function notoSaveSettings(s) { await notoDb.set(NOTO_KEYS.settings, s); }
async function notoUpdateSetting(k, v) { const s = await notoLoadSettings(); s[k] = v; await notoSaveSettings(s); notoApplyTheme(s.theme); }
function notoApplyTheme(theme) { document.documentElement.removeAttribute('data-theme'); if (theme && theme !== 'light') document.documentElement.setAttribute('data-theme', theme); }

// ── Exam Center Storage ─────────────────────────────────────────
async function notoLoadExams() { return await notoDb.get(NOTO_KEYS.exam + '_list', []); }
async function notoSaveExams(e) { await notoDb.set(NOTO_KEYS.exam + '_list', e); }

async function notoAddExam(examData) {
  const exams = await notoLoadExams();
  const exam = {
    id: notoId(),
    created: notoTodayISO(),
    status: 'active', // active, submitted, checked
    pages: [], // array of page data strings
    supplementCount: 0,
    marks: { obtained: null, total: null, checkerName: '', checkerSignature: [] },
    checkAnnotations: {}, // pageIndex -> array of stamps
    ...examData // title, rollNo, name, prn, subject, duration, startTime
  };
  exams.push(exam);
  await notoSaveExams(exams);
  return exam;
}

async function notoUpdateExam(id, updates) {
  const exams = await notoLoadExams();
  const idx = exams.findIndex(e => e.id === id);
  if (idx > -1) {
    Object.assign(exams[idx], updates);
    await notoSaveExams(exams);
    return exams[idx];
  }
  return null;
}

async function notoGetExam(id) {
  const exams = await notoLoadExams();
  return exams.find(e => e.id === id);
}

async function notoDeleteExam(id) {
  let exams = await notoLoadExams();
  exams = exams.filter(e => e.id !== id);
  await notoSaveExams(exams);
}

// ── Diagnostics & Utility ───────────────────────────────────────
async function notoStorageUsage() {
  if (!window.navigator || !window.navigator.storage || !window.navigator.storage.estimate) return 0;
  const est = await window.navigator.storage.estimate();
  return est.usage || 0;
}

function notoFormatBytes(b) {
  if (b < 1024) return b + ' B';
  if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
  return (b / 1048576).toFixed(2) + ' MB';
}

async function notoExportAllData() {
  try {
    const db = await notoDb.open();
    const allData = await new Promise((resolve, reject) => {
      const tx = db.transaction(_DB_STORE, 'readonly');
      const store = tx.objectStore(_DB_STORE);
      const req = store.getAll();
      const keysReq = store.getAllKeys();
      req.onsuccess = () => {
        const items = req.result;
        keysReq.onsuccess = () => {
          const keys = keysReq.result;
          const data = {};
          keys.forEach((k, i) => data[k] = items[i]);
          resolve(data);
        };
        keysReq.onerror = () => reject(keysReq.error);
      };
      req.onerror = () => reject(req.error);
    });

    const backup = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      deviceName: (allData[NOTO_KEYS.settings] && allData[NOTO_KEYS.settings].deviceName) || 'Noto Device',
      data: allData
    };

    const jsonString = JSON.stringify(backup, null, 2);

    // Electron path: use native save dialog
    if (window.notoOS && typeof window.notoOS.exportData === 'function') {
      await window.notoOS.exportData(jsonString);
      if (typeof notoToast === 'function') notoToast('Backup exported successfully');
      return;
    }

    // Browser fallback: Blob download
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'noto-backup-' + notoTodayISO() + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (typeof notoToast === 'function') notoToast('Backup exported successfully');
  } catch (e) {
    console.error('Export failed:', e);
    if (typeof notoToast === 'function') notoToast('Export failed: ' + e.message);
  }
}

async function notoImportData() {
  try {
    let jsonString = null;

    // Electron path: use native open dialog
    if (window.notoOS && typeof window.notoOS.importData === 'function') {
      const result = await window.notoOS.importData();
      if (!result || !result.success) {
        return; // user cancelled
      }
      jsonString = result.data;
    } else {
      // Browser fallback: hidden file input
      jsonString = await new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.display = 'none';
        input.onchange = () => {
          const file = input.files[0];
          if (!file) { resolve(null); return; }
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsText(file);
        };
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
        // Handle cancel (no file selected after a delay)
        setTimeout(() => { if (!input.files || !input.files.length) resolve(null); }, 60000);
      });
    }

    if (!jsonString) return; // user cancelled

    let backup;
    try {
      backup = JSON.parse(jsonString);
    } catch (parseErr) {
      if (typeof notoToast === 'function') notoToast('Invalid backup file — could not parse JSON');
      return;
    }

    // Validate structure
    if (!backup.data || typeof backup.data !== 'object') {
      if (typeof notoToast === 'function') notoToast('Invalid backup file — missing data');
      return;
    }

    // Confirm overwrite
    const confirmed = await notoConfirm(
      'This will replace ALL existing data with the backup' +
      (backup.exportDate ? ' from ' + new Date(backup.exportDate).toLocaleDateString() : '') +
      '. This cannot be undone. Continue?',
      { confirm: 'Restore Backup', cancel: 'Cancel' }
    );
    if (!confirmed) return;

    // Clear existing data and write backup
    await notoDb.clear();
    const keys = Object.keys(backup.data);
    for (const key of keys) {
      await notoDb.set(key, backup.data[key]);
    }

    if (typeof notoToast === 'function') notoToast('Backup restored successfully — reloading...');
    setTimeout(() => { window.location.reload(); }, 1500);
  } catch (e) {
    console.error('Import failed:', e);
    if (typeof notoToast === 'function') notoToast('Import failed: ' + e.message);
  }
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
    
    // Save mode from URL query to localStorage if present
    const urlParams = new URLSearchParams(window.location.search);
    const modeParam = urlParams.get('mode');
    if (modeParam) {
      localStorage.setItem('noto_mode', modeParam);
    }
    
    const s = await notoLoadSettings();
    notoApplyTheme(s.theme);
    
    // Only import prebaked materials in B2B mode
    if (localStorage.getItem('noto_mode') === 'b2b') {
      await notoLoadPrebakedMaterials();
    }
  } catch (e) { console.error('Startup failed:', e); }
})();

// ── Navigation & Lockdown ────────────────────────────────────
let _notoExamActive = (localStorage.getItem('noto_exam_lockdown') === 'true');

function notoSetExam(isActive) {
  _notoExamActive = isActive;
  localStorage.setItem('noto_exam_lockdown', isActive ? 'true' : 'false');
}
function notoIsExamActive() { return _notoExamActive; }

// AUTO-LOCK: Redirect to exam paper if lockdown is active
if (_notoExamActive && !window.location.href.includes('exam.html')) {
  window.location.href = 'exam.html';
}

function notoNavigate(page) {
  if (_notoExamActive && page !== 'exam.html') {
    notoToast('Exam in progress. Navigation locked.');
    return;
  }
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
  const tick = () => { const n = new Date(); el.textContent = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); };
  tick(); setInterval(tick, 1000);
}

// ── Date helpers ──────────────────────────────────────────────
function notoToday() { return new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function notoTodayISO() { const n = new Date(); return n.getFullYear() + '-' + String(n.getMonth() + 1).padStart(2, '0') + '-' + String(n.getDate()).padStart(2, '0'); }
function notoFormatDate(iso) { if (!iso) return ''; const [y, m, d] = iso.split('-'); return d + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m - 1] + ' ' + y; }

// ── Utilities ─────────────────────────────────────────────────
function notoEsc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function notoId() { return 'noto_' + Math.random().toString(36).substr(2, 9); }

// ── Capacitor Integration (Hardware Interaction) ──────────────
(async function initCapacitor() {
  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    // 1. Status Bar Polish
    try {
      const { StatusBar } = await import('@capacitor/status-bar');
      await StatusBar.hide();
    } catch (e) { console.warn('StatusBar plugin not loaded'); }

    // 2. Hardware Back Button Handling
    try {
      const { App } = await import('@capacitor/app');
      App.addListener('backButton', ({ canGoBack }) => {
        const path = window.location.pathname;
        if (path.includes('index.html') || path.endsWith('/')) {
          App.exitApp();
        } else {
          // Check if we are in drawing mode, if so, maybe just exit drawing? 
          // For now, standard navigation back.
          window.history.back();
        }
      });
    } catch (e) { console.warn('App plugin not loaded'); }
  }
})();

// ── B2B Custom Study Material (Lazy Loaded) ─────────────────────
async function notoLoadMaterialMeta(subjectId) {
  const meta = await notoDb.get('noto_material_meta_' + subjectId, null);
  if (meta) return meta;
  const full = await notoDb.get('noto_material_' + subjectId, null);
  if (full && full.pages) {
    return { subjectId, pageCount: full.pages.length, legacy: true };
  }
  return { subjectId, pageCount: 0 };
}

async function notoLoadMaterialPage(subjectId, pageIdx) {
  const page = await notoDb.get(`noto_material_page_${subjectId}_${pageIdx}`, null);
  if (page) return page;
  const full = await notoDb.get('noto_material_' + subjectId, null);
  if (full && full.pages && full.pages[pageIdx]) {
    return full.pages[pageIdx];
  }
  return null;
}

async function notoLoadMaterial(subjectId) {
  const meta = await notoLoadMaterialMeta(subjectId);
  if (meta.legacy) {
    return await notoDb.get('noto_material_' + subjectId, { pages: [] });
  }
  const pages = [];
  for (let i = 0; i < meta.pageCount; i++) {
    const p = await notoLoadMaterialPage(subjectId, i);
    if (p) pages.push(p);
  }
  return { pages };
}

async function notoSaveMaterial(subjectId, material) {
  if (!material || !material.pages) return;
  const pageCount = material.pages.length;
  await notoDb.set('noto_material_meta_' + subjectId, { subjectId, pageCount, lastUpdated: Date.now() });
  for (let i = 0; i < pageCount; i++) {
    await notoDb.set(`noto_material_page_${subjectId}_${i}`, material.pages[i]);
  }
  await notoDb.set('noto_material_' + subjectId, material);
}

async function notoDeleteMaterial(subjectId) {
  const meta = await notoLoadMaterialMeta(subjectId);
  for (let i = 0; i < meta.pageCount; i++) {
    await notoDb.remove(`noto_material_page_${subjectId}_${i}`);
  }
  await notoDb.remove('noto_material_meta_' + subjectId);
  await notoDb.remove('noto_material_' + subjectId);
}

async function notoHasMaterial(subjectId) {
  const meta = await notoLoadMaterialMeta(subjectId);
  return meta && meta.pageCount > 0;
}

// ── B2B Admin PIN System ──────────────────────────────────────
async function notoHashPin(pin) {
  const msgUint8 = new TextEncoder().encode(pin + 'noto_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
async function notoSetAdminPin(pin) {
  const s = await notoLoadSettings();
  s.adminPin = await notoHashPin(pin);
  await notoSaveSettings(s);
}
async function notoVerifyAdminPin(pin) {
  const s = await notoLoadSettings();
  if (!s.adminPin) return true;
  const hash = await notoHashPin(pin);
  return hash === s.adminPin;
}
async function notoIsAdminMode() {
  const s = await notoLoadSettings();
  return !!s.adminPin;
}

// ── B2B Pre-baked Materials ───────────────────────────────────
async function notoLoadPrebakedMaterials() {
  try {
    const imported = await notoDb.get('noto_prebaked_imported', false);
    if (imported) return;
    
    console.log('Loading pre-baked materials for B2B mode...');
    const resp = await fetch('materials/manifest.json');
    if (!resp.ok) {
      console.log('No prebaked materials manifest found.');
      return;
    }
    const manifest = await resp.json();
    if (!manifest || !manifest.packs) return;

    for (const pack of manifest.packs) {
      const grades = await notoLoadGrades();
      let grade = grades.find(g => g.name === pack.gradeName);
      if (!grade) {
        grade = await notoAddGrade(pack.gradeName, pack.gradeEmoji || '🎒');
      }

      const subjects = await notoLoadSubjects(grade.id);
      let subject = subjects.find(s => s.name === pack.subjectName);
      if (!subject) {
        subject = await notoAddSubject(grade.id, pack.subjectName, pack.subjectEmoji || '📖');
      }

      const pages = [];
      for (const pageFile of (pack.pages || [])) {
        try {
          const pageUrl = 'materials/' + pack.folder + pageFile;
          const pageResp = await fetch(pageUrl);
          if (pageResp.ok) {
            const blob = await pageResp.blob();
            const base64 = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            pages.push({ type: 'image', data: base64 });
          }
        } catch (err) {
          console.error('Failed to load prebaked page:', pageFile, err);
        }
      }

      if (pages.length > 0) {
        await notoSaveMaterial(subject.id, { pages });
        console.log(`Successfully imported ${pages.length} pages for subject ${pack.subjectName}`);
      }
    }
    await notoDb.set('noto_prebaked_imported', true);
  } catch (e) {
    console.error('Error importing prebaked materials:', e);
  }
}
