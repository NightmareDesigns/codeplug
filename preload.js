const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("decrypterApi", {
  decryptFile: (inputPath, outputPath) => ipcRenderer.invoke("decrypt-file", inputPath, outputPath)
});
