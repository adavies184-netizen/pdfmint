
const tabs = document.querySelectorAll('.tool-tab');
const panels = document.querySelectorAll('.tool-panel');
tabs.forEach(tab => tab.addEventListener('click', () => {
  tabs.forEach(item => item.classList.remove('active'));
  panels.forEach(panel => panel.classList.remove('active'));
  tab.classList.add('active');
  document.getElementById(tab.dataset.target).classList.add('active');
}));


document.querySelectorAll('.nav-dropdown-toggle').forEach(toggle => {
  toggle.addEventListener('click', event => {
    event.stopPropagation();
    const dropdown = toggle.closest('.nav-dropdown');
    const willOpen = !dropdown.classList.contains('open');

    document.querySelectorAll('.nav-dropdown.open').forEach(item => {
      item.classList.remove('open');
      const button = item.querySelector('.nav-dropdown-toggle');
      if (button) button.setAttribute('aria-expanded', 'false');
    });

    if (willOpen) {
      dropdown.classList.add('open');
      toggle.setAttribute('aria-expanded', 'true');
    }
  });
});

document.addEventListener('click', event => {
  if (!event.target.closest('.nav-dropdown')) {
    document.querySelectorAll('.nav-dropdown.open').forEach(item => {
      item.classList.remove('open');
      const button = item.querySelector('.nav-dropdown-toggle');
      if (button) button.setAttribute('aria-expanded', 'false');
    });
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    document.querySelectorAll('.nav-dropdown.open').forEach(item => {
      item.classList.remove('open');
      const button = item.querySelector('.nav-dropdown-toggle');
      if (button) button.setAttribute('aria-expanded', 'false');
    });
  }
});

const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.querySelector('.mobile-menu');
if (menuButton && mobileMenu) {
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', String(!open));
    mobileMenu.hidden = open;
  });
}

if (window.pdfjsLib) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

const workspace = document.getElementById('pdf-workspace');
const alertBox = document.getElementById('workspace-alert');
const views = {
  preview: document.getElementById('preview-view'),
  merge: document.getElementById('merge-view'),
  split: document.getElementById('split-view')
};
const titles = {
  preview: ['PAGE EDITOR', 'Organise your PDF', 'Rotate, delete and rearrange pages before downloading.'],
  merge: ['MERGE PDF', 'Combine PDF files', 'Arrange multiple PDFs and download one combined document.'],
  split: ['SPLIT PDF', 'Extract PDF pages', 'Create a new PDF from the pages you choose.']
};

let editor = {
  file: null,
  originalBytes: null,
  pdfjs: null,
  pages: [],
  selectedIndex: 0,
  zoom: 1,
  renderToken: 0,
  mode: 'select',
  annotations: {},
  selectedAnnotationId: null,
  canvasMetrics: null,
  extractedText: {},
  selectedExistingTextId: null,
  editTextBoxMode: false,
  editCreatedText: {},
  selectedEditCreatedTextId: null,
  signatures: {},
  selectedSignatureId: null,
  pendingSignature: null
};
let splitFile = null;
let splitPageCount = 0;
let mergeFiles = [];

const editorHistory = { undo: [], redo: [], restoring: false };
function cloneEditorState() {
  return JSON.parse(JSON.stringify({
    pages: editor.pages,
    annotations: editor.annotations,
    extractedText: editor.extractedText,
    editCreatedText: editor.editCreatedText,
    signatures: editor.signatures,
    selectedIndex: editor.selectedIndex,
    selectedAnnotationId: editor.selectedAnnotationId,
    selectedExistingTextId: editor.selectedExistingTextId,
    selectedSignatureId: editor.selectedSignatureId
  }));
}
function restoreEditorState(snapshot) {
  editorHistory.restoring = true;
  editor.pages = snapshot.pages;
  editor.annotations = snapshot.annotations;
  editor.extractedText = snapshot.extractedText || {};
  editor.editCreatedText = snapshot.editCreatedText || {};
  editor.signatures = snapshot.signatures || {};
  editor.selectedIndex = Math.min(snapshot.selectedIndex, Math.max(0, editor.pages.length - 1));
  editor.selectedAnnotationId = snapshot.selectedAnnotationId;
  editor.selectedExistingTextId = snapshot.selectedExistingTextId || null;
  editor.selectedSignatureId = snapshot.selectedSignatureId || null;
  editorHistory.restoring = false;
  renderThumbnails().then(() => renderSelectedPage());
  updateEditorUi();
updateHistoryButtons();
  updateHistoryButtons();
}
function recordHistory() {
  if (editorHistory.restoring || !editor.pages.length) return;
  editorHistory.undo.push(cloneEditorState());
  if (editorHistory.undo.length > 60) editorHistory.undo.shift();
  editorHistory.redo = [];
  updateHistoryButtons();
}
function undoEditor() {
  if (!editorHistory.undo.length) return;
  editorHistory.redo.push(cloneEditorState());
  restoreEditorState(editorHistory.undo.pop());
}
function redoEditor() {
  if (!editorHistory.redo.length) return;
  editorHistory.undo.push(cloneEditorState());
  restoreEditorState(editorHistory.redo.pop());
}
function updateHistoryButtons() {
  const undo = document.getElementById('undo-tool');
  const redo = document.getElementById('redo-tool');
  if (undo) undo.disabled = editorHistory.undo.length === 0;
  if (redo) redo.disabled = editorHistory.redo.length === 0;
}


function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '—';
  const units = ['bytes', 'KB', 'MB', 'GB'];
  let value = bytes, unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit++; }
  return `${value.toFixed(unit === 0 ? 0 : 2)} ${units[unit]}`;
}
function validPdf(file) {
  return file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
}
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
}
function showAlert(message) {
  alertBox.textContent = message;
  alertBox.hidden = false;
  clearTimeout(showAlert.timer);
  showAlert.timer = setTimeout(() => { alertBox.hidden = true; }, 5000);
}
function clearAlert() { alertBox.hidden = true; alertBox.textContent = ''; }
function openWorkspace(tool) {
  clearAlert();

  if (tool !== 'preview') {
    showAlert(`${tool.charAt(0).toUpperCase() + tool.slice(1)} PDF remains available from the homepage tools and will be restored in the next combined editor build.`);
    return;
  }

  Object.entries(views).forEach(([name, view]) => {
    if (view) view.hidden = name !== tool;
  });

  workspace.hidden = false;
  document.body.classList.add('workspace-open');
}
function closeWorkspace() {
  workspace.hidden = true;
  document.body.classList.remove('workspace-open');
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !workspace.hidden) closeWorkspace();
});
document.querySelectorAll('[data-open-tool]').forEach(button => {
  button.addEventListener('click', () => openWorkspace(button.dataset.openTool));
});

async function loadEditorPdf(file) {
  if (!validPdf(file)) return showAlert('Please select a valid PDF file.');
  openWorkspace('preview');
  clearAlert();
  try {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdfjs = await pdfjsLib.getDocument({data: bytes.slice()}).promise;
    editor = {
      file,
      originalBytes: bytes,
      pdfjs,
      pages: Array.from({length: pdfjs.numPages}, (_, index) => ({
        sourceIndex: index,
        rotation: 0
      })),
      selectedIndex: 0,
      zoom: 1,
      renderToken: editor.renderToken + 1,
      mode: 'select',
      annotations: {},
      selectedAnnotationId: null,
      canvasMetrics: null,
      extractedText: {},
      selectedExistingTextId: null,
      editTextBoxMode: false,
      editCreatedText: {},
      selectedEditCreatedTextId: null,
      signatures: {},
      selectedSignatureId: null,
      pendingSignature: null
    };
    editorHistory.undo = []; editorHistory.redo = []; updateHistoryButtons();
    setEditorMode('select');
    document.getElementById('preview-name').textContent = file.name;
    document.getElementById('preview-size').textContent = formatBytes(file.size);
    updateEditorUi();
    await renderThumbnails();
    await renderSelectedPage();
  } catch (error) {
    showAlert('PDFMint could not open this PDF. Password-protected or damaged files may not be supported.');
  }
}


function getPageAnnotations(sourceIndex) {
  const key = String(sourceIndex);
  if (!editor.annotations[key]) editor.annotations[key] = [];
  return editor.annotations[key];
}
function getSelectedAnnotation() {
  if (!editor.pages.length || !editor.selectedAnnotationId) return null;
  return getPageAnnotations(editor.pages[editor.selectedIndex].sourceIndex)
    .find(item => item.id === editor.selectedAnnotationId) || null;
}

function clearEditTextInterfaceImmediately() {
  editor.editTextBoxMode = false;
  editor.selectedExistingTextId = null;
  editor.selectedEditCreatedTextId = null;

  const editOptionsBar = document.getElementById('edit-text-options-bar');
  const addBoxButton = document.getElementById('edit-add-text-box');
  const colourMenu = document.getElementById('edit-colour-menu');
  const layer = document.getElementById('annotation-layer');

  if (editOptionsBar) editOptionsBar.hidden = true;
  if (addBoxButton) addBoxButton.classList.remove('active');
  if (colourMenu) colourMenu.hidden = true;

  if (layer) {
    layer.classList.remove('edit-text-mode', 'add-edit-box-mode');
  }

  // Remove the visible Edit Text layer now, during the toolbar click itself.
  // Do not wait for a later click on the PDF preview.
  document.querySelectorAll(
    '.existing-text-box, .existing-text-whiteout, .edit-created-text'
  ).forEach(element => element.remove());
}

function setEditorMode(mode) {
  if (mode !== 'edit-existing') {
    clearEditTextInterfaceImmediately();
  }

  editor.mode = mode;
  if (mode !== 'signature-place') {
    editor.selectedSignatureId = null;
    editor.pendingSignature = null;
  }

  const addTextTool = document.getElementById('add-text-tool');
  const editTextTool = document.getElementById('edit-text-tool');
  if (addTextTool) addTextTool.classList.toggle('active', mode === 'text');
  if (editTextTool) editTextTool.classList.toggle('active', mode === 'edit-existing');

  const addOptionsBar = document.getElementById('text-options-bar');
  const editOptionsBar = document.getElementById('edit-text-options-bar');
  if (addOptionsBar) addOptionsBar.hidden = mode !== 'text';
  if (editOptionsBar) editOptionsBar.hidden = mode !== 'edit-existing';

  if (mode !== 'edit-existing') {
    editor.editTextBoxMode = false;
    editor.selectedExistingTextId = null;
    editor.selectedEditCreatedTextId = null;
    const addBoxButton = document.getElementById('edit-add-text-box');
    if (addBoxButton) addBoxButton.classList.remove('active');
  }

  const layer = document.getElementById('annotation-layer');
  layer.classList.toggle('text-mode', mode === 'text');
  layer.classList.toggle('select-mode', mode === 'select');
  layer.classList.toggle('edit-text-mode', mode === 'edit-existing');
  layer.classList.toggle('add-edit-box-mode', mode === 'edit-existing' && editor.editTextBoxMode);
  layer.classList.toggle('signature-place-mode', mode === 'signature-place');

  if (mode === 'text') {
    showEditorHint('Click anywhere on the page to add text.');
  } else if (mode === 'edit-existing') {
    showEditorHint('Click once to select text. Double-click to edit it.');
    ensureExistingTextForCurrentPage().then(renderAnnotations);
  } else {
    renderAnnotations();
  }
}

function showEditorHint(message) {
  let toast = document.querySelector('.editor-help-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'editor-help-toast';
    (document.querySelector('.desktop-editor') || document.body).appendChild(toast);
  }
  toast.textContent = message;
  clearTimeout(showEditorHint.timer);
  showEditorHint.timer = setTimeout(() => toast.remove(), 2200);
}
function hexToRgb01(hex) {
  const value = hex.replace('#','');
  const full = value.length === 3 ? value.split('').map(c => c+c).join('') : value;
  return {
    r: parseInt(full.slice(0,2),16)/255,
    g: parseInt(full.slice(2,4),16)/255,
    b: parseInt(full.slice(4,6),16)/255
  };
}

