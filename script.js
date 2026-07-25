
const tabs = document.querySelectorAll('.tool-tab');
const panels = document.querySelectorAll('.tool-panel');
tabs.forEach(tab => tab.addEventListener('click', () => {
  tabs.forEach(item => item.classList.remove('active'));
  panels.forEach(panel => panel.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById(tab.dataset.target).classList.add('active');
}));

const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.querySelector('.mobile-menu');
if (menuButton && mobileMenu) {
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    mobileMenu.hidden = open;
  });
}

const workspace = document.getElementById('pdf-workspace');
const alertBox = document.getElementById('workspace-alert');
const views = {
  preview: document.getElementById('preview-view'),
  merge: document.getElementById('merge-view'),
  split: document.getElementById('split-view')
};
const titles = {
  preview: ['PDF PREVIEW', 'Preview your PDF', 'Check the document before choosing a tool.'],
  merge: ['MERGE PDF', 'Combine PDF files', 'Arrange multiple PDFs and download one combined document.'],
  split: ['SPLIT PDF', 'Extract PDF pages', 'Create a new PDF from the pages you choose.']
};

let previewFile = null;
let splitFile = null;
let splitPageCount = 0;
let mergeFiles = [];

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  const units = ['bytes', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
}

function validPdf(file) {
  return file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
}

function showAlert(message) {
  alertBox.textContent = message;
  alertBox.hidden = false;
}

function clearAlert() {
  alertBox.hidden = true;
  alertBox.textContent = '';
}

function openWorkspace(tool) {
  clearAlert();
  Object.entries(views).forEach(([name, view]) => view.hidden = name !== tool);
  const [eyebrow, title, subtitle] = titles[tool];
  document.getElementById('workspace-eyebrow').textContent = eyebrow;
  document.getElementById('workspace-title').textContent = title;
  document.getElementById('workspace-subtitle').textContent = subtitle;
  workspace.hidden = false;
  document.body.classList.add('workspace-open');
}

function closeWorkspace() {
  workspace.hidden = true;
  document.body.classList.remove('workspace-open');
}

document.querySelectorAll('[data-close-workspace]').forEach(button => {
  button.addEventListener('click', closeWorkspace);
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !workspace.hidden) closeWorkspace();
});
document.querySelectorAll('[data-open-tool]').forEach(button => {
  button.addEventListener('click', () => openWorkspace(button.dataset.openTool));
});

async function renderPreview(file) {
  if (!validPdf(file)) {
    showAlert('Please select a valid PDF file.');
    return;
  }
  clearAlert();
  previewFile = file;
  openWorkspace('preview');

  const canvas = document.getElementById('pdf-preview-canvas');
  const placeholder = document.getElementById('preview-placeholder');
  document.getElementById('preview-name').textContent = file.name;
  document.getElementById('preview-size').textContent = formatBytes(file.size);
  document.getElementById('preview-pages').textContent = 'Loading…';

  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = await pdfjsLib.getDocument({data: bytes}).promise;
    document.getElementById('preview-pages').textContent = String(pdf.numPages);
    const page = await pdf.getPage(1);
    const unscaled = page.getViewport({scale: 1});
    const availableWidth = Math.min(650, Math.max(280, document.querySelector('.preview-stage').clientWidth - 50));
    const scale = availableWidth / unscaled.width;
    const viewport = page.getViewport({scale});
    const context = canvas.getContext('2d');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    placeholder.hidden = true;
    canvas.hidden = false;
    await page.render({canvasContext: context, viewport}).promise;
  } catch (error) {
    canvas.hidden = true;
    placeholder.hidden = false;
    showAlert('PDFMint could not preview this file. It may be encrypted or damaged.');
  }
}

const heroInput = document.getElementById('file-input');
const heroCard = document.getElementById('upload-card');
const heroStatus = document.getElementById('file-status');
if (heroInput) {
  heroInput.addEventListener('change', event => {
    const file = event.target.files[0];
    if (file) {
      heroStatus.textContent = `${file.name} selected — opening preview…`;
      renderPreview(file);
    }
    event.target.value = '';
  });
}
if (heroCard) {
  ['dragenter','dragover'].forEach(name => heroCard.addEventListener(name, event => {
    event.preventDefault();
    heroCard.classList.add('dragover');
  }));
  ['dragleave','drop'].forEach(name => heroCard.addEventListener(name, event => {
    event.preventDefault();
    heroCard.classList.remove('dragover');
  }));
  heroCard.addEventListener('drop', event => {
    const file = event.dataTransfer.files[0];
    if (file) renderPreview(file);
  });
}

document.getElementById('preview-file-input').addEventListener('change', event => {
  const file = event.target.files[0];
  if (file) renderPreview(file);
  event.target.value = '';
});
document.getElementById('open-split-from-preview').addEventListener('click', async () => {
  if (!previewFile) return;
  await setSplitFile(previewFile);
  openWorkspace('split');
});

