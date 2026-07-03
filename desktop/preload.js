const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  scanPostman: () => ipcRenderer.invoke('scan-postman'),
  isElectron: true
});