function getCurrentSourcePageIndex() {
  if (!editor.pages.length) return null;
  return editor.pages[editor.selectedIndex].sourceIndex;
}

function getExistingTextItems(sourceIndex) {
  const key = String(sourceIndex);
  if (!editor.extractedText[key]) editor.extractedText[key] = [];
  return editor.extractedText[key];
}

function approximatePdfFont(fontName = '') {
  const lower = String(fontName).toLowerCase();
  const bold = /bold|black|semibold|demi/.test(lower);
  const italic = /italic|oblique/.test(lower);
  let font = 'Helvetica';
  if (/times|serif|roman/.test(lower)) font = 'TimesRoman';
  else if (/courier|mono/.test(lower)) font = 'Courier';
  return {font, bold, italic};
}

async function ensureExistingTextForCurrentPage() {
  const sourceIndex = getCurrentSourcePageIndex();
  if (sourceIndex === null) return [];

  const key = String(sourceIndex);
  if (editor.extractedText[key]?.length) return editor.extractedText[key];

  const page = await editor.pdfjs.getPage(sourceIndex + 1);
  const textContent = await page.getTextContent();
  const viewport = page.getViewport({scale: 1});

  const runs = textContent.items
    .map((textItem, index) => {
      const text = String(textItem.str || '');
      if (!text.trim()) return null;

      const tx = pdfjsLib.Util.transform(viewport.transform, textItem.transform);
      const fontHeight = Math.max(5, Math.hypot(tx[2], tx[3]));
      const x = tx[4];
      const top = tx[5] - fontHeight;
      const width = Math.max(8, Math.abs(textItem.width || 0));
      const style = approximatePdfFont(textItem.fontName);

      return {
        index,
        text,
        x,
        top,
        width,
        height: fontHeight,
        baselineY: textItem.transform[5],
        pdfX: textItem.transform[4],
        pdfY: textItem.transform[5],
        pdfFontSize: Math.max(5, Math.hypot(textItem.transform[0], textItem.transform[1])),
        fontName: textItem.fontName || '',
        font: style.font,
        bold: style.bold,
        italic: style.italic
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const vertical = a.top - b.top;
      return Math.abs(vertical) > Math.max(a.height, b.height) * .55 ? vertical : a.x - b.x;
    });

  // First group runs into visual lines.
  const lines = [];
  for (const run of runs) {
    let line = lines.find(candidate => {
      const tolerance = Math.max(candidate.avgHeight, run.height) * .55;
      return Math.abs(candidate.top - run.top) <= tolerance;
    });

    if (!line) {
      line = {
        runs: [],
        top: run.top,
        bottom: run.top + run.height,
        left: run.x,
        right: run.x + run.width,
        avgHeight: run.height
      };
      lines.push(line);
    }

    line.runs.push(run);
    line.top = Math.min(line.top, run.top);
    line.bottom = Math.max(line.bottom, run.top + run.height);
    line.left = Math.min(line.left, run.x);
    line.right = Math.max(line.right, run.x + run.width);
    line.avgHeight = line.runs.reduce((sum, item) => sum + item.height, 0) / line.runs.length;
  }

  lines.sort((a, b) => a.top - b.top);
  lines.forEach(line => line.runs.sort((a, b) => a.x - b.x));

  // Then group neighbouring lines into paragraph boxes.
  const paragraphs = [];
  for (const line of lines) {
    const text = line.runs.map((run, i) => {
      if (i === 0) return run.text;
      const prev = line.runs[i - 1];
      const gap = run.x - (prev.x + prev.width);
      return `${gap > Math.max(2, line.avgHeight * .16) ? ' ' : ''}${run.text}`;
    }).join('');

    const firstRun = line.runs[0];
    const paragraphCandidate = paragraphs[paragraphs.length - 1];
    const lineGap = paragraphCandidate ? line.top - paragraphCandidate.bottom : Infinity;
    const sameLeftEdge = paragraphCandidate
      ? Math.abs(line.left - paragraphCandidate.left) <= Math.max(8, line.avgHeight * .85)
      : false;
    const closeVertically = paragraphCandidate
      ? lineGap <= Math.max(line.avgHeight, paragraphCandidate.avgHeight) * .72
      : false;
    const previousFirstRun = paragraphCandidate?.firstRun;
    const sameFontFamily = previousFirstRun
      ? previousFirstRun.font === firstRun.font
      : false;
    const similarFontSize = previousFirstRun
      ? Math.abs(previousFirstRun.pdfFontSize - firstRun.pdfFontSize) <= Math.max(1.2, firstRun.pdfFontSize * .14)
      : false;

    if (paragraphCandidate && closeVertically && sameLeftEdge && sameFontFamily && similarFontSize) {
      paragraphCandidate.lines.push({text, line});
      paragraphCandidate.text += `\n${text}`;
      paragraphCandidate.originalText = paragraphCandidate.text;
      paragraphCandidate.left = Math.min(paragraphCandidate.left, line.left);
      paragraphCandidate.right = Math.max(paragraphCandidate.right, line.right);
      paragraphCandidate.top = Math.min(paragraphCandidate.top, line.top);
      paragraphCandidate.bottom = Math.max(paragraphCandidate.bottom, line.bottom);
      paragraphCandidate.avgHeight =
        paragraphCandidate.lines.reduce((sum, item) => sum + item.line.avgHeight, 0) /
        paragraphCandidate.lines.length;
    } else {
      paragraphs.push({
        lines: [{text, line}],
        text,
        originalText: text,
        left: line.left,
        right: line.right,
        top: line.top,
        bottom: line.bottom,
        avgHeight: line.avgHeight,
        firstRun
      });
    }
  }

  const items = paragraphs.map((paragraph, index) => {
    const firstRun = paragraph.firstRun;
    const width = Math.max(12, paragraph.right - paragraph.left);
    const height = Math.max(paragraph.avgHeight * 1.15, paragraph.bottom - paragraph.top);

    return {
      id: `existing-${sourceIndex}-${index}`,
      type: 'existing-text',
      originalText: paragraph.originalText,
      text: paragraph.text,
      x: Math.max(0, paragraph.left / viewport.width),
      y: Math.max(0, paragraph.top / viewport.height),
      w: Math.min(1, Math.max(.02, width / viewport.width)),
      h: Math.min(.75, Math.max(.018, height / viewport.height)),
      originalX: Math.max(0, paragraph.left / viewport.width),
      originalY: Math.max(0, paragraph.top / viewport.height),
      originalW: Math.min(1, Math.max(.02, width / viewport.width)),
      originalH: Math.min(.75, Math.max(.018, height / viewport.height)),
      pdfX: firstRun.pdfX,
      pdfY: firstRun.pdfY,
      pdfWidth: width,
      pdfFontSize: firstRun.pdfFontSize,
      fontName: firstRun.fontName,
      font: firstRun.font,
      bold: firstRun.bold,
      italic: firstRun.italic,
      lineHeight: paragraph.avgHeight,
      modified: false
    };
  });

  editor.extractedText[key] = items;
  return items;
}

function getSelectedExistingText() {
  const sourceIndex = getCurrentSourcePageIndex();
  if (sourceIndex === null || !editor.selectedExistingTextId) return null;
  return getExistingTextItems(sourceIndex).find(item => item.id === editor.selectedExistingTextId) || null;
}

function refreshExistingTextSelectionClasses() {
  document.querySelectorAll('.existing-text-box').forEach(box => {
    const selected = box.dataset.id === editor.selectedExistingTextId;
    box.classList.toggle('selected', selected);
    if (!selected) {
      box.classList.remove('editing');
      const content = box.querySelector('.existing-text-content');
      if (content) content.removeAttribute('contenteditable');
    }
  });
}

function selectExistingText(id) {
  editor.selectedExistingTextId = id;
  editor.selectedAnnotationId = null;
  refreshExistingTextSelectionClasses();
}

function deselectExistingText() {
  editor.selectedExistingTextId = null;
  refreshExistingTextSelectionClasses();
}

function startExistingTextResize(event, item, side, box, content) {
  event.preventDefault();
  event.stopPropagation();
  selectExistingText(item.id);
  recordHistory();

  const metrics = editor.canvasMetrics;
  const startX = event.clientX;
  const originalX = item.x;
  const originalW = item.w;

  const updateBox = () => {
    box.classList.add('modified');
    content.style.display = 'block';

    box.style.left = `${item.x * metrics.width}px`;
    box.style.width = `${item.w * metrics.width}px`;

    // Ensure a whiteout exists over the full original paragraph while the
    // resized replacement is being previewed.
    let whiteout = document.querySelector(`.existing-text-whiteout[data-for="${item.id}"]`);
    if (!whiteout) {
      whiteout = document.createElement('div');
      whiteout.className = 'existing-text-whiteout';
      whiteout.dataset.for = item.id;
      document.getElementById('annotation-layer').insertBefore(whiteout, box);
    }
    whiteout.style.left = `${item.originalX * metrics.width}px`;
    whiteout.style.top = `${item.originalY * metrics.height}px`;
    whiteout.style.width = `${item.originalW * metrics.width}px`;
    whiteout.style.height = `${Math.max(16, item.originalH * metrics.height)}px`;

    const requiredHeight = Math.max(
      item.h * metrics.height,
      content.scrollHeight
    );
    box.style.minHeight = `${requiredHeight}px`;
    item.h = Math.min(1 - item.y, requiredHeight / metrics.height);
  };

  const move = moveEvent => {
    const delta = (moveEvent.clientX - startX) / metrics.width;

    if (side === 'left') {
      const newX = Math.max(0, Math.min(originalX + originalW - .03, originalX + delta));
      item.w = originalW + (originalX - newX);
      item.x = newX;
    } else {
      item.w = Math.max(.03, Math.min(1 - item.x, originalW + delta));
    }

    item.modified = true;
    updateBox();
  };

  const up = () => {
    updateBox();
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  };

  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}


function getEditCreatedTextItems(sourceIndex) {
  const key = String(sourceIndex);
  if (!editor.editCreatedText[key]) editor.editCreatedText[key] = [];
  return editor.editCreatedText[key];
}

function getSelectedEditTarget() {
  const sourceIndex = getCurrentSourcePageIndex();
  if (sourceIndex === null) return null;

  if (editor.selectedExistingTextId) {
    return getExistingTextItems(sourceIndex).find(item => item.id === editor.selectedExistingTextId) || null;
  }

  if (editor.selectedEditCreatedTextId) {
    return getEditCreatedTextItems(sourceIndex).find(item => item.id === editor.selectedEditCreatedTextId) || null;
  }

  return null;
}

function syncEditTextToolbar() {
  const item = getSelectedEditTarget();
  if (!item) return;

  const font = document.getElementById('edit-text-font');
  const size = document.getElementById('edit-text-size');
  const bold = document.getElementById('edit-text-bold');
  const italic = document.getElementById('edit-text-italic');
  const colourLine = document.getElementById('edit-colour-line');

  if (font) font.value = item.font || 'Helvetica';

  if (size) {
    const requested = Math.max(4, Math.min(200, Math.round(item.pdfFontSize || item.size || 18)));
    let option = Array.from(size.options).find(opt => Number(opt.value) === requested);
    if (!option) {
      option = document.createElement('option');
      option.value = String(requested);
      option.textContent = String(requested);
      size.appendChild(option);
    }
    size.value = String(requested);
  }

  if (bold) bold.classList.toggle('active', Boolean(item.bold));
  if (italic) italic.classList.toggle('active', Boolean(item.italic));
  if (colourLine) colourLine.style.background = item.color || '#111827';
}

function updateEditTarget(mutator) {
  const item = getSelectedEditTarget();
  if (!item) return;
  recordHistory();
  mutator(item);
  item.modified = true;
  renderAnnotations();
}

function applyColourToCurrentSelection(colour) {
  const active = document.activeElement;
  const isEditable =
    active &&
    (active.classList.contains('existing-text-content') || active.classList.contains('edit-created-text')) &&
    active.isContentEditable;

  if (isEditable) {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed && active.contains(selection.anchorNode)) {
      document.execCommand('styleWithCSS', false, true);
      document.execCommand('foreColor', false, colour);
      const target = getSelectedEditTarget();
      if (target) {
        target.html = active.innerHTML;
        target.text = active.innerText.replace(/\r/g, '');
        target.modified = true;
      }
      return;
    }
  }

  updateEditTarget(item => {
    item.color = colour;
    item.html = '';
  });
}

