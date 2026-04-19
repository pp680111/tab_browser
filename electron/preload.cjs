const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('guitarTabs', {
  readFile: (filePath) => ipcRenderer.invoke('score-library:read-file', filePath),
});
