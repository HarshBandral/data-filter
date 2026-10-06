/**
 * app.js — Data Filter Tool
 *
 * Handles:
 *  - Welcome gate screen (yes/no question)
 *  - Banned screen
 *  - Main Excel filter app
 *
 * Filter rules:
 *  1. Rows where `Order` starts with "90085" → kept as-is
 *  2. Remaining rows with blank `Full Name`   → removed
 *  3. Remaining rows not in master file       → removed
 */

'use strict';

// ── Constants ─────────────────────────────────────────────────────────────────

const ORDER_PREFIX   = '90085';
const COL_ORDER      = 'order';
const COL_FULL_NAME  = 'full name';
const OUTPUT_SHEET   = 'Filtered Data';

const HEART_EMOJIS  = ['💖', '💗', '💓', '💞', '💕', '🩷', '❤️', '✨'];
const ANGRY_EMOJIS  = ['💢', '🔥', '⚡', '💥'];

// ── Audio ─────────────────────────────────────────────────────────────────────

const audio = {
  yes: new Audio('niconiconilovesyou-3_cutted.mp3.mpeg'),
  no:  new Audio('you_were_banned_1_ZBqWsq8.mp3.mpeg'),
};

// ── App State ─────────────────────────────────────────────────────────────────

const state = {
  dataWorkbook:     null,
  masterWorkbook:   null,
  filteredWorkbook: null,
};

// ── DOM References ─────────────────────────────────────────────────────────────

const dom = {
  // Screens
  welcomeScreen:    document.getElementById('welcomeScreen'),
  bannedScreen:     document.getElementById('bannedScreen'),
  appScreen:        document.getElementById('appScreen'),

  // Welcome
  btnYes:           document.getElementById('btnYes'),
  btnNo:            document.getElementById('btnNo'),
  welcomeEmoji:     document.getElementById('welcomeEmoji'),
  particles:        document.getElementById('particles'),

  // App particles
  appParticles:     document.getElementById('appParticles'),

  // File inputs
  dataInput:        document.getElementById('dataFile'),
  masterInput:      document.getElementById('masterFile'),
  dataDropZone:     document.getElementById('dataDropZone'),
  masterDropZone:   document.getElementById('masterDropZone'),
  dataFileName:     document.getElementById('dataFileName'),
  masterFileName:   document.getElementById('masterFileName'),

  // Controls
  processBtn:       document.getElementById('processBtn'),
  downloadBtn:      document.getElementById('downloadBtn'),

  // Output
  statusEl:         document.getElementById('status'),
  statsGrid:        document.getElementById('statsGrid'),
  statTotal:        document.getElementById('statTotal'),
  statKept90085:    document.getElementById('statKept90085'),
  statKeptMatched:  document.getElementById('statKeptMatched'),
  statRemoved:      document.getElementById('statRemoved'),
};

// ── Entry Point ────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);

function init() {
  bindWelcomeScreen();
  bindFileUploads();
  dom.processBtn.addEventListener('click', handleProcess);
  dom.downloadBtn.addEventListener('click', handleDownload);
}

// ── Welcome Screen ─────────────────────────────────────────────────────────────

function bindWelcomeScreen() {
  dom.btnYes.addEventListener('click', handleYes);
  dom.btnNo.addEventListener('click', handleNo);
}

/**
 * User clicked "More than my life" — burst hearts then navigate to app.
 */
function handleYes() {
  dom.btnYes.disabled = true;
  dom.btnNo.disabled  = true;
  dom.welcomeEmoji.textContent = '🥰';

  audio.yes.currentTime = 0;
  audio.yes.play().catch(() => {}); // catch autoplay policy errors silently

  burstParticles(dom.particles, HEART_EMOJIS, 28);

  setTimeout(() => {
    switchScreen(dom.welcomeScreen, dom.appScreen);
    // Short burst on app screen entry too
    setTimeout(() => burstParticles(dom.appParticles, HEART_EMOJIS, 14), 300);
  }, 1400);
}

/**
 * User clicked "Euuwwww" — navigate to banned screen.
 */
function handleNo() {
  dom.btnYes.disabled = true;
  dom.btnNo.disabled  = true;
  dom.welcomeEmoji.textContent = '😡';

  audio.no.currentTime = 0;
  audio.no.play().catch(() => {}); // catch autoplay policy errors silently

  burstParticles(dom.particles, ANGRY_EMOJIS, 12);

  setTimeout(() => {
    switchScreen(dom.welcomeScreen, dom.bannedScreen);
  }, 700);
}

