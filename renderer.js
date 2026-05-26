const form = document.getElementById("decrypt-form");
const statusEl = document.getElementById("status");
const inputPathEl = document.getElementById("inputPath");
const outputPathEl = document.getElementById("outputPath");

inputPathEl.addEventListener("change", () => {
  const inputPath = inputPathEl.value.trim();
  if (!inputPath || outputPathEl.value.trim()) {
    return;
  }

  if (!inputPath.toLowerCase().endsWith(".xctb")) {
    return;
  }

  outputPathEl.value = inputPath.replace(/\.xctb$/i, ".decrypted.xctb");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  statusEl.textContent = "Decrypting...";

  const formData = new FormData(form);
  const inputPath = String(formData.get("inputPath") || "").trim();
  const outputPath = String(formData.get("outputPath") || "").trim();

  try {
    const resultPath = await window.decrypterApi.decryptFile(inputPath, outputPath);
    statusEl.textContent = `Done: ${resultPath}`;
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
  }
});
