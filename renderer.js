const form = document.getElementById("decrypt-form");
const statusEl = document.getElementById("status");
const inputPathEl = document.getElementById("inputPath");
const outputPathEl = document.getElementById("outputPath");
const inputBrowseEl = document.getElementById("browseInput");
const outputBrowseEl = document.getElementById("browseOutput");
const suggestOutputEl = document.getElementById("suggestOutput");
const resetFormEl = document.getElementById("resetForm");
const submitButtonEl = document.getElementById("submitButton");
const inputDetailsEl = document.getElementById("inputDetails");
const outputDetailsEl = document.getElementById("outputDetails");
const workflowSummaryEl = document.getElementById("workflowSummary");

let lastSuggestedOutputPath = "";

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const formatBytes = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Unknown";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  const precision = index === 0 ? 0 : 2;
  return `${size.toFixed(precision)} ${units[index]}`;
};

const getSuggestedOutputPath = (inputPath) => {
  if (!/\.xctb$/i.test(inputPath)) {
    return "";
  }

  return inputPath.replace(/\.xctb$/i, ".decrypted.xctb");
};

const setStatus = (state, message) => {
  statusEl.dataset.state = state;
  statusEl.textContent = message;
};

const renderDetailCard = (element, title, details, expectation) => {
  if (!details.path) {
    element.innerHTML = `
      <h3>${title}</h3>
      <p class="empty-state">Choose a file or paste an absolute path.</p>
    `;
    return;
  }

  const checks = [];
  checks.push(details.isValid ? "Absolute path ready" : "Needs an absolute path");
  checks.push(details.extension === ".xctb" ? "Uses .xctb" : "Wrong extension");
  checks.push(details.exists ? "Exists on disk" : expectation === "input" ? "Missing on disk" : "Will be created");
  if (details.isDirectory) {
    checks.push("Directory selected");
  }

  const statusClass =
    details.isValid &&
    details.extension === ".xctb" &&
    (expectation !== "input" || (details.exists && !details.isDirectory))
      ? "good"
      : "warn";

  element.innerHTML = `
    <h3>${title}</h3>
    <div class="detail-list">
      <div><span>Name</span><strong>${escapeHtml(details.name || "Unknown")}</strong></div>
      <div><span>Folder</span><strong>${escapeHtml(details.directory || "Unknown")}</strong></div>
      <div><span>Extension</span><strong>${escapeHtml(details.extension || "None")}</strong></div>
      <div><span>Size</span><strong>${escapeHtml(details.exists ? formatBytes(details.size) : "Pending")}</strong></div>
    </div>
    <p class="path-preview">${escapeHtml(details.path)}</p>
    <p class="pill-row ${statusClass}">${checks.map((check) => `<span>${escapeHtml(check)}</span>`).join("")}</p>
    ${details.error ? `<p class="detail-error">${escapeHtml(details.error)}</p>` : ""}
  `;
};

const refreshSummary = (inputDetails, outputDetails) => {
  const readyToRun =
    inputDetails.isValid &&
    inputDetails.exists &&
    !inputDetails.isDirectory &&
    inputDetails.extension === ".xctb" &&
    outputDetails.isValid &&
    !outputDetails.isDirectory &&
    outputDetails.extension === ".xctb" &&
    inputDetails.path !== outputDetails.path;

  workflowSummaryEl.innerHTML = `
    <div class="summary-item">
      <span>Input</span>
      <strong>${escapeHtml(inputDetails.name || "Not selected")}</strong>
    </div>
    <div class="summary-item">
      <span>Output</span>
      <strong>${escapeHtml(outputDetails.name || "Not selected")}</strong>
    </div>
    <div class="summary-item">
      <span>Ready</span>
      <strong>${readyToRun ? "Yes" : "No"}</strong>
    </div>
  `;

  submitButtonEl.disabled = !readyToRun;
};

const refreshPathDetails = async () => {
  const [inputDetails, outputDetails] = await Promise.all([
    window.decrypterApi.inspectPath(inputPathEl.value),
    window.decrypterApi.inspectPath(outputPathEl.value)
  ]);

  renderDetailCard(inputDetailsEl, "Encrypted input", inputDetails, "input");
  renderDetailCard(outputDetailsEl, "Decrypted output", outputDetails, "output");
  refreshSummary(inputDetails, outputDetails);
};

const syncSuggestedOutput = (force = false) => {
  const inputPath = inputPathEl.value.trim();
  const nextSuggestion = getSuggestedOutputPath(inputPath);
  const currentOutputPath = outputPathEl.value.trim();

  if (!nextSuggestion) {
    lastSuggestedOutputPath = "";
    return;
  }

  if (force || !currentOutputPath || currentOutputPath === lastSuggestedOutputPath) {
    outputPathEl.value = nextSuggestion;
  }

  lastSuggestedOutputPath = nextSuggestion;
};

const populateInputPath = async () => {
  const filePath = await window.decrypterApi.pickInputFile();
  if (!filePath) {
    return;
  }

  inputPathEl.value = filePath;
  syncSuggestedOutput();
  await refreshPathDetails();
  setStatus("idle", "Input selected. Review the output path and decrypt when ready.");
};

const populateOutputPath = async () => {
  const filePath = await window.decrypterApi.pickOutputFile(inputPathEl.value, outputPathEl.value);
  if (!filePath) {
    return;
  }

  outputPathEl.value = filePath;
  lastSuggestedOutputPath = filePath;
  await refreshPathDetails();
  setStatus("idle", "Output selected. The app will create missing folders automatically.");
};

inputBrowseEl.addEventListener("click", populateInputPath);
outputBrowseEl.addEventListener("click", populateOutputPath);

suggestOutputEl.addEventListener("click", async () => {
  syncSuggestedOutput(true);
  await refreshPathDetails();
  setStatus("idle", "Output path regenerated from the current input file.");
});

resetFormEl.addEventListener("click", async () => {
  form.reset();
  lastSuggestedOutputPath = "";
  await refreshPathDetails();
  setStatus("idle", "Form cleared. Choose a new .xctb file to begin.");
});

inputPathEl.addEventListener("input", async () => {
  syncSuggestedOutput();
  await refreshPathDetails();
});

outputPathEl.addEventListener("input", refreshPathDetails);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButtonEl.disabled = true;
  setStatus("busy", "Decrypting .xctb file...");

  const formData = new FormData(form);
  const inputPath = String(formData.get("inputPath") || "").trim();
  const outputPath = String(formData.get("outputPath") || "").trim();

  try {
    const result = await window.decrypterApi.decryptFile(inputPath, outputPath);
    outputPathEl.value = result.outputPath;
    lastSuggestedOutputPath = result.outputPath;
    await refreshPathDetails();
    setStatus(
      "success",
      `${result.message} Output: ${result.outputPath} (${formatBytes(result.outputSize)}).`
    );
  } catch (error) {
    await refreshPathDetails();
    setStatus("error", `Error: ${error.message}`);
  }
});

refreshPathDetails().catch((error) => {
  setStatus("error", `Error: ${error.message}`);
});
