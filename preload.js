const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    secureStorage: {
        encrypt: (text) => ipcRenderer.invoke('encrypt-data', text),
        decrypt: (encryptedData) => ipcRenderer.invoke('decrypt-data', encryptedData)
    }
});
