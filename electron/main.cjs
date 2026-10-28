const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const express = require('express');

let apiServer;
let apiInfo;

async function startApi() {
  const { createApiApp } = await import('../server/app.mjs');
  const token = randomBytes(32).toString('hex');
  const dataDir = path.join(app.getPath('userData'), 'notebook-data');
  const { app: api } = await createApiApp({ dataDir, token });
  const server = express();
  server.use('/api', api);
  await new Promise((resolve, reject) => {
    apiServer = server.listen(0, '127.0.0.1', resolve);
    apiServer.once('error', reject);
  });
  const address = apiServer.address();
  apiInfo = { baseUrl: `http://127.0.0.1:${address.port}/api`, token };
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 980,
    minHeight: 680,
    title: '回溯错题本',
    backgroundColor: '#f6f7fb',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  if (process.env.VITE_DEV_SERVER_URL) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(async () => {
  await startApi();
  ipcMain.handle('backtrack:get-api-info', () => apiInfo);
  ipcMain.handle('backtrack:select-directory', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
    return result.canceled ? null : result.filePaths[0];
  });
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
app.on('before-quit', () => apiServer?.close());
