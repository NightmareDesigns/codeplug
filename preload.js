const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("decrypterApi", {
  decryptFile: (inputPath, outputPath) => ipcRenderer.invoke("decrypt-file", inputPath, outputPath),
  onProgress: (callback) => ipcRenderer.on("decrypt-progress", (_, payload) => callback(payload)),
  removeProgressListener: () => ipcRenderer.removeAllListeners("decrypt-progress")
});