function placeCaretAtEnd(element) {
  element.focus({preventScroll: true});
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}

function addEditTextBoxAt(clientX, clientY) {
  const sourceIndex = getCurrentSourcePageIndex();
  const layer = document.getElementById('annotation-layer');
  const rect = layer.getBoundingClientRect();
  if (sourceIndex === null || !rect.width || !rect.height) return;

  const item = {
    id: `edit-created-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    type: 'edit-created-text',
    text: '',
    html: '',
    x: Math.max(0, Math.min(.82, (clientX - rect.left) / rect.width)),
    y: Math.max(0, Math.min(.93, (clientY - rect.top) / rect.height)),
    w: .18,
    h: .045,
    font: document.getElementById('edit-text-font').value || 'Helvetica',
    pdfFontSize: Number(document.getElementById('edit-text-size').value) || 18,
    bold: document.getElementById('edit-text-bold').classList.contains('active'),
    italic: document.getElementById('edit-text-italic').classList.contains('active'),
    color: document.getElementById('edit-colour-line').style.background || '#111827',
    modified: true
  };

  recordHistory();
  getEditCreatedTextItems(sourceIndex).push(item);
  editor.selectedExistingTextId = null;
  editor.selectedEditCreatedTextId = item.id;
  editor.editTextBoxMode = false;
  document.getElementById('edit-add-text-box').classList.remove('active');
  layer.classList.remove('add-edit-box-mode');

  renderAnnotations();

  requestAnimationFrame(() => {
    const element = document.querySelector(`.edit-created-text[data-id="${item.id}"]`);
    if (!element) return;
    element.classList.add('editing');
    element.setAttribute('contenteditable', 'plaintext-only');
    if (element.contentEditable !== 'plaintext-only') element.setAttribute('contenteditable', 'true');
    placeCaretAtEnd(element);
  });
}

function startEditCreatedResize(event, item, side, box) {
  event.preventDefault();
  event.stopPropagation();
  recordHistory();

  const metrics = editor.canvasMetrics;
  const startX = event.clientX;
  const originalX = item.x;
  const originalW = item.w;

  const move = moveEvent => {
    const delta = (moveEvent.clientX - startX) / metrics.width;
    if (side === 'left') {
      const newX = Math.max(0, Math.min(originalX + originalW - .03, originalX + delta));
      item.w = originalW + (originalX - newX);
      item.x = newX;
    } else {
      item.w = Math.max(.03, Math.min(1 - item.x, originalW + delta));
    }

    box.style.left = `${item.x * metrics.width}px`;
    box.style.width = `${item.w * metrics.width}px`;
    const height = Math.max(30, box.scrollHeight);
    box.style.minHeight = `${height}px`;
    item.h = Math.min(1 - item.y, height / metrics.height);
  };

  const up = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  };

  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}

function renderEditCreatedTextBoxes(layer, metrics) {
  if (editor.mode !== 'edit-existing') return;
  const sourceIndex = getCurrentSourcePageIndex();
  if (sourceIndex === null) return;

  getEditCreatedTextItems(sourceIndex).forEach(item => {
    const box = document.createElement('div');
    box.className = 'edit-created-text';
    if (item.id === editor.selectedEditCreatedTextId) box.classList.add('selected');
    box.dataset.id = item.id;
    box.style.left = `${item.x * metrics.width}px`;
    box.style.top = `${item.y * metrics.height}px`;
    box.style.width = `${item.w * metrics.width}px`;
    box.style.minHeight = `${Math.max(30, item.h * metrics.height)}px`;
    box.style.fontFamily = item.font === 'TimesRoman'
      ? '"Times New Roman", Times, serif'
      : item.font === 'Courier'
        ? '"Courier New", monospace'
        : 'Helvetica, Arial, sans-serif';
    box.style.fontWeight = item.bold ? '700' : '400';
    box.style.fontStyle = item.italic ? 'italic' : 'normal';
    box.style.fontSize = `${Math.max(4, item.pdfFontSize * metrics.scale)}px`;
    box.style.color = item.color || '#111827';

    if (item.html) box.innerHTML = item.html;
    else box.textContent = item.text || '';

    const leftHandle = document.createElement('span');
    leftHandle.className = 'existing-handle left-handle';
    leftHandle.contentEditable = 'false';

    const rightHandle = document.createElement('span');
    rightHandle.className = 'existing-handle right-handle';
    rightHandle.contentEditable = 'false';

    box.append(leftHandle, rightHandle);

    box.addEventListener('click', event => {
      event.stopPropagation();

      if (box.classList.contains('editing')) return;

      editor.selectedExistingTextId = null;
      editor.selectedEditCreatedTextId = item.id;
      document.querySelectorAll('.existing-text-box').forEach(el => el.classList.remove('selected'));
      document.querySelectorAll('.edit-created-text').forEach(el => el.classList.toggle('selected', el === box));
      syncEditTextToolbar();
    });

    box.addEventListener('dblclick', event => {
      event.preventDefault();
      event.stopPropagation();

      editor.selectedExistingTextId = null;
      editor.selectedEditCreatedTextId = item.id;
      box.classList.add('selected', 'editing');
      box.setAttribute('contenteditable', 'plaintext-only');
      if (box.contentEditable !== 'plaintext-only') box.setAttribute('contenteditable', 'true');

      requestAnimationFrame(() => placeCaretAtEnd(box));
    });

    box.addEventListener('input', () => {
      const handles = box.querySelectorAll('.existing-handle');
      handles.forEach(handle => handle.remove());

      item.html = box.innerHTML;
      item.text = box.innerText.replace(/\r/g, '');
      item.modified = true;

      box.append(leftHandle, rightHandle);
      const height = Math.max(30, box.scrollHeight);
      box.style.minHeight = `${height}px`;
      item.h = Math.min(1 - item.y, height / metrics.height);
    });

    box.addEventListener('blur', () => {
      if (!box.classList.contains('editing')) return;
      box.removeAttribute('contenteditable');
      box.classList.remove('editing');

      const handles = box.querySelectorAll('.existing-handle');
      handles.forEach(handle => handle.remove());
      item.html = box.innerHTML;
      item.text = box.innerText.replace(/\r/g, '');
      box.append(leftHandle, rightHandle);
    });

    leftHandle.addEventListener('mousedown', event => startEditCreatedResize(event, item, 'left', box));
    rightHandle.addEventListener('mousedown', event => startEditCreatedResize(event, item, 'right', box));

    layer.appendChild(box);
  });
}

function renderExistingTextBoxes(layer, metrics) {
  if (editor.mode !== 'edit-existing') return;

  const sourceIndex = getCurrentSourcePageIndex();
  if (sourceIndex === null) return;

  getExistingTextItems(sourceIndex).forEach(item => {
    const isSelected = item.id === editor.selectedExistingTextId;
    const isModified = Boolean(item.modified);

    // Whenever the text is selected, resized or edited, hide the original PDF
    // text beneath the complete original paragraph area.
    if (isSelected || isModified) {
      const whiteout = document.createElement('div');
      whiteout.className = 'existing-text-whiteout';
      whiteout.dataset.for = item.id;
      whiteout.style.left = `${item.originalX * metrics.width}px`;
      whiteout.style.top = `${item.originalY * metrics.height}px`;
      whiteout.style.width = `${item.originalW * metrics.width}px`;
      whiteout.style.height = `${Math.max(16, item.originalH * metrics.height)}px`;
      layer.appendChild(whiteout);
    }

    const box = document.createElement('div');
    box.className = 'existing-text-box';
    if (isSelected) box.classList.add('selected');
    if (isModified) box.classList.add('modified');
    box.dataset.id = item.id;
    box.style.left = `${item.x * metrics.width}px`;
    box.style.top = `${item.y * metrics.height}px`;
    box.style.width = `${item.w * metrics.width}px`;
    box.style.minHeight = `${Math.max(16, item.h * metrics.height)}px`;

    const content = document.createElement('div');
    content.className = 'existing-text-content';
    if (item.html) content.innerHTML = item.html;
    else content.textContent = item.text;
    content.spellcheck = false;
    content.style.fontFamily = item.font === 'TimesRoman'
      ? '"Times New Roman", Times, serif'
      : item.font === 'Courier'
        ? '"Courier New", monospace'
        : 'Helvetica, Arial, sans-serif';
    content.style.fontWeight = item.bold ? '700' : '400';
    content.style.fontStyle = item.italic ? 'italic' : 'normal';
    content.style.fontSize = `${Math.max(4, item.pdfFontSize * metrics.scale)}px`;
    content.style.color = item.color || '#111827';

    const leftHandle = document.createElement('span');
    leftHandle.className = 'existing-handle left-handle';
    const rightHandle = document.createElement('span');
    rightHandle.className = 'existing-handle right-handle';

    box.append(content, leftHandle, rightHandle);

    box.addEventListener('click', event => {
      event.stopPropagation();
      if (box.classList.contains('editing')) return;
      selectExistingText(item.id);
      editor.selectedEditCreatedTextId = null;
      syncEditTextToolbar();
    });

    box.addEventListener('dblclick', event => {
      event.preventDefault();
      event.stopPropagation();

      selectExistingText(item.id);
      recordHistory();

      // Mark modified immediately so the replacement overlay remains visible
      // after the user clicks away, even when only deleting text.
      item.modified = true;
      box.classList.add('selected', 'editing', 'modified');
      content.setAttribute('contenteditable', 'plaintext-only');
      if (content.contentEditable !== 'plaintext-only') {
        content.setAttribute('contenteditable', 'true');
      }
      content.style.display = 'block';

      requestAnimationFrame(() => {
        content.focus({preventScroll: true});
        const range = document.createRange();
        range.selectNodeContents(content);
        range.collapse(false);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      });
    });

    content.addEventListener('mousedown', event => {
      if (box.classList.contains('editing')) event.stopPropagation();
    });

    content.addEventListener('click', event => {
      if (box.classList.contains('editing')) event.stopPropagation();
    });

    content.addEventListener('input', () => {
      item.text = content.innerText.replace(/\r/g, '');
      item.modified = true;
      box.classList.add('modified');

      const requiredHeight = Math.max(16, content.scrollHeight);
      box.style.minHeight = `${requiredHeight}px`;
      item.h = Math.min(1 - item.y, requiredHeight / metrics.height);
    });

    content.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        content.blur();
      }
    });

    content.addEventListener('blur', () => {
      if (!box.classList.contains('editing')) return;

      content.removeAttribute('contenteditable');
      box.classList.remove('editing');
      box.classList.add('modified');

      item.text = content.innerText.replace(/\r/g, '');
      item.modified = true;

      const requiredHeight = Math.max(16, content.scrollHeight);
      box.style.minHeight = `${requiredHeight}px`;
      item.h = Math.min(1 - item.y, requiredHeight / metrics.height);

      // Keep the replacement visible. Do not restore the original PDF text.
      refreshExistingTextSelectionClasses();
    });

    leftHandle.addEventListener('mousedown', event => {
      item.modified = true;
      box.classList.add('modified');
      startExistingTextResize(event, item, 'left', box, content);
    });
    rightHandle.addEventListener('mousedown', event => {
      item.modified = true;
      box.classList.add('modified');
      startExistingTextResize(event, item, 'right', box, content);
    });

    layer.appendChild(box);
  });
}


function getPageSignatures(sourceIndex) {
  const key = String(sourceIndex);
  if (!editor.signatures[key]) editor.signatures[key] = [];
  return editor.signatures[key];
}

function getSelectedSignature() {
  if (!editor.selectedSignatureId || !editor.pages.length) return null;
  const sourceIndex = editor.pages[editor.selectedIndex].sourceIndex;
  return getPageSignatures(sourceIndex).find(item => item.id === editor.selectedSignatureId) || null;
}

function selectSignature(id) {
  editor.selectedSignatureId = id;
  editor.selectedAnnotationId = null;
  editor.selectedExistingTextId = null;
  editor.selectedEditCreatedTextId = null;
  renderAnnotations();
}

function startDragSignature(event, item, element) {
  event.preventDefault();
  event.stopPropagation();

  const metrics = editor.canvasMetrics;
  const startClientX = event.clientX;
  const startClientY = event.clientY;
  const startLeft = item.x;
  const startTop = item.y;
  const dragThreshold = 5;
  let dragging = false;
  let historyRecorded = false;

  try {
    element.setPointerCapture(event.pointerId);
  } catch (_) {}

  const move = moveEvent => {
    const pixelDx = moveEvent.clientX - startClientX;
    const pixelDy = moveEvent.clientY - startClientY;

    if (!dragging && Math.hypot(pixelDx, pixelDy) < dragThreshold) {
      return;
    }

    if (!dragging) {
      dragging = true;
      element.classList.add('dragging');

      if (!historyRecorded) {
        recordHistory();
        historyRecorded = true;
      }
    }

    item.x = Math.max(
      0,
      Math.min(1 - item.w, startLeft + pixelDx / metrics.width)
    );
    item.y = Math.max(
      0,
      Math.min(1 - item.h, startTop + pixelDy / metrics.height)
    );

    // Update the existing element directly while dragging. Rebuilding the
    // annotation layer on every pointer move made the handles difficult to use.
    element.style.left = `${item.x * metrics.width}px`;
    element.style.top = `${item.y * metrics.height}px`;
  };

  const up = upEvent => {
    try {
      element.releasePointerCapture(event.pointerId);
    } catch (_) {}

    element.classList.remove('dragging');
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);

    // A simple click/tap only selects and anchors the signature in place.
    // The blue handles remain available immediately afterwards.
    if (!dragging) {
      editor.selectedSignatureId = item.id;
      element.classList.add('selected');
    }
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

function startResizeSignature(event, item, handleName, element) {
  event.preventDefault();
  event.stopPropagation();
  recordHistory();

  const metrics = editor.canvasMetrics;
  const startX = event.clientX;
  const startY = event.clientY;
  const original = {x:item.x, y:item.y, w:item.w, h:item.h};
  const aspect = item.aspect || (item.w / item.h) || 3;
  const minW = .06;
  const minH = .025;

  try {
    element.setPointerCapture(event.pointerId);
  } catch (_) {}

  const move = moveEvent => {
    const dx = (moveEvent.clientX - startX) / metrics.width;
    const dy = (moveEvent.clientY - startY) / metrics.height;

    let x = original.x;
    let y = original.y;
    let w = original.w;
    let h = original.h;

    const corner = ['nw','ne','sw','se'].includes(handleName);

    if (corner) {
      let proposedW = original.w;
      if (handleName.includes('e')) proposedW = original.w + dx;
      if (handleName.includes('w')) proposedW = original.w - dx;

      proposedW = Math.max(minW, proposedW);
      let proposedH = proposedW / aspect;

      if (handleName.includes('w')) x = original.x + (original.w - proposedW);
      if (handleName.includes('n')) y = original.y + (original.h - proposedH);

      w = proposedW;
      h = Math.max(minH, proposedH);
    } else {
      if (handleName === 'e') w = Math.max(minW, original.w + dx);
      if (handleName === 'w') {
        w = Math.max(minW, original.w - dx);
        x = original.x + (original.w - w);
      }
      if (handleName === 's') h = Math.max(minH, original.h + dy);
      if (handleName === 'n') {
        h = Math.max(minH, original.h - dy);
        y = original.y + (original.h - h);
      }
    }

    if (x < 0) {
      w += x;
      x = 0;
    }
    if (y < 0) {
      h += y;
      y = 0;
    }
    if (x + w > 1) w = 1 - x;
    if (y + h > 1) h = 1 - y;

    item.x = x;
    item.y = y;
    item.w = Math.max(minW, w);
    item.h = Math.max(minH, h);

    element.style.left = `${item.x * metrics.width}px`;
    element.style.top = `${item.y * metrics.height}px`;
    element.style.width = `${item.w * metrics.width}px`;
    element.style.height = `${item.h * metrics.height}px`;
  };

  const up = () => {
    try {
      element.releasePointerCapture(event.pointerId);
    } catch (_) {}

    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);

    editor.selectedSignatureId = item.id;
    element.classList.add('selected');
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

function renderSignatures(layer, metrics) {
  if (!editor.pages.length) return;
  const sourceIndex = editor.pages[editor.selectedIndex].sourceIndex;

  getPageSignatures(sourceIndex).forEach(item => {
    const element = document.createElement('div');
    element.className = `signature-annotation${item.id === editor.selectedSignatureId ? ' selected' : ''}`;
    element.dataset.id = item.id;
    element.style.left = `${item.x * metrics.width}px`;
    element.style.top = `${item.y * metrics.height}px`;
    element.style.width = `${item.w * metrics.width}px`;
    element.style.height = `${item.h * metrics.height}px`;

    const image = document.createElement('img');
    image.src = item.dataUrl;
    image.alt = 'Signature';

    element.appendChild(image);

    ['nw','n','ne','w','e','sw','s','se'].forEach(name => {
      const handle = document.createElement('span');
      handle.className = `signature-resize-handle ${name}`;
      handle.dataset.handle = name;
      handle.addEventListener('pointerdown', event => {
        editor.selectedSignatureId = item.id;
        element.classList.add('selected');
        startResizeSignature(event, item, name, element);
      });
      element.appendChild(handle);
    });

    element.addEventListener('pointerdown', event => {
      if (event.target.closest('.signature-resize-handle')) return;
      // First tap/click selects. Movement beyond a small threshold drags.
      editor.selectedSignatureId = item.id;
      document.querySelectorAll('.signature-annotation').forEach(node => {
        node.classList.toggle('selected', node === element);
      });
      startDragSignature(event, item, element);
    });

    layer.appendChild(element);
  });
}

function placePendingSignatureCentered() {
  if (!editor.pendingSignature || !editor.pages.length) return;

  recordHistory();

  const aspect = editor.pendingSignature.aspect || 3;
  const w = Math.min(.52, Math.max(.34, editor.pendingSignature.defaultWidth || .42));
  const h = Math.max(.055, Math.min(.32, w / aspect));
  const x = Math.max(0, (1 - w) / 2);
  const y = Math.max(0, (1 - h) / 2);

  const item = {
    id: `sig-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    type: 'signature',
    dataUrl: editor.pendingSignature.dataUrl,
    source: editor.pendingSignature.source,
    x, y, w, h, aspect
  };

  getPageSignatures(editor.pages[editor.selectedIndex].sourceIndex).push(item);
  editor.selectedSignatureId = item.id;
  editor.pendingSignature = null;
  editor.mode = 'select';
  document.getElementById('sign-tool')?.classList.remove('active');
  document.getElementById('annotation-layer')?.classList.remove('signature-place-mode');
  renderAnnotations();
}

