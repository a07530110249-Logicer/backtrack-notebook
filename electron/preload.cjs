const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('backtrackDesktop', {
  getApiInfo: () => ipcRenderer.invoke('backtrack:get-api-info'),
});
