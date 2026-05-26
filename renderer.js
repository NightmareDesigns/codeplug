const form = document.getElementById("decrypt-form");
const statusEl = document.getElementById("status");

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
