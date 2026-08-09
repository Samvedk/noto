// ============================================================
// PRELOAD.JS — Noto Electron IPC Bridge
// Securely exposes OS-level capabilities to the renderer via
// window.notoOS using Electron's contextBridge.
// ============================================================

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notoOS', {

  // ── Data Export ──────────────────────────────────────────────
  // Sends JSON string to main process which opens a file save
  // dialog and writes the data to the chosen path.
  // Returns: { success: true, path: '/saved/path.notobackup' }
  //      or: { success: false, error: 'reason' }
  exportData: (jsonString) => {
    return ipcRenderer.invoke('noto:export-data', jsonString);
  },

  // ── Data Import ─────────────────────────────────────────────
  // Opens a file picker for .notobackup files and returns the
  // parsed JSON content string back to the renderer.
  // Returns: { success: true, data: '...' }
  //      or: { success: false, cancelled: true }
  //      or: { success: false, error: 'reason' }
  importData: () => {
    return ipcRenderer.invoke('noto:import-data');
  },

  // ── Battery Level ───────────────────────────────────────────
  // Reads battery percentage from Linux sysfs.
  // Returns: { level: 85, charging: false }
  //      or: { level: -1 } if unavailable (e.g. Mac/desktop)
  getBattery: () => {
    return ipcRenderer.invoke('noto:get-battery');
  },

  // ── App Info ────────────────────────────────────────────────
  // Returns the current app version and mode for display in
  // the Settings page.
  getAppInfo: () => {
    return ipcRenderer.invoke('noto:get-app-info');
  },

  // ── Platform Detection ──────────────────────────────────────
  // Returns 'linux', 'darwin', or 'win32' so the renderer can
  // adapt UI (e.g. hide battery on Mac, show kiosk controls on
  // Linux ARM).
  platform: process.platform
});
