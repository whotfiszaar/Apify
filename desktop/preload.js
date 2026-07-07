const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  scanPostman: () => ipcRenderer.invoke('scan-postman'),
  setTheme: (themeId) => ipcRenderer.send('set-theme', themeId),
  downloadAndInstallUpdate: (downloadUrl) => ipcRenderer.invoke('download-and-install-update', downloadUrl),
  isElectron: true
});