function renderAnnotations() {
  const layer = document.getElementById('annotation-layer');
  layer.innerHTML = '';
  if (!editor.pages.length || !editor.canvasMetrics) return;
  const pageState = editor.pages[editor.selectedIndex];
  const items = getPageAnnotations(pageState.sourceIndex);
  const metrics = editor.canvasMetrics;

  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'text-annotation' + (item.id === editor.selectedAnnotationId ? ' selected' : '');
    el.dataset.id = item.id;
    el.contentEditable = item.id === editor.selectedAnnotationId ? 'true' : 'false';
    el.spellcheck = false;
    el.textContent = item.text;
    el.style.left = `${item.x * metrics.width}px`;
    el.style.top = `${item.y * metrics.height}px`;
    el.style.width = `${item.w * metrics.width}px`;
    el.style.minHeight = `${item.h * metrics.height}px`;
    const fontFamilies = {
      Helvetica: 'Helvetica, Arial, sans-serif',
      Arial: 'Arial, sans-serif',
      Verdana: 'Verdana, sans-serif',
      Tahoma: 'Tahoma, sans-serif',
      Trebuchet: '"Trebuchet MS", sans-serif',
      TimesRoman: '"Times New Roman", Times, serif',
      Georgia: 'Georgia, serif',
      Garamond: 'Garamond, Georgia, serif',
      Courier: '"Courier New", monospace',
      LucidaConsole: '"Lucida Console", monospace',
      Impact: 'Impact, sans-serif',
      ComicSans: '"Comic Sans MS", cursive'
    };
    el.style.fontFamily = fontFamilies[item.font] || 'Helvetica, Arial, sans-serif';
    el.style.backgroundColor = item.fillColor || 'transparent';
    el.style.fontSize = `${item.size * metrics.scale}px`;
    el.style.fontWeight = item.bold ? '700' : '400';
    el.style.fontStyle = item.italic ? 'italic' : 'normal';
    el.style.textAlign = item.align;
    el.style.color = item.color;
    el.style.opacity = item.opacity;
    el.style.lineHeight = '1.15';

    const handle = document.createElement('span');
    handle.className = 'resize-handle';
    handle.contentEditable = 'false';
    el.appendChild(handle);

    el.addEventListener('mousedown', event => {
      if (event.target === handle) return;
      event.stopPropagation();
      selectAnnotation(item.id);
      if (editor.mode !== 'select') setEditorMode('select');
      if (event.detail === 2) {
        el.contentEditable = 'true';
        el.focus();
        return;
      }
      if (el.isContentEditable && document.activeElement === el) return;
      startDragAnnotation(event, item, el);
    });
    el.addEventListener('focus', () => { if (!el.dataset.historyRecorded) { recordHistory(); el.dataset.historyRecorded = '1'; } });
    el.addEventListener('input', () => {
      item.text = Array.from(el.childNodes).filter(node => node !== handle).map(node => node.textContent).join('');
    });
    el.addEventListener('blur', () => {
      delete el.dataset.historyRecorded;
      item.text = el.innerText.replace(/\n+$/,'');
    });
    handle.addEventListener('mousedown', event => {
      event.stopPropagation();
      selectAnnotation(item.id);
      startResizeAnnotation(event, item);
    });
    layer.appendChild(el);
  });
  renderExistingTextBoxes(layer, metrics);
  renderEditCreatedTextBoxes(layer, metrics);
  renderSignatures(layer, metrics);
  syncTextInspector();
  syncEditTextToolbar();
}
function selectAnnotation(id) {
  editor.selectedAnnotationId = id;
  renderAnnotations();
}
function deselectAnnotation() {
  editor.selectedAnnotationId = null;
  renderAnnotations();
}
function startDragAnnotation(event, item) {
  event.preventDefault();
  recordHistory();
  const metrics = editor.canvasMetrics;
  const startX = event.clientX, startY = event.clientY;
  const startLeft = item.x, startTop = item.y;
  const move = e => {
    item.x = Math.max(0, Math.min(1 - item.w, startLeft + (e.clientX - startX)/metrics.width));
    item.y = Math.max(0, Math.min(1 - item.h, startTop + (e.clientY - startY)/metrics.height));
    renderAnnotations();
  };
  const up = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}
function startResizeAnnotation(event, item) {
  event.preventDefault();
  recordHistory();
  const metrics = editor.canvasMetrics;
  const startX = event.clientX, startY = event.clientY;
  const startW = item.w, startH = item.h;
  const move = e => {
    item.w = Math.max(.06, Math.min(1-item.x, startW + (e.clientX-startX)/metrics.width));
    item.h = Math.max(.035, Math.min(1-item.y, startH + (e.clientY-startY)/metrics.height));
    renderAnnotations();
  };
  const up = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}
