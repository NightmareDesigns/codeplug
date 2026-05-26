const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 980,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.loadFile("index.html");
};

const validateUserPath = (filePath, label) => {
  if (typeof filePath !== "string" || filePath.includes("\0")) {
    throw new Error(`${label} path is invalid.`);
  }

  const trimmedPath = filePath.trim();
  if (!trimmedPath) {
    throw new Error(`${label} path is required.`);
  }

  if (!path.isAbsolute(trimmedPath)) {
    throw new Error(`${label} path must be absolute.`);
  }

  return path.resolve(trimmedPath);
};

const ensureXctbExtension = (filePath) => {
  if (path.extname(filePath).toLowerCase() === ".xctb") {
    return filePath;
  }

  return `${filePath}.xctb`;
};

const buildSuggestedOutputPath = (inputPath) => {
  const parsedPath = path.parse(inputPath);
  return path.join(parsedPath.dir, `${parsedPath.name}.decrypted.xctb`);
};

const getActiveWindow = () =>
  BrowserWindow.getFocusedWindow() || BrowserWindow.getAllWindows()[0] || null;

const runDecrypter = (inputPath, outputPath, onProgress) =>
  new Promise((resolve, reject) => {
    const binName = process.platform === "win32" ? "decrypter.exe" : "decrypter";
    const binaryPath = path.join(__dirname, "native", "bin", binName);
    const child = spawn(binaryPath, [inputPath, outputPath]);
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        if (trimmed.startsWith("progress:")) {
          const bytes = parseInt(trimmed.slice("progress:".length), 10);
          if (!Number.isNaN(bytes)) {
            onProgress({ status: "progress", bytesProcessed: bytes });
          }
        } else {
          onProgress({ status: "log", detail: trimmed });
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) {
        resolve("Decrypt completed.");
        return;
      }
      reject(new Error(stderr.trim() || `Decrypter failed with code ${code}.`));
    });
  });

const validateXctbPath = (filePath, label) => {
  if (path.extname(filePath).toLowerCase() !== ".xctb") {
    throw new Error(`${label} file must use the .xctb extension.`);
  }
};

const inspectPath = async (filePath) => {
  if (typeof filePath !== "string" || filePath.includes("\0")) {
    return {
      path: "",
      isValid: false,
      exists: false,
      isDirectory: false,
      extension: "",
      name: "",
      directory: "",
      size: null,
      error: "Path is invalid."
    };
  }

  const trimmedPath = filePath.trim();
  if (!trimmedPath) {
    return {
      path: "",
      isValid: false,
      exists: false,
      isDirectory: false,
      extension: "",
      name: "",
      directory: "",
      size: null,
      error: "Path is required."
    };
  }

  const isAbsolute = path.isAbsolute(trimmedPath);
  const normalizedPath = isAbsolute ? path.resolve(trimmedPath) : trimmedPath;
  const parsedPath = path.parse(normalizedPath);

  try {
    const stats = await fs.stat(normalizedPath);
    return {
      path: normalizedPath,
      isValid: isAbsolute,
      exists: true,
      isDirectory: stats.isDirectory(),
      extension: parsedPath.ext.toLowerCase(),
      name: parsedPath.base,
      directory: parsedPath.dir,
      size: stats.isDirectory() ? null : stats.size,
      error: isAbsolute ? null : "Path must be absolute."
    };
  } catch {
    return {
      path: normalizedPath,
      isValid: isAbsolute,
      exists: false,
      isDirectory: false,
      extension: parsedPath.ext.toLowerCase(),
      name: parsedPath.base,
      directory: parsedPath.dir,
      size: null,
      error: isAbsolute ? null : "Path must be absolute."
    };
  }
};

ipcMain.handle("pick-input-file", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog(getActiveWindow(), {
    title: "Choose encrypted .xctb file",
    properties: ["openFile"],
    filters: [
      { name: "XCTB codeplug files", extensions: ["xctb"] },
      { name: "All files", extensions: ["*"] }
    ]
  });

  return canceled ? null : filePaths[0];
});

ipcMain.handle("pick-output-file", async (_, inputPath, currentOutputPath) => {
  let defaultPath = null;
  const trimmedOutputPath =
    typeof currentOutputPath === "string" ? currentOutputPath.trim() : "";
  const trimmedInputPath = typeof inputPath === "string" ? inputPath.trim() : "";

  if (trimmedOutputPath && path.isAbsolute(trimmedOutputPath)) {
    defaultPath = ensureXctbExtension(path.resolve(trimmedOutputPath));
  } else if (trimmedInputPath && path.isAbsolute(trimmedInputPath)) {
    defaultPath = buildSuggestedOutputPath(path.resolve(trimmedInputPath));
  }

  const { canceled, filePath } = await dialog.showSaveDialog(getActiveWindow(), {
    title: "Choose decrypted output file",
    defaultPath: defaultPath || undefined,
    filters: [{ name: "XCTB codeplug files", extensions: ["xctb"] }]
  });

  return canceled || !filePath ? null : ensureXctbExtension(filePath);
});

ipcMain.handle("inspect-path", async (_, filePath) => inspectPath(filePath));

ipcMain.handle("decrypt-file", async (event, inputPath, outputPath) => {
  const safeInputPath = validateUserPath(inputPath, "Input");
  const safeOutputPath = validateUserPath(outputPath, "Output");
  validateXctbPath(safeInputPath, "Input");
  validateXctbPath(safeOutputPath, "Output");

  if (safeInputPath === safeOutputPath) {
    throw new Error("Input and output paths must be different.");
  }

  try {
    await fs.access(safeInputPath);
  } catch {
    throw new Error(`Input file does not exist or is not accessible: ${safeInputPath}`);
  }

  const sender = event.sender;
  const sendProgress = (payload) => {
    if (!sender.isDestroyed()) {
      sender.send("decrypt-progress", payload);
    }
  };

  await fs.mkdir(path.dirname(safeOutputPath), { recursive: true });
  const inputStats = await fs.stat(safeInputPath);
  const message = await runDecrypter(safeInputPath, safeOutputPath, sendProgress);
  const outputStats = await fs.stat(safeOutputPath);

  return {
    inputPath: safeInputPath,
    outputPath: safeOutputPath,
    message,
    inputSize: inputStats.size,
    outputSize: outputStats.size
  };
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
