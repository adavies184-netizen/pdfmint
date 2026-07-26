
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
  canvasMetrics: null
};
let splitFile = null;
let splitPageCount = 0;
let mergeFiles = [];

const editorHistory = { undo: [], redo: [], restoring: false };
function cloneEditorState() {
  return JSON.parse(JSON.stringify({
    pages: editor.pages,
    annotations: editor.annotations,
    selectedIndex: editor.selectedIndex,
    selectedAnnotationId: editor.selectedAnnotationId
  }));
}
function restoreEditorState(snapshot) {
  editorHistory.restoring = true;
  editor.pages = snapshot.pages;
  editor.annotations = snapshot.annotations;
  editor.selectedIndex = Math.min(snapshot.selectedIndex, Math.max(0, editor.pages.length - 1));
  editor.selectedAnnotationId = snapshot.selectedAnnotationId;
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
      canvasMetrics: null
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
function setEditorMode(mode) {
  editor.mode = mode;
  const addTextTool = document.getElementById('add-text-tool');
  if (addTextTool) addTextTool.classList.toggle('active', mode === 'text');
  const optionsBar = document.getElementById('text-options-bar');
  if (optionsBar) optionsBar.hidden = mode !== 'text';
  const layer = document.getElementById('annotation-layer');
  layer.classList.toggle('text-mode', mode === 'text');
  layer.classList.toggle('select-mode', mode === 'select');
  if (mode === 'text') showEditorHint('Click anywhere on the page to add text.');
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
  syncTextInspector();
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
  }
});
document.getElementById('add-text-tool').addEventListener('click', () => setEditorMode('text'));
document.getElementById('annotation-layer').addEventListener('mousedown', event => {
  if (event.target !== event.currentTarget) return;
  if (editor.mode === 'text') addTextAt(event.clientX, event.clientY);
  else deselectAnnotation();
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
    const {width, height} = page.getSize();

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
