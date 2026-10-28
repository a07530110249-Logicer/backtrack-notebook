const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('backtrackDesktop', {
  getApiInfo: () => ipcRenderer.invoke('backtrack:get-api-info'),
  selectDirectory: () => ipcRenderer.invoke('backtrack:select-directory'),
});
