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

const runDecryptor = (inputPath, outputPath) =>
  new Promise((resolve, reject) => {
    const binName = process.platform === "win32" ? "decrypter.exe" : "decrypter";
    const binaryPath = path.join(__dirname, "native", "bin", binName);
    const child = spawn(binaryPath, [inputPath, outputPath]);
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim() || "Decrypt completed.");
        return;
      }
      reject(new Error(stderr.trim() || `Decrypter failed with code ${code}.`));
    });
  });

ipcMain.handle("decrypt-file", async (_, inputPath, outputPath) => {
  if (!inputPath || !outputPath) {
    throw new Error("Input and output paths are required.");
  }

  try {
    await fs.access(inputPath);
  } catch {
    throw new Error(`Input file does not exist or is not accessible: ${inputPath}`);
  }

  await runDecryptor(inputPath, outputPath);
  return outputPath;
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
