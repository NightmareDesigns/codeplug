const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { spawn } = require("node:child_process");

const createWindow = () => {
  const win = new BrowserWindow({
    width: 900,
    height: 620,
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

  return path.normalize(trimmedPath);
};

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
          onProgress({ status: "progress", bytesProcessed: bytes });
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

ipcMain.handle("decrypt-file", async (event, inputPath, outputPath) => {
  const safeInputPath = validateUserPath(inputPath, "Input");
  const safeOutputPath = validateUserPath(outputPath, "Output");

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

  await runDecrypter(safeInputPath, safeOutputPath, sendProgress);
  return safeOutputPath;
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
