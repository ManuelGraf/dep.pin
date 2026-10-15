import { app, BrowserWindow, clipboard, ipcMain, screen, shell } from 'electron';
import path from 'node:path';
import { IpcChannel } from '../src/app/core/dep-pin-api';
import type { PackageJson } from '../src/app/core/models';
import { runAudit, runCheckUpdates } from './npm';

/** set by `npm start` to load the renderer from `ng serve` instead of the built files */
const rendererUrl = process.env['ELECTRON_RENDERER_URL'];

let win: BrowserWindow | null = null;

function createWindow(): void {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  win = new BrowserWindow({
    width,
    height,
    show: false,
    backgroundColor: '#121212',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#ffffff', height: 30 },
    webPreferences: {
      preload: path.join(import.meta.dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win?.show());

  // open external links (audit advisories, changelogs) in the default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win?.webContents.getURL()) {
      event.preventDefault();
    }
  });

  if (rendererUrl) {
    void win.loadURL(rendererUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    void win.loadFile(path.join(import.meta.dirname, '../renderer/index.html'));
  }

  win.on('closed', () => {
    win = null;
  });
}

function registerIpcHandlers(): void {
  ipcMain.handle(IpcChannel.audit, (_event, pkg: PackageJson) => runAudit(pkg));
  ipcMain.handle(IpcChannel.checkUpdates, (_event, pkg: PackageJson) => runCheckUpdates(pkg));
  ipcMain.handle(IpcChannel.copyToClipboard, (_event, text: string) => clipboard.writeText(text));
}

void app.whenReady().then(() => {
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