// ── Screen Transitions ─────────────────────────────────────────────────────────

/**
 * Fades out `from` and fades in `to` with a CSS class toggle.
 *
 * @param {HTMLElement} from
 * @param {HTMLElement} to
 */
function switchScreen(from, to) {
  from.classList.add('screen--hidden');
  to.classList.remove('screen--hidden');
}

// ── Particle System ────────────────────────────────────────────────────────────

/**
 * Creates `count` emoji particles that float upward from random positions.
 *
 * @param {HTMLElement} container - The .particles element to append to.
 * @param {string[]}    emojis    - Pool of emoji characters to pick from.
 * @param {number}      count     - Number of particles to spawn.
 */
function burstParticles(container, emojis, count) {
  for (let i = 0; i < count; i++) {
    const el = document.createElement('span');
    el.classList.add('particle');
    el.textContent = emojis[Math.floor(Math.random() * emojis.length)];

    const duration = 2 + Math.random() * 2;
    el.style.setProperty('--duration', `${duration}s`);
    el.style.left      = `${5 + Math.random() * 90}%`;
    el.style.fontSize  = `${1 + Math.random() * 1.5}rem`;
    el.style.animationDelay = `${Math.random() * 0.8}s`;

    container.appendChild(el);

    // Clean up after animation
    el.addEventListener('animationend', () => el.remove());
  }
}

// ── File Uploads ───────────────────────────────────────────────────────────────

function bindFileUploads() {
  setupDropZone(dom.dataDropZone,   dom.dataInput);
  setupDropZone(dom.masterDropZone, dom.masterInput);

  dom.dataInput.addEventListener('change',   () =>
    handleFileSelect(dom.dataInput, dom.dataFileName, 'data'));
  dom.masterInput.addEventListener('change', () =>
    handleFileSelect(dom.masterInput, dom.masterFileName, 'master'));
}

/**
 * Enables drag-and-drop on a drop zone, forwarding files to the hidden input.
 *
 * @param {HTMLElement}     dropZone
 * @param {HTMLInputElement} input
 */
function setupDropZone(dropZone, input) {
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drop-zone--active');
  });

  dropZone.addEventListener('dragleave', () =>
    dropZone.classList.remove('drop-zone--active'));

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drop-zone--active');
    const file = e.dataTransfer.files[0];
    if (!file) return;

    const dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change'));
  });
}

/**
 * Reads a selected file into a SheetJS workbook and updates state.
 *
 * @param {HTMLInputElement}    input
 * @param {HTMLElement}         nameEl
 * @param {'data'|'master'}     fileType
 */
function handleFileSelect(input, nameEl, fileType) {
  const file = input.files[0];
  if (!file) return;

  showStatus(`Reading ${fileType} file…`, 'info');

  readWorkbook(file, (err, workbook) => {
    if (err) {
      showStatus(`Error reading ${fileType} file: ${err.message}`, 'error');
      return;
    }

    nameEl.textContent = `✅ ${file.name}`;
    state[`${fileType}Workbook`] = workbook;
    hideStatus();
    updateProcessButton();
  });
}

/**
 * Reads a File as an ArrayBuffer and parses it with SheetJS.
 *
 * @param {File}     file
 * @param {Function} callback  - Called as callback(error, workbook).
 */
function readWorkbook(file, callback) {
  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const workbook = XLSX.read(e.target.result, { type: 'array' });
      callback(null, workbook);
    } catch (err) {
      callback(err, null);
    }
  };

  reader.onerror = () =>
    callback(new Error('FileReader failed to read the file.'), null);

  reader.readAsArrayBuffer(file);
}

function updateProcessButton() {
  const ready = !!(state.dataWorkbook && state.masterWorkbook);
  dom.processBtn.disabled     = !ready;
  dom.processBtn.ariaDisabled = String(!ready);
}

// ── Processing ─────────────────────────────────────────────────────────────────

function handleProcess() {
  try {
    runFilterPipeline();
  } catch (err) {
    showStatus(`Unexpected error: ${err.message}`, 'error');
  }
}