function addTextAt(clientX, clientY) {
  recordHistory();
  const layer = document.getElementById('annotation-layer');
  const rect = layer.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const x = Math.max(0, Math.min(.82, (clientX - rect.left)/rect.width));
  const y = Math.max(0, Math.min(.93, (clientY - rect.top)/rect.height));
  const item = {
    id: `txt-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    type: 'text',
    text: 'Type here',
    x, y, w: .18, h: .045,
    size: 18,
    font: 'Helvetica',
    color: '#111827',
    fillColor: 'transparent',
    opacity: 1,
    bold: false,
    italic: false,
    align: 'left'
  };
  getPageAnnotations(editor.pages[editor.selectedIndex].sourceIndex).push(item);
  editor.selectedAnnotationId = item.id;
  setEditorMode('text');
  renderAnnotations();
  setTimeout(() => {
    const el = document.querySelector(`.text-annotation[data-id="${item.id}"]`);
    if (el) {
      el.contentEditable = 'true';
      el.focus();
      const range = document.createRange();
      range.selectNodeContents(el);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }, 0);
}
function syncTextInspector() {
  const item = getSelectedAnnotation();
  if (!item) return;

  const font = document.getElementById('text-font');
  const size = document.getElementById('text-size');
  const colour = document.getElementById('text-color');
  const fill = document.getElementById('text-fill-color');
  const opacity = document.getElementById('text-opacity');
  const opacityValue = document.getElementById('text-opacity-value');
  const fillSwatch = document.getElementById('fill-swatch');

  if (font) font.value = item.font || 'Helvetica';
  if (size) size.value = item.size || 18;
  if (colour) colour.value = item.color || '#111827';

  const fillValue = item.fillColor && item.fillColor !== 'transparent' ? item.fillColor : '#ffffff';
  if (fill) fill.value = fillValue;
  if (fillSwatch) fillSwatch.style.background = item.fillColor || 'transparent';

  const opacityPercent = Math.round((item.opacity ?? 1) * 100);
  if (opacity) opacity.value = opacityPercent;
  if (opacityValue) opacityValue.textContent = `${opacityPercent}%`;

  ['left', 'center', 'right'].forEach(alignment => {
    const button = document.getElementById(`text-align-${alignment}`);
    if (button) button.classList.toggle('active', item.align === alignment);
  });
}

function updateSelectedText(mutator) {
  const item = getSelectedAnnotation();
  if (!item) return;
  mutator(item);
  renderAnnotations();
}

function updateEditorUi() {
  const count = editor.pages.length;

  const previewPages = document.getElementById('preview-pages');
  const pageTotal = document.getElementById('page-total-label');
  const pageInput = document.getElementById('current-page-input');
  const zoomReset = document.getElementById('zoom-reset');

  if (previewPages) previewPages.textContent = count || '—';
  if (pageTotal) pageTotal.textContent = count || '—';

  if (pageInput) {
    pageInput.max = Math.max(1, count);
    pageInput.value = count ? editor.selectedIndex + 1 : 1;
  }

  if (zoomReset) zoomReset.textContent = `${Math.round(editor.zoom * 100)}%`;

  const noPages = count === 0;
  const disableWhenEmpty = [
    'page-prev', 'page-next', 'rotate-page', 'delete-page',
    'download-edited-pdf', 'zoom-in', 'zoom-out', 'zoom-reset'
  ];

  disableWhenEmpty.forEach(id => {
    const element = document.getElementById(id);
    if (element) element.disabled = noPages;
  });

  const previous = document.getElementById('page-prev');
  const next = document.getElementById('page-next');
  const deletePage = document.getElementById('delete-page');

  if (previous) previous.disabled = noPages || editor.selectedIndex === 0;
  if (next) next.disabled = noPages || editor.selectedIndex === count - 1;
  if (deletePage) deletePage.disabled = count <= 1;
}

async function renderSelectedPage() {
  const canvas = document.getElementById('pdf-preview-canvas');
  const placeholder = document.getElementById('preview-placeholder');
  if (!editor.pages.length || !editor.pdfjs) {
    canvas.hidden = true;
    placeholder.hidden = false;
    return;
  }
  const token = ++editor.renderToken;
  const pageState = editor.pages[editor.selectedIndex];
  const page = await editor.pdfjs.getPage(pageState.sourceIndex + 1);
  const baseViewport = page.getViewport({scale: 1, rotation: pageState.rotation});
  const stage = document.getElementById('document-stage');
  const fitWidth = Math.max(320, Math.min(860, stage.clientWidth - 80));
  const baseScale = fitWidth / baseViewport.width;
  const viewport = page.getViewport({scale: baseScale * editor.zoom, rotation: pageState.rotation});
  if (token !== editor.renderToken) return;
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  canvas.hidden = false;
  placeholder.hidden = true;
  await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
  const layer = document.getElementById('annotation-layer');
  layer.style.width = `${canvas.width}px`;
  layer.style.height = `${canvas.height}px`;
  editor.canvasMetrics = {
    width: canvas.width,
    height: canvas.height,
    scale: viewport.scale,
    rotation: pageState.rotation,
    originalWidth: baseViewport.width,
    originalHeight: baseViewport.height
  };
  if (editor.mode === 'edit-existing') {
    await ensureExistingTextForCurrentPage();
  }
  renderAnnotations();
  updateEditorUi();
}

async function renderThumbnails() {
  const list = document.getElementById('thumbnail-list');
  list.innerHTML = '';
  if (!editor.pages.length) {
    list.innerHTML = '<div class="editor-empty">No pages</div>';
    return;
  }
  for (let index = 0; index < editor.pages.length; index++) {
    const state = editor.pages[index];
    const item = document.createElement('div');
    item.className = `thumbnail-item${index === editor.selectedIndex ? ' active' : ''}`;
    item.draggable = true;
    item.dataset.index = index;
    item.innerHTML = `<canvas></canvas><div class="thumbnail-meta"><span>Page ${index + 1}</span><span class="thumbnail-rotation">${state.rotation ? state.rotation + '°' : ''}</span></div>`;
    list.appendChild(item);

    item.addEventListener('click', async () => {
      editor.selectedIndex = Number(item.dataset.index);
      refreshThumbnailStates();
      updateEditorUi();
      await renderSelectedPage();
    });
    item.addEventListener('dragstart', event => {
      item.classList.add('dragging');
      event.dataTransfer.setData('text/plain', item.dataset.index);
      event.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      document.querySelectorAll('.thumbnail-item').forEach(el => el.classList.remove('drag-target'));
    });
    item.addEventListener('dragover', event => {
      event.preventDefault();
      item.classList.add('drag-target');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-target'));
    item.addEventListener('drop', async event => {
      event.preventDefault();
      const from = Number(event.dataTransfer.getData('text/plain'));
      const to = Number(item.dataset.index);
      item.classList.remove('drag-target');
      if (Number.isInteger(from) && from !== to) {
        recordHistory();
        const [moved] = editor.pages.splice(from, 1);
        editor.pages.splice(to, 0, moved);
        editor.selectedIndex = to;
        await renderThumbnails();
        updateEditorUi();
        await renderSelectedPage();
      }
    });

    try {
      const page = await editor.pdfjs.getPage(state.sourceIndex + 1);
      const base = page.getViewport({scale: 1, rotation: state.rotation});
      const viewport = page.getViewport({scale: 132 / base.width, rotation: state.rotation});
      const thumbCanvas = item.querySelector('canvas');
      thumbCanvas.width = Math.floor(viewport.width);
      thumbCanvas.height = Math.floor(viewport.height);
      await page.render({canvasContext: thumbCanvas.getContext('2d'), viewport}).promise;
    } catch (_) {}
  }
}

function refreshThumbnailStates() {
  document.querySelectorAll('.thumbnail-item').forEach((item, index) => {
    item.classList.toggle('active', index === editor.selectedIndex);
  });
}
async function selectRelative(delta) {
  const next = editor.selectedIndex + delta;
  if (next < 0 || next >= editor.pages.length) return;
  editor.selectedIndex = next;
  editor.selectedAnnotationId = null;
  editor.selectedExistingTextId = null;
  refreshThumbnailStates();
  updateEditorUi();
  await renderSelectedPage();
}
async function rotateSelected() {
  if (!editor.pages.length) return;
  recordHistory();
  editor.pages[editor.selectedIndex].rotation =
    (editor.pages[editor.selectedIndex].rotation + 90) % 360;
  await renderThumbnails();
  updateEditorUi();
  await renderSelectedPage();
}
async function deleteSelected() {
  if (editor.pages.length <= 1) return showAlert('A PDF must contain at least one page.');
  recordHistory();
  editor.pages.splice(editor.selectedIndex, 1);
  editor.selectedIndex = Math.min(editor.selectedIndex, editor.pages.length - 1);
  await renderThumbnails();
  updateEditorUi();
  await renderSelectedPage();
}
async function moveSelected(delta) {
  const from = editor.selectedIndex;
  const to = from + delta;
  if (to < 0 || to >= editor.pages.length) return;
  recordHistory();
  [editor.pages[from], editor.pages[to]] = [editor.pages[to], editor.pages[from]];
  editor.selectedIndex = to;
  await renderThumbnails();
  updateEditorUi();
  await renderSelectedPage();
}
async function changeZoom(delta) {
  editor.zoom = Math.min(2.5, Math.max(.4, editor.zoom + delta));
  updateEditorUi();
  await renderSelectedPage();
}

document.getElementById('page-prev').addEventListener('click', () => selectRelative(-1));
document.getElementById('page-next').addEventListener('click', () => selectRelative(1));
document.getElementById('current-page-input').addEventListener('change', async event => {
  const page = Math.max(1, Math.min(editor.pages.length, Number(event.target.value) || 1));
  editor.selectedIndex = page - 1;
  editor.selectedAnnotationId = null;
  editor.selectedExistingTextId = null;
  refreshThumbnailStates(); updateEditorUi(); await renderSelectedPage();
});
document.getElementById('zoom-out').addEventListener('click', () => changeZoom(-.15));
document.getElementById('zoom-in').addEventListener('click', () => changeZoom(.15));
document.getElementById('zoom-reset').addEventListener('click', async () => {
  editor.zoom = 1; updateEditorUi(); await renderSelectedPage();
});
const rotateButton = document.getElementById('rotate-page');
const deletePageButton = document.getElementById('delete-page');
if (rotateButton) rotateButton.addEventListener('click', rotateSelected);
if (deletePageButton) deletePageButton.addEventListener('click', deleteSelected);


const undoTool = document.getElementById('undo-tool');
const redoTool = document.getElementById('redo-tool');
if (undoTool) undoTool.addEventListener('click', undoEditor);
if (redoTool) redoTool.addEventListener('click', redoEditor);
document.addEventListener('keydown', event => {
  if (workspace.hidden) return;
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === 'z') {
    event.preventDefault();
    if (event.shiftKey) redoEditor(); else undoEditor();
  } else if (modifier && event.key.toLowerCase() === 'y') {
    event.preventDefault(); redoEditor();
  } else if ((event.key === 'Delete' || event.key === 'Backspace') &&
             editor.selectedSignatureId &&
             !event.target.matches('input,textarea,[contenteditable="true"]')) {
    event.preventDefault();
    recordHistory();
    const sourceIndex = editor.pages[editor.selectedIndex].sourceIndex;
    editor.signatures[String(sourceIndex)] =
      getPageSignatures(sourceIndex).filter(item => item.id !== editor.selectedSignatureId);
    editor.selectedSignatureId = null;
    renderAnnotations();
  }
});
document.getElementById('add-text-tool').addEventListener('click', () => setEditorMode('text'));
document.getElementById('edit-text-tool').addEventListener('click', () => setEditorMode('edit-existing'));
document.getElementById('annotation-layer').addEventListener('mousedown', event => {
  if (event.target !== event.currentTarget) return;
  if (editor.mode === 'text') {
    addTextAt(event.clientX, event.clientY);
  } else if (editor.mode === 'edit-existing') {
    if (editor.editTextBoxMode) {
      addEditTextBoxAt(event.clientX, event.clientY);
    } else {
      deselectExistingText();
      editor.selectedEditCreatedTextId = null;
      document.querySelectorAll('.edit-created-text').forEach(el => el.classList.remove('selected'));
    }
  } else {
    editor.selectedSignatureId = null;
    deselectAnnotation();
    renderAnnotations();
  }
});
document.getElementById('text-font').addEventListener('change', e => {
  recordHistory();
  updateSelectedText(item => item.font = e.target.value);
});
document.getElementById('text-size').addEventListener('change', e => {
  recordHistory();
  updateSelectedText(item => item.size = Math.max(8, Math.min(96, Number(e.target.value) || 18)));
});
document.getElementById('text-color').addEventListener('input', e => {
  updateSelectedText(item => item.color = e.target.value);
});
document.getElementById('text-color').addEventListener('change', recordHistory);
document.getElementById('text-fill-color').addEventListener('input', e => {
  const swatch = document.getElementById('fill-swatch');
  if (swatch) swatch.style.background = e.target.value;
  updateSelectedText(item => item.fillColor = e.target.value);
});
document.getElementById('text-fill-color').addEventListener('change', recordHistory);
document.getElementById('text-opacity').addEventListener('input', e => {
  const value = Number(e.target.value);
  document.getElementById('text-opacity-value').textContent = `${value}%`;
  updateSelectedText(item => item.opacity = value / 100);
});
document.getElementById('text-opacity').addEventListener('change', recordHistory);
document.getElementById('text-align-left').addEventListener('click', () => {
  recordHistory();
  updateSelectedText(item => item.align = 'left');
});
document.getElementById('text-align-center').addEventListener('click', () => {
  recordHistory();
  updateSelectedText(item => item.align = 'center');
});
document.getElementById('text-align-right').addEventListener('click', () => {
  recordHistory();
  updateSelectedText(item => item.align = 'right');
});


let preparedExportBytes = null;
let preparedExportFilename = '';

function openFormatModal() {
  if (!editor.pages.length) return;
  preparedExportBytes = null;
  const originalBase = editor.file.name.replace(/\.pdf$/i, '');
  document.getElementById('export-filename').value = originalBase;
  document.getElementById('format-modal').hidden = false;
}

function closeFormatModal() {
  document.getElementById('format-modal').hidden = true;
}

function openEmailModal() {
  closeFormatModal();
  document.getElementById('email-error').hidden = true;
  document.getElementById('download-email').classList.remove('invalid');
  document.getElementById('email-modal').hidden = false;
  setTimeout(() => document.getElementById('download-email').focus(), 50);
}

function closeEmailModal() {
  document.getElementById('email-modal').hidden = true;
}

async function createEditedPdfBytes() {
  const source = await PDFLib.PDFDocument.load(editor.originalBytes.slice());
  const output = await PDFLib.PDFDocument.create();
  const fontCache = {};

  async function getFont(item) {
    const sansFonts = ['Helvetica','Arial','Verdana','Tahoma','Trebuchet','Impact','ComicSans'];
    const serifFonts = ['TimesRoman','Georgia','Garamond'];
    const monoFonts = ['Courier','LucidaConsole'];
    let key = sansFonts.includes(item.font) ? 'Helvetica'
      : serifFonts.includes(item.font) ? 'TimesRoman'
      : monoFonts.includes(item.font) ? 'Courier'
      : 'Helvetica';

    if (key === 'Helvetica' && item.bold && item.italic) key = 'HelveticaBoldOblique';
    else if (key === 'Helvetica' && item.bold) key = 'HelveticaBold';
    else if (key === 'Helvetica' && item.italic) key = 'HelveticaOblique';
    else if (key === 'TimesRoman' && item.bold && item.italic) key = 'TimesRomanBoldItalic';
    else if (key === 'TimesRoman' && item.bold) key = 'TimesRomanBold';
    else if (key === 'TimesRoman' && item.italic) key = 'TimesRomanItalic';
    else if (key === 'Courier' && item.bold && item.italic) key = 'CourierBoldOblique';
    else if (key === 'Courier' && item.bold) key = 'CourierBold';
    else if (key === 'Courier' && item.italic) key = 'CourierOblique';

    if (!fontCache[key]) fontCache[key] = await output.embedFont(PDFLib.StandardFonts[key]);
    return fontCache[key];
  }

  for (const state of editor.pages) {
    const [page] = await output.copyPages(source, [state.sourceIndex]);
    const originalRotation = page.getRotation().angle || 0;
    page.setRotation(PDFLib.degrees((originalRotation + state.rotation) % 360));
    output.addPage(page);

    const annotations = getPageAnnotations(state.sourceIndex);
    const existingEdits = getExistingTextItems(state.sourceIndex).filter(item => item.modified);
    const {width, height} = page.getSize();

    for (const item of existingEdits) {
      const font = await getFont(item);
      const fontSize = item.pdfFontSize || 12;
      const targetWidth = Math.max(10, item.w * width);
      const lineHeight = fontSize * 1.15;
      const x = Math.max(0, item.x * width);
      const topY = height - item.y * height;

      const rawLines = String(item.text || '').split(/\r?\n/);
      const wrappedLines = [];

      for (const rawLine of rawLines) {
        const words = rawLine.split(/\s+/);
        let current = '';

        for (const word of words) {
          const test = current ? `${current} ${word}` : word;
          if (font.widthOfTextAtSize(test, fontSize) > targetWidth && current) {
            wrappedLines.push(current);
            current = word;
          } else {
            current = test;
          }
        }

        wrappedLines.push(current || '');
      }

      const replacementHeight = Math.max(
        item.h * height,
        wrappedLines.length * lineHeight + fontSize * .35
      );

      // Always cover the complete original paragraph footprint first.
      const originalX = item.originalX * width;
      const originalTopY = height - item.originalY * height;
      const originalWidth = item.originalW * width;
      const originalHeight = item.originalH * height;

      page.drawRectangle({
        x: Math.max(0, originalX - 2),
        y: Math.max(0, originalTopY - originalHeight - 2),
        width: Math.min(width - originalX + 2, originalWidth + 4),
        height: originalHeight + 4,
        color: PDFLib.rgb(1, 1, 1)
      });

      // If the replacement wraps lower than the original paragraph, cover that
      // additional vertical area too.
      if (replacementHeight > originalHeight) {
        page.drawRectangle({
          x: Math.max(0, x - 2),
          y: Math.max(0, topY - replacementHeight - 2),
          width: Math.min(width - x + 2, targetWidth + 4),
          height: replacementHeight + 4,
          color: PDFLib.rgb(1, 1, 1)
        });
      }

      wrappedLines.forEach((line, lineIndex) => {
        page.drawText(line, {
          x,
          y: topY - fontSize - lineIndex * lineHeight,
          size: fontSize,
          font,
          color: (() => {
            const c = hexToRgb01(item.color || '#111827');
            return PDFLib.rgb(c.r, c.g, c.b);
          })(),
          maxWidth: targetWidth
        });
      });
    }

    const createdEditItems = getEditCreatedTextItems(state.sourceIndex);

    for (const item of createdEditItems) {
      const font = await getFont(item);
      const rgb = hexToRgb01(item.color || '#111827');
      const fontSize = item.pdfFontSize || 18;
      const lineHeight = fontSize * 1.15;
      const maxWidth = Math.max(10, item.w * width);
      const startX = item.x * width;
      const topY = height - item.y * height;

      const rawLines = String(item.text || '').split(/\r?\n/);
      const wrapped = [];

      for (const raw of rawLines) {
        const words = raw.split(/\s+/);
        let line = '';

        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (font.widthOfTextAtSize(test, fontSize) > maxWidth && line) {
            wrapped.push(line);
            line = word;
          } else {
            line = test;
          }
        }

        wrapped.push(line || '');
      }

      wrapped.forEach((line, idx) => {
        page.drawText(line, {
          x: startX,
          y: topY - fontSize - idx * lineHeight,
          size: fontSize,
          font,
          color: PDFLib.rgb(rgb.r, rgb.g, rgb.b)
        });
      });
    }

    const signatures = getPageSignatures(state.sourceIndex);

    for (const item of signatures) {
      const data = item.dataUrl.split(',')[1];
      const bytes = Uint8Array.from(atob(data), character => character.charCodeAt(0));
      const image = item.dataUrl.startsWith('data:image/jpeg')
        ? await output.embedJpg(bytes)
        : await output.embedPng(bytes);

      page.drawImage(image, {
        x: item.x * width,
        y: height - (item.y + item.h) * height,
        width: item.w * width,
        height: item.h * height
      });
    }

    for (const item of annotations) {
      const font = await getFont(item);
      const rgb = hexToRgb01(item.color);
      const fontSize = item.size;
      const lineHeight = fontSize * 1.15;
      const maxWidth = Math.max(10, item.w * width);
      const startX = item.x * width;
      const topY = height - item.y * height;

      if (item.fillColor && item.fillColor !== 'transparent') {
        const fillRgb = hexToRgb01(item.fillColor);
        page.drawRectangle({
          x: startX,
          y: height - (item.y + item.h) * height,
          width: item.w * width,
          height: item.h * height,
          color: PDFLib.rgb(fillRgb.r, fillRgb.g, fillRgb.b),
          opacity: item.opacity
        });
      }

      const rawLines = String(item.text || '').split(/\r?\n/);
      const lines = [];
      for (const raw of rawLines) {
        const words = raw.split(/\s+/);
        let line = '';
        for (const word of words) {
          const test = line ? `${line} ${word}` : word;
          if (font.widthOfTextAtSize(test, fontSize) > maxWidth && line) {
            lines.push(line);
            line = word;
          } else {
            line = test;
          }
        }
        lines.push(line || '');
      }

      lines.forEach((line, idx) => {
        let x = startX;
        if (item.align === 'center') {
          x += Math.max(0, (maxWidth - font.widthOfTextAtSize(line, fontSize)) / 2);
        } else if (item.align === 'right') {
          x += Math.max(0, maxWidth - font.widthOfTextAtSize(line, fontSize));
        }

        page.drawText(line, {
          x,
          y: topY - fontSize - idx * lineHeight,
          size: fontSize,
          font,
          color: PDFLib.rgb(rgb.r, rgb.g, rgb.b),
          opacity: item.opacity
        });
      });
    }
  }

  return output.save();
}




const signatureState = {
  tab: 'draw',
  colour: '#111111',
  drawing: false,
  hasDrawing: false,
  imageDataUrl: null,
  typedFont: 'Caveat'
};

const signatureModal = document.getElementById('signature-modal');
const signatureCanvas = document.getElementById('signature-draw-canvas');
const signatureContext = signatureCanvas.getContext('2d', {willReadFrequently: true});

function resetSignatureCanvas() {
  signatureContext.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
  signatureContext.lineCap = 'round';
  signatureContext.lineJoin = 'round';
  signatureContext.lineWidth = 7;
  signatureContext.strokeStyle = signatureState.colour;
  signatureState.hasDrawing = false;
  updateSignatureDoneState();
}

function updateTypedSignaturePreview() {
  const input = document.getElementById('signature-name-input');
  const action = document.getElementById('signature-clear-type');
  const value = input.value.trim();
  const hasValue = Boolean(value);

  input.style.fontFamily = `"${signatureState.typedFont}", cursive`;
  input.style.color = signatureState.colour;

  action.textContent = hasValue ? 'Clear Signature' : 'Sign Here';
  action.classList.toggle('has-value', hasValue);

  document.querySelectorAll('.signature-font-choice span').forEach(span => {
    span.textContent = value || 'Signature';
    span.style.color = signatureState.colour;
  });

  updateSignatureDoneState();
}

function updateSignatureDoneState() {
  const done = document.getElementById('signature-done');
  done.disabled =
    signatureState.tab === 'draw' ? !signatureState.hasDrawing :
    signatureState.tab === 'image' ? !signatureState.imageDataUrl :
    !document.getElementById('signature-name-input').value.trim();
}

function switchSignatureTab(tab) {
  signatureState.tab = tab;
  document.querySelectorAll('.signature-tab').forEach(button => {
    button.classList.toggle('active', button.dataset.signatureTab === tab);
  });
  document.querySelectorAll('[data-signature-panel]').forEach(panel => {
    const active = panel.dataset.signaturePanel === tab;
    panel.hidden = !active;
    panel.classList.toggle('active', active);
  });
  updateSignatureDoneState();

  if (tab === 'type') {
    requestAnimationFrame(() => {
      const input = document.getElementById('signature-name-input');
      input.focus({preventScroll:true});
    });
  }
}

function openSignatureModal() {
  clearEditTextInterfaceImmediately();
  setEditorMode('select');
  document.getElementById('sign-tool')?.classList.add('active');
  signatureModal.hidden = false;
  switchSignatureTab('draw');
  resetSignatureCanvas();
}

function closeSignatureModal() {
  signatureModal.hidden = true;
  document.getElementById('sign-tool')?.classList.remove('active');
}

function signatureCanvasPoint(event) {
  const rect = signatureCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * signatureCanvas.width / rect.width,
    y: (event.clientY - rect.top) * signatureCanvas.height / rect.height
  };
}

signatureCanvas.addEventListener('pointerdown', event => {
  event.preventDefault();
  signatureState.drawing = true;
  signatureCanvas.setPointerCapture(event.pointerId);
  const point = signatureCanvasPoint(event);
  signatureContext.beginPath();
  signatureContext.moveTo(point.x, point.y);
});

signatureCanvas.addEventListener('pointermove', event => {
  if (!signatureState.drawing) return;
  event.preventDefault();
  const point = signatureCanvasPoint(event);
  signatureContext.strokeStyle = signatureState.colour;
  signatureContext.lineTo(point.x, point.y);
  signatureContext.stroke();
  signatureState.hasDrawing = true;
  updateSignatureDoneState();
});

function endSignatureStroke(event) {
  if (!signatureState.drawing) return;
  signatureState.drawing = false;
  try { signatureCanvas.releasePointerCapture(event.pointerId); } catch (_) {}
}
signatureCanvas.addEventListener('pointerup', endSignatureStroke);
signatureCanvas.addEventListener('pointercancel', endSignatureStroke);

document.querySelectorAll('.signature-tab').forEach(button => {
  button.addEventListener('click', () => switchSignatureTab(button.dataset.signatureTab));
});

document.querySelectorAll('[data-signature-colour]').forEach(button => {
  button.addEventListener('click', () => {
    signatureState.colour = button.dataset.signatureColour;
    document.querySelectorAll('[data-signature-colour]').forEach(item => item.classList.toggle('active', item === button));
    signatureContext.strokeStyle = signatureState.colour;
    updateTypedSignaturePreview();
  });
});

document.getElementById('signature-clear-draw').addEventListener('click', resetSignatureCanvas);
document.getElementById('signature-clear-type').addEventListener('click', () => {
  const input = document.getElementById('signature-name-input');
  if (!input.value.trim()) {
    input.focus();
    return;
  }

  input.value = '';
  updateTypedSignaturePreview();
  input.focus();
});
document.getElementById('signature-name-input').addEventListener('input', updateTypedSignaturePreview);

document.querySelectorAll('input[name="signature-font"]').forEach(input => {
  input.addEventListener('change', () => {
    signatureState.typedFont = input.value;
    document.querySelectorAll('.signature-font-choice').forEach(label => {
      label.classList.toggle('active', label.contains(input) && input.checked);
    });
    updateTypedSignaturePreview();
  });
});

function loadSignatureImage(file) {
  if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) {
    showAlert('Please choose a PNG, JPG or WEBP image.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    signatureState.imageDataUrl = reader.result;
    const preview = document.getElementById('signature-image-preview');
    preview.src = reader.result;
    preview.hidden = false;
    document.querySelector('.signature-upload-button').hidden = true;
    updateSignatureDoneState();
  };
  reader.readAsDataURL(file);
}

document.getElementById('signature-image-input').addEventListener('change', event => {
  loadSignatureImage(event.target.files[0]);
  event.target.value = '';
});

const signatureUploadZone = document.getElementById('signature-upload-zone');
['dragenter','dragover'].forEach(name => signatureUploadZone.addEventListener(name, event => {
  event.preventDefault();
  signatureUploadZone.classList.add('dragover');
}));
['dragleave','drop'].forEach(name => signatureUploadZone.addEventListener(name, event => {
  event.preventDefault();
  signatureUploadZone.classList.remove('dragover');
}));
signatureUploadZone.addEventListener('drop', event => loadSignatureImage(event.dataTransfer.files[0]));

function trimCanvasToContent(sourceCanvas) {
  const context = sourceCanvas.getContext('2d', {willReadFrequently: true});
  const {width, height} = sourceCanvas;
  const pixels = context.getImageData(0, 0, width, height).data;
  let left = width, right = 0, top = height, bottom = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (pixels[(y * width + x) * 4 + 3] > 8) {
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (right < left || bottom < top) return sourceCanvas;

  const padding = 18;
  left = Math.max(0, left - padding);
  top = Math.max(0, top - padding);
  right = Math.min(width - 1, right + padding);
  bottom = Math.min(height - 1, bottom + padding);

  const output = document.createElement('canvas');
  output.width = right - left + 1;
  output.height = bottom - top + 1;
  output.getContext('2d').drawImage(
    sourceCanvas,
    left, top, output.width, output.height,
    0, 0, output.width, output.height
  );
  return output;
}

async function createTypedSignatureCanvas() {
  const text = document.getElementById('signature-name-input').value.trim();
  await document.fonts.load(`72px "${signatureState.typedFont}"`);
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 300;
  const context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = signatureState.colour;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `72px "${signatureState.typedFont}", cursive`;
  context.fillText(text, canvas.width / 2, canvas.height / 2);
  return trimCanvasToContent(canvas);
}

async function resolveSignatureData() {
  if (signatureState.tab === 'draw') {
    const trimmed = trimCanvasToContent(signatureCanvas);
    return {
      dataUrl: trimmed.toDataURL('image/png'),
      aspect: trimmed.width / trimmed.height,
      source: 'draw'
    };
  }

  if (signatureState.tab === 'image') {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = signatureState.imageDataUrl;
    });
    return {
      dataUrl: signatureState.imageDataUrl,
      aspect: image.naturalWidth / image.naturalHeight,
      source: 'image'
    };
  }

  const typed = await createTypedSignatureCanvas();
  return {
    dataUrl: typed.toDataURL('image/png'),
    aspect: typed.width / typed.height,
    source: 'type'
  };
}

document.getElementById('signature-done').addEventListener('click', async event => {
  const button = event.currentTarget;
  if (button.disabled) return;
  button.disabled = true;
  button.textContent = 'Preparing…';

  try {
    editor.pendingSignature = await resolveSignatureData();
    closeSignatureModal();
    placePendingSignatureCentered();
    showEditorHint('Drag the signature to position it. Use the blue handles to resize.');
  } catch (_) {
    showAlert('PDFMint could not prepare that signature.');
  } finally {
    button.textContent = 'Done';
    updateSignatureDoneState();
  }
});

document.getElementById('sign-tool').addEventListener('click', openSignatureModal);
document.getElementById('signature-cancel').addEventListener('click', closeSignatureModal);
document.getElementById('signature-close').addEventListener('click', closeSignatureModal);
document.querySelector('[data-close-signature]').addEventListener('click', closeSignatureModal);


document.addEventListener('click', event => {
  const toolButton = event.target.closest(
    '.editor-tool-button, .tool-button, [data-editor-tool], #add-text-tool, #edit-text-tool, #sign-tool'
  );

  if (!toolButton || toolButton.id === 'edit-text-tool' || toolButton.id === 'sign-tool') return;

  if (editor.mode === 'edit-existing') {
    clearEditTextInterfaceImmediately();

    // Placeholder tools do not yet have their own mode handler, so move the
    // editor to neutral select mode while preserving the user's edits.
    if (toolButton.id !== 'add-text-tool') {
      editor.mode = 'select';

      document.getElementById('edit-text-tool')?.classList.remove('active');
      document.getElementById('add-text-tool')?.classList.remove('active');

      const addOptionsBar = document.getElementById('text-options-bar');
      if (addOptionsBar) addOptionsBar.hidden = true;

      const layer = document.getElementById('annotation-layer');
      layer?.classList.remove('text-mode', 'edit-text-mode', 'add-edit-box-mode');
      layer?.classList.add('select-mode');
    }
  }
}, true);

document.getElementById('edit-add-text-box').addEventListener('click', () => {
  editor.editTextBoxMode = !editor.editTextBoxMode;
  const button = document.getElementById('edit-add-text-box');
  button.classList.toggle('active', editor.editTextBoxMode);
  document.getElementById('annotation-layer').classList.toggle('add-edit-box-mode', editor.editTextBoxMode);
  if (editor.editTextBoxMode) showEditorHint('Click anywhere on the document to create a text box.');
});

document.getElementById('edit-text-colour-button').addEventListener('click', event => {
  event.stopPropagation();
  const menu = document.getElementById('edit-colour-menu');
  menu.hidden = !menu.hidden;
});

document.querySelectorAll('[data-edit-colour]').forEach(button => {
  button.addEventListener('click', event => {
    event.stopPropagation();
    const colour = button.dataset.editColour;
    document.getElementById('edit-colour-line').style.background = colour;
    applyColourToCurrentSelection(colour);
    document.getElementById('edit-colour-menu').hidden = true;
  });
});

document.addEventListener('click', event => {
  if (!event.target.closest('.colour-dropdown')) {
    const menu = document.getElementById('edit-colour-menu');
    if (menu) menu.hidden = true;
  }
});

document.getElementById('edit-text-font').addEventListener('change', event => {
  updateEditTarget(item => item.font = event.target.value);
});

document.getElementById('edit-text-size').addEventListener('change', event => {
  updateEditTarget(item => item.pdfFontSize = Math.max(4, Math.min(200, Number(event.target.value) || 18)));
});

document.getElementById('edit-text-bold').addEventListener('click', () => {
  updateEditTarget(item => item.bold = !item.bold);
});

document.getElementById('edit-text-italic').addEventListener('click', () => {
  updateEditTarget(item => item.italic = !item.italic);
});

document.getElementById('download-edited-pdf').addEventListener('click', openFormatModal);

document.querySelectorAll('[data-close-export]').forEach(button => {
  button.addEventListener('click', closeFormatModal);
});
document.querySelectorAll('[data-close-email]').forEach(button => {
  button.addEventListener('click', closeEmailModal);
});

document.getElementById('continue-to-email').addEventListener('click', async event => {
  const button = event.currentTarget;
  const rawName = document.getElementById('export-filename').value.trim();
  const safeName = (rawName || editor.file.name.replace(/\.pdf$/i, ''))
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\.+$/g, '')
    .trim();

  preparedExportFilename = `${safeName || 'pdfmint-document'}.pdf`;
  button.disabled = true;
  button.textContent = 'Preparing…';

  try {
    preparedExportBytes = await createEditedPdfBytes();
    openEmailModal();
  } catch (error) {
    showAlert('PDFMint could not prepare this PDF.');
  } finally {
    button.disabled = false;
    button.textContent = 'Download';
  }
});


let selectedAccessPlan = {
  value: 'full',
  name: '7-day full access',
  price: 1.00,
  disclosure: 'Renews at £24.90 every four weeks after seven days unless cancelled beforehand.'
};

function formatPounds(value) {
  return new Intl.NumberFormat('en-GB', {style: 'currency', currency: 'GBP'}).format(value);
}

async function renderCheckoutPreview(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !editor.pdfjs || !editor.pages.length) return;

  const state = editor.pages[0];
  const page = await editor.pdfjs.getPage(state.sourceIndex + 1);
  const base = page.getViewport({scale: 1, rotation: state.rotation});
  const targetWidth = canvasId === 'plan-preview-canvas' ? 430 : 70;
  const viewport = page.getViewport({scale: targetWidth / base.width, rotation: state.rotation});
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
}

function closeEditorCheckoutOverlays() {
  closeEmailModal();
  closeFormatModal();
}

async function openAccessPage() {
  closeEditorCheckoutOverlays();
  document.getElementById('access-page').hidden = false;
  await renderCheckoutPreview('plan-preview-canvas');
}

function closeAccessPage() {
  document.getElementById('access-page').hidden = true;
}

async function openPaymentPage() {
  closeAccessPage();

  const checked = document.querySelector('input[name="access-plan"]:checked');
  const option = checked.closest('.plan-option');
  const planName = option.querySelector('.plan-copy strong').textContent;
  const price = Number(checked.dataset.price);

  let disclosure = 'One-time access with no automatic renewal.';
  if (checked.value === 'full') disclosure = 'Renews at £24.90 every four weeks after seven days unless cancelled beforehand.';
  if (checked.value === 'annual') disclosure = 'Billed £24.90 monthly until cancelled.';

  selectedAccessPlan = {value: checked.value, name: planName, price, disclosure};

  document.getElementById('summary-plan-name').textContent = planName;
  document.getElementById('summary-plan-price').textContent = formatPounds(price);
  document.getElementById('summary-due-today').textContent = formatPounds(price);
  document.getElementById('summary-total').textContent = formatPounds(price);
  document.getElementById('summary-renewal').textContent = disclosure;
  document.getElementById('summary-filename').textContent = preparedExportFilename || editor.file.name;

  document.getElementById('payment-page').hidden = false;
  await renderCheckoutPreview('payment-preview-canvas');
}

function closePaymentPage() {
  document.getElementById('payment-page').hidden = true;
}

document.querySelectorAll('input[name="access-plan"]').forEach(input => {
  input.addEventListener('change', event => {
    document.querySelectorAll('.plan-option').forEach(option => option.classList.remove('selected'));
    const option = event.currentTarget.closest('.plan-option');
    option.classList.add('selected');

    const disclosure = document.getElementById('plan-disclosure');
    if (event.currentTarget.value === 'limited') {
      disclosure.textContent = 'Seven-day limited access costs £0.50 today and applies to this document only. No automatic renewal.';
    } else if (event.currentTarget.value === 'annual') {
      disclosure.textContent = 'Annual access is billed at £24.90 per month until cancelled.';
    } else {
      disclosure.textContent = 'Seven-day full access costs £1 today. Unless cancelled, it renews at £24.90 every four weeks after the trial. Cancel at any time before renewal.';
    }
  });
});

document.getElementById('plan-continue').addEventListener('click', openPaymentPage);
document.getElementById('back-to-plans').addEventListener('click', () => {
  closePaymentPage();
  document.getElementById('access-page').hidden = false;
});

document.querySelectorAll('.payment-method').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.payment-method').forEach(item => item.classList.remove('active'));
    button.classList.add('active');
    const isCard = button.dataset.paymentMethod === 'card';
    document.getElementById('card-payment-panel').hidden = !isCard;
    document.getElementById('paypal-payment-panel').hidden = isCard;
  });
});

function openDemoPaymentNotice() {
  document.getElementById('demo-payment-modal').hidden = false;
}
document.getElementById('mock-pay-button').addEventListener('click', openDemoPaymentNotice);
document.getElementById('mock-paypal-button').addEventListener('click', openDemoPaymentNotice);
document.getElementById('close-demo-payment').addEventListener('click', () => {
  document.getElementById('demo-payment-modal').hidden = true;
});
document.getElementById('return-to-payment').addEventListener('click', () => {
  document.getElementById('demo-payment-modal').hidden = true;
});

document.getElementById('final-download').addEventListener('click', () => {
  const emailInput = document.getElementById('download-email');
  const error = document.getElementById('email-error');
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());

  if (!valid) {
    emailInput.classList.add('invalid');
    error.hidden = false;
    emailInput.focus();
    return;
  }

  emailInput.classList.remove('invalid');
  error.hidden = true;

  if (!preparedExportBytes) {
    showAlert('The document is no longer prepared. Please click Done again.');
    closeEmailModal();
    return;
  }

  openAccessPage();
});

document.getElementById('download-email').addEventListener('input', event => {
  event.currentTarget.classList.remove('invalid');
  document.getElementById('email-error').hidden = true;
});

function showOAuthSetupMessage(provider) {
  const error = document.getElementById('email-error');
  error.textContent = `${provider} sign-in requires the ${provider} OAuth connection. Email download is available now.`;
  error.hidden = false;
}

document.getElementById('continue-google').addEventListener('click', openAccessPage);
document.getElementById('continue-apple').addEventListener('click', openAccessPage);


const heroInput = document.getElementById('file-input');
const heroCard = document.getElementById('upload-card');
const heroStatus = document.getElementById('file-status');
heroInput.addEventListener('change', event => {
  const file = event.target.files[0];
  if (file) {
    heroStatus.textContent = `${file.name} selected — opening editor…`;
    loadEditorPdf(file);
  }
  event.target.value = '';
});
['dragenter','dragover'].forEach(name => heroCard.addEventListener(name, event => {
  event.preventDefault(); heroCard.classList.add('dragover');
}));
['dragleave','drop'].forEach(name => heroCard.addEventListener(name, event => {
  event.preventDefault(); heroCard.classList.remove('dragover');
}));
heroCard.addEventListener('drop', event => {
  const file = event.dataTransfer.files[0];
  if (file) loadEditorPdf(file);
});
document.getElementById('preview-file-input').addEventListener('change', event => {
  const file = event.target.files[0];
  if (file) loadEditorPdf(file);
  event.target.value = '';
});

if (document.getElementById('merge-file-input') && document.getElementById('split-file-input')) {
function renderMergeList() {
  const list = document.getElementById('merge-list');
  const summary = document.getElementById('merge-summary');
  const button = document.getElementById('merge-button');
  if (!mergeFiles.length) {
    list.innerHTML = '<div class="merge-empty">No PDF files have been added yet.</div>';
    summary.textContent = 'No files selected'; button.disabled = true; return;
  }
  list.innerHTML = mergeFiles.map((file, index) => `
    <div class="merge-item">
      <div class="merge-item-icon">PDF</div>
      <div><strong>${escapeHtml(file.name)}</strong><small>${formatBytes(file.size)}</small></div>
      <div class="merge-controls">
        <button class="icon-button" type="button" data-move-up="${index}">↑</button>
        <button class="icon-button" type="button" data-move-down="${index}">↓</button>
        <button class="icon-button" type="button" data-remove="${index}">×</button>
      </div>
    </div>`).join('');
  summary.textContent = `${mergeFiles.length} PDF${mergeFiles.length === 1 ? '' : 's'} selected`;
  button.disabled = mergeFiles.length < 2;
  list.querySelectorAll('[data-move-up]').forEach(btn => btn.onclick = () => moveMergeFile(Number(btn.dataset.moveUp), -1));
  list.querySelectorAll('[data-move-down]').forEach(btn => btn.onclick = () => moveMergeFile(Number(btn.dataset.moveDown), 1));
  list.querySelectorAll('[data-remove]').forEach(btn => btn.onclick = () => {
    mergeFiles.splice(Number(btn.dataset.remove), 1); renderMergeList();
  });
}
function moveMergeFile(index, direction) {
  const next = index + direction;
  if (next < 0 || next >= mergeFiles.length) return;
  [mergeFiles[index], mergeFiles[next]] = [mergeFiles[next], mergeFiles[index]];
  renderMergeList();
}
function addMergeFiles(files) {
  const valid = Array.from(files).filter(validPdf);
  if (!valid.length) return showAlert('Please add PDF files only.');
  mergeFiles.push(...valid); renderMergeList();
}
const mergeInput = document.getElementById('merge-file-input');
mergeInput.addEventListener('change', event => { addMergeFiles(event.target.files); event.target.value = ''; });
const mergeDrop = document.getElementById('merge-drop-zone');
['dragenter','dragover'].forEach(name => mergeDrop.addEventListener(name, event => {
  event.preventDefault(); mergeDrop.classList.add('dragover');
}));
['dragleave','drop'].forEach(name => mergeDrop.addEventListener(name, event => {
  event.preventDefault(); mergeDrop.classList.remove('dragover');
}));
mergeDrop.addEventListener('drop', event => addMergeFiles(event.dataTransfer.files));
document.getElementById('merge-button').addEventListener('click', async event => {
  const button = event.currentTarget;
  if (mergeFiles.length < 2) return;
  button.disabled = true; button.textContent = 'Merging…';
  try {
    const output = await PDFLib.PDFDocument.create();
    for (const file of mergeFiles) {
      const source = await PDFLib.PDFDocument.load(await file.arrayBuffer());
      const pages = await output.copyPages(source, source.getPageIndices());
      pages.forEach(page => output.addPage(page));
    }
    downloadPdf(await output.save(), 'pdfmint-merged.pdf');
  } catch (_) { showAlert('The files could not be merged.'); }
  finally { button.disabled = false; button.textContent = 'Merge and download'; }
});

async function setSplitFile(file) {
  if (!validPdf(file)) return showAlert('Please select a valid PDF file.');
  try {
    const source = await PDFLib.PDFDocument.load(await file.arrayBuffer());
    splitFile = file; splitPageCount = source.getPageCount();
    document.getElementById('split-file-summary').textContent =
      `${file.name} · ${splitPageCount} page${splitPageCount === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
    document.getElementById('split-help').textContent = `Choose pages from 1 to ${splitPageCount}.`;
    document.getElementById('split-button').disabled = false;
  } catch (_) { showAlert('PDFMint could not open this file.'); }
}
document.getElementById('split-file-input').addEventListener('change', async event => {
  const file = event.target.files[0]; if (file) await setSplitFile(file); event.target.value = '';
});
function parsePageRanges(text, maxPage) {
  if (!text.trim()) throw new Error('Enter at least one page number or range.');
  const result = [];
  for (const raw of text.split(',')) {
    const part = raw.trim(); if (!part) continue;
    if (/^\d+$/.test(part)) {
      const page = Number(part);
      if (page < 1 || page > maxPage) throw new Error(`Page ${page} is outside the available range.`);
      result.push(page - 1); continue;
    }
    const match = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (!match) throw new Error(`“${part}” is not a valid page or range.`);
    const start = Number(match[1]), end = Number(match[2]);
    if (start < 1 || end < 1 || start > maxPage || end > maxPage) throw new Error(`Range ${part} is outside pages 1-${maxPage}.`);
    const step = start <= end ? 1 : -1;
    for (let page = start; page !== end + step; page += step) result.push(page - 1);
  }
  if (!result.length) throw new Error('Enter at least one valid page.');
  return result;
}
document.getElementById('split-button').addEventListener('click', async event => {
  const button = event.currentTarget; if (!splitFile) return;
  button.disabled = true; button.textContent = 'Creating PDF…';
  try {
    const indices = parsePageRanges(document.getElementById('split-ranges').value, splitPageCount);
    const source = await PDFLib.PDFDocument.load(await splitFile.arrayBuffer());
    const output = await PDFLib.PDFDocument.create();
    const pages = await output.copyPages(source, indices);
    pages.forEach(page => output.addPage(page));
    downloadPdf(await output.save(), `${splitFile.name.replace(/\.pdf$/i, '')}-selected-pages.pdf`);
  } catch (error) { showAlert(error.message || 'The selected pages could not be extracted.'); }
  finally { button.disabled = false; button.textContent = 'Split and download'; }
});

}
function downloadPdf(bytes, filename) {
  const blob = new Blob([bytes], {type: 'application/pdf'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename;
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
if (document.getElementById('merge-list')) renderMergeList();
updateEditorUi();
