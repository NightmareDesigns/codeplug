const { contextBridge, ipcRenderer } = require("electron");

let _progressListener = null;

contextBridge.exposeInMainWorld("decrypterApi", {
  decryptFile: (inputPath, outputPath) => ipcRenderer.invoke("decrypt-file", inputPath, outputPath),
  onProgress: (callback) => {
    if (_progressListener) {
      ipcRenderer.removeListener("decrypt-progress", _progressListener);
    }
    _progressListener = (_, payload) => callback(payload);
    ipcRenderer.on("decrypt-progress", _progressListener);
  },
  removeProgressListener: () => {
    if (_progressListener) {
      ipcRenderer.removeListener("decrypt-progress", _progressListener);
      _progressListener = null;
    }
  },
  pickInputFile: () => ipcRenderer.invoke("pick-input-file"),
  pickOutputFile: (inputPath, outputPath) =>
    ipcRenderer.invoke("pick-output-file", inputPath, outputPath),
  inspectPath: (filePath) => ipcRenderer.invoke("inspect-path", filePath)
});
