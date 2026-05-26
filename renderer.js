const form = document.getElementById("decrypt-form");
const statusEl = document.getElementById("status");
const logEl = document.getElementById("log");

const appendLog = (text) => {
  logEl.textContent += text + "\n";
  logEl.scrollTop = logEl.scrollHeight;
};

const clearLog = () => {
  logEl.textContent = "";
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  clearLog();
  statusEl.textContent = "Decrypting...";
  statusEl.style.color = "";

  const formData = new FormData(form);
  const inputPath = String(formData.get("inputPath") || "").trim();
  const outputPath = String(formData.get("outputPath") || "").trim();

  window.decrypterApi.removeProgressListener();
  window.decrypterApi.onProgress((payload) => {
    if (payload.status === "progress") {
      statusEl.textContent = `Decrypting… ${payload.bytesProcessed.toLocaleString()} bytes processed`;
    } else if (payload.status === "log") {
      appendLog(payload.detail);
    }
  });

  try {
    const resultPath = await window.decrypterApi.decryptFile(inputPath, outputPath);
    window.decrypterApi.removeProgressListener();
    statusEl.textContent = `Done: ${resultPath}`;
    statusEl.style.color = "#4ade80";
  } catch (error) {
    window.decrypterApi.removeProgressListener();
    statusEl.textContent = `Error: ${error.message}`;
    statusEl.style.color = "#f87171";
  }
});