function renderMergeList() {
  const list = document.getElementById('merge-list');
  const summary = document.getElementById('merge-summary');
  const button = document.getElementById('merge-button');

  if (!mergeFiles.length) {
    list.innerHTML = '<div class="merge-empty">No PDF files have been added yet.</div>';
    summary.textContent = 'No files selected';
    button.disabled = true;
    return;
  }

  list.innerHTML = mergeFiles.map((file, index) => `
    <div class="merge-item">
      <div class="merge-item-icon">PDF</div>
      <div><strong>${escapeHtml(file.name)}</strong><small>${formatBytes(file.size)}</small></div>
      <div class="merge-controls">
        <button class="icon-button" type="button" data-move-up="${index}" aria-label="Move up">↑</button>
        <button class="icon-button" type="button" data-move-down="${index}" aria-label="Move down">↓</button>
        <button class="icon-button" type="button" data-remove="${index}" aria-label="Remove">×</button>
      </div>
    </div>
  `).join('');

  summary.textContent = `${mergeFiles.length} PDF${mergeFiles.length === 1 ? '' : 's'} selected`;
  button.disabled = mergeFiles.length < 2;

  list.querySelectorAll('[data-move-up]').forEach(btn => btn.addEventListener('click', () => moveMergeFile(Number(btn.dataset.moveUp), -1)));
  list.querySelectorAll('[data-move-down]').forEach(btn => btn.addEventListener('click', () => moveMergeFile(Number(btn.dataset.moveDown), 1)));
  list.querySelectorAll('[data-remove]').forEach(btn => btn.addEventListener('click', () => {
    mergeFiles.splice(Number(btn.dataset.remove), 1);
    renderMergeList();
  }));
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
}

function moveMergeFile(index, direction) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= mergeFiles.length) return;
  [mergeFiles[index], mergeFiles[newIndex]] = [mergeFiles[newIndex], mergeFiles[index]];
  renderMergeList();
}

function addMergeFiles(files) {
  const valid = Array.from(files).filter(validPdf);
  if (!valid.length) {
    showAlert('Please add PDF files only.');
    return;
  }
  clearAlert();
  mergeFiles.push(...valid);
  renderMergeList();
}

const mergeInput = document.getElementById('merge-file-input');
mergeInput.addEventListener('change', event => {
  addMergeFiles(event.target.files);
  event.target.value = '';
});
const mergeDrop = document.getElementById('merge-drop-zone');
['dragenter','dragover'].forEach(name => mergeDrop.addEventListener(name, event => {
  event.preventDefault();
  mergeDrop.classList.add('dragover');
}));
['dragleave','drop'].forEach(name => mergeDrop.addEventListener(name, event => {
  event.preventDefault();
  mergeDrop.classList.remove('dragover');
}));
mergeDrop.addEventListener('drop', event => addMergeFiles(event.dataTransfer.files));

document.getElementById('merge-button').addEventListener('click', async event => {
  const button = event.currentTarget;
  if (mergeFiles.length < 2) return;
  button.disabled = true;
  button.textContent = 'Merging…';
  clearAlert();

  try {
    const output = await PDFLib.PDFDocument.create();
    for (const file of mergeFiles) {
      const source = await PDFLib.PDFDocument.load(await file.arrayBuffer());
      const pages = await output.copyPages(source, source.getPageIndices());
      pages.forEach(page => output.addPage(page));
    }
    const bytes = await output.save();
    downloadPdf(bytes, 'pdfmint-merged.pdf');
  } catch (error) {
    showAlert('The files could not be merged. Password-protected or damaged PDFs may not be supported.');
  } finally {
    button.disabled = false;
    button.textContent = 'Merge and download';
  }
});

async function setSplitFile(file) {
  if (!validPdf(file)) {
    showAlert('Please select a valid PDF file.');
    return;
  }
  clearAlert();
  try {
    const source = await PDFLib.PDFDocument.load(await file.arrayBuffer());
    splitFile = file;
    splitPageCount = source.getPageCount();
    document.getElementById('split-file-summary').textContent =
      `${file.name} · ${splitPageCount} page${splitPageCount === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
    document.getElementById('split-help').textContent =
      `Choose pages from 1 to ${splitPageCount}. Duplicate page numbers are allowed.`;
    document.getElementById('split-button').disabled = false;
  } catch (error) {
    splitFile = null;
    splitPageCount = 0;
    document.getElementById('split-button').disabled = true;
    showAlert('PDFMint could not open this file. It may be password-protected or damaged.');
  }
}

document.getElementById('split-file-input').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (file) await setSplitFile(file);
  event.target.value = '';
});

function parsePageRanges(text, maxPage) {
  if (!text.trim()) throw new Error('Enter at least one page number or range.');
  const result = [];
  for (const rawPart of text.split(',')) {
    const part = rawPart.trim();
    if (!part) continue;
    if (/^\d+$/.test(part)) {
      const page = Number(part);
      if (page < 1 || page > maxPage) throw new Error(`Page ${page} is outside the available range.`);
      result.push(page - 1);
      continue;
    }
    const match = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!match) throw new Error(`“${part}” is not a valid page or range.`);
    const start = Number(match[1]);
    const end = Number(match[2]);
    if (start < 1 || end < 1 || start > maxPage || end > maxPage) {
      throw new Error(`Range ${part} is outside pages 1-${maxPage}.`);
    }
    const step = start <= end ? 1 : -1;
    for (let page = start; page !== end + step; page += step) result.push(page - 1);
  }
  if (!result.length) throw new Error('Enter at least one valid page.');
  return result;
}

document.getElementById('split-button').addEventListener('click', async event => {
  const button = event.currentTarget;
  if (!splitFile) return;
  button.disabled = true;
  button.textContent = 'Creating PDF…';
  clearAlert();

  try {
    const indices = parsePageRanges(document.getElementById('split-ranges').value, splitPageCount);
    const source = await PDFLib.PDFDocument.load(await splitFile.arrayBuffer());
    const output = await PDFLib.PDFDocument.create();
    const pages = await output.copyPages(source, indices);
    pages.forEach(page => output.addPage(page));
    const bytes = await output.save();
    const base = splitFile.name.replace(/\.pdf$/i, '');
    downloadPdf(bytes, `${base}-selected-pages.pdf`);
  } catch (error) {
    showAlert(error.message || 'The selected pages could not be extracted.');
  } finally {
    button.disabled = false;
    button.textContent = 'Split and download';
  }
});

function downloadPdf(bytes, filename) {
  const blob = new Blob([bytes], {type: 'application/pdf'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

renderMergeList();
