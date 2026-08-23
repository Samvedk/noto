// ============================================================
// MAIN.JS — Noto Electron Main Process
// Handles window creation, IPC bridge, data export/import,
// battery reading, and kiosk mode for B2B deployments.
// ============================================================

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// ── Parse mode and kiosk configs ──────────────────────────────
const isKiosk = process.argv.includes('--kiosk');

// Set single unified user data directory for Noto
app.setPath('userData', path.join(app.getPath('appData'), 'Noto'));

// ── Auto-sync export folder ───────────────────────────────────
// This folder is what a phone's Files app sees via USB/MTP.
const syncFolder = path.join(app.getPath('home'), 'Noto_Sync');
if (!fs.existsSync(syncFolder)) {
  fs.mkdirSync(syncFolder, { recursive: true });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 750,
    autoHideMenuBar: true,
    fullscreen: isKiosk,
    kiosk: isKiosk,
    title: 'Noto — Digital Notebook & Study Material Manager',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  win.loadURL(`file://${path.join(__dirname, 'public/index.html')}`);
}

// ── IPC Handlers ──────────────────────────────────────────────

// Export data: opens a save dialog, writes JSON to the chosen path
ipcMain.handle('noto:export-data', async (event, jsonString) => {
  try {
    const win = BrowserWindow.getFocusedWindow();
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: 'Export Noto Backup',
      defaultPath: path.join(app.getPath('documents'), `noto_backup_${Date.now()}.notobackup`),
      filters: [
        { name: 'Noto Backup', extensions: ['notobackup'] },
        { name: 'JSON', extensions: ['json'] }
      ]
    });

    if (canceled || !filePath) {
      return { success: false, cancelled: true };
    }

    fs.writeFileSync(filePath, jsonString, 'utf-8');

    // Also auto-save a copy to the USB sync folder
    const autoPath = path.join(syncFolder, `noto_backup_latest.notobackup`);
    fs.writeFileSync(autoPath, jsonString, 'utf-8');

    return { success: true, path: filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Import data: opens a file picker, reads and returns JSON string
ipcMain.handle('noto:import-data', async (event) => {
  try {
    const win = BrowserWindow.getFocusedWindow();
    const { canceled, filePaths } = await dialog.showOpenDialog(win, {
      title: 'Import Noto Backup',
      filters: [
        { name: 'Noto Backup', extensions: ['notobackup', 'json'] }
      ],
      properties: ['openFile']
    });

    if (canceled || filePaths.length === 0) {
      return { success: false, cancelled: true };
    }

    const data = fs.readFileSync(filePaths[0], 'utf-8');
    return { success: true, data: data };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// Battery: reads from Linux sysfs, returns -1 on unsupported platforms
ipcMain.handle('noto:get-battery', async () => {
  try {
    // Linux (Radxa CM3, Raspberry Pi, etc.)
    const capacityPath = '/sys/class/power_supply/battery/capacity';
    const statusPath = '/sys/class/power_supply/battery/status';

    if (fs.existsSync(capacityPath)) {
      const level = parseInt(fs.readFileSync(capacityPath, 'utf-8').trim(), 10);
      let charging = false;
      if (fs.existsSync(statusPath)) {
        const status = fs.readFileSync(statusPath, 'utf-8').trim().toLowerCase();
        charging = (status === 'charging' || status === 'full');
      }
      return { level, charging };
    }

    // Fallback: platform doesn't have battery sysfs
    return { level: -1, charging: false };
  } catch (err) {
    return { level: -1, charging: false };
  }
});

// App info: returns version and mode for the settings page
ipcMain.handle('noto:get-app-info', async () => {
  const pkg = require('./package.json');
  return {
    version: pkg.version || '1.0.0',
    mode: mode,
    platform: process.platform,
    arch: process.arch,
    electron: process.versions.electron
  };
});

// ── App Lifecycle ─────────────────────────────────────────────
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});