function runFilterPipeline() {
  showStatus('Processing…', 'info');
  resetResults();

  const dataRows   = sheetToRows(state.dataWorkbook);
  const masterRows = sheetToRows(state.masterWorkbook);

  if (dataRows.length === 0) {
    showStatus('Data file is empty or has only a header row.', 'error');
    return;
  }
  if (masterRows.length === 0) {
    showStatus('Master file is empty or has only a header row.', 'error');
    return;
  }

  const orderKey      = resolveColumnKey(dataRows[0],   COL_ORDER);
  const dataNameKey   = resolveColumnKey(dataRows[0],   COL_FULL_NAME);
  const masterNameKey = resolveColumnKey(masterRows[0], COL_FULL_NAME);

  if (!orderKey)      { showStatus('Cannot find "Order" column in data file.',       'error'); return; }
  if (!dataNameKey)   { showStatus('Cannot find "Full Name" column in data file.',   'error'); return; }
  if (!masterNameKey) { showStatus('Cannot find "Full Name" column in master file.', 'error'); return; }

  const masterNameSet  = buildNameSet(masterRows, masterNameKey);
  const result         = classifyRows(dataRows, orderKey, dataNameKey, masterNameSet);
  const outputRows     = [...result.kept90085, ...result.keptMatched];

  state.filteredWorkbook = buildOutputWorkbook(outputRows);

  renderStats({
    total:       dataRows.length,
    kept90085:   result.kept90085.length,
    keptMatched: result.keptMatched.length,
    removed:     result.removedBlankName + result.removedNoMatch,
  });

  showStatus(
    `✅ Done! ${outputRows.length} of ${dataRows.length} rows kept. ` +
    `(${result.removedBlankName} blank name, ${result.removedNoMatch} not in master)`,
    'success'
  );

  dom.downloadBtn.classList.add('visible');
}

// ── Filter Helpers ─────────────────────────────────────────────────────────────

function sheetToRows(workbook) {
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function resolveColumnKey(sampleRow, targetName) {
  const normalised = targetName.toLowerCase().replace(/\s+/g, ' ').trim();
  return (
    Object.keys(sampleRow).find(
      (key) => key.toLowerCase().replace(/\s+/g, ' ').trim() === normalised
    ) ?? null
  );
}

function buildNameSet(masterRows, masterNameKey) {
  return new Set(
    masterRows
      .map((row) => normaliseValue(row[masterNameKey]))
      .filter((name) => name !== '')
  );
}

/**
 * Applies all three filter rules and returns categorised rows + counters.
 */
function classifyRows(dataRows, orderKey, dataNameKey, masterNames) {
  const kept90085        = [];
  const keptMatched      = [];
  let   removedBlankName = 0;
  let   removedNoMatch   = 0;

  for (const row of dataRows) {
    const orderValue = normaliseValue(row[orderKey]);
    const nameValue  = normaliseValue(row[dataNameKey]);

    // Rule 1 — preserve 90085 orders untouched
    if (orderValue.startsWith(ORDER_PREFIX)) {
      kept90085.push(row);
      continue;
    }

    // Rule 2 — drop blank full name
    if (nameValue === '') {
      removedBlankName++;
      continue;
    }

    // Rule 3 — keep only if name exists in master
    if (masterNames.has(nameValue)) {
      keptMatched.push(row);
    } else {
      removedNoMatch++;
    }
  }

  return { kept90085, keptMatched, removedBlankName, removedNoMatch };
}

function buildOutputWorkbook(rows) {
  const workbook = XLSX.utils.book_new();
  const sheet    = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, OUTPUT_SHEET);
  return workbook;
}

// ── Download ───────────────────────────────────────────────────────────────────

function handleDownload() {
  if (!state.filteredWorkbook) return;
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  XLSX.writeFile(state.filteredWorkbook, `filtered_data_${timestamp}.xlsx`);
}

// ── UI Helpers ─────────────────────────────────────────────────────────────────

function showStatus(message, type) {
  dom.statusEl.className   = `status status--${type}`;
  dom.statusEl.textContent = message;
}

function hideStatus() {
  dom.statusEl.className   = 'status';
  dom.statusEl.textContent = '';
  dom.statusEl.style.display = 'none';
}

function renderStats(stats) {
  dom.statTotal.textContent       = stats.total;
  dom.statKept90085.textContent   = stats.kept90085;
  dom.statKeptMatched.textContent = stats.keptMatched;
  dom.statRemoved.textContent     = stats.removed;
  dom.statsGrid.classList.add('stats-grid--visible');
}

function resetResults() {
  dom.statsGrid.classList.remove('stats-grid--visible');
  dom.downloadBtn.classList.remove('visible');
  state.filteredWorkbook = null;
}

// ── Utility ────────────────────────────────────────────────────────────────────

function normaliseValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}
