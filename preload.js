const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("decrypterApi", {
  decryptFile: (inputPath, outputPath) => ipcRenderer.invoke("decrypt-file", inputPath, outputPath),
  pickInputFile: () => ipcRenderer.invoke("pick-input-file"),
  pickOutputFile: (inputPath, outputPath) =>
    ipcRenderer.invoke("pick-output-file", inputPath, outputPath),
  inspectPath: (filePath) => ipcRenderer.invoke("inspect-path", filePath)
});
