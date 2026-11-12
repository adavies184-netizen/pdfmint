
/* ---- PDFBreeze application code ---- */

/* Heavy PDF libraries load on first use instead of on every page view.
   Pages that already include the <script> tags (editor.html) reuse them. */
const PDFBREEZE_VENDORS = {
  pdfjs: { global: 'pdfjsLib', src: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js' },
  pdflib: { global: 'PDFLib', src: 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js' },
  jszip: { global: 'JSZip', src: 'vendor/jszip-3.10.1.min.js' }
};
const pdfBreezeVendorPromises = {};

function configurePdfJsWorker() {
  if (window.pdfjsLib && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
}

function loadPdfBreezeVendor(name) {
  const vendor = PDFBREEZE_VENDORS[name];
  if (window[vendor.global]) return Promise.resolve(window[vendor.global]);
  if (!pdfBreezeVendorPromises[name]) {
    pdfBreezeVendorPromises[name] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = vendor.src;
      script.async = true;
      script.onload = () => window[vendor.global] ? resolve(window[vendor.global]) : reject(new Error(`${name} did not load.`));
      script.onerror = () => reject(new Error('A required PDF component could not be loaded. Please check your connection and try again.'));
      document.head.appendChild(script);
    }).catch(error => {
      delete pdfBreezeVendorPromises[name];
      throw error;
    });
  }
  return pdfBreezeVendorPromises[name];
}

async function ensurePdfLibraries(...names) {
  const wanted = names.length ? names : ['pdfjs', 'pdflib'];
  await Promise.all(wanted.map(loadPdfBreezeVendor));
  configurePdfJsWorker();
}

window.PDFBreezeVendors = Object.assign(window.PDFBreezeVendors || {}, { load: loadPdfBreezeVendor, ensure: ensurePdfLibraries });
configurePdfJsWorker();

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
  embeddedFonts: {},
  selectedExistingTextId: null,
  editTextBoxMode: false,
  editCreatedText: {},
  selectedEditCreatedTextId: null,
  signatures: {},
  selectedSignatureId: null,
  pendingSignature: null,
  drawings: {},
  drawTool: 'marker',
  drawColour: '#111111',
  drawThickness: 4,
  activeDrawing: null,
  shapes: {},
  shapeTool: 'line',
  shapeStroke: '#111111',
  shapeFill: '#ffffff',
  shapeFillEnabled: false,
  shapeOpacity: 1,
  shapeThickness: 2,
  activeShape: null,
  selectedShapeId: null,
  textHighlights: {},
  highlightColour: '#fff200',
  links: {},
  selectedLinkId: null,
  activeLinkDraft: null,
  notes: {},
  selectedNoteId: null,
  crops: {},
  cropDraft: null,
  cropScope: 'current',
  watermark: { text: 'HELLO WORLD!', size: 100, opacity: 50, colour: '#ef4444', angle: -45, align: 'center', vertical: 50, applied: false },
  splitPoints: [],
  splitApplied: false
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
    drawings: editor.drawings,
    shapes: editor.shapes,
    textHighlights: editor.textHighlights,
    links: editor.links,
    notes: editor.notes,
    crops: editor.crops,
    watermark: editor.watermark,
    splitPoints: editor.splitPoints,
    splitApplied: editor.splitApplied,
    selectedIndex: editor.selectedIndex,
    selectedAnnotationId: editor.selectedAnnotationId,
    selectedExistingTextId: editor.selectedExistingTextId,
    selectedSignatureId: editor.selectedSignatureId,
    selectedShapeId: editor.selectedShapeId,
    selectedLinkId: editor.selectedLinkId,
    selectedNoteId: editor.selectedNoteId
  }));
}
function restoreEditorState(snapshot) {
  editorHistory.restoring = true;
  editor.pages = snapshot.pages;
  editor.annotations = snapshot.annotations;
  editor.extractedText = snapshot.extractedText || {};
  editor.editCreatedText = snapshot.editCreatedText || {};
  editor.signatures = snapshot.signatures || {};
  editor.drawings = snapshot.drawings || {};
  editor.shapes = snapshot.shapes || {};
  editor.textHighlights = snapshot.textHighlights || {};
  editor.links = snapshot.links || {};
  editor.crops = snapshot.crops || {};
  editor.cropDraft = null;
  editor.watermark = snapshot.watermark || { text: 'HELLO WORLD!', size: 100, opacity: 50, colour: '#ef4444', angle: -45, align: 'center', vertical: 50, applied: false };
  editor.watermark.align = editor.watermark.align || 'center';
  editor.watermark.vertical = Number.isFinite(editor.watermark.vertical) ? editor.watermark.vertical : 50;
  editor.splitPoints = snapshot.splitPoints || [];
  editor.splitApplied = Boolean(snapshot.splitApplied);
  editor.activeLinkDraft = null;
  editor.selectedIndex = Math.min(snapshot.selectedIndex, Math.max(0, editor.pages.length - 1));
  editor.selectedAnnotationId = snapshot.selectedAnnotationId;
  editor.selectedExistingTextId = snapshot.selectedExistingTextId || null;
  editor.selectedSignatureId = snapshot.selectedSignatureId || null;
  editor.selectedShapeId = snapshot.selectedShapeId || null;
  editor.selectedLinkId = snapshot.selectedLinkId || null;
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
    await ensurePdfLibraries();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdfjs = await pdfjsLib.getDocument({data: bytes.slice(), fontExtraProperties: true}).promise;
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
      embeddedFonts: {},
      selectedExistingTextId: null,
      editTextBoxMode: false,
      editCreatedText: {},
      selectedEditCreatedTextId: null,
      signatures: {},
      selectedSignatureId: null,
      pendingSignature: null,
      drawings: {},
      drawTool: 'marker',
      drawColour: '#111111',
      drawThickness: 4,
      activeDrawing: null,
      shapes: {},
      shapeTool: 'line',
      shapeStroke: '#111111',
      shapeFill: '#ffffff',
      shapeFillEnabled: false,
      shapeOpacity: 1,
      shapeThickness: 2,
      activeShape: null,
      selectedShapeId: null,
      textHighlights: {},
      highlightColour: '#fff200',
      links: {},
      selectedLinkId: null,
      activeLinkDraft: null,
      notes: {},
      selectedNoteId: null,
      crops: {},
      cropDraft: null,
      cropScope: 'current',
      watermark: { text: 'HELLO WORLD!', size: 100, opacity: 50, colour: '#ef4444', angle: -45, align: 'center', vertical: 50, applied: false },
      splitPoints: [],
      splitApplied: false
    };
    editorHistory.undo = []; editorHistory.redo = []; updateHistoryButtons();
    setEditorMode('select');
    document.getElementById('preview-name').textContent = file.name;
    document.getElementById('preview-size').textContent = formatBytes(file.size);
    updateEditorUi();
    await renderThumbnails();
    await renderSelectedPage();
  } catch (error) {
    console.error('PDF upload or preview error:', error);
    const isPasswordError =
      error?.name === 'PasswordException' ||
      /password/i.test(String(error?.message || ''));

    showAlert(
      isPasswordError
        ? 'This PDF is password protected. Remove the password and try again.'
        : 'PDFBreeze could not finish loading the PDF preview. Please try the file again.'
    );
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
  commitExistingTextEditing({render: false});
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
    '.existing-text-box:not(.modified), .edit-created-text'
  ).forEach(element => element.remove());
  document.querySelectorAll('.existing-text-box.modified').forEach(box => {
    box.classList.remove('selected', 'editing');
    box.querySelector('.existing-text-content')?.removeAttribute('contenteditable');
  });
}

function setEditorMode(mode) {
  if (mode !== 'crop') editor.cropDraft = null;
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
  document.getElementById('draw-tool')?.classList.toggle('active', mode === 'draw');
  document.getElementById('line-tool')?.classList.toggle('active', mode === 'shape');
  document.getElementById('text-highlight-tool')?.classList.toggle('active', mode === 'text-highlight');
  document.getElementById('link-tool')?.classList.toggle('active', mode === 'link');
  document.getElementById('note-tool')?.classList.toggle('active', mode === 'note');
  document.getElementById('watermark-tool')?.classList.toggle('active', mode === 'watermark');
  document.getElementById('crop-tool')?.classList.toggle('active', mode === 'crop');
  document.getElementById('manage-tool')?.classList.toggle('active', mode === 'manage');

  const addOptionsBar = document.getElementById('text-options-bar');
  const editOptionsBar = document.getElementById('edit-text-options-bar');
  const drawOptionsBar = document.getElementById('draw-options-bar');
  const lineOptionsBar = document.getElementById('line-options-bar');
  const highlightOptionsBar = document.getElementById('text-highlight-options-bar');
  const watermarkOptionsBar = document.getElementById('watermark-options-bar');
  const cropOptionsBar = document.getElementById('crop-options-bar');
  const managerOptionsBar = document.getElementById('manager-options-bar');
  if (addOptionsBar) addOptionsBar.hidden = mode !== 'text';
  if (editOptionsBar) editOptionsBar.hidden = mode !== 'edit-existing';
  if (drawOptionsBar) drawOptionsBar.hidden = mode !== 'draw';
  if (lineOptionsBar) lineOptionsBar.hidden = mode !== 'shape';
  if (highlightOptionsBar) highlightOptionsBar.hidden = mode !== 'text-highlight';
  if (watermarkOptionsBar) watermarkOptionsBar.hidden = mode !== 'watermark';
  if (cropOptionsBar) cropOptionsBar.hidden = mode !== 'crop';
  if (managerOptionsBar) managerOptionsBar.hidden = mode !== 'manage';

  const normalEditorBody = document.querySelector('.desktop-editor-body');
  const managerWorkspace = document.getElementById('manager-workspace');
  if (normalEditorBody) normalEditorBody.hidden = mode === 'manage';
  if (managerWorkspace) managerWorkspace.hidden = mode !== 'manage';

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
  layer.classList.toggle('note-mode', mode === 'note');
  layer.classList.toggle('edit-text-mode', mode === 'edit-existing');
  layer.classList.toggle('add-edit-box-mode', mode === 'edit-existing' && editor.editTextBoxMode);
  layer.classList.toggle('signature-place-mode', mode === 'signature-place');
  layer.classList.toggle('draw-mode', mode === 'draw');
  layer.classList.toggle('eraser-mode', mode === 'draw' && editor.drawTool === 'eraser');
  layer.classList.toggle('shape-mode', mode === 'shape');
  layer.classList.toggle('text-highlight-mode', mode === 'text-highlight');
  layer.classList.toggle('link-mode', mode === 'link');
  layer.classList.toggle('crop-mode', mode === 'crop');
  layer.classList.remove('text-highlight-dragging');

  if (mode === 'text') {
    showEditorHint('Click anywhere on the page to add text.');
  } else if (mode === 'edit-existing') {
    showEditorHint('Click once to select text. Double-click to edit it.');
    ensureExistingTextForCurrentPage().then(renderAnnotations);
  } else if (mode === 'text-highlight') {
    showEditorHint('Drag across any text to highlight it.');
    ensureExistingTextForCurrentPage().then(renderAnnotations);
  } else if (mode === 'link') {
    showEditorHint('Drag a box over the text or area you want to make clickable.');
    renderAnnotations();
  } else if (mode === 'watermark') {
    showEditorHint('Changes are applied live to every page.');
    renderAnnotations();
  } else if (mode === 'crop') {
    showEditorHint('Press and drag on the page to select the area to keep.');
    renderAnnotations();
  } else if (mode === 'manage') {
    showEditorHint('Select pages, then choose an action or drag them into a new position.');
    openManagerWorkspace();
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

function getEmbeddedFontTraits(data, fallbackName = '') {
  const lowerName = String(fallbackName || '').toLowerCase();
  let weight = /thin/.test(lowerName) ? 100
    : /extra[- ]?light|ultra[- ]?light/.test(lowerName) ? 200
      : /light/.test(lowerName) ? 300
        : /medium/.test(lowerName) ? 500
          : /semi[- ]?bold|demi/.test(lowerName) ? 600
            : /extra[- ]?bold|ultra[- ]?bold/.test(lowerName) ? 800
              : /black|heavy/.test(lowerName) ? 900
                : /bold/.test(lowerName) ? 700
                  : 400;
  let italic = /italic|oblique/.test(lowerName);

  try {
    const parsed = data?.length && window.fontkit?.create
      ? window.fontkit.create(data)
      : null;
    const parsedWeight = Number(parsed?.['OS/2']?.usWeightClass);
    if (Number.isFinite(parsedWeight) && parsedWeight >= 1 && parsedWeight <= 1000) {
      weight = parsedWeight;
    }
    italic = italic || Number(parsed?.post?.italicAngle || 0) !== 0 ||
      /italic|oblique/.test(String(parsed?.subfamilyName || '').toLowerCase());
  } catch (error) {
    console.warn('PDFBreeze could not read embedded font traits.', error);
  }

  return {weight, italic};
}

async function loadExactPdfFont(page, fontName) {
  if (!fontName) return null;
  if (Object.prototype.hasOwnProperty.call(editor.embeddedFonts, fontName)) {
    return editor.embeddedFonts[fontName];
  }

  try {
    const pdfFont = page.commonObjs.get(fontName);
    const rawData = pdfFont?.data;
    const data = rawData
      ? new Uint8Array(rawData.buffer
        ? rawData.buffer.slice(rawData.byteOffset, rawData.byteOffset + rawData.byteLength)
        : rawData)
      : null;
    const family = `PDFBreezeExact_${fontName.replace(/[^a-z0-9_-]/gi, '_')}`;
    const traits = getEmbeddedFontTraits(data, pdfFont?.name || fontName);
    const entry = {
      family,
      name: pdfFont?.name || fontName,
      data,
      weight: traits.weight,
      italic: traits.italic,
      ascent: Number.isFinite(pdfFont?.ascent) ? pdfFont.ascent : null,
      descent: Number.isFinite(pdfFont?.descent) ? pdfFont.descent : null
    };

    if (data?.length && window.FontFace && document.fonts) {
      const face = new FontFace(family, data, {
        weight: String(traits.weight),
        style: traits.italic ? 'italic' : 'normal'
      });
      await face.load();
      document.fonts.add(face);
      entry.face = face;
    }

    editor.embeddedFonts[fontName] = entry;
    return entry;
  } catch (error) {
    console.warn(`PDFBreeze could not load embedded PDF font ${fontName}.`, error);
    editor.embeddedFonts[fontName] = null;
    return null;
  }
}

function cssFamilyForExistingText(item) {
  const exact = item.exactFontKey && editor.embeddedFonts[item.exactFontKey];
  if (exact?.face) return `"${exact.family}"`;
  return item.font === 'TimesRoman'
    ? '"Times New Roman", Times, serif'
    : item.font === 'Courier'
      ? '"Courier New", monospace'
      : 'Helvetica, Arial, sans-serif';
}

async function ensureExistingTextForCurrentPage() {
  const sourceIndex = getCurrentSourcePageIndex();
  if (sourceIndex === null) return [];

  const key = String(sourceIndex);
  if (editor.extractedText[key]?.length) return editor.extractedText[key];

  const page = await editor.pdfjs.getPage(sourceIndex + 1);
  const textContent = await page.getTextContent();
  await page.getOperatorList();
  const fontNames = [...new Set(textContent.items.map(item => item.fontName).filter(Boolean))];
  await Promise.all(fontNames.map(fontName => loadExactPdfFont(page, fontName)));
  const viewport = page.getViewport({scale: 1});

  const runs = textContent.items
    .map((textItem, index) => {
      const text = String(textItem.str || '');
      if (!text.trim()) return null;

      const tx = pdfjsLib.Util.transform(viewport.transform, textItem.transform);
      const fontHeight = Math.max(5, Math.hypot(tx[2], tx[3]));
      const rawX = tx[4];
      const textStyle = textContent.styles?.[textItem.fontName] || {};
      const exactFont = editor.embeddedFonts[textItem.fontName];
      const ascent = Number.isFinite(textStyle.ascent)
        ? textStyle.ascent
        : Number.isFinite(exactFont?.ascent)
          ? exactFont.ascent
          : 1;
      const rawTop = tx[5] - fontHeight * ascent;
      const rawWidth = Math.max(1, Math.abs(textItem.width || 0));
      const x = Math.max(0, Math.min(viewport.width, rawX));
      const right = Math.max(0, Math.min(viewport.width, rawX + rawWidth));
      const top = Math.max(0, Math.min(viewport.height, rawTop));
      const bottom = Math.max(0, Math.min(viewport.height, rawTop + fontHeight));
      const width = right - x;
      const clippedHeight = bottom - top;
      // Some scanned PDFs contain malformed invisible OCR runs positioned far
      // outside the page. They previously produced selection boxes across the
      // editor. Ignore those runs and clip partial runs to the visible page.
      if (width < 1 || clippedHeight < 1) return null;
      const style = approximatePdfFont(exactFont?.name || textItem.fontName);
      const fontWeight = Number.isFinite(exactFont?.weight)
        ? exactFont.weight
        : style.bold ? 700 : 400;
      const italic = exactFont?.face ? Boolean(exactFont.italic) : style.italic;

      return {
        index,
        text,
        x,
        top,
        width,
        height: clippedHeight,
        baselineY: textItem.transform[5],
        pdfX: textItem.transform[4],
        pdfY: textItem.transform[5],
        pdfFontSize: Math.max(5, Math.hypot(textItem.transform[0], textItem.transform[1])),
        fontName: textItem.fontName || '',
        exactFontKey: exactFont?.data?.length ? textItem.fontName : '',
        font: style.font,
        fontWeight,
        bold: fontWeight >= 600,
        italic
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const vertical = a.top - b.top;
      return Math.abs(vertical) > Math.max(a.height, b.height) * .55 ? vertical : a.x - b.x;
    });

  // Keep every PDF.js text run independent. Joining neighbouring runs into a
  // browser paragraph changes columns, spacing and fonts before the user edits
  // anything. Run-level editing leaves every unrelated PDF object untouched.
  const items = runs.map((run, index) => {
    const width = Math.max(2, run.width);
    const height = Math.max(5, run.height);
    const normalisedX = Math.max(0, Math.min(.995, run.x / viewport.width));
    const normalisedY = Math.max(0, Math.min(.995, run.top / viewport.height));
    const normalisedWidth = Math.min(1 - normalisedX, Math.max(.005, width / viewport.width));
    const normalisedHeight = Math.min(1 - normalisedY, Math.max(.008, height / viewport.height));

    // Character-level geometry shared by text annotation tools.
    // Widths are measured per glyph and then normalised to the exact PDF run width.
    const highlightCharacters = [];
    const measurementCanvas = document.createElement('canvas');
    const measurementContext = measurementCanvas.getContext('2d');

    const exactEntry = run.exactFontKey && editor.embeddedFonts[run.exactFontKey];
    const editingFamily = exactEntry?.face
      ? exactEntry.family
      : run.font === 'TimesRoman' ? 'Times New Roman'
        : run.font === 'Courier' ? 'Courier New'
          : 'Arial';
    measurementContext.font =
      `${run.italic ? 'italic ' : ''}${run.fontWeight || (run.bold ? 700 : 400)} ` +
      `${run.pdfFontSize}px "${editingFamily}"`;
    const measuredRunWidth = Math.max(.01, measurementContext.measureText(run.text).width);
    const fontScaleX = Math.max(.35, Math.min(3, run.width / measuredRunWidth));

    {
        const characters = Array.from(String(run.text || ''));
        if (!characters.length) return;

        const runExactEntry = run.exactFontKey && editor.embeddedFonts[run.exactFontKey];
        const family = runExactEntry?.face
          ? runExactEntry.family
          : run.font === 'TimesRoman' ? 'Times New Roman'
            : run.font === 'Courier' ? 'Courier New'
              : 'Arial';

        measurementContext.font =
          `${run.italic ? 'italic ' : ''}${run.fontWeight || (run.bold ? 700 : 400)} ${run.height}px "${family}"`;

        const measured = characters.map(character => {
          const metrics = measurementContext.measureText(character);
          return {
            character,
            width: Math.max(.01, metrics.width),
            ascent: Number.isFinite(metrics.actualBoundingBoxAscent)
              ? metrics.actualBoundingBoxAscent
              : run.height * .78,
            descent: Number.isFinite(metrics.actualBoundingBoxDescent)
              ? metrics.actualBoundingBoxDescent
              : run.height * .18
          };
        });

        const measuredTotal = Math.max(
          .01,
          measured.reduce((sum, item) => sum + item.width, 0)
        );
        const widthScale = run.width / measuredTotal;

        const maxAscent = Math.max(...measured.map(item => item.ascent), run.height * .7);
        const maxDescent = Math.max(...measured.map(item => item.descent), run.height * .12);
        const metricTotal = Math.max(1, maxAscent + maxDescent);
        const metricScale = run.height / metricTotal;

        // PDF.js tx[5] is the visual baseline in viewport coordinates.
        const baseline = run.top + run.height;
        const glyphAscent = maxAscent * metricScale;
        const glyphDescent = maxDescent * metricScale;

        // Small, even padding above and below the actual glyph bounds.
        const verticalPadding = Math.max(.45, run.height * .055);
        const highlightTop = baseline - glyphAscent - verticalPadding;
        const highlightBottom = baseline + glyphDescent + verticalPadding;
        const highlightHeight = Math.max(2, highlightBottom - highlightTop);

        let cursorX = run.x;

        measured.forEach((item, characterIndex) => {
          const characterWidth = item.width * widthScale;
          const isWhitespace = /\s/.test(item.character);

          highlightCharacters.push({
            text: item.character,
            isWhitespace,
            lineIndex: 0,
            runIndex: run.index,
            characterIndex,
            x: Math.max(0, cursorX / viewport.width),
            y: Math.max(0, highlightTop / viewport.height),
            w: Math.min(1, Math.max(.0005, characterWidth / viewport.width)),
            h: Math.min(1, Math.max(.004, highlightHeight / viewport.height))
          });

          cursorX += characterWidth;
        });
    }

    return {
      id: `existing-${sourceIndex}-${index}`,
      type: 'existing-text',
      originalText: run.text,
      text: run.text,
      x: normalisedX,
      y: normalisedY,
      w: normalisedWidth,
      h: normalisedHeight,
      originalX: normalisedX,
      originalY: normalisedY,
      originalW: normalisedWidth,
      originalH: normalisedHeight,
      pdfX: run.pdfX,
      pdfY: run.pdfY,
      pdfWidth: width,
      pdfFontSize: run.pdfFontSize,
      fittedPdfFontSize: run.pdfFontSize,
      fontScaleX,
      lineWidths: [run.width],
      lineOffsets: [0],
      fontName: run.fontName,
      exactFontKey: run.exactFontKey || '',
      hasExactFont: Boolean(exactEntry?.face),
      font: run.font,
      fontWeight: run.fontWeight,
      bold: run.bold,
      italic: run.italic,
      lineHeight: run.height,
      highlightCharacters,
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

function commitExistingTextEditing({render = true} = {}) {
  const box = document.querySelector('.existing-text-box.editing');
  if (!box) return false;
  const sourceIndex = getCurrentSourcePageIndex();
  const item = sourceIndex === null ? null : getExistingTextItems(sourceIndex)
    .find(candidate => candidate.id === box.dataset.id);
  if (!item) return false;

  const content = box.querySelector('.existing-text-content');
  const nextText = (content?.textContent || '').replace(/\r/g, '');
  const changed = nextText !== item.originalText || Boolean(item.html);
  item.editing = false;
  item.modified = changed;

  if (changed) {
    item.text = nextText;
    const requiredHeight = Math.max(16, content?.scrollHeight || 0);
    if (editor.canvasMetrics?.height) {
      item.h = Math.min(1 - item.y, requiredHeight / editor.canvasMetrics.height);
    }
  } else {
    item.text = item.originalText;
    item.html = '';
    item.x = item.originalX;
    item.y = item.originalY;
    item.w = item.originalW;
    item.h = item.originalH;
  }

  if (render) renderAnnotations();
  return true;
}

function beginExistingTextEditing(item, clientX, clientY) {
  commitExistingTextEditing({render: false});
  editor.selectedExistingTextId = item.id;
  editor.selectedAnnotationId = null;
  editor.selectedEditCreatedTextId = null;
  if (!item.editing) recordHistory();
  item.editing = true;
  renderAnnotations();
  syncEditTextToolbar();

  requestAnimationFrame(() => {
    const box = document.querySelector(`.existing-text-box[data-id="${CSS.escape(item.id)}"]`);
    const content = box?.querySelector('.existing-text-content');
    if (!content) return;
    content.setAttribute('contenteditable', 'plaintext-only');
    if (content.contentEditable !== 'plaintext-only') content.setAttribute('contenteditable', 'true');
    content.focus({preventScroll: true});

    let range = null;
    if (document.caretPositionFromPoint) {
      const position = document.caretPositionFromPoint(clientX, clientY);
      if (position && content.contains(position.offsetNode)) {
        range = document.createRange();
        range.setStart(position.offsetNode, position.offset);
        range.collapse(true);
      }
    } else if (document.caretRangeFromPoint) {
      const candidate = document.caretRangeFromPoint(clientX, clientY);
      if (candidate && content.contains(candidate.startContainer)) range = candidate;
    }
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(content);
      range.collapse(false);
    }
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
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

    // Cover only this original PDF text run while its replacement is previewed.
    let whiteout = document.querySelector(`.existing-text-whiteout[data-for="${item.id}"]`);
    if (!whiteout) {
      whiteout = document.createElement('div');
      whiteout.className = 'existing-text-whiteout';
      whiteout.dataset.for = item.id;
      document.getElementById('annotation-layer').insertBefore(whiteout, box);
    }
    whiteout.style.left = `${item.originalX * metrics.width - 1}px`;
    whiteout.style.top = `${item.originalY * metrics.height - 1}px`;
    whiteout.style.width = `${item.originalW * metrics.width + 2}px`;
    whiteout.style.height = `${Math.max(8, item.originalH * metrics.height) + 2}px`;

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


function getPageTextHighlights(sourceIndex) {
  const key = String(sourceIndex);
  if (!editor.textHighlights[key]) editor.textHighlights[key] = [];
  return editor.textHighlights[key];
}

function getHighlightCharactersForPage(sourceIndex) {
  const characters = [];

  getExistingTextItems(sourceIndex).forEach(paragraph => {
    (paragraph.highlightCharacters || []).forEach(character => {
      characters.push({
        ...character,
        paragraphId: paragraph.id
      });
    });
  });

  return characters
    .sort((a,b) => {
      const sameVisualLine =
        Math.abs(a.y - b.y) <= Math.max(a.h,b.h) * .42;

      if (!sameVisualLine) return a.y - b.y;
      if (a.x !== b.x) return a.x - b.x;
      if (a.runIndex !== b.runIndex) return a.runIndex - b.runIndex;
      return a.characterIndex - b.characterIndex;
    })
    .map((character,index) => ({...character, order:index}));
}

function renderSavedTextHighlights(layer, metrics) {
  if (!editor.pages.length) return;
  const sourceIndex = getCurrentSourcePageIndex();

  getPageTextHighlights(sourceIndex).forEach(highlight => {
    highlight.rects.forEach(rect => {
      const element = document.createElement('div');
      element.className = 'saved-text-highlight';
      element.style.left = `${rect.x * metrics.width}px`;
      element.style.top = `${rect.y * metrics.height}px`;
      element.style.width = `${rect.w * metrics.width}px`;
      element.style.height = `${rect.h * metrics.height}px`;
      element.style.background = highlight.colour;
      element.style.opacity = '.48';
      layer.appendChild(element);
    });
  });
}

function mergeHighlightCharacterRects(selectedCharacters) {
  const sorted = [...selectedCharacters].sort((a,b) => a.order - b.order);
  const rows = [];

  sorted.forEach(word => {
    let row = rows.find(candidate =>
      Math.abs(candidate.y - word.y) <= Math.max(candidate.h,word.h) * .48
    );

    if (!row) {
      row = {y:word.y, h:word.h, words:[]};
      rows.push(row);
    }

    row.words.push(word);
    row.y = Math.min(row.y,word.y);
    row.h = Math.max(row.h,word.h);
  });

  return rows
    .sort((a,b) => a.y - b.y)
    .map(row => {
      row.words.sort((a,b) => a.x - b.x);
      const visible = row.words.filter(character => !character.isWhitespace);
      const source = visible.length ? visible : row.words;
      const left = Math.min(...source.map(character => character.x));
      const right = Math.max(...source.map(character => character.x + character.w));
      const top = Math.min(...source.map(character => character.y));
      const bottom = Math.max(...source.map(character => character.y + character.h));

      return {
        x:left,
        y:top,
        w:right-left,
        h:bottom-top
      };
    });
}

function renderTextHighlightInteraction(layer, metrics) {
  if (editor.mode !== 'text-highlight' || !editor.pages.length) return;

  const sourceIndex = getCurrentSourcePageIndex();
  const characters = getHighlightCharactersForPage(sourceIndex);
  if (!characters.length) {
    showEditorHint('No selectable text was found on this PDF page.');
    return;
  }

  const shield = document.createElement('div');
  shield.className = 'text-highlight-drag-shield';
  layer.appendChild(shield);

  let startOrder = null;
  let currentOrder = null;
  let pointerId = null;
  let previewElements = [];

  const clearPreview = () => {
    previewElements.forEach(element => element.classList.remove('preview'));
    previewElements = [];
  };

  const showPreview = () => {
    clearPreview();
    if (startOrder === null || currentOrder === null) return;

    const first = Math.min(startOrder,currentOrder);
    const last = Math.max(startOrder,currentOrder);

    layer.querySelectorAll('.text-highlight-hit').forEach(element => {
      const order = Number(element.dataset.order);
      if (
        order >= first &&
        order <= last &&
        element.dataset.whitespace !== 'true'
      ) {
        element.classList.add('preview');
        previewElements.push(element);
      }
    });
  };

  const orderAtPoint = (clientX,clientY) => {
    const bounds = layer.getBoundingClientRect();
    const x = (clientX - bounds.left) / bounds.width;
    const y = (clientY - bounds.top) / bounds.height;

    let best = null;
    let bestDistance = Infinity;

    characters.forEach(character => {
      const centreX = character.x + character.w / 2;
      const centreY = character.y + character.h / 2;
      const dx = Math.max(0,Math.abs(x-centreX)-character.w/2);
      const dy = Math.max(0,Math.abs(y-centreY)-character.h/2);
      const distance = dx*dx + dy*dy*5;

      if (distance < bestDistance) {
        bestDistance = distance;
        best = character;
      }
    });

    return best?.order ?? null;
  };

  const move = event => {
    if (startOrder === null) return;
    currentOrder = orderAtPoint(event.clientX,event.clientY);
    showPreview();
  };

  const finish = event => {
    if (startOrder === null) return;

    currentOrder = orderAtPoint(event.clientX,event.clientY) ?? currentOrder ?? startOrder;
    const first = Math.min(startOrder,currentOrder);
    const last = Math.max(startOrder,currentOrder);
    const selectedCharacters = characters.filter(character =>
      character.order >= first &&
      character.order <= last
    );

    if (selectedCharacters.length) {
      recordHistory();
      getPageTextHighlights(sourceIndex).push({
        id:`highlight-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        colour:editor.highlightColour,
        rects:mergeHighlightCharacterRects(selectedCharacters)
      });
    }

    startOrder = null;
    currentOrder = null;
    clearPreview();
    layer.classList.remove('text-highlight-dragging');

    window.removeEventListener('pointermove',move);
    window.removeEventListener('pointerup',finish);
    window.removeEventListener('pointercancel',finish);
    renderAnnotations();
  };

  characters.forEach(character => {
    const hit = document.createElement('div');
    hit.className = 'text-highlight-hit';
    hit.dataset.order = String(character.order);
    hit.dataset.whitespace = character.isWhitespace ? 'true' : 'false';
    hit.style.left = `${character.x * metrics.width}px`;
    hit.style.top = `${character.y * metrics.height}px`;
    hit.style.width = `${Math.max(1,character.w * metrics.width)}px`;
    hit.style.height = `${Math.max(6,character.h * metrics.height)}px`;

    if (!character.isWhitespace) {
      hit.addEventListener('pointerdown',event => {
        if (editor.mode !== 'text-highlight') return;

        event.preventDefault();
        event.stopPropagation();

        pointerId = event.pointerId;
        startOrder = character.order;
        currentOrder = character.order;
        layer.classList.add('text-highlight-dragging');
        showPreview();

        window.addEventListener('pointermove',move);
        window.addEventListener('pointerup',finish);
        window.addEventListener('pointercancel',finish);
      });
    } else {
      hit.style.pointerEvents = 'none';
    }

    layer.appendChild(hit);
  });
}


function renderExistingTextBoxes(layer, metrics) {
  const sourceIndex = getCurrentSourcePageIndex();
  if (sourceIndex === null) return;

  const editModeActive = editor.mode === 'edit-existing';
  getExistingTextItems(sourceIndex)
    .filter(item => editModeActive || item.modified)
    .forEach(item => {
    const isSelected = item.id === editor.selectedExistingTextId;
    const isModified = Boolean(item.modified);
    const isEditing = Boolean(item.editing);

    // A replacement hides only its corresponding original PDF text run.
    if (isModified || (isEditing && item.hasExactFont)) {
      const whiteout = document.createElement('div');
      whiteout.className = 'existing-text-whiteout';
      whiteout.dataset.for = item.id;
      whiteout.style.left = `${item.originalX * metrics.width - 1}px`;
      whiteout.style.top = `${item.originalY * metrics.height - 1}px`;
      whiteout.style.width = `${item.originalW * metrics.width + 2}px`;
      whiteout.style.height = `${Math.max(8, item.originalH * metrics.height) + 2}px`;
      layer.appendChild(whiteout);
    }

    const box = document.createElement('div');
    box.className = 'existing-text-box';
    if (isSelected) box.classList.add('selected');
    if (isModified) box.classList.add('modified');
    if (isEditing) box.classList.add('editing');
    if (!item.hasExactFont) box.classList.add('no-exact-font');
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
    content.style.fontFamily = cssFamilyForExistingText(item);
    content.style.fontWeight = String(item.fontWeight || (item.bold ? 700 : 400));
    content.style.fontStyle = item.italic ? 'italic' : 'normal';
    const visualPdfFontSize = item.pdfFontSize;
    content.style.fontSize = `${Math.max(4, visualPdfFontSize * metrics.scale)}px`;
    content.style.lineHeight = `${Math.max(5, item.lineHeight * metrics.scale)}px`;
    content.style.setProperty('color', item.color || '#000000', 'important');
    const originalHorizontalScale = Number.isFinite(item.fontScaleX) ? item.fontScaleX : 1;
    const scaleForCurrentText = () => {
      if (!item.modified) return originalHorizontalScale;
      const measureCanvas = document.createElement('canvas');
      const measureContext = measureCanvas.getContext('2d');
      measureContext.font =
        `${item.italic ? 'italic ' : ''}${item.fontWeight || (item.bold ? 700 : 400)} ` +
        `${Math.max(4, visualPdfFontSize * metrics.scale)}px ${cssFamilyForExistingText(item)}`;
      const currentWidth = Math.max(.01, measureContext.measureText(item.text || '').width);
      const availableWidth = Math.max(1, item.originalW * metrics.width);
      // Shorter replacements keep their original glyph scale and simply leave
      // unused space. Longer replacements compress only as much as necessary,
      // preventing them from overwriting the adjacent PDF run.
      return Math.max(.05, Math.min(originalHorizontalScale, availableWidth / currentWidth));
    };
    let horizontalScale = scaleForCurrentText();
    content.style.transformOrigin = 'left top';
    content.style.transform = `scaleX(${horizontalScale})`;
    content.style.width = `${100 / horizontalScale}%`;

    const leftHandle = document.createElement('span');
    leftHandle.className = 'existing-handle left-handle';
    const rightHandle = document.createElement('span');
    rightHandle.className = 'existing-handle right-handle';

    box.append(content, leftHandle, rightHandle);

    box.addEventListener('click', event => {
      if (!editModeActive) return;
      if (box.classList.contains('editing')) {
        event.stopPropagation();
        return;
      }
      beginExistingTextEditing(item, event.clientX, event.clientY);
    });

    box.addEventListener('dblclick', event => {
      // Once the first click has enabled content editing, leave the browser's
      // native double-click word selection intact.
      event.stopPropagation();
    });

    content.addEventListener('mousedown', event => {
      if (box.classList.contains('editing')) event.stopPropagation();
    });

    content.addEventListener('click', event => {
      if (box.classList.contains('editing')) event.stopPropagation();
    });

    content.addEventListener('input', () => {
      item.text = content.textContent.replace(/\r/g, '');
      item.modified = item.text !== item.originalText || Boolean(item.html);
      box.classList.toggle('modified', item.modified);
      horizontalScale = scaleForCurrentText();
      content.style.transform = `scaleX(${horizontalScale})`;
      content.style.width = `${100 / horizontalScale}%`;

      // Type 3 and other programmatic PDF fonts cannot be used by a browser
      // contenteditable. Keep the original PDF glyphs visible until the user
      // genuinely changes this run; only then cover this run (never its
      // neighbours) and show the editable replacement.
      if (item.modified && !document.querySelector(`.existing-text-whiteout[data-for="${CSS.escape(item.id)}"]`)) {
        const whiteout = document.createElement('div');
        whiteout.className = 'existing-text-whiteout';
        whiteout.dataset.for = item.id;
        whiteout.style.left = `${item.originalX * metrics.width - 1}px`;
        whiteout.style.top = `${item.originalY * metrics.height - 1}px`;
        whiteout.style.width = `${item.originalW * metrics.width + 2}px`;
        whiteout.style.height = `${Math.max(8, item.originalH * metrics.height) + 2}px`;
        layer.insertBefore(whiteout, box);
      }

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
      if (!item.editing || !box.classList.contains('editing')) return;
      commitExistingTextEditing();
    });

    leftHandle.addEventListener('mousedown', event => {
      if (!editModeActive) return;
      item.modified = true;
      box.classList.add('modified');
      startExistingTextResize(event, item, 'left', box, content);
    });
    rightHandle.addEventListener('mousedown', event => {
      if (!editModeActive) return;
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


function getPageDrawings(sourceIndex){
  const key=String(sourceIndex);
  if(!editor.drawings[key]) editor.drawings[key]=[];
  return editor.drawings[key];
}
function paintStroke(ctx,stroke,w,h){
  if(!stroke.points||stroke.points.length<2)return;
  ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
  ctx.strokeStyle=stroke.colour;ctx.globalAlpha=stroke.tool==='highlighter'?.32:1;
  ctx.lineWidth=Math.max(1,stroke.thickness*w/1000);
  ctx.beginPath();ctx.moveTo(stroke.points[0].x*w,stroke.points[0].y*h);
  for(let i=1;i<stroke.points.length;i++){
    const p=stroke.points[i-1],q=stroke.points[i];
    ctx.quadraticCurveTo(p.x*w,p.y*h,(p.x+q.x)*w/2,(p.y+q.y)*h/2);
  }
  const last=stroke.points.at(-1);ctx.lineTo(last.x*w,last.y*h);ctx.stroke();ctx.restore();
}
function redrawDrawingCanvas(canvas){
  if(!editor.pages.length)return;
  const rect=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
  canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr);
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,rect.width,rect.height);
  getPageDrawings(editor.pages[editor.selectedIndex].sourceIndex).forEach(s=>paintStroke(ctx,s,rect.width,rect.height));
  if(editor.activeDrawing)paintStroke(ctx,editor.activeDrawing,rect.width,rect.height);
}
function eraseDrawingAt(x,y){
  const strokes=getPageDrawings(editor.pages[editor.selectedIndex].sourceIndex);
  let hit=-1,best=Infinity;
  strokes.forEach((s,i)=>s.points.forEach(p=>{const d=Math.hypot(p.x-x,p.y-y);if(d<best){best=d;hit=i}}));
  if(hit>=0&&best<=Math.max(.015,editor.drawThickness/650)){strokes.splice(hit,1);return true}
  return false;
}
function attachDrawingCanvas(layer){
  const canvas=document.createElement('canvas');canvas.className='drawing-canvas';layer.appendChild(canvas);
  const point=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height}};
  canvas.addEventListener('pointerdown',e=>{
    if(editor.mode!=='draw')return;e.preventDefault();e.stopPropagation();canvas.setPointerCapture?.(e.pointerId);
    const p=point(e);
    if(editor.drawTool==='eraser'){recordHistory();eraseDrawingAt(p.x,p.y);redrawDrawingCanvas(canvas);return}
    recordHistory();editor.activeDrawing={id:`draw-${Date.now()}`,tool:editor.drawTool,colour:editor.drawColour,
      thickness:editor.drawTool==='highlighter'?Math.max(14,editor.drawThickness*4):editor.drawThickness,points:[p]};
    redrawDrawingCanvas(canvas);
  });
  canvas.addEventListener('pointermove',e=>{
    if(editor.mode!=='draw')return;const p=point(e);
    if(editor.drawTool==='eraser'&&e.buttons){if(eraseDrawingAt(p.x,p.y))redrawDrawingCanvas(canvas);return}
    if(!editor.activeDrawing)return;editor.activeDrawing.points.push(p);redrawDrawingCanvas(canvas);
  });
  const finish=e=>{
    if(!editor.activeDrawing)return;
    if(editor.activeDrawing.points.length===1)editor.activeDrawing.points.push({...editor.activeDrawing.points[0]});
    getPageDrawings(editor.pages[editor.selectedIndex].sourceIndex).push(editor.activeDrawing);
    editor.activeDrawing=null;redrawDrawingCanvas(canvas);
  };
  canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
  requestAnimationFrame(()=>redrawDrawingCanvas(canvas));
}


function getPageShapes(sourceIndex){const key=String(sourceIndex);if(!editor.shapes[key])editor.shapes[key]=[];return editor.shapes[key]}
function getSelectedShape(){if(!editor.pages.length)return null;return getPageShapes(editor.pages[editor.selectedIndex].sourceIndex).find(s=>s.id===editor.selectedShapeId)||null}
function svgEl(name,attrs={}){const el=document.createElementNS('http://www.w3.org/2000/svg',name);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el}
function shapeBounds(s){return{x:Math.min(s.x1,s.x2),y:Math.min(s.y1,s.y2),w:Math.abs(s.x2-s.x1),h:Math.abs(s.y2-s.y1)}}
function updateShapeToolbar(){const s=getSelectedShape();if(!s)return;document.getElementById('line-stroke-colour').value=s.stroke;document.getElementById('line-fill-colour').value=s.fill;document.getElementById('line-fill-enabled').checked=s.fillEnabled;document.getElementById('line-opacity').value=Math.round(s.opacity*100);document.getElementById('line-opacity-value').textContent=`${Math.round(s.opacity*100)}%`;document.getElementById('line-thickness').value=String(s.thickness)}
function startShapeDrag(e,s,svg){e.preventDefault();e.stopPropagation();const r=svg.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,o={x1:s.x1,y1:s.y1,x2:s.x2,y2:s.y2};let moved=false;const move=ev=>{if(!moved&&Math.hypot(ev.clientX-sx,ev.clientY-sy)<4)return;if(!moved){recordHistory();moved=true}const dx=(ev.clientX-sx)/r.width,dy=(ev.clientY-sy)/r.height;s.x1=Math.max(0,Math.min(1,o.x1+dx));s.x2=Math.max(0,Math.min(1,o.x2+dx));s.y1=Math.max(0,Math.min(1,o.y1+dy));s.y2=Math.max(0,Math.min(1,o.y2+dy));renderAnnotations()};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up)}
function startShapeResize(e,s,handle,svg){e.preventDefault();e.stopPropagation();recordHistory();const r=svg.getBoundingClientRect();const move=ev=>{const x=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width)),y=Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height));if(s.type==='line'||s.type==='arrow'){if(handle==='start'){s.x1=x;s.y1=y}else{s.x2=x;s.y2=y}}else{const b=shapeBounds(s);let left=b.x,right=b.x+b.w,top=b.y,bottom=b.y+b.h;if(handle.includes('w'))left=x;if(handle.includes('e'))right=x;if(handle.includes('n'))top=y;if(handle.includes('s'))bottom=y;s.x1=left;s.x2=right;s.y1=top;s.y2=bottom}renderAnnotations()};const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up)}
function renderShapes(layer,metrics){if(!editor.pages.length)return;const svg=svgEl('svg',{class:'shape-svg-layer',viewBox:`0 0 ${metrics.width} ${metrics.height}`,preserveAspectRatio:'none'});const defs=svgEl('defs');const marker=svgEl('marker',{id:'pdfmint-arrowhead',markerWidth:'10',markerHeight:'10',refX:'8',refY:'3',orient:'auto',markerUnits:'strokeWidth'});marker.appendChild(svgEl('path',{d:'M0,0 L0,6 L9,3 z',fill:'context-stroke'}));defs.appendChild(marker);svg.appendChild(defs);
 const shapes=getPageShapes(editor.pages[editor.selectedIndex].sourceIndex);if(editor.activeShape)shapes.concat([editor.activeShape]).forEach(s=>renderOne(s));else shapes.forEach(s=>renderOne(s));
 function renderOne(s){const x1=s.x1*metrics.width,y1=s.y1*metrics.height,x2=s.x2*metrics.width,y2=s.y2*metrics.height,b=shapeBounds(s),bx=b.x*metrics.width,by=b.y*metrics.height,bw=b.w*metrics.width,bh=b.h*metrics.height;let shape;if(s.type==='line'||s.type==='arrow'){shape=svgEl('line',{x1,y1,x2,y2})}else if(s.type==='box'){shape=svgEl('rect',{x:bx,y:by,width:bw,height:bh,rx:'1'})}else{shape=svgEl('ellipse',{cx:bx+bw/2,cy:by+bh/2,rx:bw/2,ry:bh/2})}shape.setAttribute('class',`shape-object${s.fillEnabled?' has-fill':''}`);shape.setAttribute('stroke',s.stroke);shape.setAttribute('stroke-width',s.thickness);shape.setAttribute('fill',s.type==='line'||s.type==='arrow'?'none':(s.fillEnabled?s.fill:'transparent'));shape.setAttribute('opacity',s.opacity);shape.setAttribute('vector-effect','non-scaling-stroke');if(s.type==='arrow')shape.setAttribute('marker-end','url(#pdfmint-arrowhead)');svg.appendChild(shape);
 let zone;if(s.type==='line'||s.type==='arrow')zone=svgEl('line',{x1,y1,x2,y2,class:'shape-drag-zone'});else if(s.type==='box')zone=svgEl('rect',{x:bx,y:by,width:bw,height:bh,class:'shape-drag-zone area'});else zone=svgEl('ellipse',{cx:bx+bw/2,cy:by+bh/2,rx:bw/2,ry:bh/2,class:'shape-drag-zone area'});zone.addEventListener('pointerdown',e=>{editor.selectedShapeId=s.id;updateShapeToolbar();startShapeDrag(e,s,svg)});svg.appendChild(zone);
 if(s.id===editor.selectedShapeId&&!editor.activeShape){if(s.type==='line'||s.type==='arrow'){[['start',x1,y1],['end',x2,y2]].forEach(([h,x,y])=>{const c=svgEl('circle',{cx:x,cy:y,r:6,class:'shape-handle'});c.addEventListener('pointerdown',e=>startShapeResize(e,s,h,svg));svg.appendChild(c)})}else{svg.appendChild(svgEl('rect',{x:bx,y:by,width:bw,height:bh,class:'shape-selection'}));[['nw',bx,by],['n',bx+bw/2,by],['ne',bx+bw,by],['w',bx,by+bh/2],['e',bx+bw,by+bh/2],['sw',bx,by+bh],['s',bx+bw/2,by+bh],['se',bx+bw,by+bh]].forEach(([h,x,y])=>{const c=svgEl('circle',{cx:x,cy:y,r:6,class:'shape-handle'});c.addEventListener('pointerdown',e=>startShapeResize(e,s,h,svg));svg.appendChild(c)})}}
 }
 svg.addEventListener('pointerdown',e=>{if(e.target!==svg||editor.mode!=='shape')return;e.preventDefault();const r=svg.getBoundingClientRect(),p={x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};recordHistory();editor.selectedShapeId=null;editor.activeShape={id:`shape-${Date.now()}`,type:editor.shapeTool,x1:p.x,y1:p.y,x2:p.x,y2:p.y,stroke:editor.shapeStroke,fill:editor.shapeFill,fillEnabled:editor.shapeFillEnabled,opacity:editor.shapeOpacity,thickness:editor.shapeThickness};const move=ev=>{editor.activeShape.x2=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));editor.activeShape.y2=Math.max(0,Math.min(1,(ev.clientY-r.top)/r.height));renderAnnotations()};const up=()=>{const made=editor.activeShape;editor.activeShape=null;if(Math.hypot(made.x2-made.x1,made.y2-made.y1)>.006){getPageShapes(editor.pages[editor.selectedIndex].sourceIndex).push(made);editor.selectedShapeId=made.id}window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);renderAnnotations()};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up)});layer.appendChild(svg)}


function getPageLinks(sourceIndex) {
  const key = String(sourceIndex);
  if (!editor.links || typeof editor.links !== 'object') editor.links = {};
  if (!editor.links[key]) editor.links[key] = [];
  return editor.links[key];
}
function getSelectedLink() {
  if (!editor.pages.length || !editor.selectedLinkId) return null;
  return getPageLinks(editor.pages[editor.selectedIndex].sourceIndex)
    .find(item => item.id === editor.selectedLinkId) || null;
}
function normaliseWebsiteUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
function positionLinkSettings(item, element) {
  const popover = document.getElementById('link-settings-popover');
  const rect = element.getBoundingClientRect();

  popover.hidden = false;

  requestAnimationFrame(() => {
    const width = popover.offsetWidth || 330;
    const height = popover.offsetHeight || 220;
    const gap = 12;

    let left = rect.left + rect.width / 2 - width / 2;
    let top = rect.bottom + gap;

    left = Math.max(12, Math.min(window.innerWidth - width - 12, left));

    if (top + height > window.innerHeight - 12) {
      top = rect.top - height - gap;
      popover.classList.add('above');
    } else {
      popover.classList.remove('above');
    }

    top = Math.max(12, Math.min(window.innerHeight - height - 12, top));

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  });
}
function updateLinkSettingsRows() {
  const kind = document.querySelector('input[name="link-kind"]:checked')?.value || 'website';
  document.getElementById('link-website-row').hidden = kind !== 'website';
  document.getElementById('link-page-row').hidden = kind !== 'page';
}
function openLinkSettings(item, element) {
  editor.selectedLinkId = item.id;
  const websiteRadio = document.querySelector('input[name="link-kind"][value="website"]');
  const pageRadio = document.querySelector('input[name="link-kind"][value="page"]');
  const websiteInput = document.getElementById('link-website-value');
  const pageInput = document.getElementById('link-page-value');
  websiteRadio.checked = item.kind !== 'page';
  pageRadio.checked = item.kind === 'page';
  websiteInput.value = item.url || '';
  pageInput.value = item.page || 1;
  pageInput.max = editor.pages.length;
  updateLinkSettingsRows();
  positionLinkSettings(item, element);
  setTimeout(() => (item.kind === 'page' ? pageInput : websiteInput).focus(), 0);
}
function closeLinkSettings() {
  document.getElementById('link-settings-popover').hidden = true;
}
function removeLinkById(id) {
  const sourceIndex = editor.pages[editor.selectedIndex].sourceIndex;
  editor.links[String(sourceIndex)] = getPageLinks(sourceIndex).filter(item => item.id !== id);
  editor.selectedLinkId = null;
  closeLinkSettings();
  renderAnnotations();
}
function startLinkResize(event, item, handle, element) {
  event.preventDefault();
  event.stopPropagation();
  recordHistory();
  const metrics = editor.canvasMetrics;
  const startX = event.clientX, startY = event.clientY;
  const original = {x:item.x,y:item.y,w:item.w,h:item.h};
  const minW=.025,minH=.018;
  const move = moveEvent => {
    const dx=(moveEvent.clientX-startX)/metrics.width;
    const dy=(moveEvent.clientY-startY)/metrics.height;
    let left=original.x,top=original.y,right=original.x+original.w,bottom=original.y+original.h;
    if(handle.includes('w')) left=Math.max(0,Math.min(right-minW,original.x+dx));
    if(handle.includes('e')) right=Math.min(1,Math.max(left+minW,original.x+original.w+dx));
    if(handle.includes('n')) top=Math.max(0,Math.min(bottom-minH,original.y+dy));
    if(handle.includes('s')) bottom=Math.min(1,Math.max(top+minH,original.y+original.h+dy));
    item.x=left;item.y=top;item.w=right-left;item.h=bottom-top;
    element.style.left=`${item.x*metrics.width}px`;
    element.style.top=`${item.y*metrics.height}px`;
    element.style.width=`${item.w*metrics.width}px`;
    element.style.height=`${item.h*metrics.height}px`;
    if(!document.getElementById('link-settings-popover').hidden) positionLinkSettings(item,element);
  };
  const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};
  window.addEventListener('pointermove',move);
  window.addEventListener('pointerup',up);
}
function renderLinks(layer, metrics) {
  if (!editor.pages.length) return;
  const sourceIndex=editor.pages[editor.selectedIndex].sourceIndex;
  const links=getPageLinks(sourceIndex);
  const all=editor.activeLinkDraft?links.concat([editor.activeLinkDraft]):links;
  all.forEach(item=>{
    const el=document.createElement('div');
    const selected=item.id===editor.selectedLinkId;
    el.className=`pdf-link-region${selected?' selected':''}${item.draft?' draft':''}`;
    el.dataset.linkId=item.id;
    el.style.left=`${item.x*metrics.width}px`;
    el.style.top=`${item.y*metrics.height}px`;
    el.style.width=`${item.w*metrics.width}px`;
    el.style.height=`${item.h*metrics.height}px`;
    if(!item.draft&&item.kind==='website'&&item.url){
      const tip=document.createElement('span');
      tip.className='pdf-link-tooltip';
      tip.textContent=item.url;
      el.appendChild(tip);
    }
    if(selected&&!item.draft){
      ['nw','n','ne','w','e','sw','s','se'].forEach(name=>{
        const h=document.createElement('i');
        h.className=`pdf-link-handle ${name}`;
        h.addEventListener('pointerdown',event=>startLinkResize(event,item,name,el));
        el.appendChild(h);
      });
    }
    el.addEventListener('click',event=>{
      if(item.draft||event.target.closest('.pdf-link-handle'))return;
      event.preventDefault();
      event.stopPropagation();

      if(!item.saved){
        editor.selectedLinkId=item.id;
        renderAnnotations();
        const fresh=document.querySelector(`[data-link-id="${item.id}"]`);
        if(fresh)openLinkSettings(item,fresh);
        return;
      }

      if(item.kind==='website'&&item.url){
        window.open(item.url,'_blank','noopener,noreferrer');
      }else if(item.kind==='page'){
        editor.selectedIndex=Math.max(0,Math.min(editor.pages.length-1,Number(item.page)-1));
        editor.selectedLinkId=null;
        closeLinkSettings();
        renderThumbnails().then(()=>renderSelectedPage());
      }
    });
    layer.appendChild(el);
  });
}
function beginLinkDraw(event) {
  if (editor.mode !== 'link' || !editor.canvasMetrics) return;
  if (event.button !== undefined && event.button !== 0) return;

  const layer = document.getElementById('annotation-layer');
  if (!layer || !layer.contains(event.target)) return;
  if (event.target.closest?.('.pdf-link-region, .pdf-link-handle, .link-settings-popover')) return;

  event.preventDefault();
  event.stopPropagation();
  closeLinkSettings();

  const rect = layer.getBoundingClientRect();
  const startClientX = event.clientX;
  const startClientY = event.clientY;
  const sx = Math.max(0, Math.min(1, (startClientX - rect.left) / rect.width));
  const sy = Math.max(0, Math.min(1, (startClientY - rect.top) / rect.height));

  editor.selectedLinkId = null;

  const draft = document.createElement('div');
  draft.className = 'pdf-link-region draft';
  draft.style.left = `${sx * rect.width}px`;
  draft.style.top = `${sy * rect.height}px`;
  draft.style.width = '0px';
  draft.style.height = '0px';
  layer.appendChild(draft);

  let current = {x:sx, y:sy, w:0, h:0};

  try { layer.setPointerCapture(event.pointerId); } catch (_) {}

  const move = moveEvent => {
    moveEvent.preventDefault();

    const x = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (moveEvent.clientY - rect.top) / rect.height));

    current = {
      x: Math.min(sx, x),
      y: Math.min(sy, y),
      w: Math.abs(x - sx),
      h: Math.abs(y - sy)
    };

    draft.style.left = `${current.x * rect.width}px`;
    draft.style.top = `${current.y * rect.height}px`;
    draft.style.width = `${current.w * rect.width}px`;
    draft.style.height = `${current.h * rect.height}px`;
  };

  const finish = () => {
    try { layer.releasePointerCapture(event.pointerId); } catch (_) {}
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', finish, true);
    window.removeEventListener('pointercancel', cancel, true);
    draft.remove();

    if (current.w < .012 || current.h < .01) {
      renderAnnotations();
      return;
    }

    const item = {
      id:`link-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
      draft:false,
      kind:'website',
      url:'',
      page:1,
      saved:false,
      x:current.x,
      y:current.y,
      w:current.w,
      h:current.h
    };

    recordHistory();
    getPageLinks(editor.pages[editor.selectedIndex].sourceIndex).push(item);
    editor.selectedLinkId = item.id;
    renderAnnotations();

    const element = document.querySelector(`[data-link-id="${item.id}"]`);
    if (element) openLinkSettings(item, element);
  };

  const cancel = () => {
    try { layer.releasePointerCapture(event.pointerId); } catch (_) {}
    window.removeEventListener('pointermove', move, true);
    window.removeEventListener('pointerup', finish, true);
    window.removeEventListener('pointercancel', cancel, true);
    draft.remove();
  };

  window.addEventListener('pointermove', move, true);
  window.addEventListener('pointerup', finish, true);
  window.addEventListener('pointercancel', cancel, true);
}


function getPageNotes(sourceIndex) {
  const key = String(sourceIndex);
  if (!editor.notes[key]) editor.notes[key] = [];
  return editor.notes[key];
}
function renderNotes(layer, metrics) {
  const page = editor.pages[editor.selectedIndex];
  if (!page) return;
  getPageNotes(page.sourceIndex).forEach(note => {
    const wrap = document.createElement('div');
    wrap.className = 'pdf-note' + (note.id === editor.selectedNoteId ? ' open' : '');
    wrap.dataset.noteId = note.id;
    wrap.style.left = `${note.x * metrics.width}px`;
    wrap.style.top = `${note.y * metrics.height}px`;

    const pin = document.createElement('button');
    pin.type = 'button';
    pin.className = 'pdf-note-pin';
    pin.title = note.text ? note.text.slice(0,180) : 'Note';
    pin.setAttribute('aria-label','Open note');
    pin.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="pin-head" d="M8 3h8l-1 7 3 3v2H6v-2l3-3z"></path><path class="pin-stem" d="M12 15v7"></path></svg>';

    const card = document.createElement('section');
    card.className = 'pdf-note-card';
    card.innerHTML = '<header><strong>Note</strong><button type="button" class="pdf-note-close" aria-label="Close note">×</button></header><textarea aria-label="Note text" placeholder="Write your note here..."></textarea>';
    const textarea = card.querySelector('textarea');
    textarea.value = note.text || '';
    let historyRecorded = false;
    textarea.addEventListener('focus', () => {
      if (!historyRecorded) { recordHistory(); historyRecorded = true; }
    });
    textarea.addEventListener('input', () => {
      note.text = textarea.value;
      pin.title = note.text ? note.text.slice(0,180) : 'Note';
    });
    textarea.addEventListener('pointerdown', e => e.stopPropagation());
    textarea.addEventListener('click', e => e.stopPropagation());

    let pinDrag = null;
    let suppressPinClick = false;

    pin.addEventListener('pointerdown', e => {
      if (editor.selectedNoteId === note.id) return;
      e.preventDefault();
      e.stopPropagation();

      const layerRect = layer.getBoundingClientRect();
      pin.setPointerCapture?.(e.pointerId);
      pinDrag = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startX: note.x,
        startY: note.y,
        layerRect,
        moved: false,
        historyRecorded: false
      };
      wrap.classList.remove('hover-open');
      wrap.classList.add('dragging');
    });

    pin.addEventListener('pointermove', e => {
      if (!pinDrag || pinDrag.pointerId !== e.pointerId) return;

      const dx = e.clientX - pinDrag.startClientX;
      const dy = e.clientY - pinDrag.startClientY;

      if (!pinDrag.moved && Math.hypot(dx, dy) >= 4) {
        pinDrag.moved = true;
        suppressPinClick = true;
        if (!pinDrag.historyRecorded) {
          recordHistory();
          pinDrag.historyRecorded = true;
        }
      }
      if (!pinDrag.moved) return;

      note.x = Math.max(0, Math.min(.97, pinDrag.startX + dx / pinDrag.layerRect.width));
      note.y = Math.max(0, Math.min(.97, pinDrag.startY + dy / pinDrag.layerRect.height));
      wrap.style.left = `${note.x * metrics.width}px`;
      wrap.style.top = `${note.y * metrics.height}px`;
    });

    const finishPinDrag = e => {
      if (!pinDrag || pinDrag.pointerId !== e.pointerId) return;
      pin.releasePointerCapture?.(e.pointerId);
      const wasMoved = pinDrag.moved;
      pinDrag = null;
      wrap.classList.remove('dragging');
      if (wasMoved) {
        setTimeout(() => { suppressPinClick = false; }, 0);
      }
    };

    pin.addEventListener('pointerup', finishPinDrag);
    pin.addEventListener('pointercancel', finishPinDrag);

    pin.addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      if (suppressPinClick) return;

      editor.selectedNoteId = note.id;
      renderAnnotations();
      requestAnimationFrame(() => {
        const fresh = document.querySelector(`[data-note-id="${note.id}"] textarea`);
        if (fresh) { fresh.focus(); fresh.setSelectionRange(fresh.value.length,fresh.value.length); }
      });
    });

    pin.addEventListener('mouseenter', () => {
      if (!editor.selectedNoteId && !pinDrag) wrap.classList.add('hover-open');
    });
    wrap.addEventListener('mouseleave', () => {
      if (editor.selectedNoteId !== note.id) wrap.classList.remove('hover-open');
    });
    card.querySelector('.pdf-note-close').addEventListener('click', e => {
      e.preventDefault(); e.stopPropagation();
      editor.selectedNoteId = null;
      renderAnnotations();
    });
    card.addEventListener('pointerdown', e => e.stopPropagation());
    card.addEventListener('click', e => e.stopPropagation());

    wrap.append(pin,card);
    layer.appendChild(wrap);
  });
}
function placeNoteAt(event) {
  if (editor.mode !== 'note' || !editor.pages.length || event.target.closest('.pdf-note')) return;
  if (editor.selectedNoteId) {
    editor.selectedNoteId = null;
    renderAnnotations();
    return;
  }
  const layer = document.getElementById('annotation-layer');
  const rect = layer.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  event.preventDefault(); event.stopPropagation();
  recordHistory();
  const note = {
    id:`note-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    x:Math.max(0,Math.min(.97,(event.clientX-rect.left)/rect.width)),
    y:Math.max(0,Math.min(.97,(event.clientY-rect.top)/rect.height)),
    text:''
  };
  getPageNotes(editor.pages[editor.selectedIndex].sourceIndex).push(note);
  editor.selectedNoteId = note.id;
  renderAnnotations();
  requestAnimationFrame(() => document.querySelector(`[data-note-id="${note.id}"] textarea`)?.focus());
}

function renderAnnotations() {
  const layer = document.getElementById('annotation-layer');
  layer.innerHTML = '';
  if (!editor.pages.length || !editor.canvasMetrics) return;
  const pageState = editor.pages[editor.selectedIndex];
  const items = getPageAnnotations(pageState.sourceIndex);
  const metrics = editor.canvasMetrics;

  if (editor.watermark?.applied && editor.watermark.text && editor.watermark.size > 0 && editor.watermark.opacity > 0) {
    const watermark = document.createElement('div');
    watermark.className = 'watermark-preview';
    watermark.textContent = editor.watermark.text;
    watermark.style.color = editor.watermark.colour;
    watermark.style.opacity = String(editor.watermark.opacity / 100);
    const measured = Math.max(1, editor.watermark.text.length * .61);
    watermark.style.fontSize = `${metrics.width * (editor.watermark.size / 100) / measured}px`;
    const alignment = editor.watermark.align || 'center';
    const horizontal = alignment === 'left' ? 5 : alignment === 'right' ? 95 : 50;
    const translateX = alignment === 'left' ? 0 : alignment === 'right' ? -100 : -50;
    watermark.style.left = `${horizontal}%`;
    watermark.style.top = `${5 + Math.max(0, Math.min(100, editor.watermark.vertical ?? 50)) * .9}%`;
    watermark.style.transform = `translate(${translateX}%,-50%) rotate(${editor.watermark.angle}deg)`;
    layer.appendChild(watermark);
  }

  items.forEach(item => {
    const el = document.createElement('div');
    el.className = 'text-annotation' + (item.id === editor.selectedAnnotationId ? ' selected' : '');
    el.dataset.id = item.id;
    el.contentEditable = item.editing ? 'true' : 'false';
    el.spellcheck = false;
    el.textContent = item.text;
    el.style.left = `${item.x * metrics.width}px`;
    el.style.top = `${item.y * metrics.height}px`;
    el.style.width = `${item.w * metrics.width}px`;
    el.style.height = `${Math.max(28, item.h * metrics.height)}px`;
    const textInsetX = Number(item.textInsetX ?? (6 / Math.max(metrics.scale, .01)));
    const textInsetY = Number(item.textInsetY ?? (4 / Math.max(metrics.scale, .01)));
    el.style.paddingLeft = `${Math.max(0, textInsetX * metrics.scale - 1)}px`;
    el.style.paddingRight = `${Math.max(0, textInsetX * metrics.scale - 1)}px`;
    el.style.paddingTop = `${Math.max(0, textInsetY * metrics.scale - 1)}px`;
    el.style.paddingBottom = `${Math.max(0, textInsetY * metrics.scale - 1)}px`;
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
    el.style.transform = `rotate(${Number(item.rotation || 0)}deg)`;

    const resizeHandles = ['nw','ne','sw','se'].map(direction => {
      const handle = document.createElement('span');
      handle.className = `resize-handle resize-${direction}`;
      handle.dataset.resize = direction;
      handle.contentEditable = 'false';
      return handle;
    });
    const rotateHandle = document.createElement('span');
    rotateHandle.className = 'rotate-handle';
    rotateHandle.contentEditable = 'false';
    el.append(...resizeHandles, rotateHandle);

    const fitHeightToText = () => {
      el.style.height = 'auto';
      const fittedHeight = Math.max(28, el.scrollHeight + 2);
      el.style.height = `${fittedHeight}px`;
      item.h = Math.min(1 - item.y, fittedHeight / metrics.height);
    };

    el.addEventListener('mousedown', event => {
      if (event.target.closest('.resize-handle,.rotate-handle')) return;
      event.stopPropagation();
      editor.selectedAnnotationId = item.id;
      editor.mode = 'select';
      document.getElementById('add-text-tool')?.classList.remove('active');
      document.getElementById('annotation-layer')?.classList.remove('text-mode');
      document.getElementById('annotation-layer')?.classList.add('select-mode');
      document.getElementById('text-options-bar').hidden = false;
      document.querySelectorAll('.text-annotation').forEach(node => node.classList.toggle('selected', node === el));
      syncTextInspector();
      if (event.detail > 1) return;
      if (el.isContentEditable && document.activeElement === el) return;
      startDragAnnotation(event, item, el);
    });
    el.addEventListener('dblclick', event => {
      event.preventDefault();
      event.stopPropagation();
      item.editing = true;
      el.contentEditable = 'true';
      requestAnimationFrame(() => {
        el.focus({preventScroll:true});
        const range = document.createRange();
        range.selectNodeContents(el);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      });
    });
    el.addEventListener('focus', () => { if (!el.dataset.historyRecorded) { recordHistory(); el.dataset.historyRecorded = '1'; } });
    el.addEventListener('input', () => {
      item.text = Array.from(el.childNodes).filter(node => !node.classList?.contains('resize-handle') && !node.classList?.contains('rotate-handle')).map(node => node.textContent).join('');
      fitHeightToText();
    });
    el.addEventListener('blur', () => {
      delete el.dataset.historyRecorded;
      item.text = el.innerText.replace(/\n+$/,'');
      item.editing = false;
      el.contentEditable = 'false';
      fitHeightToText();
    });
    resizeHandles.forEach(handle => handle.addEventListener('mousedown', event => {
      event.stopPropagation();
      selectAnnotation(item.id);
      startResizeAnnotation(event, item, handle.dataset.resize);
    }));
    rotateHandle.addEventListener('mousedown', event => {
      selectAnnotation(item.id);
      startRotateAnnotation(event, item);
    });
    layer.appendChild(el);
    if (item.editing) fitHeightToText();
  });
  renderSavedTextHighlights(layer, metrics);
  renderExistingTextBoxes(layer, metrics);
  renderEditCreatedTextBoxes(layer, metrics);
  renderSignatures(layer, metrics);
  renderLinks(layer, metrics);
  renderShapes(layer, metrics);
  renderNotes(layer, metrics);
  attachDrawingCanvas(layer);
  renderTextHighlightInteraction(layer, metrics);
  renderCropSelection(layer, metrics);
  syncTextInspector();
  syncEditTextToolbar();
}

function getCurrentAppliedCrop() {
  if (!editor.pages.length) return null;
  return editor.crops[String(editor.pages[editor.selectedIndex].sourceIndex)] || null;
}
function syncCropDimensions(rect) {
  const values = {
    'crop-left-value': rect ? `${Math.round(rect.x * 100)}%` : '—',
    'crop-top-value': rect ? `${Math.round(rect.y * 100)}%` : '—',
    'crop-width-value': rect ? `${Math.round(rect.w * 100)}%` : '—',
    'crop-height-value': rect ? `${Math.round(rect.h * 100)}%` : '—'
  };
  Object.entries(values).forEach(([id,value]) => { const output=document.getElementById(id); if(output) output.textContent=value; });
  const apply = document.getElementById('crop-apply');
  if (apply) apply.disabled = !editor.cropDraft;
}
function renderCropSelection(layer, metrics) {
  if (editor.mode !== 'crop') return;
  if (metrics.appliedCrop && !editor.cropDraft) {
    syncCropDimensions(metrics.appliedCrop);
    return;
  }
  const rect = editor.cropDraft || getCurrentAppliedCrop();
  syncCropDimensions(rect);
  if (!rect) return;
  const x=rect.x*metrics.width,y=rect.y*metrics.height,w=rect.w*metrics.width,h=rect.h*metrics.height;
  const shades = [
    {left:0,top:0,width:metrics.width,height:y},
    {left:0,top:y,width:x,height:h},
    {left:x+w,top:y,width:Math.max(0,metrics.width-x-w),height:h},
    {left:0,top:y+h,width:metrics.width,height:Math.max(0,metrics.height-y-h)}
  ];
  shades.forEach(bounds => { const shade=document.createElement('div'); shade.className='crop-shade'; Object.assign(shade.style,{left:`${bounds.left}px`,top:`${bounds.top}px`,width:`${bounds.width}px`,height:`${bounds.height}px`}); layer.appendChild(shade); });
  const selection=document.createElement('div');
  selection.className=`crop-selection${editor.cropDraft ? '' : ' applied'}`;
  Object.assign(selection.style,{left:`${x}px`,top:`${y}px`,width:`${w}px`,height:`${h}px`});
  layer.appendChild(selection);
}
function selectAnnotation(id) {
  editor.selectedAnnotationId = id;
  const textOptionsBar = document.getElementById('text-options-bar');
  if (textOptionsBar) textOptionsBar.hidden = !id;
  renderAnnotations();
}
function deselectAnnotation() {
  editor.selectedAnnotationId = null;
  const textOptionsBar = document.getElementById('text-options-bar');
  if (textOptionsBar && editor.mode !== 'text') textOptionsBar.hidden = true;
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
function startResizeAnnotation(event, item, direction = 'se') {
  event.preventDefault();
  recordHistory();
  const metrics = editor.canvasMetrics;
  const startX = event.clientX, startY = event.clientY;
  const startLeft = item.x, startTop = item.y;
  const startW = item.w, startH = item.h;
  const move = e => {
    const dx = (e.clientX-startX)/metrics.width;
    const dy = (e.clientY-startY)/metrics.height;
    if (direction.includes('e')) item.w = Math.max(.06, Math.min(1-item.x, startW + dx));
    if (direction.includes('s')) item.h = Math.max(.035, Math.min(1-item.y, startH + dy));
    if (direction.includes('w')) {
      const nextX = Math.max(0, Math.min(startLeft + startW - .06, startLeft + dx));
      item.x = nextX;
      item.w = startW + startLeft - nextX;
    }
    if (direction.includes('n')) {
      const nextY = Math.max(0, Math.min(startTop + startH - .035, startTop + dy));
      item.y = nextY;
      item.h = startH + startTop - nextY;
    }
    renderAnnotations();
  };
  const up = () => {
    window.removeEventListener('mousemove', move);
    window.removeEventListener('mouseup', up);
  };
  window.addEventListener('mousemove', move);
  window.addEventListener('mouseup', up);
}
function startRotateAnnotation(event, item) {
  event.preventDefault();
  event.stopPropagation();
  recordHistory();
  const metrics = editor.canvasMetrics;
  const layerRect = document.getElementById('annotation-layer').getBoundingClientRect();
  const centreX = layerRect.left + (item.x + item.w / 2) * metrics.width;
  const centreY = layerRect.top + (item.y + item.h / 2) * metrics.height;
  const move = e => {
    item.rotation = Math.atan2(e.clientY - centreY, e.clientX - centreX) * 180 / Math.PI - 90;
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
    x, y, w: .18, h: Math.min(1 - y, 28 / rect.height),
    textInsetX: 6 / Math.max(editor.canvasMetrics?.scale || 1, .01),
    textInsetY: 4 / Math.max(editor.canvasMetrics?.scale || 1, .01),
    size: 18,
    font: 'Helvetica',
    color: '#111827',
    fillColor: 'transparent',
    opacity: 1,
    bold: false,
    italic: false,
    align: 'left',
    rotation: 0,
    editing: true
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
  const colourCircle = document.getElementById('font-colour-circle');
  if (colourCircle) colourCircle.style.background = item.color || '#111827';
  document.querySelectorAll('[data-font-colour]').forEach(button => {
    button.classList.toggle('selected', button.dataset.fontColour.toLowerCase() === (item.color || '#111827').toLowerCase());
  });

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
  const appliedCrop = editor.crops[String(pageState.sourceIndex)] || null;
  if (appliedCrop) {
    const fullCanvas = document.createElement('canvas');
    fullCanvas.width = Math.floor(viewport.width);
    fullCanvas.height = Math.floor(viewport.height);
    await page.render({canvasContext: fullCanvas.getContext('2d'), viewport}).promise;
    if (token !== editor.renderToken) return;
    const sourceX = Math.round(appliedCrop.x * fullCanvas.width);
    const sourceY = Math.round(appliedCrop.y * fullCanvas.height);
    const sourceWidth = Math.max(1, Math.round(appliedCrop.w * fullCanvas.width));
    const sourceHeight = Math.max(1, Math.round(appliedCrop.h * fullCanvas.height));
    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    canvas.getContext('2d').drawImage(fullCanvas, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, sourceWidth, sourceHeight);
  } else {
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
  }
  canvas.hidden = false;
  placeholder.hidden = true;
  const layer = document.getElementById('annotation-layer');
  layer.style.width = `${canvas.width}px`;
  layer.style.height = `${canvas.height}px`;
  editor.canvasMetrics = {
    width: canvas.width,
    height: canvas.height,
    scale: viewport.scale,
    rotation: pageState.rotation,
    originalWidth: baseViewport.width,
    originalHeight: baseViewport.height,
    appliedCrop
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
      const crop = editor.crops[String(state.sourceIndex)];
      if (crop) {
        const fullCanvas=document.createElement('canvas');
        fullCanvas.width=Math.floor(viewport.width); fullCanvas.height=Math.floor(viewport.height);
        await page.render({canvasContext:fullCanvas.getContext('2d'),viewport}).promise;
        const sx=Math.round(crop.x*fullCanvas.width),sy=Math.round(crop.y*fullCanvas.height);
        const sw=Math.max(1,Math.round(crop.w*fullCanvas.width)),sh=Math.max(1,Math.round(crop.h*fullCanvas.height));
        thumbCanvas.width=sw; thumbCanvas.height=sh;
        thumbCanvas.getContext('2d').drawImage(fullCanvas,sx,sy,sw,sh,0,0,sw,sh);
      } else {
        thumbCanvas.width = Math.floor(viewport.width);
        thumbCanvas.height = Math.floor(viewport.height);
        await page.render({canvasContext: thumbCanvas.getContext('2d'), viewport}).promise;
      }
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
             editor.selectedAnnotationId &&
             !event.target.matches('input,textarea,[contenteditable="true"]')) {
    event.preventDefault();
    recordHistory();
    const sourceIndex = editor.pages[editor.selectedIndex].sourceIndex;
    editor.annotations[String(sourceIndex)] =
      getPageAnnotations(sourceIndex).filter(item => item.id !== editor.selectedAnnotationId);
    editor.selectedAnnotationId = null;
    renderAnnotations();
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
document.getElementById('note-tool')?.addEventListener('click', () => {
  editor.selectedNoteId = null;
  setEditorMode('note');
  renderAnnotations();
  showEditorHint('Click anywhere on the PDF to place a note.');
});

document.getElementById('edit-text-tool').addEventListener('click', () => setEditorMode('edit-existing'));

function ensureWatermarkUi() {
  if (!document.getElementById('watermark-tool')) {
    const editTool = document.getElementById('edit-text-tool');
    if (editTool) {
      const tool = document.createElement('button');
      tool.className = 'ribbon-tool'; tool.id = 'watermark-tool'; tool.type = 'button';
      tool.innerHTML = '<span class="tool-icon watermark-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 19 9.2 5h2.2l3.1 8.5L17.7 5H20l-5.1 14h-2.2L10 11.5 7.2 19z"/><path d="M3 21h18"/></svg></span><span class="tool-label">Watermark</span>';
      editTool.after(tool);
    }
  }
  if (!document.getElementById('watermark-options-bar')) {
    const drawBar = document.getElementById('draw-options-bar');
    if (drawBar) {
      const bar = document.createElement('div');
      bar.className = 'watermark-options-bar'; bar.id = 'watermark-options-bar'; bar.hidden = true; bar.setAttribute('aria-label','Watermark options');
      bar.innerHTML = `<label class="watermark-control watermark-text-control"><span>Text</span><input id="watermark-text" type="text" value="HELLO WORLD!" maxlength="160"></label><label class="watermark-control watermark-range-control"><span>Size</span><input id="watermark-size" type="range" min="0" max="100" value="100"><output id="watermark-size-value">100%</output></label><label class="watermark-control watermark-range-control"><span>Opacity</span><input id="watermark-opacity" type="range" min="0" max="100" value="50"><output id="watermark-opacity-value">50%</output></label><div class="watermark-colour-control"><span>Colour</span><div class="watermark-swatches" role="group" aria-label="Watermark colour">${[['#ef4444','Red'],['#f97316','Orange'],['#eab308','Yellow'],['#22c55e','Green'],['#3b82f6','Blue'],['#ec4899','Pink'],['#111827','Black']].map(([colour,label]) => `<button type="button" class="watermark-swatch${label === 'Red' ? ' active' : ''}" data-watermark-colour="${colour}" style="--watermark-colour:${colour}" aria-label="${label}"></button>`).join('')}</div></div><label class="watermark-control watermark-custom-control"><span>Custom RGB</span><input id="watermark-custom-colour" type="color" value="#ef4444" aria-label="Custom watermark colour"></label><div class="watermark-control watermark-align-control"><span>Align</span><div class="watermark-align-buttons" role="group" aria-label="Horizontal position"><button type="button" data-watermark-align="left" title="Align left">≡</button><button type="button" class="active" data-watermark-align="center" title="Align centre">≡</button><button type="button" data-watermark-align="right" title="Align right">≡</button></div></div><label class="watermark-control watermark-vertical-control"><span>Height</span><input id="watermark-vertical" type="range" min="0" max="100" value="50" aria-label="Vertical position"><div class="watermark-height-labels"><small>Top</small><small>Bottom</small></div></label><div class="watermark-control watermark-angle-control"><span>Angle</span><div class="watermark-angle-dial" id="watermark-angle-dial" role="slider" tabindex="0" aria-label="Watermark angle" aria-valuemin="-180" aria-valuemax="180" aria-valuenow="-45"><i id="watermark-angle-knob"></i></div><output id="watermark-angle-value">-45°</output></div><button class="watermark-done" id="watermark-done" type="button">Done</button>`;
      drawBar.before(bar);
    }
  }
}
ensureWatermarkUi();

function ensureCropUi() {
  if (!document.getElementById('crop-tool')) {
    const watermarkTool = document.getElementById('watermark-tool');
    if (watermarkTool) {
      const tool=document.createElement('button'); tool.className='ribbon-tool'; tool.id='crop-tool'; tool.type='button';
      tool.innerHTML='<span class="tool-icon crop-tool-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 2v15a2 2 0 0 0 2 2h13"/><path d="M2 7h15a2 2 0 0 1 2 2v13"/></svg></span><span class="tool-label">Crop</span>';
      watermarkTool.after(tool);
    }
  }
  if (!document.getElementById('crop-options-bar')) {
    const drawBar=document.getElementById('draw-options-bar');
    if (drawBar) {
      const bar=document.createElement('div'); bar.className='crop-options-bar'; bar.id='crop-options-bar'; bar.hidden=true; bar.setAttribute('aria-label','Crop options');
      bar.innerHTML='<div class="crop-scope-control"><span>Pages to crop</span><div class="crop-scope-choices"><label><input type="radio" name="crop-scope" value="current" checked> Current page</label><label><input type="radio" name="crop-scope" value="all"> All pages</label><label><input type="radio" name="crop-scope" value="specific"> Specific page</label><input id="crop-specific-page" type="number" min="1" value="1" disabled aria-label="Specific page number"></div></div><div class="crop-instructions"><strong>Drag to select</strong><small>Press and hold on the page, then drag around the area to keep.</small></div><div class="crop-dimensions"><span>Crop dimensions</span><div><label>Left <output id="crop-left-value">—</output></label><label>Top <output id="crop-top-value">—</output></label><label>Width <output id="crop-width-value">—</output></label><label>Height <output id="crop-height-value">—</output></label></div></div><button class="crop-action secondary" id="crop-cancel" type="button">Cancel</button><button class="crop-action primary" id="crop-apply" type="button" disabled>Apply crop</button>';
      drawBar.before(bar);
    }
  }
}
ensureCropUi();

function syncWatermarkControls() {
  const state = editor.watermark;
  document.getElementById('watermark-text').value = state.text;
  document.getElementById('watermark-size').value = state.size;
  document.getElementById('watermark-size-value').textContent = `${state.size}%`;
  document.getElementById('watermark-opacity').value = state.opacity;
  document.getElementById('watermark-opacity-value').textContent = `${state.opacity}%`;
  document.getElementById('watermark-vertical').value = state.vertical ?? 50;
  document.querySelectorAll('[data-watermark-align]').forEach(button => button.classList.toggle('active', button.dataset.watermarkAlign === (state.align || 'center')));
  syncWatermarkAngleDial();
  document.getElementById('watermark-custom-colour').value = state.colour;
  document.querySelectorAll('[data-watermark-colour]').forEach(button => button.classList.toggle('active', button.dataset.watermarkColour.toLowerCase() === state.colour.toLowerCase()));
}
function updateWatermark(property, value) {
  editor.watermark.applied = true;
  editor.watermark[property] = value;
  renderAnnotations();
}
document.getElementById('watermark-tool')?.addEventListener('click', () => {
  if (!editor.watermark.applied) {
    recordHistory();
    editor.watermark.applied = true;
  }
  syncWatermarkControls();
  setEditorMode('watermark');
});
document.getElementById('watermark-text')?.addEventListener('input', event => updateWatermark('text', event.target.value));
document.getElementById('watermark-size')?.addEventListener('input', event => {
  const value = Math.max(0, Math.min(100, Number(event.target.value)));
  document.getElementById('watermark-size-value').textContent = `${value}%`;
  updateWatermark('size', value);
});
document.getElementById('watermark-opacity')?.addEventListener('input', event => {
  const value = Math.max(0, Math.min(100, Number(event.target.value)));
  document.getElementById('watermark-opacity-value').textContent = `${value}%`;
  updateWatermark('opacity', value);
});
document.querySelectorAll('[data-watermark-colour]').forEach(button => button.addEventListener('click', () => {
  const colour = button.dataset.watermarkColour;
  document.getElementById('watermark-custom-colour').value = colour;
  document.querySelectorAll('[data-watermark-colour]').forEach(item => item.classList.toggle('active', item === button));
  updateWatermark('colour', colour);
}));
document.getElementById('watermark-custom-colour')?.addEventListener('input', event => {
  document.querySelectorAll('[data-watermark-colour]').forEach(item => item.classList.remove('active'));
  updateWatermark('colour', event.target.value);
});
document.querySelectorAll('[data-watermark-align]').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('[data-watermark-align]').forEach(item => item.classList.toggle('active', item === button));
  updateWatermark('align', button.dataset.watermarkAlign);
}));
document.getElementById('watermark-vertical')?.addEventListener('input', event => updateWatermark('vertical', Math.max(0, Math.min(100, Number(event.target.value)))));

function normaliseWatermarkAngle(value) {
  let angle = Math.round(value);
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
}
function syncWatermarkAngleDial() {
  const angle = normaliseWatermarkAngle(editor.watermark.angle || 0);
  const dial = document.getElementById('watermark-angle-dial');
  const knob = document.getElementById('watermark-angle-knob');
  const output = document.getElementById('watermark-angle-value');
  if (knob) {
    const radians = (angle - 90) * Math.PI / 180;
    knob.style.transform = `translate(${Math.cos(radians) * 15}px,${Math.sin(radians) * 15}px)`;
  }
  if (output) output.textContent = `${angle}°`;
  if (dial) dial.setAttribute('aria-valuenow', String(angle));
}
function setWatermarkAngleFromPointer(event) {
  const dial = document.getElementById('watermark-angle-dial');
  const rect = dial.getBoundingClientRect();
  const dx = event.clientX - (rect.left + rect.width / 2);
  const dy = event.clientY - (rect.top + rect.height / 2);
  updateWatermark('angle', normaliseWatermarkAngle(Math.atan2(dy, dx) * 180 / Math.PI + 90));
  syncWatermarkAngleDial();
}
document.getElementById('watermark-angle-dial')?.addEventListener('pointerdown', event => {
  event.preventDefault();
  const dial = event.currentTarget;
  dial.setPointerCapture(event.pointerId);
  setWatermarkAngleFromPointer(event);
});
document.getElementById('watermark-angle-dial')?.addEventListener('pointermove', event => {
  if (event.currentTarget.hasPointerCapture(event.pointerId)) setWatermarkAngleFromPointer(event);
});
document.getElementById('watermark-angle-dial')?.addEventListener('keydown', event => {
  if (!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)) return;
  event.preventDefault();
  const step = event.shiftKey ? 15 : 1;
  const direction = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -1 : 1;
  updateWatermark('angle', normaliseWatermarkAngle((editor.watermark.angle || 0) + direction * step));
  syncWatermarkAngleDial();
});
document.getElementById('watermark-done')?.addEventListener('click', () => {
  setEditorMode('select');
  openFormatModal();
});

let managerSelection = new Set();
let managerZoom = 1;
let managerSessionSnapshot = null;
const managerHistory = {undo:[],redo:[]};
function managerStateSnapshot(){return {pages:JSON.parse(JSON.stringify(editor.pages)),splitPoints:[...(editor.splitPoints||[])],splitApplied:Boolean(editor.splitApplied)}}
function restoreManagerState(state){editor.pages=JSON.parse(JSON.stringify(state.pages));editor.splitPoints=[...(state.splitPoints||[])];editor.splitApplied=Boolean(state.splitApplied);managerSelection.clear();renderManagerWorkspace()}
function recordManagerHistory(){managerHistory.undo.push(managerStateSnapshot());if(managerHistory.undo.length>40)managerHistory.undo.shift();managerHistory.redo=[]}
function updateManagerButtons(){
  const selected=managerSelection.size;
  ['manager-delete','manager-duplicate','manager-rotate-left','manager-rotate-right','manager-move-left','manager-move-right'].forEach(id=>{const button=document.getElementById(id);if(button)button.disabled=!selected});
  const undo=document.getElementById('manager-undo'),redo=document.getElementById('manager-redo');if(undo)undo.disabled=!managerHistory.undo.length;if(redo)redo.disabled=!managerHistory.redo.length;
  const count=document.getElementById('manager-selection-count');if(count)count.textContent=`${selected} selected`;
  const summary=document.getElementById('manager-split-summary');const splits=(editor.splitPoints||[]).length;if(summary)summary.textContent=splits?`${splits+1} split files`:'No split points';
}
function managerActionName(){return new URLSearchParams(window.location.search).get('action')||'manage'}
function openManagerWorkspace(){
  if(!managerSessionSnapshot){managerSessionSnapshot=managerStateSnapshot();managerHistory.undo=[];managerHistory.redo=[];managerSelection.clear()}
  const action=managerActionName();const title=document.getElementById('manager-title'),instructions=document.getElementById('manager-instructions');
  if(title)title.textContent=action==='rotate'?'Rotate PDF pages':action==='delete'?'Delete PDF pages':action==='split'?'Split and organise pages':'Manage pages';
  if(instructions)instructions.textContent=action==='split'?'Click the scissors between pages to create separate files. Drag pages to reorder.':'Click any page to select it, then choose an action above. Drag pages to reorder.';
  renderManagerWorkspace();
}
function normaliseManagerSplitPoints(){editor.splitPoints=Array.from(new Set(editor.splitPoints||[])).map(Number).filter(point=>Number.isInteger(point)&&point>0&&point<editor.pages.length).sort((a,b)=>a-b)}
async function renderManagerWorkspace(){
  const grid=document.getElementById('manager-page-grid');if(!grid||!editor.pdfjs)return;normaliseManagerSplitPoints();grid.style.setProperty('--manager-zoom',String(managerZoom));grid.innerHTML='';
  for(let index=0;index<editor.pages.length;index++){
    const state=editor.pages[index];const unit=document.createElement('div');unit.className='manager-page-unit';
    const card=document.createElement('article');card.className=`manager-page-card${managerSelection.has(index)?' selected':''}`;card.draggable=true;card.dataset.managerIndex=String(index);card.innerHTML=`<div class="manager-page-paper"><canvas></canvas><span class="manager-drag-handle">⋮⋮</span><span class="manager-selected-check">✓</span></div><strong>${index+1}</strong>`;unit.appendChild(card);
    card.addEventListener('click',()=>{managerSelection.has(index)?managerSelection.delete(index):managerSelection.add(index);renderManagerWorkspace()});
    card.addEventListener('dragstart',event=>{if(!managerSelection.has(index)){managerSelection.clear();managerSelection.add(index)}card.classList.add('dragging');event.dataTransfer.setData('text/plain',String(index));event.dataTransfer.effectAllowed='move'});
    card.addEventListener('dragover',event=>{event.preventDefault();card.classList.add('drop-target')});card.addEventListener('dragleave',()=>card.classList.remove('drop-target'));
    card.addEventListener('drop',event=>{event.preventDefault();const to=Number(card.dataset.managerIndex);const selected=Array.from(managerSelection).sort((a,b)=>a-b);if(!selected.length||selected.includes(to))return;recordManagerHistory();const moving=selected.map(i=>editor.pages[i]);editor.pages=editor.pages.filter((_,i)=>!managerSelection.has(i));const removedBefore=selected.filter(i=>i<to).length;const insertAt=Math.max(0,Math.min(editor.pages.length,to-removedBefore));editor.pages.splice(insertAt,0,...moving);managerSelection=new Set(moving.map((_,i)=>insertAt+i));editor.splitApplied=false;renderManagerWorkspace()});
    try{const page=await editor.pdfjs.getPage(state.sourceIndex+1);const base=page.getViewport({scale:1,rotation:state.rotation});const viewport=page.getViewport({scale:190/base.width,rotation:state.rotation});const canvas=card.querySelector('canvas');canvas.width=Math.floor(viewport.width);canvas.height=Math.floor(viewport.height);await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise}catch(_){}
    if(index<editor.pages.length-1){const marker=document.createElement('button');const point=index+1,active=editor.splitPoints.includes(point);marker.type='button';marker.className=`manager-split-marker${active?' active':''}`;marker.setAttribute('aria-label',active?`Remove split after page ${point}`:`Split after page ${point}`);marker.innerHTML='<span>✂</span><small>Split</small>';marker.addEventListener('click',event=>{event.stopPropagation();recordManagerHistory();editor.splitPoints=active?editor.splitPoints.filter(item=>item!==point):[...editor.splitPoints,point];editor.splitApplied=false;renderManagerWorkspace()});unit.appendChild(marker)}
    grid.appendChild(unit)
  }
  updateManagerButtons()
}
function selectedManagerIndices(){return Array.from(managerSelection).sort((a,b)=>a-b)}
function managerRotate(delta){if(!managerSelection.size)return;recordManagerHistory();selectedManagerIndices().forEach(index=>editor.pages[index].rotation=(editor.pages[index].rotation+delta+360)%360);renderManagerWorkspace()}
function managerDelete(){if(!managerSelection.size)return;if(editor.pages.length-managerSelection.size<1)return showAlert('A PDF must contain at least one page.');recordManagerHistory();editor.pages=editor.pages.filter((_,index)=>!managerSelection.has(index));managerSelection.clear();editor.splitApplied=false;renderManagerWorkspace()}
function managerDuplicate(){if(!managerSelection.size)return;recordManagerHistory();const selected=selectedManagerIndices();let offset=0;selected.forEach(index=>{editor.pages.splice(index+1+offset,0,JSON.parse(JSON.stringify(editor.pages[index+offset])));offset++});managerSelection.clear();editor.splitApplied=false;renderManagerWorkspace()}
function managerMove(direction){const selected=selectedManagerIndices();if(!selected.length)return;const edge=direction<0?selected[0]:selected[selected.length-1];if((direction<0&&edge===0)||(direction>0&&edge===editor.pages.length-1))return;recordManagerHistory();const swap=direction<0?selected:[...selected].reverse();swap.forEach(index=>{const other=index+direction;[editor.pages[index],editor.pages[other]]=[editor.pages[other],editor.pages[index]]});managerSelection=new Set(selected.map(index=>index+direction));editor.splitApplied=false;renderManagerWorkspace()}
document.getElementById('manage-tool')?.addEventListener('click',()=>setEditorMode('manage'));
document.getElementById('manager-delete')?.addEventListener('click',managerDelete);document.getElementById('manager-duplicate')?.addEventListener('click',managerDuplicate);document.getElementById('manager-rotate-left')?.addEventListener('click',()=>managerRotate(-90));document.getElementById('manager-rotate-right')?.addEventListener('click',()=>managerRotate(90));document.getElementById('manager-move-left')?.addEventListener('click',()=>managerMove(-1));document.getElementById('manager-move-right')?.addEventListener('click',()=>managerMove(1));
document.getElementById('manager-select-all')?.addEventListener('click',()=>{managerSelection=new Set(editor.pages.map((_,index)=>index));renderManagerWorkspace()});document.getElementById('manager-select-none')?.addEventListener('click',()=>{managerSelection.clear();renderManagerWorkspace()});
document.getElementById('manager-zoom-out')?.addEventListener('click',()=>{managerZoom=Math.max(.7,managerZoom-.1);renderManagerWorkspace()});document.getElementById('manager-zoom-in')?.addEventListener('click',()=>{managerZoom=Math.min(1.5,managerZoom+.1);renderManagerWorkspace()});
document.getElementById('manager-undo')?.addEventListener('click',()=>{if(!managerHistory.undo.length)return;managerHistory.redo.push(managerStateSnapshot());restoreManagerState(managerHistory.undo.pop())});document.getElementById('manager-redo')?.addEventListener('click',()=>{if(!managerHistory.redo.length)return;managerHistory.undo.push(managerStateSnapshot());restoreManagerState(managerHistory.redo.pop())});
document.getElementById('manager-cancel')?.addEventListener('click',()=>{if(managerSessionSnapshot)restoreManagerState(managerSessionSnapshot);managerSessionSnapshot=null;setEditorMode('select')});
document.getElementById('manager-apply')?.addEventListener('click',async()=>{normaliseManagerSplitPoints();editor.splitApplied=editor.splitPoints.length>0;managerSessionSnapshot=null;managerSelection.clear();editor.selectedIndex=Math.min(editor.selectedIndex,Math.max(0,editor.pages.length-1));await renderThumbnails();await renderSelectedPage();setEditorMode('select');showAlert(`Page changes applied${editor.splitApplied?`. ${editor.splitPoints.length+1} split PDFs will be created on PDF export.`:'.'}`)});

let selectedSplitPage = 0;
function normaliseSplitPoints() {
  editor.splitPoints = Array.from(new Set(editor.splitPoints || []))
    .map(Number)
    .filter(point => Number.isInteger(point) && point > 0 && point < editor.pages.length)
    .sort((a, b) => a - b);
}
function updateSplitSummary() {
  normaliseSplitPoints();
  const count = editor.splitPoints.length;
  const sectionCount = document.getElementById('split-section-count');
  const pointCount = document.getElementById('split-point-count');
  const apply = document.getElementById('split-apply');
  if (sectionCount) sectionCount.textContent = `${count + 1} output file${count ? 's' : ''}`;
  if (pointCount) pointCount.textContent = count ? `${count} split point${count === 1 ? '' : 's'} selected` : 'No split points selected';
  if (apply) apply.disabled = count === 0;
}
async function renderSplitWorkspace() {
  const grid = document.getElementById('split-page-grid');
  if (!grid || !editor.pdfjs) return;
  normaliseSplitPoints();
  grid.innerHTML = '';
  for (let index = 0; index < editor.pages.length; index++) {
    const state = editor.pages[index];
    const card = document.createElement('article');
    card.className = `split-page-card${index === selectedSplitPage ? ' selected' : ''}`;
    card.draggable = true;
    card.dataset.splitIndex = String(index);
    card.innerHTML = `<div class="split-page-paper"><canvas></canvas><span class="split-drag-handle" aria-hidden="true">⋮⋮</span></div><strong>Page ${index + 1}</strong>`;
    grid.appendChild(card);
    card.addEventListener('click', () => {
      selectedSplitPage = index;
      grid.querySelectorAll('.split-page-card').forEach((item, itemIndex) => item.classList.toggle('selected', itemIndex === index));
    });
    card.addEventListener('dragstart', event => {
      card.classList.add('dragging');
      event.dataTransfer.setData('text/plain', String(index));
      event.dataTransfer.effectAllowed = 'move';
    });
    card.addEventListener('dragover', event => { event.preventDefault(); card.classList.add('drop-target'); });
    card.addEventListener('dragleave', () => card.classList.remove('drop-target'));
    card.addEventListener('dragend', () => grid.querySelectorAll('.split-page-card').forEach(item => item.classList.remove('dragging','drop-target')));
    card.addEventListener('drop', async event => {
      event.preventDefault();
      const from = Number(event.dataTransfer.getData('text/plain'));
      const to = Number(card.dataset.splitIndex);
      if (!Number.isInteger(from) || from === to) return;
      recordHistory();
      const [moved] = editor.pages.splice(from, 1);
      editor.pages.splice(to, 0, moved);
      selectedSplitPage = to;
      editor.splitApplied = false;
      await renderSplitWorkspace();
    });
    try {
      const page = await editor.pdfjs.getPage(state.sourceIndex + 1);
      const base = page.getViewport({scale:1,rotation:state.rotation});
      const viewport = page.getViewport({scale:180/base.width,rotation:state.rotation});
      const canvas = card.querySelector('canvas');
      canvas.width = Math.floor(viewport.width); canvas.height = Math.floor(viewport.height);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    } catch (_) {}
    if (index < editor.pages.length - 1) {
      const cut = document.createElement('button');
      const active = editor.splitPoints.includes(index + 1);
      cut.type = 'button';
      cut.className = `split-marker${active ? ' active' : ''}`;
      cut.dataset.splitPoint = String(index + 1);
      cut.setAttribute('aria-label', active ? `Remove split after page ${index + 1}` : `Split after page ${index + 1}`);
      cut.innerHTML = `<span>✂</span><small>${active ? 'Split here' : 'Add split'}</small>`;
      grid.appendChild(cut);
      cut.addEventListener('click', () => {
        const point = Number(cut.dataset.splitPoint);
        editor.splitPoints = editor.splitPoints.includes(point) ? editor.splitPoints.filter(item => item !== point) : [...editor.splitPoints, point];
        editor.splitApplied = false;
        renderSplitWorkspace();
      });
    }
  }
  updateSplitSummary();
}
document.getElementById('split-tool')?.addEventListener('click', () => setEditorMode('split'));
document.getElementById('split-reset')?.addEventListener('click', () => {
  editor.splitPoints = [];
  editor.splitApplied = false;
  renderSplitWorkspace();
});
document.getElementById('split-apply')?.addEventListener('click', () => {
  if (!editor.splitPoints.length) return;
  recordHistory();
  editor.splitApplied = true;
  const files = editor.splitPoints.length + 1;
  setEditorMode('select');
  showAlert(`Split applied. ${files} files will be created when you export as PDF.`);
});

document.getElementById('crop-tool')?.addEventListener('click', () => {
  editor.cropDraft = null;
  document.getElementById('crop-specific-page').max = Math.max(1, editor.pages.length);
  setEditorMode('crop');
});
document.querySelectorAll('input[name="crop-scope"]').forEach(input => input.addEventListener('change', event => {
  editor.cropScope = event.target.value;
  document.getElementById('crop-specific-page').disabled = editor.cropScope !== 'specific';
}));
document.getElementById('crop-cancel')?.addEventListener('click', () => {
  editor.cropDraft = null;
  setEditorMode('select');
});
document.getElementById('crop-apply')?.addEventListener('click', () => {
  if (!editor.cropDraft) return;
  const modal = document.getElementById('crop-confirm-modal');
  if (modal) modal.hidden = false;
});
function closeCropConfirmModal() {
  const modal = document.getElementById('crop-confirm-modal');
  if (modal) modal.hidden = true;
}
document.querySelectorAll('[data-close-crop-confirm]').forEach(button => button.addEventListener('click', closeCropConfirmModal));
document.getElementById('crop-confirm-ok')?.addEventListener('click', async () => {
  if (!editor.cropDraft) return closeCropConfirmModal();
  recordHistory();
  let crop = {...editor.cropDraft};
  const baseCrop = getCurrentAppliedCrop();
  if (baseCrop) {
    crop = {
      x:baseCrop.x + crop.x * baseCrop.w,
      y:baseCrop.y + crop.y * baseCrop.h,
      w:crop.w * baseCrop.w,
      h:crop.h * baseCrop.h
    };
  }
  if (editor.cropScope === 'all') {
    editor.pages.forEach(page => { editor.crops[String(page.sourceIndex)] = {...crop}; });
  } else if (editor.cropScope === 'specific') {
    const pageNumber = Math.max(1, Math.min(editor.pages.length, Number(document.getElementById('crop-specific-page').value) || 1));
    editor.crops[String(editor.pages[pageNumber - 1].sourceIndex)] = {...crop};
  } else {
    editor.crops[String(editor.pages[editor.selectedIndex].sourceIndex)] = {...crop};
  }
  editor.cropDraft = null;
  closeCropConfirmModal();
  await renderThumbnails();
  await renderSelectedPage();
  showEditorHint(editor.cropScope === 'all' ? 'Crop applied to all pages.' : 'Crop applied. Press Done when you are ready to export.');
});
document.getElementById('annotation-layer').addEventListener('pointerdown', event => {
  if (editor.mode !== 'crop' || event.button !== 0) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const layer = event.currentTarget;
  const bounds = layer.getBoundingClientRect();
  const startX = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
  const startY = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
  layer.setPointerCapture(event.pointerId);
  editor.cropDraft = {x:startX,y:startY,w:0,h:0};
  const move = moveEvent => {
    const currentX=Math.max(0,Math.min(1,(moveEvent.clientX-bounds.left)/bounds.width));
    const currentY=Math.max(0,Math.min(1,(moveEvent.clientY-bounds.top)/bounds.height));
    editor.cropDraft={x:Math.min(startX,currentX),y:Math.min(startY,currentY),w:Math.abs(currentX-startX),h:Math.abs(currentY-startY)};
    renderAnnotations();
  };
  const finish = finishEvent => {
    layer.removeEventListener('pointermove',move);
    layer.removeEventListener('pointerup',finish);
    layer.removeEventListener('pointercancel',finish);
    if (editor.cropDraft && (editor.cropDraft.w < .02 || editor.cropDraft.h < .02)) editor.cropDraft=null;
    renderAnnotations();
  };
  layer.addEventListener('pointermove',move);
  layer.addEventListener('pointerup',finish);
  layer.addEventListener('pointercancel',finish);
  renderAnnotations();
}, true);

document.getElementById('text-highlight-tool').addEventListener('click', () => {
  setEditorMode('text-highlight');
});
document.getElementById('link-tool').addEventListener('click',()=>{
  closeLinkSettings();editor.selectedLinkId=null;setEditorMode('link');
});
document.querySelectorAll('input[name="link-kind"]').forEach(input=>input.addEventListener('change',updateLinkSettingsRows));
document.getElementById('link-settings-cancel').addEventListener('click',()=>{
  const item=getSelectedLink();
  if(item&&!item.url&&item.kind==='website') removeLinkById(item.id);
  else closeLinkSettings();
});
document.getElementById('link-settings-save').addEventListener('click',()=>{
  const item=getSelectedLink();if(!item)return;
  const kind=document.querySelector('input[name="link-kind"]:checked')?.value||'website';
  if(kind==='website'){
    const url=normaliseWebsiteUrl(document.getElementById('link-website-value').value);
    if(!url){showAlert('Enter a website address.');return}
    recordHistory();item.kind='website';item.url=url;item.page=null;
  }else{
    const page=Math.max(1,Math.min(editor.pages.length,Number(document.getElementById('link-page-value').value)||1));
    recordHistory();item.kind='page';item.page=page;item.url='';
  }
  item.saved=true;
  editor.selectedLinkId=null;
  closeLinkSettings();
  renderAnnotations();
  showEditorHint(kind==='website'?'Website link added. Hover to preview, then click to open.':`Page ${item.page} link added. Click it to navigate.`);
});
document.getElementById('link-settings-popover').addEventListener('keydown',event=>{
  if(event.key==='Enter'&&event.target.tagName==='INPUT'){event.preventDefault();document.getElementById('link-settings-save').click()}
});


document.querySelectorAll('[data-highlight-colour]').forEach(button => {
  button.addEventListener('click', () => {
    editor.highlightColour = button.dataset.highlightColour;
    document.querySelectorAll('[data-highlight-colour]').forEach(item => {
      item.classList.toggle('active',item === button);
    });
  });
});
document.getElementById('annotation-layer').addEventListener('pointerdown', beginLinkDraw, true);

document.getElementById('annotation-layer').addEventListener('mousedown', event => {
  if (event.target !== event.currentTarget) return;
  if (editor.mode === 'text') {
    if (editor.selectedAnnotationId) {
      document.activeElement?.blur?.();
      editor.selectedAnnotationId = null;
      setEditorMode('select');
      document.getElementById('text-options-bar').hidden = true;
      return;
    }
    addTextAt(event.clientX, event.clientY);
  } else if (editor.mode === 'edit-existing') {
    if (editor.editTextBoxMode) {
      addEditTextBoxAt(event.clientX, event.clientY);
    } else {
      commitExistingTextEditing({render: false});
      deselectExistingText();
      editor.selectedEditCreatedTextId = null;
      document.querySelectorAll('.edit-created-text').forEach(el => el.classList.remove('selected'));
      renderAnnotations();
    }
  } else {
    if (editor.mode === 'link') return;
    editor.selectedSignatureId = null;
    editor.selectedShapeId = null;
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
  document.getElementById('font-colour-circle').style.background = e.target.value;
  updateSelectedText(item => item.color = e.target.value);
});
document.getElementById('text-color').addEventListener('change', recordHistory);
document.getElementById('font-colour-button')?.addEventListener('click', event => {
  event.stopPropagation();
  const menu = document.getElementById('font-colour-menu');
  menu.hidden = !menu.hidden;
  event.currentTarget.setAttribute('aria-expanded', String(!menu.hidden));
});
document.querySelectorAll('[data-font-colour]').forEach(button => button.addEventListener('click', event => {
  event.stopPropagation();
  recordHistory();
  const colour = button.dataset.fontColour;
  document.getElementById('text-color').value = colour;
  document.getElementById('font-colour-circle').style.background = colour;
  updateSelectedText(item => item.color = colour);
  document.getElementById('font-colour-menu').hidden = true;
  document.getElementById('font-colour-button').setAttribute('aria-expanded', 'false');
}));
document.getElementById('custom-font-colour')?.addEventListener('click', event => {
  event.stopPropagation();
  document.getElementById('text-color')?.click();
});
document.addEventListener('click', event => {
  if (event.target.closest('.font-colour-option')) return;
  const menu = document.getElementById('font-colour-menu');
  if (menu) menu.hidden = true;
  document.getElementById('font-colour-button')?.setAttribute('aria-expanded', 'false');
});
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
let pendingDashboardFileSave = Promise.resolve();
let pdfiumAuthenticatedCheckout = false;

function isDashboardEditorSession() {
  try {
    const params = new URLSearchParams(window.location.search);
    return pdfiumAuthenticatedCheckout || (
      Boolean(window.PDFMintAuth?.isSignedIn?.()) &&
      params.get('source') === 'dashboard'
    );
  } catch (_) {
    return false;
  }
}

async function hasUnlimitedPaidAccess() {
  try {
    const auth = window.PDFMintAuth;
    const user = await auth?.getUser?.();
    if (!user || !auth?.client) return false;
    const {data, error} = await auth.client
      .from('subscriptions')
      .select('plan_code,status,trial_ends_at')
      .eq('user_id', user.id)
      .in('status', ['trialing', 'active']);
    if (error) throw error;
    const now = Date.now();
    return (data || []).some(subscription => {
      if (subscription.plan_code === 'unlimited_trial' || subscription.plan_code === 'annual') return true;
      return subscription.plan_code === 'document_trial' &&
        subscription.status === 'active' &&
        (!subscription.trial_ends_at || Date.parse(subscription.trial_ends_at) <= now);
    });
  } catch (error) {
    console.warn('PDFBreeze could not verify membership access.', error);
    return false;
  }
}

function saveFileToDashboard(blob, filename) {
  if (!isDashboardEditorSession()) return Promise.resolve();
  if (window.PDFMintAuth?.saveDocument) {
    const params = new URLSearchParams(window.location.search);
    return window.PDFMintAuth.saveDocument(blob, filename, params.get('tool') || params.get('action') || 'editor')
      .catch(error => console.warn('PDFBreeze could not add the finished file to My Files.', error));
  }
  if (!window.indexedDB) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('pdfmint-dashboard-files', 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('files')) {
        request.result.createObjectStore('files', { keyPath: 'id' });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = async () => {
      const db = request.result;
      try {
        const bytes = await blob.arrayBuffer();
        const record = {
          id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
          name: filename,
          type: blob.type || 'application/octet-stream',
          size: blob.size,
          lastModified: Date.now(),
          bytes
        };
        const transaction = db.transaction('files', 'readwrite');
        transaction.objectStore('files').put(record);
        transaction.oncomplete = () => { db.close(); resolve(); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      } catch (error) {
        db.close();
        reject(error);
      }
    };
  }).catch(error => console.warn('PDFBreeze could not add the finished file to My Files.', error));
}

function openFormatModal() {
  if (!editor.pages.length) return;
  preparedExportBytes = null;
  const pdfChoice = document.querySelector('input[name="export-format"][value="pdf"]');
  if (pdfChoice) {
    pdfChoice.checked = true;
    pdfChoice.dispatchEvent(new Event('change', { bubbles: true }));
  }
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
  await ensurePdfLibraries('pdflib');
  const source = await PDFLib.PDFDocument.load(editor.originalBytes.slice());
  const output = await PDFLib.PDFDocument.create();
  const fontCache = {};
  const ruleCanvasCache = new Map();

  if (window.fontkit && typeof output.registerFontkit === 'function') {
    output.registerFontkit(window.fontkit);
  }

  async function createExistingTextPng(item, lines, width, height, fontSize, lineHeight, baselineOffset) {
    const exactEntry = item.exactFontKey && editor.embeddedFonts[item.exactFontKey];
    if (exactEntry?.face) await exactEntry.face.loaded;
    const pixelScale = 4;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width * pixelScale));
    canvas.height = Math.max(1, Math.ceil(height * pixelScale));
    const context = canvas.getContext('2d');
    context.scale(pixelScale, pixelScale);
    context.textBaseline = 'alphabetic';
    context.textAlign = 'left';
    context.fillStyle = item.color || '#000000';
    const fontFamily = exactEntry?.face ? `"${exactEntry.family}"` : 'Arial, Helvetica, sans-serif';
    context.font = `${item.italic ? 'italic ' : ''}${item.fontWeight || (item.bold ? 700 : 400)} ${fontSize}px ${fontFamily}`;

    lines.forEach((line, index) => {
      const measuredWidth = Math.max(.01, context.measureText(line).width);
      const requestedWidth = Number(item.lineWidths?.[index]);
      const originalScaleX = Number.isFinite(item.fontScaleX) ? item.fontScaleX : 1;
      const lineScaleX = Number.isFinite(requestedWidth) && requestedWidth > 0
        ? Math.min(originalScaleX, requestedWidth / measuredWidth)
        : originalScaleX;
      const lineOffset = Number.isFinite(Number(item.lineOffsets?.[index]))
        ? Number(item.lineOffsets[index])
        : 0;
      context.save();
      context.translate(lineOffset, baselineOffset + index * lineHeight);
      context.scale(lineScaleX, 1);
      context.fillText(line, 0, 0);
      context.restore();
    });

    return output.embedPng(canvas.toDataURL('image/png'));
  }

  async function createExistingTextMaskPng(item, width, height, fontSize, baselineOffset) {
    const exactEntry = item.exactFontKey && editor.embeddedFonts[item.exactFontKey];
    if (!exactEntry?.face) return null;
    await exactEntry.face.loaded;
    const pixelScale = 4;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil(width * pixelScale));
    canvas.height = Math.max(1, Math.ceil(height * pixelScale));
    const context = canvas.getContext('2d');
    context.scale(pixelScale, pixelScale);
    context.textBaseline = 'alphabetic';
    context.textAlign = 'left';
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#ffffff';
    context.lineWidth = .35;
    context.font = `${item.italic ? 'italic ' : ''}${item.fontWeight || (item.bold ? 700 : 400)} ${fontSize}px "${exactEntry.family}"`;
    const originalText = String(item.originalText || '');
    const measuredWidth = Math.max(.01, context.measureText(originalText).width);
    const originalScaleX = Number.isFinite(item.fontScaleX) ? item.fontScaleX : 1;
    const requestedWidth = Number(item.lineWidths?.[0]);
    const scaleX = Number.isFinite(requestedWidth) && requestedWidth > 0
      ? Math.min(originalScaleX, requestedWidth / measuredWidth)
      : originalScaleX;
    context.save();
    context.translate(0, baselineOffset);
    context.scale(scaleX, 1);
    context.strokeText(originalText, 0, 0);
    context.fillText(originalText, 0, 0);
    context.restore();
    return output.embedPng(canvas.toDataURL('image/png'));
  }

  async function getFont(item) {
    const exactEntry = item.exactFontKey && editor.embeddedFonts[item.exactFontKey];
    if (exactEntry?.data?.length && window.fontkit) {
      const exactKey = `exact:${item.exactFontKey}`;
      if (!fontCache[exactKey]) {
        fontCache[exactKey] = await output.embedFont(exactEntry.data, {subset: false});
      }
      return fontCache[exactKey];
    }

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

  async function restoreOriginalRules(page, item, pageWidth, pageHeight, sourceIndex) {
    let canvas = ruleCanvasCache.get(sourceIndex);
    if (!canvas) {
      const sourcePage = await editor.pdfjs.getPage(sourceIndex + 1);
      const viewport = sourcePage.getViewport({scale: 1});
      canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.ceil(viewport.width));
      canvas.height = Math.max(1, Math.ceil(viewport.height));
      await sourcePage.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
      ruleCanvasCache.set(sourceIndex, canvas);
    }
    const context = canvas.getContext('2d', {willReadFrequently: true});
    const x0 = Math.max(0, Math.floor(item.originalX * canvas.width));
    const x1 = Math.min(canvas.width - 1, Math.ceil((item.originalX + item.originalW) * canvas.width));
    const y0 = Math.max(0, Math.floor(item.originalY * canvas.height) - 2);
    const y1 = Math.min(canvas.height - 1, Math.ceil((item.originalY + item.originalH) * canvas.height) + 2);
    if (x1 <= x0 || y1 <= y0) return;
    const pixels = context.getImageData(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    const darkAt = (x, y) => {
      const offset = (y * pixels.width + x) * 4;
      return pixels.data[offset + 3] > 160 &&
        (pixels.data[offset] + pixels.data[offset + 1] + pixels.data[offset + 2]) / 3 < 105;
    };
    const horizontal = [];
    for (let y = 0; y < pixels.height; y++) {
      let dark = 0;
      for (let x = 0; x < pixels.width; x++) if (darkAt(x, y)) dark++;
      if (dark / pixels.width > .72) horizontal.push(y);
    }
    for (const row of horizontal) {
      const pdfY = pageHeight - ((y0 + row + .5) / canvas.height) * pageHeight;
      page.drawLine({
        start: {x: item.originalX * pageWidth, y: pdfY},
        end: {x: (item.originalX + item.originalW) * pageWidth, y: pdfY},
        thickness: Math.max(.35, pageHeight / canvas.height),
        color: PDFLib.rgb(0, 0, 0)
      });
    }
    const vertical = [];
    for (let x = 0; x < pixels.width; x++) {
      let dark = 0;
      for (let y = 0; y < pixels.height; y++) if (darkAt(x, y)) dark++;
      if (dark / pixels.height > .78) vertical.push(x);
    }
    for (const column of vertical) {
      const pdfX = ((x0 + column + .5) / canvas.width) * pageWidth;
      page.drawLine({
        start: {x: pdfX, y: pageHeight - (y1 / canvas.height) * pageHeight},
        end: {x: pdfX, y: pageHeight - (y0 / canvas.height) * pageHeight},
        thickness: Math.max(.35, pageWidth / canvas.width),
        color: PDFLib.rgb(0, 0, 0)
      });
    }
  }

  for (const state of editor.pages) {
    const [page] = await output.copyPages(source, [state.sourceIndex]);
    const originalRotation = page.getRotation().angle || 0;
    page.setRotation(PDFLib.degrees((originalRotation + state.rotation) % 360));
    output.addPage(page);

    const annotations = getPageAnnotations(state.sourceIndex);
    const existingEdits = getExistingTextItems(state.sourceIndex).filter(item => item.modified);
    const {width, height} = page.getSize();

    const crop = editor.crops[String(state.sourceIndex)];
    if (crop && crop.w > 0 && crop.h > 0) {
      page.setCropBox(
        crop.x * width,
        (1 - crop.y - crop.h) * height,
        crop.w * width,
        crop.h * height
      );
    }

    if (editor.watermark?.applied && editor.watermark.text && editor.watermark.size > 0 && editor.watermark.opacity > 0) {
      const watermarkFont = await getFont({font:'Helvetica', bold:true, italic:false});
      const text = String(editor.watermark.text);
      const unitWidth = Math.max(.001, watermarkFont.widthOfTextAtSize(text, 1));
      const fontSize = width * (editor.watermark.size / 100) / unitWidth;
      const textWidth = watermarkFont.widthOfTextAtSize(text, fontSize);
      const angle = -Number(editor.watermark.angle || 0);
      const radians = angle * Math.PI / 180;
      const cos = Math.cos(radians), sin = Math.sin(radians);
      const corners = [[0,0],[textWidth,0],[0,fontSize],[textWidth,fontSize]].map(([x,y]) => ({x:x*cos-y*sin,y:x*sin+y*cos}));
      const minX = Math.min(...corners.map(point => point.x));
      const maxX = Math.max(...corners.map(point => point.x));
      const minY = Math.min(...corners.map(point => point.y));
      const maxY = Math.max(...corners.map(point => point.y));
      const alignment = editor.watermark.align || 'center';
      const marginX = width * .05;
      const targetX = alignment === 'left' ? marginX : alignment === 'right' ? width - marginX : width / 2;
      const x = targetX - (alignment === 'left' ? minX : alignment === 'right' ? maxX : (minX + maxX) / 2);
      const boxHeight = maxY - minY;
      const marginY = height * .05;
      const vertical = Math.max(0, Math.min(100, editor.watermark.vertical ?? 50));
      const targetCentreY = marginY + boxHeight / 2 + (1 - vertical / 100) * Math.max(0, height - marginY * 2 - boxHeight);
      const y = targetCentreY - (minY + maxY) / 2;
      const colour = hexToRgb01(editor.watermark.colour || '#111827');
      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font: watermarkFont,
        color: PDFLib.rgb(colour.r, colour.g, colour.b),
        opacity: editor.watermark.opacity / 100,
        rotate: PDFLib.degrees(angle)
      });
    }

    for (const item of existingEdits) {
      const fontSize = item.pdfFontSize || 12;
      const targetWidth = Math.max(10, item.w * width);
      const lineHeight = item.lineHeight || fontSize * 1.15;
      const x = Math.max(0, item.x * width);
      const firstBaselineY = Number.isFinite(item.pdfY)
        ? item.pdfY
        : height - item.y * height - fontSize;
      const replacementTopY = height - item.y * height;

      const rawLines = String(item.text || '').split(/\r?\n/);
      const wrappedLines = [];

      const exactEntry = item.exactFontKey && editor.embeddedFonts[item.exactFontKey];
      const measurementCanvas = document.createElement('canvas');
      const measurementContext = measurementCanvas.getContext('2d');
      measurementContext.font = exactEntry?.face
        ? `${item.italic ? 'italic ' : ''}${item.fontWeight || (item.bold ? 700 : 400)} ${fontSize}px "${exactEntry.family}"`
        : `${fontSize}px Helvetica`;

      const fallbackFont = exactEntry?.face ? null : await getFont(item);

      for (const rawLine of rawLines) {
        if (exactEntry?.face) {
          // PDF.js has already reconstructed the document's visual line breaks.
          // Preserve them verbatim for embedded-font edits; re-wrapping with a
          // second metrics engine introduces different breaks and vertical drift.
          wrappedLines.push(rawLine);
          continue;
        }
        const words = rawLine.split(/\s+/);
        let current = '';

        for (const word of words) {
          const test = current ? `${current} ${word}` : word;
          const measuredWidth = exactEntry?.face
            ? measurementContext.measureText(test).width
            : fallbackFont.widthOfTextAtSize(test, fontSize);
          if (measuredWidth > targetWidth && current) {
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

      // Cover only the original PDF text run being changed. Every untouched
      // run remains part of the copied source page and is never reconstructed.
      const originalX = item.originalX * width;
      const originalTopY = height - item.originalY * height;
      const originalWidth = item.originalW * width;
      const originalHeight = item.originalH * height;

      // Erase the glyph band from the run's real PDF baseline, rather than the
      // whole PDF.js selection box. Selection boxes can extend onto adjacent
      // table rules; the glyph band cannot.
      const sourceFontSize = Math.max(1, Number(item.pdfFontSize) || originalHeight);
      const sourceBaselineY = Number.isFinite(Number(item.pdfY))
        ? Number(item.pdfY) * height
        : originalTopY - originalHeight * .78;
      const eraseBelowBaseline = Math.min(.85, Math.max(.2, sourceFontSize * .065));
      const eraseAboveBaseline = Math.min(
        originalHeight * .9,
        Math.max(sourceFontSize * .82, originalHeight * .68)
      );
      const maskHeight = sourceFontSize;
      const maskBaselineOffset = sourceFontSize * .82;
      const originalMask = await createExistingTextMaskPng(
        item,
        originalWidth,
        maskHeight,
        sourceFontSize,
        maskBaselineOffset
      );
      if (originalMask) {
        page.drawImage(originalMask, {
          x: Math.max(0, originalX),
          y: sourceBaselineY - maskHeight + maskBaselineOffset,
          width: Math.min(width - originalX, originalWidth),
          height: maskHeight
        });
      } else {
        page.drawRectangle({
          x: Math.max(0, originalX),
          y: Math.max(0, sourceBaselineY + .35),
          width: Math.min(width - originalX, originalWidth),
          height: Math.max(.1, eraseAboveBaseline - .35),
          color: PDFLib.rgb(1, 1, 1)
        });
      }

      // If the replacement wraps lower than the original paragraph, cover that
      // additional vertical area too.
      if (replacementHeight > originalHeight) {
        page.drawRectangle({
          x: Math.max(0, x - .75),
          y: Math.max(0, replacementTopY - replacementHeight - .75),
          width: Math.min(width - x + .75, targetWidth + 1.5),
          height: replacementHeight + 1.5,
          color: PDFLib.rgb(1, 1, 1)
        });
      }

      const baselineOffset = Math.max(0, replacementTopY - firstBaselineY);
      const rasterBaselineOffset = fontSize * .82;
      const rasterHeight = Math.max(
        fontSize,
        rasterBaselineOffset + Math.max(0, wrappedLines.length - 1) * lineHeight + fontSize * .12
      );
      const exactTextImage = await createExistingTextPng(
        item,
        wrappedLines,
        targetWidth,
        rasterHeight,
        fontSize,
        lineHeight,
        rasterBaselineOffset
      );
      if (exactTextImage) {
        page.drawImage(exactTextImage, {
          x,
          y: firstBaselineY - rasterHeight + rasterBaselineOffset,
          width: targetWidth,
          height: rasterHeight
        });
      } else {
        wrappedLines.forEach((line, lineIndex) => {
          page.drawText(line, {
            x,
            y: firstBaselineY - lineIndex * lineHeight,
            size: fontSize,
            font: fallbackFont,
            color: (() => {
              const c = hexToRgb01(item.color || '#000000');
              return PDFLib.rgb(c.r, c.g, c.b);
            })(),
            maxWidth: targetWidth
          });
        });
      }
      await restoreOriginalRules(page, item, width, height, state.sourceIndex);
    }

    const createdEditItems = getEditCreatedTextItems(state.sourceIndex);

    for (const item of createdEditItems) {
      const font = await getFont(item);
      const rgb = hexToRgb01(item.color || '#000000');
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

    const pageShapes = getPageShapes(state.sourceIndex);
    for (const shape of pageShapes) {
      const c=hexToRgb01(shape.stroke||'#111111'), fill=hexToRgb01(shape.fill||'#ffffff');
      const x1=shape.x1*width,y1=height-shape.y1*height,x2=shape.x2*width,y2=height-shape.y2*height;
      const x=Math.min(x1,x2), y=Math.min(y1,y2), w=Math.abs(x2-x1), h=Math.abs(y2-y1);
      if(shape.type==='line'||shape.type==='arrow'){
        page.drawLine({start:{x:x1,y:y1},end:{x:x2,y:y2},thickness:shape.thickness,color:PDFLib.rgb(c.r,c.g,c.b),opacity:shape.opacity});
        if(shape.type==='arrow'){
          const angle=Math.atan2(y2-y1,x2-x1),size=Math.max(8,shape.thickness*4),a1=angle+Math.PI*.82,a2=angle-Math.PI*.82;
          page.drawLine({start:{x:x2,y:y2},end:{x:x2+Math.cos(a1)*size,y:y2+Math.sin(a1)*size},thickness:shape.thickness,color:PDFLib.rgb(c.r,c.g,c.b),opacity:shape.opacity});
          page.drawLine({start:{x:x2,y:y2},end:{x:x2+Math.cos(a2)*size,y:y2+Math.sin(a2)*size},thickness:shape.thickness,color:PDFLib.rgb(c.r,c.g,c.b),opacity:shape.opacity});
        }
      } else if(shape.type==='box') page.drawRectangle({x,y,width:w,height:h,borderWidth:shape.thickness,borderColor:PDFLib.rgb(c.r,c.g,c.b),color:shape.fillEnabled?PDFLib.rgb(fill.r,fill.g,fill.b):undefined,opacity:shape.opacity,borderOpacity:shape.opacity});
      else page.drawEllipse({x:x+w/2,y:y+h/2,xScale:w/2,yScale:h/2,borderWidth:shape.thickness,borderColor:PDFLib.rgb(c.r,c.g,c.b),color:shape.fillEnabled?PDFLib.rgb(fill.r,fill.g,fill.b):undefined,opacity:shape.opacity,borderOpacity:shape.opacity});
    }

    const pageHighlights = getPageTextHighlights(state.sourceIndex);
    for (const highlight of pageHighlights) {
      const colour = hexToRgb01(highlight.colour || '#fff200');

      for (const rect of highlight.rects) {
        page.drawRectangle({
          x:rect.x * width,
          y:height - (rect.y + rect.h) * height,
          width:rect.w * width,
          height:rect.h * height,
          color:PDFLib.rgb(colour.r,colour.g,colour.b),
          opacity:.48
        });
      }
    }

    const drawingStrokes = getPageDrawings(state.sourceIndex);
    for (const stroke of drawingStrokes) {
      const c = hexToRgb01(stroke.colour || '#111111');
      for (let i=1;i<stroke.points.length;i++) {
        const a=stroke.points[i-1], b=stroke.points[i];
        page.drawLine({
          start:{x:a.x*width,y:height-a.y*height},
          end:{x:b.x*width,y:height-b.y*height},
          thickness:Math.max(.5,(stroke.thickness||4)*width/1000),
          color:PDFLib.rgb(c.r,c.g,c.b),
          opacity:stroke.tool==='highlighter'?.32:1
        });
      }
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



    const pageNotes = getPageNotes(state.sourceIndex);
    for (const note of pageNotes) {
      if (!String(note.text || '').trim()) continue;
      try {
        const pinSize = Math.max(16, Math.min(width,height) * .025);
        const x = Math.max(0, Math.min(width-pinSize, note.x*width));
        const y = Math.max(0, Math.min(height-pinSize, height-note.y*height-pinSize));
        const annotation = output.context.obj({
          Type:'Annot',
          Subtype:'Text',
          Rect:[x,y,x+pinSize,y+pinSize],
          Contents:PDFLib.PDFString.of(String(note.text)),
          Name:PDFLib.PDFName.of('PushPin'),
          C:[0.88,0.12,0.12],
          Open:false,
          F:4
        });
        page.node.addAnnot(output.context.register(annotation));
      } catch(error) {
        console.error('Could not export note annotation',error);
      }
    }

    const pageLinks = getPageLinks(state.sourceIndex);
    for (const item of pageLinks) {
      const x1=item.x*width;
      const y1=height-(item.y+item.h)*height;
      const x2=(item.x+item.w)*width;
      const y2=height-item.y*height;
      try{
        let annotation;
        if(item.kind==='page'){
          const targetIndex=Math.max(0,Math.min(output.getPageCount()-1,Number(item.page||1)-1));
          const targetPage=output.getPage(targetIndex);
          annotation=output.context.obj({
            Type:'Annot',Subtype:'Link',Rect:[x1,y1,x2,y2],Border:[0,0,0],
            A:{Type:'Action',S:'GoTo',D:[targetPage.ref,PDFLib.PDFName.of('Fit')]}
          });
        }else if(item.url){
          annotation=output.context.obj({
            Type:'Annot',Subtype:'Link',Rect:[x1,y1,x2,y2],Border:[0,0,0],
            A:{Type:'Action',S:'URI',URI:PDFLib.PDFString.of(item.url)}
          });
        }
        if(annotation){
          const ref=output.context.register(annotation);
          page.node.addAnnot(ref);
        }
      }catch(error){console.error('Could not export link annotation',error)}
    }

    for (const item of annotations) {
      const font = await getFont(item);
      const rgb = hexToRgb01(item.color);
      const fontSize = item.size;
      const lineHeight = fontSize * 1.15;
      // Match the visible glyph origin inside the editor's border-box. The
      // preview has a 1px border plus 5px/3px text padding; exporting from the
      // outer box origin made text move left and slightly upward in the PDF.
      const horizontalTextInset = Number(item.textInsetX ?? 6);
      const verticalTextInset = Number(item.textInsetY ?? 4);
      const maxWidth = Math.max(10, item.w * width - horizontalTextInset * 2);
      const startX = item.x * width + horizontalTextInset;
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
          y: topY - verticalTextInset - fontSize - idx * lineHeight,
          size: fontSize,
          font,
          color: PDFLib.rgb(rgb.r, rgb.g, rgb.b),
          opacity: item.opacity,
          rotate: PDFLib.degrees(-Number(item.rotation || 0))
        });
      });
    }
  }

  return output.save();
}






function selectShapeTool(type){editor.shapeTool=type;const labels={line:'Line',arrow:'Arrow',box:'Box',circle:'Circle'},icons={line:'／',arrow:'↗',box:'▢',circle:'○'};document.getElementById('line-tool-label').textContent=labels[type];document.getElementById('line-tool-icon').textContent=icons[type];document.getElementById('line-current-shape').textContent=labels[type];document.querySelectorAll('[data-line-shape]').forEach(b=>b.classList.toggle('active',b.dataset.lineShape===type));document.getElementById('line-shape-menu').hidden=true;setEditorMode('shape');showEditorHint(`Drag on the PDF to add a ${labels[type].toLowerCase()}.`)}
function positionLineShapeMenu(){
  const button=document.getElementById('line-tool');
  const menu=document.getElementById('line-shape-menu');
  if(!button||!menu||menu.hidden)return;

  const rect=button.getBoundingClientRect();
  const menuWidth=158;
  const viewportPadding=8;
  const left=Math.min(
    window.innerWidth-menuWidth-viewportPadding,
    Math.max(viewportPadding,rect.left)
  );

  menu.style.left=`${left}px`;
  menu.style.top=`${rect.bottom+4}px`;
}

document.getElementById('line-tool').addEventListener('click',e=>{
  e.stopPropagation();
  const menu=document.getElementById('line-shape-menu');

  if(editor.mode!=='shape'){
    selectShapeTool(editor.shapeTool);
  }

  menu.hidden=!menu.hidden;

  if(!menu.hidden){
    requestAnimationFrame(positionLineShapeMenu);
  }
});

document.querySelectorAll('[data-line-shape]').forEach(b=>b.addEventListener('click',e=>{
  e.stopPropagation();
  selectShapeTool(b.dataset.lineShape);
}));

document.addEventListener('click',e=>{
  if(!e.target.closest('.line-tool-wrap')&&!e.target.closest('.line-shape-menu')){
    document.getElementById('line-shape-menu').hidden=true;
  }
});

window.addEventListener('resize',positionLineShapeMenu);
document.querySelector('.desktop-ribbon')?.addEventListener('scroll',positionLineShapeMenu);

/* PDFBreeze v5.1.1 — task-first toolbar order */
(function arrangeEditorToolbar(){
  const ribbon=document.querySelector('.desktop-ribbon');
  if(!ribbon)return;
  [
    'undo-tool','redo-tool','add-text-tool','edit-text-tool','sign-tool','image-tool',
    'draw-tool','text-highlight-tool','link-tool','note-tool','stamp-tool',
    'watermark-tool','crop-tool','line-tool','manage-tool'
  ].forEach(id=>{
    const item=id==='line-tool'?document.getElementById(id)?.closest('.line-tool-wrap'):document.getElementById(id);
    if(item)ribbon.appendChild(item);
  });
})();

function updateSelectedShapeProperty(fn){const s=getSelectedShape();if(s){recordHistory();fn(s);renderAnnotations()}}
document.getElementById('line-stroke-colour').addEventListener('input',e=>{editor.shapeStroke=e.target.value;const s=getSelectedShape();if(s){s.stroke=e.target.value;renderAnnotations()}});document.getElementById('line-stroke-colour').addEventListener('change',()=>{if(getSelectedShape())recordHistory()});
document.getElementById('line-fill-colour').addEventListener('input',e=>{editor.shapeFill=e.target.value;const s=getSelectedShape();if(s){s.fill=e.target.value;renderAnnotations()}});document.getElementById('line-fill-enabled').addEventListener('change',e=>{editor.shapeFillEnabled=e.target.checked;updateSelectedShapeProperty(s=>s.fillEnabled=e.target.checked)});
document.getElementById('line-opacity').addEventListener('input',e=>{editor.shapeOpacity=Number(e.target.value)/100;document.getElementById('line-opacity-value').textContent=`${e.target.value}%`;const s=getSelectedShape();if(s){s.opacity=editor.shapeOpacity;renderAnnotations()}});document.getElementById('line-thickness').addEventListener('change',e=>{editor.shapeThickness=Number(e.target.value)||2;updateSelectedShapeProperty(s=>s.thickness=editor.shapeThickness)});

function setDrawTool(tool){
  editor.drawTool=tool;
  document.getElementById('draw-marker-tool').classList.toggle('active',tool==='marker');
  document.getElementById('draw-highlighter-tool').classList.toggle('active',tool==='highlighter');
  document.getElementById('draw-eraser-tool').classList.toggle('active',tool==='eraser');
  document.getElementById('annotation-layer').classList.toggle('eraser-mode',tool==='eraser');
}
document.getElementById('draw-tool').addEventListener('click',()=>{
  clearEditTextInterfaceImmediately();editor.selectedSignatureId=null;setEditorMode('draw');setDrawTool(editor.drawTool);renderAnnotations();
});
document.getElementById('draw-marker-tool').addEventListener('click',()=>setDrawTool('marker'));
document.getElementById('draw-highlighter-tool').addEventListener('click',()=>setDrawTool('highlighter'));
document.getElementById('draw-eraser-tool').addEventListener('click',()=>setDrawTool('eraser'));
document.getElementById('draw-thickness').addEventListener('change',e=>editor.drawThickness=Number(e.target.value)||4);
document.querySelectorAll('[data-draw-colour]').forEach(b=>b.addEventListener('click',()=>{
  editor.drawColour=b.dataset.drawColour;document.getElementById('draw-custom-colour').value=editor.drawColour;
  document.querySelectorAll('[data-draw-colour]').forEach(x=>x.classList.toggle('active',x===b));
}));
document.getElementById('draw-custom-colour').addEventListener('input',e=>{
  editor.drawColour=e.target.value;document.querySelectorAll('[data-draw-colour]').forEach(x=>x.classList.remove('active'));
});
document.getElementById('draw-clear-page').addEventListener('click',()=>{
  if(!editor.pages.length)return;const key=String(editor.pages[editor.selectedIndex].sourceIndex);
  if(!(editor.drawings[key]||[]).length)return;recordHistory();editor.drawings[key]=[];renderAnnotations();
});

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
    showAlert('PDFBreeze could not prepare that signature.');
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
    '.editor-tool-button, .tool-button, [data-editor-tool], .ribbon-tool'
  );

  if (!toolButton) return;

  if (editor.mode === 'watermark' && toolButton.id !== 'watermark-tool') {
    setEditorMode('select');
  }

  if (toolButton.id === 'edit-text-tool' || toolButton.id === 'sign-tool' || toolButton.id === 'draw-tool' || toolButton.id === 'text-highlight-tool' || toolButton.id === 'line-tool' || toolButton.id === 'watermark-tool') return;

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
  updateEditTarget(item => {
    item.pdfFontSize = Math.max(4, Math.min(200, Number(event.target.value) || 18));
    item.fontSizeChanged = true;
  });
});

document.getElementById('edit-text-bold').addEventListener('click', () => {
  updateEditTarget(item => {
    item.bold = !item.bold;
    item.fontWeight = item.bold ? 700 : 400;
  });
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

  preparedExportFilename = `${safeName || 'pdfbreeze-document'}.pdf`;
  button.disabled = true;
  button.textContent = 'Preparing…';

  try {
    // A file opened from My Files is already inside an authenticated member
    // workflow. Bypass the public paywall before it is ever rendered.
    if (isDashboardEditorSession() || await hasUnlimitedPaidAccess()) {
      const format = document.querySelector('input[name="export-format"]:checked')?.value || 'pdf';
      closeFormatModal();
      showDashboardExportProgress(format);
      await exportEditedDocument(format);
      await pendingDashboardFileSave;
      updateExportProgress(100, 'Download ready', `Your ${format.toUpperCase()} file has downloaded.`);
      const progressNote = document.getElementById('dashboard-export-progress-note');
      if (progressNote) progressNote.textContent = 'Returning to My Files…';
      await new Promise(resolve => window.setTimeout(resolve, 550));
      window.location.assign('dashboard.html?updated=1');
      return;
    }
    preparedExportBytes = await createEditedPdfBytes();
    openEmailModal();
  } catch (error) {
    if (isDashboardEditorSession()) showDashboardExportError(error?.message || 'PDFBreeze could not prepare this file.');
    else showAlert('PDFBreeze could not prepare this PDF.');
  } finally {
    button.disabled = false;
    button.textContent = 'Download';
  }
});


let selectedAccessPlan = {
  value: 'full',
  name: '3-day full access',
  price: 1.00,
  disclosure: 'Renews at £49.99 every four weeks after three days unless cancelled beforehand.'
};

const paymentWallStyleCacheKey = 'pdfbreeze_payment_wall_style_v1';
const trialDisclosureCopy = "Money-back guarantee—try us for 30 days and if you're not satisfied, contact us and we'll refund your money. After 3 days, auto-renews at £49.99 billed every 4 weeks—you may cancel anytime.";
let activePaymentWallStyle = 'zendocs';
let paymentWallStyleRequest = null;

function formatPounds(value) {
  return new Intl.NumberFormat('en-GB', {style: 'currency', currency: 'GBP'}).format(value);
}

async function renderCheckoutPreview(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !editor.pdfjs || !editor.pages.length) return;

  const state = editor.pages[0];
  const page = await editor.pdfjs.getPage(state.sourceIndex + 1);
  const base = page.getViewport({scale: 1, rotation: state.rotation});
  const targetWidth = canvasId === 'plan-preview-canvas' || canvasId === 'zendocs-preview-canvas' ? 430 : 70;
  const viewport = page.getViewport({scale: targetWidth / base.width, rotation: state.rotation});
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  await page.render({canvasContext: canvas.getContext('2d'), viewport}).promise;
}

function closeEditorCheckoutOverlays() {
  closeEmailModal();
  closeFormatModal();
}

function showStripeLoadingShell() {
  const mount = document.getElementById('stripe-payment-element');
  if (!mount) return;
  const shell = document.createElement('div');
  shell.className = 'stripe-loading-skeleton';
  shell.setAttribute('role', 'status');
  shell.setAttribute('aria-live', 'polite');
  shell.innerHTML = `
    <div class="stripe-loading-notice">
      <span class="stripe-circle-loader" aria-hidden="true"></span>
      <span><strong data-stripe-loading-title>Opening secure payment</strong><small data-stripe-loading-detail>Your document is ready. Payment fields will appear here.</small></span>
    </div>
    <div class="stripe-skeleton-field stripe-skeleton-card">
      <span class="stripe-skeleton-label"></span>
      <span class="stripe-skeleton-input"></span>
    </div>
    <div class="stripe-skeleton-row">
      <div class="stripe-skeleton-field"><span class="stripe-skeleton-label"></span><span class="stripe-skeleton-input"></span></div>
      <div class="stripe-skeleton-field"><span class="stripe-skeleton-label"></span><span class="stripe-skeleton-input"></span></div>
    </div>`;
  mount.replaceChildren(shell);
}

function setStripeLoadingStage(title, detail) {
  const shell = document.querySelector('#stripe-payment-element .stripe-loading-skeleton');
  const titleNode = shell?.querySelector('[data-stripe-loading-title]');
  const detailNode = shell?.querySelector('[data-stripe-loading-detail]');
  if (titleNode) titleNode.textContent = title;
  if (detailNode) detailNode.textContent = detail;
}

function applyPaymentWallStyle(style) {
  activePaymentWallStyle = style === 'zendocs' ? 'zendocs' : 'standard';
  const paymentPage = document.getElementById('payment-page');
  paymentPage?.classList.toggle('payment-wall-zendocs', activePaymentWallStyle === 'zendocs');
  const paymentTitle = document.getElementById('payment-title');
  const payButton = document.getElementById('mock-pay-button');
  if (paymentTitle) paymentTitle.textContent = activePaymentWallStyle === 'zendocs'
    ? 'Download Now!'
    : "You're on the last step before receiving your document";
  if (payButton) payButton.textContent = activePaymentWallStyle === 'zendocs' ? 'Pay now' : 'Download my document';
}

async function loadPaymentWallStyle() {
  const params = new URLSearchParams(location.search);
  const forced = params.get('paymentWall');
  if (forced === 'standard' || forced === 'zendocs') {
    applyPaymentWallStyle(forced);
    return forced;
  }
  if (params.get('preview') === 'zendocs-payment') {
    applyPaymentWallStyle('zendocs');
    return 'zendocs';
  }
  try {
    const cached = JSON.parse(localStorage.getItem(paymentWallStyleCacheKey) || 'null');
    if (cached && Date.now() - Number(cached.cachedAt || 0) < 60000 && ['standard','zendocs'].includes(cached.style)) {
      applyPaymentWallStyle(cached.style);
      return cached.style;
    }
  } catch (_) {}
  if (paymentWallStyleRequest) return paymentWallStyleRequest;
  const engineBaseUrl = String(window.PDFMINT_CONFIG?.engineBaseUrl || 'https://pdfmint-engine-5dfdx.sevalla.app').replace(/\/+$/, '');
  paymentWallStyleRequest = (async () => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(`${engineBaseUrl}/v1/site/payment-wall`, {cache:'no-store', signal:controller.signal});
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'Payment wall setting unavailable.');
      const style = result.style === 'zendocs' ? 'zendocs' : 'standard';
      localStorage.setItem(paymentWallStyleCacheKey, JSON.stringify({style, cachedAt:Date.now()}));
      applyPaymentWallStyle(style);
      return style;
    } catch (_) {
      applyPaymentWallStyle('zendocs');
      return 'zendocs';
    } finally {
      window.clearTimeout(timeout);
      paymentWallStyleRequest = null;
    }
  })();
  return paymentWallStyleRequest;
}

// Start this small settings request while the customer is editing so checkout
// never waits on it after they enter their email.
void loadPaymentWallStyle();

async function openAccessPage() {
  closeEditorCheckoutOverlays();
  const paymentWallStyle = await loadPaymentWallStyle();
  if (paymentWallStyle === 'zendocs') {
    const fullPlan = document.querySelector('input[name="access-plan"][value="full"]');
    if (fullPlan) fullPlan.checked = true;
    window.PDFBreezeAnalytics?.track('payment_plan_viewed', 'zendocs');
    await openPaymentPage();
    return;
  }
  document.getElementById('access-page').hidden = false;
  const planFilename = document.getElementById('plan-filename');
  if (planFilename) planFilename.textContent = preparedExportFilename || editor.file?.name || 'document.pdf';
  window.PDFBreezeAnalytics?.track('payment_plan_viewed', 'standard');
  loadStripeLibrary().catch(() => {});
  window.PDFMintAuth?.getSession?.().catch?.(() => {});
  await renderCheckoutPreview('plan-preview-canvas');
}

function closeAccessPage() {
  document.getElementById('access-page').hidden = true;
}

async function openPaymentPage(options = {}) {
  const checked = document.querySelector('input[name="access-plan"]:checked');
  if (!checked) return;
  const option = checked.closest('.plan-option');
  const planName = option.querySelector('.plan-copy strong').textContent;
  const price = Number(checked.dataset.price);

  let disclosure = 'One-time access with no automatic renewal.';
  if (checked.value === 'limited' || checked.value === 'full') disclosure = 'Renews at £49.99 every four weeks after three days unless cancelled beforehand.';
  if (checked.value === 'annual') disclosure = 'Billed £299.99 annually until cancelled.';

  selectedAccessPlan = {value: checked.value, name: planName, price, disclosure};

  const summaryValues = {
    'summary-plan-name': planName,
    'summary-plan-price': formatPounds(price),
    'summary-due-today': formatPounds(price),
    'summary-total': formatPounds(price),
    'summary-renewal': disclosure,
    'summary-filename': preparedExportFilename || editor.file?.name || 'document.pdf',
    'zendocs-filename': preparedExportFilename || editor.file?.name || 'document.pdf'
  };
  Object.entries(summaryValues).forEach(([id, value]) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  });

  closeAccessPage();
  document.getElementById('payment-page').hidden = false;
  window.PDFBreezeAnalytics?.track('payment_card_viewed', activePaymentWallStyle);
  if (!options.fromHistory && history.state?.pdfbreezeCheckout !== 'payment') {
    history.pushState({...history.state, pdfbreezeCheckout:'payment'}, '', location.href);
  }
  let stripeMount = document.getElementById('stripe-payment-element');
  if (!stripeMount) {
    stripeMount = document.createElement('div');
    stripeMount.id = 'stripe-payment-element';
    document.getElementById('card-payment-panel')?.prepend(stripeMount);
  }
  const previewPromise = renderCheckoutPreview('payment-preview-canvas').catch(error => {
    console.warn('Checkout preview could not be rendered.', error);
  });
  const zendocsPreviewPromise = renderCheckoutPreview('zendocs-preview-canvas').catch(error => {
    console.warn('Zendocs-style checkout preview could not be rendered.', error);
  });
  try {
    await prepareStripePaymentElement();
  } catch (error) {
    showStripeError(error.message || 'Secure payment could not be loaded.');
    const payButton = document.getElementById('mock-pay-button');
    if (payButton) payButton.disabled = true;
  }
  await previewPromise;
  await zendocsPreviewPromise;
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
      disclosure.textContent = trialDisclosureCopy;
    } else if (event.currentTarget.value === 'annual') {
      disclosure.textContent = 'Annual unlimited access is charged at £299.99 today and every year until cancelled.';
    } else {
      disclosure.textContent = trialDisclosureCopy;
    }
  });
});

document.getElementById('plan-continue').addEventListener('click', openPaymentPage);
// Phone sticky bar: same action as the main Continue button.
document.querySelector('[data-plan-continue]')?.addEventListener('click', () => document.getElementById('plan-continue')?.click());
document.getElementById('back-to-plans').addEventListener('click', () => {
  if (history.state?.pdfbreezeCheckout === 'payment') history.back();
  else {
    closePaymentPage();
    document.getElementById('access-page').hidden = false;
  }
});

window.addEventListener('popstate', event => {
  const paymentPage = document.getElementById('payment-page');
  if (!paymentPage?.hidden && event.state?.pdfbreezeCheckout !== 'payment') {
    closePaymentPage();
    document.getElementById('access-page').hidden = false;
  }
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
let pendingCheckoutBlob = null;
let pendingCheckoutFilename = '';
let stripeClient = null;
let stripeElements = null;
let stripeIntentType = null;
let stripeElementPlan = null;
let stripeCheckoutSubscriptionId = '';
let stripeClientSecret = '';
let stripeCheckoutMode = 'live';
let stripeCardNumberElement = null;
let stripeCardElements = [];
const stripeCheckoutDocumentKey = crypto.randomUUID?.() || `document-${Date.now()}`;
const googleAdsTrialPurchaseSendTo = 'AW-16506274922/y4WSCPDa1YQdEOqI5749';
const googleAdsPendingPurchaseKey = 'pdfbreezeGoogleAdsPendingPurchase';

function queueGoogleAdsTrialPurchase(transactionId) {
  if (stripeCheckoutMode !== 'live' || !window.PDFBreezeAnalytics?.isLiveTrackingContext?.()) return;
  const cleanTransactionId = String(transactionId || '').trim();
  const value = Number(selectedAccessPlan?.price);
  if (!googleAdsTrialPurchaseSendTo || !cleanTransactionId || !Number.isFinite(value) || value <= 0) return;
  sessionStorage.setItem(googleAdsPendingPurchaseKey, JSON.stringify({
      sendTo: googleAdsTrialPurchaseSendTo,
      value,
      currency: 'GBP',
      transactionId: cleanTransactionId,
      createdAt: Date.now()
  }));
}

let stripeLibraryPromise = null;
function loadStripeLibrary() {
  if (window.Stripe) return Promise.resolve();
  if (stripeLibraryPromise) return stripeLibraryPromise;
  stripeLibraryPromise = new Promise((resolve, reject) => {
    let existing = document.querySelector('script[data-pdfbreeze-stripe]');
    if (existing?.dataset.loadFailed === 'true' || (existing?.dataset.loaded === 'true' && !window.Stripe)) {
      existing.remove();
      existing = null;
    }
    const script = existing || document.createElement('script');
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (error) {
        script.dataset.loadFailed = 'true';
        stripeLibraryPromise = null;
        reject(error);
      } else {
        script.dataset.loaded = 'true';
        resolve();
      }
    };
    const timeout = window.setTimeout(() => finish(new Error('Stripe took too long to load. Please check your connection and try again.')), 15000);
    script.addEventListener('load', () => window.Stripe ? finish() : finish(new Error('Stripe loaded without starting correctly. Please try again.')), {once: true});
    script.addEventListener('error', () => finish(new Error('Stripe could not load. Please check your connection and try again.')), {once: true});
    if (existing) return;
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.dataset.pdfbreezeStripe = 'true';
    document.head.appendChild(script);
  });
  return stripeLibraryPromise;
}

function stripePlanCode() {
  if (selectedAccessPlan.value === 'limited') return 'document_trial';
  if (selectedAccessPlan.value === 'annual') return 'annual';
  return 'unlimited_trial';
}

function showStripeError(message) {
  let error = document.getElementById('stripe-payment-error');
  if (!error) {
    error = document.createElement('p');
    error.id = 'stripe-payment-error';
    error.className = 'payment-consent-warning';
    document.getElementById('stripe-payment-element')?.insertAdjacentElement('afterend', error);
  }
  error.textContent = message || '';
  error.hidden = !message;
}

async function loadStripeCheckoutConfig(session) {
  const adminSandbox = localStorage.getItem('pdfbreezeAdminStripeSandbox') === 'true';
  const params = new URLSearchParams();
  if (adminSandbox) params.set('mode', 'sandbox');
  const query = params.size ? `?${params}` : '';
  const response = await fetch(`${window.PDFMINT_CONFIG.engineBaseUrl}/v1/billing/config${query}`, {
    cache: 'no-store',
    headers: session?.access_token ? {Authorization:`Bearer ${session.access_token}`} : {}
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.detail || 'Stripe checkout configuration could not be loaded.');
  if (!result.configured || !result.publishableKey) {
    const label = result.mode === 'sandbox' ? 'Sandbox' : 'Live';
    throw new Error(`${label} Stripe checkout is not configured yet.`);
  }
  return result;
}

async function prepareStripePaymentElement() {
  const panel = document.getElementById('card-payment-panel');
  if (!panel) throw new Error('Stripe checkout is not configured.');

  [...panel.querySelectorAll('.payment-field, .payment-field-row, .express-payment-row')]
    .forEach(element => {
      element.hidden = true;
      element.style.setProperty('display', 'none', 'important');
    });
  let mount = document.getElementById('stripe-payment-element');
  if (!mount) {
    mount = document.createElement('div');
    mount.id = 'stripe-payment-element';
    panel.prepend(mount);
  }
  const plan = stripePlanCode();
  const payButton = document.getElementById('mock-pay-button');
  const session = await window.PDFMintAuth?.getSession?.();
  if (!session?.access_token) {
    throw new Error('Your checkout session could not be established. Please return to the email step and try again.');
  }
  const config = await loadStripeCheckoutConfig(session);
  stripeCheckoutMode = config.mode || 'live';
  let sandboxNotice = document.getElementById('stripe-sandbox-notice');
  if (stripeCheckoutMode === 'sandbox') {
    if (!sandboxNotice) {
      sandboxNotice = document.createElement('p');
      sandboxNotice.id = 'stripe-sandbox-notice';
      sandboxNotice.className = 'payment-consent-warning';
      mount.insertAdjacentElement('beforebegin', sandboxNotice);
    }
    sandboxNotice.textContent = 'Admin sandbox mode — use a Stripe test card. No real charge will be made.';
    sandboxNotice.hidden = false;
  } else if (sandboxNotice) {
    sandboxNotice.hidden = true;
  }
  const checkoutKey = `${stripeCheckoutMode}:${plan}`;
  if (stripeElements && stripeElementPlan === checkoutKey) return;
  showStripeLoadingShell();
  if (payButton) payButton.disabled = true;
  setStripeLoadingStage('Checking your secure session', 'Your document is ready while we connect the payment form.');
  const stripeReady = loadStripeLibrary();
  stripeReady.catch(() => {});
  setStripeLoadingStage('Connecting to secure payment', 'This normally takes only a moment.');

  const checkoutController = new AbortController();
  const checkoutTimeout = window.setTimeout(() => checkoutController.abort(), 20000);
  let response;
  try {
    [response] = await Promise.all([fetch(`${window.PDFMINT_CONFIG.engineBaseUrl}/v1/billing/checkout`, {
    method: 'POST',
    signal: checkoutController.signal,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      plan,
      mode: stripeCheckoutMode,
      document_key: plan === 'document_trial' ? stripeCheckoutDocumentKey : null,
      analytics_session_id: window.PDFBreezeAnalytics?.sessionId?.() || null,
      analytics_landing_page: window.PDFBreezeAnalytics?.landingPage?.() || 'unknown'
    })
    }), stripeReady]);
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('The secure checkout service took too long to respond. Please try again.');
    throw error;
  } finally {
    clearTimeout(checkoutTimeout);
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.detail || 'PDFBreeze could not start secure checkout.');

  setStripeLoadingStage('Loading payment fields', 'Secure fields are being supplied directly by Stripe.');
  stripeClient = window.Stripe(config.publishableKey);
  stripeIntentType = result.intent_type;
  stripeCheckoutSubscriptionId = result.subscription_id || result.subscription || '';
  stripeClientSecret = result.client_secret;
  stripeCardElements.forEach(element => element.unmount());
  stripeCardElements = [];
  stripeElements = stripeClient.elements();
  const paymentTarget = document.createElement('div');
  paymentTarget.className = 'stripe-payment-fields';
  paymentTarget.style.opacity = '0';
  paymentTarget.innerHTML = `
    <label class="stripe-card-field stripe-card-number-field">
      <span>Card number</span>
      <div id="stripe-card-number"></div>
    </label>
    <div class="stripe-card-field-row">
      <label class="stripe-card-field">
        <span>Expiry date</span>
        <div id="stripe-card-expiry"></div>
      </label>
      <label class="stripe-card-field">
        <span>Security code</span>
        <div id="stripe-card-cvc"></div>
      </label>
    </div>`;
  mount.append(paymentTarget);
  const fieldStyle = {
    base: {
      color: '#172033',
      fontFamily: 'Poppins, Arial, sans-serif',
      fontSize: '16px',
      fontSmoothing: 'antialiased',
      '::placeholder': {color: '#9aa4b2'}
    },
    invalid: {color: '#d92d20'}
  };
  const cardNumber = stripeElements.create('cardNumber', {style: fieldStyle, showIcon: true});
  const cardExpiry = stripeElements.create('cardExpiry', {style: fieldStyle});
  const cardCvc = stripeElements.create('cardCvc', {style: fieldStyle});
  stripeCardNumberElement = cardNumber;
  stripeCardElements = [cardNumber, cardExpiry, cardCvc];
  let readyFields = 0;
  const onFieldReady = () => {
    readyFields += 1;
    if (readyFields < stripeCardElements.length) return;
    mount.querySelector('.stripe-loading-skeleton')?.remove();
    paymentTarget.style.opacity = '1';
    if (payButton) payButton.disabled = false;
  };
  stripeCardElements.forEach(element => {
    element.on('ready', onFieldReady);
    element.on('change', event => showStripeError(event.error?.message || ''));
  });
  cardNumber.mount('#stripe-card-number');
  cardExpiry.mount('#stripe-card-expiry');
  cardCvc.mount('#stripe-card-cvc');
  stripeElementPlan = checkoutKey;
  showStripeError('');
}

function triggerPreparedDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

function finishMockCheckout() {
  try {
    const cardInputs = [...document.querySelectorAll('#card-payment-panel input:not([type="checkbox"])')];
    const cardDigits = String(cardInputs[1]?.value || '').replace(/\D/g, '');
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';
    localStorage.setItem('pdfmintSelectedPlan', JSON.stringify(selectedAccessPlan || {}));
    localStorage.setItem('pdfmintAccountCreatedAt', new Date().toISOString());
    localStorage.setItem('pdfmintPaymentCard', JSON.stringify({
      name: String(cardInputs[0]?.value || '').trim(),
      lastFour: cardDigits.slice(-4) || '2721',
      expiry: String(cardInputs[2]?.value || '08/31').replace(/\s/g, ''),
      timezone
    }));
    localStorage.setItem('pdfmintPaymentTimezone', timezone);
  } catch (error) {
    console.warn('PDFBreeze could not save the local account preview state.', error);
  }

  // Give the browser time to accept the download before replacing the editor.
  window.setTimeout(() => {
    if (window.PDFMintAuth?.isSignedIn?.()) {
      window.location.assign('dashboard.html?v=pdfium-dashboard-3&welcome=1');
      return;
    }
    const email = sessionStorage.getItem('pdfmintPendingEmail') || '';
    sessionStorage.setItem('pdfmintCheckoutAccess', JSON.stringify({
      email,
      completedAt: Date.now()
    }));
    window.location.assign('dashboard.html?v=pdfium-dashboard-3&welcome=1');
  }, 350);
}

function validateMockCheckout() {
  const requiredFields = [...document.querySelectorAll('#card-payment-panel input:not([type="checkbox"])')]
    .filter(input => input.dataset.paymentField !== 'billingPostcode');
  let valid = true;

  requiredFields.forEach(input => {
    const empty = !String(input.value || '').trim();
    input.classList.toggle('payment-invalid', empty);
    if (empty) valid = false;
  });

  return valid;
}

document.getElementById('mock-pay-button').addEventListener('click', async () => {
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const payButton = document.getElementById('mock-pay-button');
  const payButtonLabel = payButton?.textContent || 'Download my document';
  if (payButton) {
    payButton.disabled = true;
    payButton.classList.add('is-processing');
    payButton.innerHTML = '<span class="payment-spinner" aria-hidden="true"></span><span>Processing payment…</span>';
  }
  try {
    if (!stripeElements) await prepareStripePaymentElement();
    if (!stripeClientSecret || !stripeCardNumberElement) throw new Error('Secure card fields are not ready yet. Please try again.');
    const confirmation = stripeIntentType === 'setup'
      ? stripeClient.confirmCardSetup(stripeClientSecret, {payment_method: {card: stripeCardNumberElement}})
      : stripeClient.confirmCardPayment(stripeClientSecret, {payment_method: {card: stripeCardNumberElement}});
    const {error, paymentIntent, setupIntent} = await confirmation;
    if (error) {
      showStripeError(error.message || 'Payment could not be completed.');
      if (payButton) {
        payButton.disabled = false;
        payButton.classList.remove('is-processing');
        payButton.textContent = payButtonLabel;
      }
      return;
    }
    const paymentSucceeded = paymentIntent?.status === 'succeeded';
    if (paymentSucceeded) {
      queueGoogleAdsTrialPurchase(paymentIntent.id);
    }
    if (pendingCheckoutBlob && pendingCheckoutFilename) {
      const paidFilename = pendingCheckoutFilename;
      await window.PDFMintAuth?.saveDocument?.(pendingCheckoutBlob, paidFilename, 'paid-download');
      sessionStorage.setItem('pdfmintPostCheckoutDownload', JSON.stringify({
        filename: paidFilename,
        createdAt: Date.now()
      }));
      pendingCheckoutBlob = null;
      pendingCheckoutFilename = '';
    }
    await sendCheckoutWelcomeEmail().catch(emailError => {
      console.warn('PDFBreeze could not send the welcome email.', emailError);
    });
    window.location.assign('dashboard.html?v=pdfium-dashboard-3&payment=complete&download=1');
  } catch (error) {
    showStripeError(error.message || 'Payment could not be completed.');
    if (payButton) {
      payButton.disabled = false;
      payButton.classList.remove('is-processing');
      payButton.textContent = payButtonLabel;
    }
  }
});

async function sendCheckoutWelcomeEmail() {
  const temporaryPassword = sessionStorage.getItem('pdfmintCheckoutTemporaryPassword');
  if (!temporaryPassword || !stripeCheckoutSubscriptionId) return;
  const session = await window.PDFMintAuth?.getSession?.();
  if (!session?.access_token) return;
  const response = await fetch(`${window.PDFMINT_CONFIG.engineBaseUrl}/v1/billing/welcome-email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      subscription_id: stripeCheckoutSubscriptionId,
      mode: stripeCheckoutMode,
      temporary_password: temporaryPassword,
      plan_name: selectedAccessPlan.name,
      amount: formatPounds(selectedAccessPlan.price)
    })
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.detail || 'The welcome email could not be sent.');
  }
  sessionStorage.removeItem('pdfmintCheckoutTemporaryPassword');
}
document.getElementById('mock-paypal-button').addEventListener('click', openDemoPaymentNotice);
document.getElementById('close-demo-payment').addEventListener('click', () => {
  document.getElementById('demo-payment-modal').hidden = true;
});
document.getElementById('return-to-payment').addEventListener('click', () => {
  document.getElementById('demo-payment-modal').hidden = true;
});

function preparePaymentPrototypeUi() {
  const accessTitle = document.getElementById('access-title');
  const paymentTitle = document.getElementById('payment-title');
  const payButton = document.getElementById('mock-pay-button');
  const cardPanel = document.getElementById('card-payment-panel');
  const orderSummary = document.querySelector('.order-summary-card');

  document.querySelectorAll('.recommended-ribbon').forEach(ribbon => {
    ribbon.textContent = 'Most Popular';
  });
  document.querySelectorAll('.secure-payment-note').forEach(note => {
    note.textContent = 'Your payment is secured and the information is encrypted.';
    const button = note.closest('.card-payment-panel')?.querySelector('.pay-now-button');
    if (button) button.before(note);
  });

  const paymentInputs = [...(cardPanel?.querySelectorAll('input:not([type="checkbox"])') || [])];
  const paymentFieldConfig = [
    ['cardholderName', 'cc-name'],
    ['cardNumber', 'cc-number'],
    ['cardExpiry', 'cc-exp'],
    ['cardCvc', 'cc-csc'],
    ['billingPostcode', 'postal-code']
  ];
  paymentInputs.forEach((input, index) => {
    const config = paymentFieldConfig[index];
    if (!config) return;
    input.name = config[0];
    input.autocomplete = config[1];
    input.setAttribute('data-payment-field', config[0]);
  });

  if (accessTitle) accessTitle.textContent = 'Select a plan to download your document';
  if (paymentTitle) paymentTitle.textContent = "You're on the last step before receiving your document";
  if (payButton) payButton.textContent = 'Download my document';

  const annualInput = document.querySelector('input[name="access-plan"][value="annual"]');
  if (annualInput) annualInput.dataset.price = '299.99';
  const annualSubtext = annualInput?.closest('.plan-option')?.querySelector('.plan-copy small');
  if (annualSubtext) annualSubtext.textContent = 'Unlimited access · billed £299.99 yearly';
  const annualPrice = annualInput?.closest('.plan-option')?.querySelector('.plan-price');
  if (annualPrice) annualPrice.innerHTML = '£25.00<span>/pm</span>';

  document.querySelectorAll('.plan-benefits div').forEach(item => {
    if (item.textContent.includes('Convert PDFs to and from common formats')) {
      item.lastChild.textContent = ' Convert all popular file formats';
    }
  });

  const planBenefits = document.querySelector('.plan-benefits');
  if (planBenefits && !planBenefits.querySelector('[data-benefit="form-templates"]')) {
    const templatesBenefit = document.createElement('div');
    templatesBenefit.dataset.benefit = 'form-templates';
    templatesBenefit.innerHTML = '<span>✓</span> Access to ready-made form templates';
    planBenefits.appendChild(templatesBenefit);
  }

  const updatePlanBenefits = planValue => {
    const benefitItems = [...document.querySelectorAll('.plan-benefits > div')];
    benefitItems.forEach((item, index) => {
      let copy = item.querySelector('.benefit-copy');
      if (!copy) {
        const textNodes = [...item.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
        copy = document.createElement('span');
        copy.className = 'benefit-copy';
        copy.textContent = textNodes.map(node => node.textContent.trim()).join(' ');
        textNodes.forEach(node => node.remove());
        item.appendChild(copy);
      }
      const unavailable = planValue === 'limited' && index >= benefitItems.length - 3;
      item.classList.toggle('benefit-unavailable', unavailable);
      const icon = item.querySelector('span:not(.benefit-copy)');
      if (icon) icon.textContent = unavailable ? '×' : '✓';
    });
  };
  document.querySelectorAll('input[name="access-plan"]').forEach(input => {
    input.addEventListener('change', () => updatePlanBenefits(input.value));
  });
  updatePlanBenefits(document.querySelector('input[name="access-plan"]:checked')?.value || 'full');

  const planDisclosure = document.getElementById('plan-disclosure');
  if (planDisclosure) {
    planDisclosure.textContent = trialDisclosureCopy;
    document.querySelectorAll('input[name="access-plan"]').forEach(input => input.addEventListener('change', () => {
      planDisclosure.textContent = input.value === 'annual'
        ? 'Annual unlimited access is charged at £299.99 today and every year until cancelled.'
        : trialDisclosureCopy;
    }));
  }

  cardPanel?.querySelector('.payment-consent')?.remove();
  document.getElementById('payment-consent-warning')?.remove();

  const backToPlans = document.getElementById('back-to-plans');
  backToPlans?.remove();

  const paymentProgress = document.querySelector('#payment-page .checkout-progress');
  const paymentSteps = [...(paymentProgress?.querySelectorAll('.progress-step') || [])];
  const goToCheckoutStep = stepIndex => {
    if (stepIndex === 0) {
      closePaymentPage();
      closeAccessPage();
      openEmailModal();
      return;
    }
    if (stepIndex === 1) {
      closePaymentPage();
      document.getElementById('access-page').hidden = false;
    }
  };
  paymentSteps.forEach((step, index) => {
    if (!step.classList.contains('complete') || index > 1) return;
    step.classList.add('checkout-step-link');
    step.setAttribute('role', 'button');
    step.setAttribute('tabindex', '0');
    step.setAttribute('aria-label', index === 0 ? 'Return to email step' : 'Return to plan selection');
    step.addEventListener('click', () => goToCheckoutStep(index));
    step.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      goToCheckoutStep(index);
    });
  });

  document.querySelectorAll('.checkout-review-grid article').forEach(article => {
    if (article.querySelector('.review-avatar')) return;
    const name = article.querySelector('small');
    if (!name) return;
    const initials = name.textContent.trim().split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
    const identity = document.createElement('div');
    identity.className = 'review-identity';
    identity.innerHTML = `<span class="review-avatar" aria-hidden="true">${initials}</span>`;
    identity.append(name);
    article.append(identity);
  });

  if (cardPanel && !cardPanel.querySelector('.digicert-secured')) {
    const seal = document.createElement('img');
    seal.className = 'digicert-secured';
    seal.src = 'assets/digicert-secured.svg';
    seal.alt = 'DigiCert Secured';
    const button = cardPanel.querySelector('.pay-now-button');
    const note = cardPanel.querySelector('.secure-payment-note');
    if (button && note) {
      const assurance = document.createElement('div');
      assurance.className = 'payment-assurance-row';
      button.before(assurance);
      assurance.append(note, seal);
    }
  }

  if (cardPanel && !cardPanel.querySelector('.payment-legal-copy')) {
    const legal = document.createElement('p');
    legal.className = 'payment-legal-copy';
    legal.innerHTML = 'By clicking on the button, you accept our <a href="terms-of-use.html" target="_blank" rel="noopener">Terms of Use</a> and <a href="privacy-policy.html" target="_blank" rel="noopener">Privacy Policy</a>.';
    cardPanel.querySelector('.pay-now-button')?.insertAdjacentElement('afterend', legal);
  }

  if (orderSummary) {
    orderSummary.querySelector('#summary-renewal')?.remove();
    orderSummary.querySelector('.summary-line.muted')?.remove();
    const firstPrice = orderSummary.querySelector('.summary-line');
    const guarantees = orderSummary.querySelector('.summary-guarantees');
    const totalToday = orderSummary.querySelector('.summary-total');
    if (firstPrice && guarantees) {
      guarantees.innerHTML = '<div><span>&#10003;</span><p><strong>Unlimited edits</strong></p></div><div><span>&#10003;</span><p><strong>Unlimited downloads</strong></p></div><div><span>&#10003;</span><p><strong>Convert to any format</strong></p></div><div><span>&#10003;</span><p><strong>Sign your docs online</strong></p></div><div><span>&#10003;</span><p><strong>Create your own forms</strong></p></div>';
      firstPrice.insertAdjacentElement('afterend', guarantees);
      if (totalToday) guarantees.insertAdjacentElement('afterend', totalToday);
    }
  }

  if (cardPanel && !document.querySelector('.express-payment-row')) {
    const express = document.createElement('div');
    express.className = 'express-payment-row';
    express.innerHTML = '<button type="button" aria-label="Google Pay">G Pay</button><button type="button" aria-label="Apple Pay">● Pay</button><div><span></span><strong>Pay with card</strong><span></span></div>';
    cardPanel.prepend(express);
    express.querySelectorAll('button').forEach(button => button.addEventListener('click', openDemoPaymentNotice));
  }

  cardPanel?.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
    input.classList.remove('payment-invalid');
  }));

  const params = new URLSearchParams(window.location.search);
  if (params.get('preview') === 'plans') document.getElementById('access-page').hidden = false;
  if (params.get('preview') === 'payment') document.getElementById('payment-page').hidden = false;
  if (params.get('preview') === 'zendocs-payment') {
    applyPaymentWallStyle('zendocs');
    document.getElementById('payment-page').hidden = false;
  }
}

preparePaymentPrototypeUi();



const PDFMINT_ENGINE_URL = String(
  window.PDFMINT_CONFIG?.engineBaseUrl ||
  window.PDFMINT_CONFIG?.conversionApiBaseUrl ||
  'https://pdfmint-engine-5dfdx.sevalla.app'
).replace(/\/+$/, '');

let pdfMintEngineHealth = {
  checkedAt: 0,
  available: false
};



let pdfMintExportTimer = null;
let pdfMintExportStartedAt = 0;
let pdfMintExportEstimatedSeconds = 0;
let pdfMintExportDisplayedProgress = 0;
let pdfMintExportFormat = '';

function stopExportCountdown() {
  if (pdfMintExportTimer) {
    clearInterval(pdfMintExportTimer);
    pdfMintExportTimer = null;
  }

  const eta = document.getElementById('export-progress-eta');
  if (eta) eta.hidden = true;
}

function updateSimpleProgressMessage() {
  const eta = document.getElementById('export-progress-eta');
  const message = document.getElementById('export-progress-simple-message');
  if (!eta || !message || !pdfMintExportFormat) return;

  const elapsed = (Date.now() - pdfMintExportStartedAt) / 1000;
  const remaining = Math.max(0, pdfMintExportEstimatedSeconds - elapsed);

  eta.hidden = false;

  if (remaining <= 2) {
    message.textContent = 'Nearly ready…';
  } else if (pdfMintExportFormat === 'doc') {
    message.textContent = 'Usually ready in around 10 seconds';
  } else if (pdfMintExportFormat === 'docx') {
    message.textContent = 'Usually ready in a few seconds';
  } else if (pdfMintExportFormat === 'xlsx') {
    message.textContent = 'Usually ready in a few seconds';
  } else if (pdfMintExportFormat === 'xls') {
    message.textContent = 'Usually ready in around 7 seconds';
  } else if (pdfMintExportFormat === 'pptx') {
    message.textContent = 'Usually ready in a few seconds';
  } else if (pdfMintExportFormat === 'ppt') {
    message.textContent = 'Usually ready in around 7 seconds';
  } else {
    eta.hidden = true;
  }
}

function startExportCountdown(format) {
  stopExportCountdown();

  const estimates = {
    docx: 6,
    doc: 10,
    xlsx: 5,
    xls: 7,
    pptx: 5,
    ppt: 7
  };

  pdfMintExportFormat = format;
  // Bigger documents take longer: scale the estimate with the page count so the bar
  // doesn't race to the end and then sit still on long files.
  const exportPages = Math.max(1, Number(editor?.pages?.length) || 1);
  const perPage = { docx: 0.9, doc: 1.1, xlsx: 0.6, xls: 0.8, pptx: 0.7, ppt: 0.9 }[format] || 0;
  pdfMintExportEstimatedSeconds = estimates[format] ? estimates[format] + perPage * Math.max(0, exportPages - 3) : 0;
  pdfMintExportStartedAt = Date.now();
  pdfMintExportDisplayedProgress = 2;

  if (!pdfMintExportEstimatedSeconds) return;

  updateSimpleProgressMessage();

  pdfMintExportTimer = setInterval(() => {
    updateSimpleProgressMessage();

    const elapsed = (Date.now() - pdfMintExportStartedAt) / 1000;
    const ratio = elapsed / pdfMintExportEstimatedSeconds;
    // Keeps creeping forward (never stalls) and only reaches 100% when the file arrives.
    const estimatedProgress = Math.min(97, 42 + 55 * (1 - Math.exp(-1.6 * ratio)));
    // Once the upload is done (50%+), say what the converter is doing.
    if (pdfMintExportDisplayedProgress >= 50) {
      const pages = Math.max(1, Number(editor?.pages?.length) || 1);
      const label = pdfMintExportFormat.toUpperCase();
      const detail = ratio < 0.3 ? `Reading your ${pages} page${pages === 1 ? '' : 's'}…`
        : ratio < 0.65 ? 'Rebuilding the text, tables and layout…'
        : ratio < 1 ? `Adding images and finishing your ${label}…`
        : `Still working: longer documents take a little more time (${Math.round(elapsed)}s)`;
      for (const id of ['export-progress-detail', 'dashboard-export-progress-detail']) {
        const node = document.getElementById(id);
        if (node && node.textContent !== detail) node.textContent = detail;
      }
    }

    if (estimatedProgress > pdfMintExportDisplayedProgress) {
      pdfMintExportDisplayedProgress = estimatedProgress;
      const bar = document.getElementById('export-progress-bar');
      const percentNode = document.getElementById('export-progress-percent');
      const dashboardBar = document.getElementById('dashboard-export-progress-bar');
      const dashboardPercent = document.getElementById('dashboard-export-progress-percent');

      if (bar) bar.style.width = `${estimatedProgress}%`;
      if (percentNode) percentNode.textContent = `${Math.round(estimatedProgress)}%`;
      if (dashboardBar) dashboardBar.style.width = `${estimatedProgress}%`;
      if (dashboardPercent) dashboardPercent.textContent = `${Math.round(estimatedProgress)}%`;
    }
  }, 250);
}

function updateExportProgress(percent, title, detail) {
  const panel = document.getElementById('export-progress-panel');
  const titleNode = document.getElementById('export-progress-title');
  const detailNode = document.getElementById('export-progress-detail');
  const percentNode = document.getElementById('export-progress-percent');
  const bar = document.getElementById('export-progress-bar');
  const dashboardTitle = document.getElementById('dashboard-export-progress-title');
  const dashboardDetail = document.getElementById('dashboard-export-progress-detail');
  const dashboardPercent = document.getElementById('dashboard-export-progress-percent');
  const dashboardBar = document.getElementById('dashboard-export-progress-bar');

  if (panel) panel.hidden = false;
  const requestedPercent = Math.max(0, Math.min(100, Number(percent) || 0));
  pdfMintExportDisplayedProgress = Math.max(pdfMintExportDisplayedProgress, requestedPercent);
  const safePercent = Math.round(pdfMintExportDisplayedProgress);

  if (requestedPercent >= 100 || String(title || '').toLowerCase().includes('could not')) {
    stopExportCountdown();
  }

  if (titleNode) titleNode.textContent = title || 'Preparing document';
  if (detailNode) detailNode.textContent = detail || '';
  if (percentNode) percentNode.textContent = `${safePercent}%`;
  if (bar) bar.style.width = `${safePercent}%`;
  if (dashboardTitle) dashboardTitle.textContent = title || 'Preparing document';
  if (dashboardDetail) dashboardDetail.textContent = detail || '';
  if (dashboardPercent) dashboardPercent.textContent = `${safePercent}%`;
  if (dashboardBar) dashboardBar.style.width = `${safePercent}%`;
}

function showDashboardExportProgress(format) {
  const layer = document.getElementById('dashboard-export-progress');
  if (!layer) return;
  const close = document.getElementById('dashboard-export-progress-close');
  const note = document.getElementById('dashboard-export-progress-note');
  layer.classList.remove('is-error');
  if (close) close.hidden = true;
  if (note) note.textContent = 'Please keep this window open. Your download will start automatically.';
  layer.hidden = false;
  document.body.style.overflow = 'hidden';
  resetExportProgress();
  startExportCountdown(format);
  updateExportProgress(2, 'Starting export', `Preparing ${format.toUpperCase()}…`);
}

function showDashboardExportError(message) {
  stopExportCountdown();
  const layer = document.getElementById('dashboard-export-progress');
  const close = document.getElementById('dashboard-export-progress-close');
  const note = document.getElementById('dashboard-export-progress-note');
  const percent = document.getElementById('dashboard-export-progress-percent');
  if (layer) layer.classList.add('is-error');
  updateExportProgress(0, 'Export could not be completed', message || 'Please try again.');
  if (percent) percent.textContent = '—';
  if (note) note.textContent = 'Your editor remains open and your changes have not been lost.';
  if (close) close.hidden = false;
}

document.getElementById('dashboard-export-progress-close')?.addEventListener('click', () => {
  document.getElementById('dashboard-export-progress').hidden = true;
  document.body.style.overflow = '';
});

function resetExportProgress() {
  stopExportCountdown();
  pdfMintExportStartedAt = 0;
  pdfMintExportEstimatedSeconds = 0;
  pdfMintExportDisplayedProgress = 0;
  pdfMintExportFormat = '';

  const panel = document.getElementById('export-progress-panel');
  if (panel) panel.hidden = true;
  updateExportProgress(0, 'Preparing document', 'Applying your edits…');
  if (panel) panel.hidden = true;
}


async function ensurePdfMintEngineAvailable() {
  if (!PDFMINT_ENGINE_URL) {
    throw new Error('The PDFBreeze Engine URL has not been configured.');
  }

  const now = Date.now();
  if (pdfMintEngineHealth.available && now - pdfMintEngineHealth.checkedAt < 30000) {
    return;
  }

  updateExportProgress(12, 'Connecting to PDFBreeze Engine', 'Checking the conversion service…');

  let response;
  try {
    response = await fetch(`${PDFMINT_ENGINE_URL}/v1/health`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: AbortSignal.timeout ? AbortSignal.timeout(7000) : undefined
    });
  } catch (error) {
    pdfMintEngineHealth = { checkedAt: now, available: false };
    throw new Error(
      'PDFBreeze Engine is not running or cannot be reached. Start the engine and check the URL in config.js.'
    );
  }

  if (!response.ok) {
    pdfMintEngineHealth = { checkedAt: now, available: false };
    throw new Error(`PDFBreeze Engine health check failed (${response.status}).`);
  }

  const data = await response.json().catch(() => ({}));
  if (data.status !== 'ok') {
    pdfMintEngineHealth = { checkedAt: now, available: false };
    throw new Error('PDFBreeze Engine reported that it is unavailable.');
  }

  pdfMintEngineHealth = { checkedAt: now, available: true };
}

async function convertPdfThroughPdfMintEngine(pdfBlob, operation, filename) {
  await ensurePdfMintEngineAvailable();

  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append('file', pdfBlob, `${filename}.pdf`);
    form.append('operation', operation);

    const request = new XMLHttpRequest();
    request.open('POST', `${PDFMINT_ENGINE_URL}/v1/jobs`, true);
    request.responseType = 'blob';
    request.timeout = 240000;

    request.upload.addEventListener('progress', event => {
      if (!event.lengthComputable) return;
      const uploadPercent = event.loaded / event.total;
      updateExportProgress(
        25 + uploadPercent * 20,
        'Uploading securely',
        `Uploading the completed PDF… ${Math.round(uploadPercent * 100)}%`
      );
    });

    request.upload.addEventListener('load', () => {
      const formatLabel = operation.replace('pdf-to-', '').toUpperCase();
      updateExportProgress(
        50,
        `Preparing your ${formatLabel}…`,
        'Please keep this window open while your download is prepared.'
      );
    });

    request.addEventListener('load', async () => {
      if (request.status >= 200 && request.status < 300) {
        updateExportProgress(95, 'Preparing download', 'The converted document is ready.');
        resolve(request.response);
        return;
      }

      let message = `PDFBreeze Engine returned status ${request.status}.`;
      try {
        const text = await request.response.text();
        const parsed = JSON.parse(text);
        if (parsed.detail) message = parsed.detail;
      } catch (_) {}
      reject(new Error(message));
    });

    request.addEventListener('error', () => {
      reject(new Error(
        'The connection to PDFBreeze Engine was interrupted. Check that the engine is running and CORS is configured.'
      ));
    });

    request.addEventListener('timeout', () => {
      reject(new Error('The conversion took too long. Please try again.'));
    });

    request.send(form);
  });
}

async function exportEditedPdfThroughEngine(format) {
  const baseName = safeExportBaseName();
  updateExportProgress(8, `Preparing your ${format.toUpperCase()}…`, 'Please keep this window open.');
  const pdfBlob = await buildFinalEditedPdfBlob();
  updateExportProgress(20, `Preparing your ${format.toUpperCase()}…`, 'Your document is being prepared securely.');

  const operationMap = {
    docx: 'pdf-to-docx',
    doc: 'pdf-to-doc',
    xlsx: 'pdf-to-xlsx',
    xls: 'pdf-to-xls',
    pptx: 'pdf-to-pptx',
    ppt: 'pdf-to-ppt'
  };

  const operation = operationMap[format];
  if (!operation) {
    throw new Error('That server conversion format is not available.');
  }

  let convertedBlob;

  try {
    convertedBlob = await convertPdfThroughPdfMintEngine(
      pdfBlob,
      operation,
      baseName
    );
  } catch (error) {
    // Legacy PPT is the only format that gets one silent retry.
    // LibreOffice Impress can occasionally be killed on the smallest
    // Sevalla instance during a transient memory spike.
    if (format !== 'ppt') {
      throw error;
    }

    const message = String(error && error.message ? error.message : error);
    const transient =
      message.includes('503') ||
      message.toLowerCase().includes('timed out') ||
      message.toLowerCase().includes('timeout') ||
      message.toLowerCase().includes('cannot be reached');

    if (!transient) {
      throw error;
    }

    updateExportProgress(
      74,
      'Preparing your PPT…',
      'Nearly ready…'
    );

    await new Promise(resolve => setTimeout(resolve, 2200));

    convertedBlob = await convertPdfThroughPdfMintEngine(
      pdfBlob,
      operation,
      baseName
    );
  }

  updateExportProgress(100, 'Download ready', `${baseName}.${format} is ready.`);
  downloadBlob(convertedBlob, `${baseName}.${format}`);
}

async function exportEditedPdfAsOcrDocx() {
  const baseName = safeExportBaseName();
  updateExportProgress(8, 'Preparing OCR', 'Applying your PDF edits firstâ€¦');
  const pdfBlob = await buildFinalEditedPdfBlob();
  updateExportProgress(20, 'Recognising text', 'Scanned pages may take a little longer.');
  const convertedBlob = await convertPdfThroughPdfMintEngine(pdfBlob, 'ocr-docx', baseName);
  updateExportProgress(100, 'Download ready', `${baseName}.docx is ready.`);
  downloadBlob(convertedBlob, `${baseName}.docx`);
}

async function buildFinalEditedPdfBlob() {
  const bytes = await createEditedPdfBytes();
  return new Blob([bytes], { type: 'application/pdf' });
}

function safeExportBaseName() {
  const input = document.getElementById('export-filename');
  const raw = String(input?.value || editor.file?.name || 'document')
    .replace(/\.[^.]+$/, '')
    .trim();
  return (raw || 'document').replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_');
}

function downloadBlob(blob, filename) {
  if (isDashboardEditorSession()) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    pendingDashboardFileSave = /\.pdf$/i.test(String(filename || ''))
      ? saveFileToDashboard(blob, filename)
      : Promise.resolve();
    return;
  }
  pendingCheckoutBlob = blob;
  pendingCheckoutFilename = filename;
  preparedExportFilename = filename;
  openAccessPage();
}

async function loadPdfDocumentFromBlob(blob) {
  await ensurePdfLibraries('pdfjs');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return pdfjsLib.getDocument({ data: bytes }).promise;
}

function encodeRgbaAsTiff(imageData, width, height) {
  const entryCount = 13;
  const ifdOffset = 8;
  const ifdSize = 2 + entryCount * 12 + 4;
  const bitsOffset = ifdOffset + ifdSize;
  const xResolutionOffset = bitsOffset + 6;
  const yResolutionOffset = xResolutionOffset + 8;
  const pixelOffset = yResolutionOffset + 8;
  const pixelBytes = width * height * 3;
  const buffer = new ArrayBuffer(pixelOffset + pixelBytes);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  bytes[0] = 0x49; bytes[1] = 0x49;
  view.setUint16(2, 42, true);
  view.setUint32(4, ifdOffset, true);
  view.setUint16(ifdOffset, entryCount, true);

  let entryOffset = ifdOffset + 2;
  const entry = (tag, type, count, value) => {
    view.setUint16(entryOffset, tag, true);
    view.setUint16(entryOffset + 2, type, true);
    view.setUint32(entryOffset + 4, count, true);
    if (type === 3 && count === 1) view.setUint16(entryOffset + 8, value, true);
    else view.setUint32(entryOffset + 8, value, true);
    entryOffset += 12;
  };

  entry(256, 4, 1, width);
  entry(257, 4, 1, height);
  entry(258, 3, 3, bitsOffset);
  entry(259, 3, 1, 1);
  entry(262, 3, 1, 2);
  entry(273, 4, 1, pixelOffset);
  entry(277, 3, 1, 3);
  entry(278, 4, 1, height);
  entry(279, 4, 1, pixelBytes);
  entry(282, 5, 1, xResolutionOffset);
  entry(283, 5, 1, yResolutionOffset);
  entry(284, 3, 1, 1);
  entry(296, 3, 1, 2);
  view.setUint32(entryOffset, 0, true);

  view.setUint16(bitsOffset, 8, true);
  view.setUint16(bitsOffset + 2, 8, true);
  view.setUint16(bitsOffset + 4, 8, true);
  view.setUint32(xResolutionOffset, 300, true);
  view.setUint32(xResolutionOffset + 4, 1, true);
  view.setUint32(yResolutionOffset, 300, true);
  view.setUint32(yResolutionOffset + 4, 1, true);

  const rgba = imageData.data;
  let destination = pixelOffset;
  for (let source = 0; source < rgba.length; source += 4) {
    bytes[destination++] = rgba[source];
    bytes[destination++] = rgba[source + 1];
    bytes[destination++] = rgba[source + 2];
  }
  return new Blob([buffer], { type: 'image/tiff' });
}

async function renderPdfPageToImageBlob(pdf, pageNumber, format) {
  const page = await pdf.getPage(pageNumber);
  const PDF_POINTS_PER_INCH = 72;
  const TARGET_DPI = 300;
  const targetScale = TARGET_DPI / PDF_POINTS_PER_INCH;
  const viewport = page.getViewport({ scale: targetScale });

  const canvas = document.createElement('canvas');
  const MAX_CANVAS_PIXELS = 40_000_000;
  let renderWidth = Math.ceil(viewport.width);
  let renderHeight = Math.ceil(viewport.height);

  if (renderWidth * renderHeight > MAX_CANVAS_PIXELS) {
    const reduction = Math.sqrt(MAX_CANVAS_PIXELS / (renderWidth * renderHeight));
    renderWidth = Math.max(1, Math.floor(renderWidth * reduction));
    renderHeight = Math.max(1, Math.floor(renderHeight * reduction));
  }

  canvas.width = renderWidth;
  canvas.height = renderHeight;

  const renderScaleX = renderWidth / viewport.width;
  const renderScaleY = renderHeight / viewport.height;
  const context = canvas.getContext('2d', { alpha: format === 'png' });

  if (format !== 'png') {
    context.save();
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }

  await page.render({
    canvasContext: context,
    viewport,
    transform: [renderScaleX, 0, 0, renderScaleY, 0, 0]
  }).promise;

  if (format === 'tiff') {
    return encodeRgbaAsTiff(
      context.getImageData(0, 0, canvas.width, canvas.height),
      canvas.width,
      canvas.height
    );
  }

  const mime = format === 'jpg' ? 'image/jpeg'
    : format === 'webp' ? 'image/webp'
    : 'image/png';
  const quality = format === 'jpg' ? 0.92
    : format === 'webp' ? 0.9
    : undefined;

  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error(`Could not create ${format.toUpperCase()} image.`));
    }, mime, quality);
  });
}

async function exportEditedPdfAsImages(format) {
  updateExportProgress(8, 'Preparing document', 'Applying your PDF edits…');
  const pdfBlob = await buildFinalEditedPdfBlob();
  updateExportProgress(18, `Preparing ${format.toUpperCase()}`, 'Loading the completed PDF…');
  const pdf = await loadPdfDocumentFromBlob(pdfBlob);
  const baseName = safeExportBaseName();
  const extension = format;

  if (pdf.numPages === 1) {
    updateExportProgress(35, `Rendering ${format.toUpperCase()}`, 'Rendering page 1 of 1 at high quality…');
    const blob = await renderPdfPageToImageBlob(pdf, 1, format);
    updateExportProgress(100, 'Download ready', `${baseName}.${extension} is ready.`);
    downloadBlob(blob, `${baseName}.${extension}`);
    return;
  }

  try {
    await loadPdfBreezeVendor('jszip');
  } catch (_) {
    throw new Error('The image packaging library could not be loaded.');
  }

  const zip = new JSZip();
  const digits = String(pdf.numPages).length;

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const pageProgress = 20 + (pageNumber - 1) / pdf.numPages * 60;
    updateExportProgress(
      pageProgress,
      `Rendering ${format.toUpperCase()} pages`,
      `Rendering page ${pageNumber} of ${pdf.numPages}…`
    );
    const blob = await renderPdfPageToImageBlob(pdf, pageNumber, format);
    const padded = String(pageNumber).padStart(digits, '0');
    zip.file(`${baseName}-page-${padded}.${extension}`, blob);
  }

  updateExportProgress(84, 'Packaging images', `Creating one ZIP with ${pdf.numPages} images…`);
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  }, metadata => {
    updateExportProgress(
      84 + metadata.percent * .14,
      'Packaging images',
      `Creating ZIP… ${Math.round(metadata.percent)}%`
    );
  });

  updateExportProgress(100, 'Download ready', `${baseName}-images.zip is ready.`);
  downloadBlob(zipBlob, `${baseName}-images.zip`);
}

async function extractEditedPdfText() {
  updateExportProgress(8, 'Preparing document', 'Applying your PDF edits…');
  const pdfBlob = await buildFinalEditedPdfBlob();
  const pdf = await loadPdfDocumentFromBlob(pdfBlob);
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    updateExportProgress(
      20 + pageNumber / pdf.numPages * 70,
      'Extracting text',
      `Reading page ${pageNumber} of ${pdf.numPages}…`
    );
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const lines = [];
    let currentLine = [];
    let lastY = null;

    textContent.items.forEach(item => {
      const y = Math.round(item.transform?.[5] || 0);
      if (lastY !== null && Math.abs(y - lastY) > 3) {
        if (currentLine.length) lines.push(currentLine.join(' ').replace(/\s+/g, ' ').trim());
        currentLine = [];
      }
      if (item.str) currentLine.push(item.str);
      lastY = y;
    });

    if (currentLine.length) lines.push(currentLine.join(' ').replace(/\s+/g, ' ').trim());

    const pageText = lines.filter(Boolean).join('\n');
    pages.push(pdf.numPages > 1 ? `--- Page ${pageNumber} ---\n${pageText}` : pageText);
  }

  return pages.join('\n\n');
}

async function exportAppliedSplitArchive() {
  await ensurePdfLibraries('pdflib', 'jszip');
  const editedBytes = await createEditedPdfBytes();
  const source = await PDFLib.PDFDocument.load(editedBytes);
  normaliseSplitPoints();
  const boundaries = [0, ...editor.splitPoints, source.getPageCount()];
  const archive = new JSZip();
  const baseName = safeExportBaseName();
  for (let section = 0; section < boundaries.length - 1; section++) {
    const start = boundaries[section];
    const end = boundaries[section + 1];
    const output = await PDFLib.PDFDocument.create();
    const indices = Array.from({length:end-start}, (_, offset) => start + offset);
    const pages = await output.copyPages(source, indices);
    pages.forEach(page => output.addPage(page));
    archive.file(`${baseName}-part-${section + 1}.pdf`, await output.save());
  }
  const blob = await archive.generateAsync({type:'blob',compression:'DEFLATE'});
  updateExportProgress(100, 'Download ready', `${boundaries.length - 1} split PDF files are ready.`);
  downloadBlob(blob, `${baseName}-split.zip`);
}

let pendingWordOcr = false;

async function exportEditedDocument(format) {
  if (format === 'pdf' && editor.splitApplied && editor.splitPoints?.length) {
    await exportAppliedSplitArchive();
    return;
  }
  const baseName = safeExportBaseName();

  if (format === 'pdf') {
    updateExportProgress(10, 'Preparing PDF', 'Applying your edits…');
    const blob = await buildFinalEditedPdfBlob();
    updateExportProgress(100, 'Download ready', `${baseName}.pdf is ready.`);
    downloadBlob(blob, `${baseName}.pdf`);
    return;
  }

  if (format === 'docx' && pendingWordOcr) {
    await exportEditedPdfAsOcrDocx();
    return;
  }

  if (
    format === 'docx' || format === 'doc' ||
    format === 'xlsx' || format === 'xls' ||
    format === 'pptx' || format === 'ppt'
  ) {
    await exportEditedPdfThroughEngine(format);
    return;
  }

  if (format === 'jpg' || format === 'png' || format === 'webp' || format === 'tiff') {
    await exportEditedPdfAsImages(format);
    return;
  }

  if (format === 'txt') {
    const text = await extractEditedPdfText();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    updateExportProgress(100, 'Download ready', `${baseName}.txt is ready.`);
    downloadBlob(blob, `${baseName}.txt`);
    return;
  }

  throw new Error('That export format is not available yet.');
}

document.getElementById('final-download').addEventListener('click', async () => {
  const emailInput = document.getElementById('download-email');
  const error = document.getElementById('email-error');
  const email = String(emailInput?.value || '').trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    if (error) error.hidden = false;
    emailInput?.focus();
    return;
  }

  if (error) error.hidden = true;
  sessionStorage.setItem('pdfmintPendingEmail', email);

  const button = document.getElementById('final-download');
  const selectedFormat = document.querySelector('input[name="export-format"]:checked')?.value || 'pdf';
  const originalText = button.textContent;

  button.disabled = true;
  resetExportProgress();
  startExportCountdown(selectedFormat);
  updateExportProgress(2, 'Starting export', `Preparing ${selectedFormat.toUpperCase()}…`);
  button.textContent = selectedFormat === 'pdf' ? 'Preparing PDF…' : `Preparing ${selectedFormat.toUpperCase()}…`;

  try {
    await ensureCheckoutAccount(email);
    // Only count an email after it has produced a real, authenticated member.
    // Analytics must never delay or block the customer's checkout journey.
    void window.PDFBreezeAnalytics?.track('email_entered');
    await exportEditedDocument(selectedFormat);
  } catch (exportError) {
    console.error('Export failed:', exportError);
    updateExportProgress(
      0,
      'Export could not be completed',
      exportError?.message || 'PDFBreeze could not create that download.'
    );
    showAlert(exportError?.message || 'PDFBreeze could not create that download.');
  } finally {
    stopExportCountdown();
    button.disabled = false;
    button.textContent = originalText;
  }
});

function createCheckoutTemporaryPassword() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, value => alphabet[value % alphabet.length]).join('');
}

async function ensureCheckoutAccount(email) {
  const existingSession = await window.PDFMintAuth?.getSession?.();
  if (existingSession?.access_token) return existingSession;

  if (!window.PDFMintAuth?.signUp) {
    throw new Error('PDFBreeze account services are unavailable. Please try again.');
  }

  const temporaryPassword = createCheckoutTemporaryPassword();
  const result = await window.PDFMintAuth.signUp({
    email,
    password: temporaryPassword,
    firstName: '',
    lastName: ''
  });
  const session = result?.session || await window.PDFMintAuth.getSession?.();
  if (!session?.access_token) {
    throw new Error('Please use the sign-in option for this email before continuing.');
  }

  sessionStorage.setItem('pdfmintCheckoutTemporaryPassword', temporaryPassword);
  return session;
}

document.getElementById('download-email').addEventListener('input', event => {
  event.currentTarget.classList.remove('invalid');
  document.getElementById('email-error').hidden = true;
});

function showOAuthSetupMessage(provider) {
  const error = document.getElementById('email-error');
  error.textContent = `${provider} sign-in requires the ${provider} OAuth connection. Email download is available now.`;
  error.hidden = false;
}

document.getElementById('continue-google')?.addEventListener('click', () => {
  openAccessPage();
});

function initialiseDailyEditCounter(hero, badge) {
  if (!hero || !badge) return;

  let proofRow = badge.closest('.hero-proof-row');
  if (!proofRow) {
    proofRow = document.createElement('div');
    proofRow.className = 'hero-proof-row';
    badge.before(proofRow);
    proofRow.appendChild(badge);
  }

  let counter = proofRow.querySelector('.live-edit-count');
  if (!counter) {
    counter = document.createElement('span');
    counter.className = 'live-edit-count';
    counter.setAttribute('aria-label', 'Live edits today');
    counter.innerHTML = '<span class="live-edit-dot" aria-hidden="true"></span><strong data-edit-count>53,200</strong><span>edits today</span>';
    proofRow.appendChild(counter);
  }

  const output = counter.querySelector('[data-edit-count]');
  if (!output || window.__pdfBreezeDailyEditCounter) return;
  window.__pdfBreezeDailyEditCounter = true;

  const storageKey = 'pdfbreeze-daily-edit-counter-v1';
  const now = Date.now();
  const today = new Date(now).toLocaleDateString('en-CA');
  const baseline = 53200;
  let state = { date: today, value: baseline, updatedAt: now };

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved?.date === today && Number.isFinite(saved.value) && Number.isFinite(saved.updatedAt)) {
      const elapsed = Math.max(0, now - saved.updatedAt);
      const catchUp = Math.floor(elapsed / 1180);
      state = {
        date: today,
        value: Math.max(baseline, Math.floor(saved.value) + catchUp),
        updatedAt: now
      };
    }
  } catch (_) {
    // The counter still works for this visit if browser storage is unavailable.
  }

  const formatter = new Intl.NumberFormat('en-GB');
  const render = () => {
    output.textContent = formatter.format(state.value);
    try { localStorage.setItem(storageKey, JSON.stringify(state)); } catch (_) {}
  };

  const scheduleNextEdit = () => {
    const burst = Math.random() < 0.24;
    const delay = burst
      ? 180 + Math.floor(Math.random() * 360)
      : 720 + Math.floor(Math.random() * 1420);
    window.setTimeout(() => {
      state.value += 1;
      state.updatedAt = Date.now();
      render();
      scheduleNextEdit();
    }, delay);
  };

  render();
  scheduleNextEdit();
}


const heroInput = document.getElementById('file-input');
const heroCard = document.getElementById('upload-card');
const heroStatus = document.getElementById('file-status');
if (heroCard && heroInput) {
  const hero = heroCard.closest('.hero');
  const badge = hero?.querySelector('.hero-copy .eyebrow');
  const title = hero?.querySelector('.hero-copy h1')?.textContent.trim() || '';
  const isHome = /Everything you need to work with PDFs/i.test(title);
  if (badge) {
    badge.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.6-2.8 8.1-7 10-4.2-1.9-7-5.4-7-10V6l7-3Z" fill="none" stroke="currentColor" stroke-width="1.8"/></svg><span>Trusted by 1M+ users</span>';
    initialiseDailyEditCounter(hero, badge);
  }
  if (!isHome) {
    const list = hero?.querySelector('.check-list');
    const lowerTitle = title.toLowerCase();
    const items = lowerTitle.includes('sign')
      ? ['Create a signature in seconds', 'Place and resize it precisely', 'Add notes and highlights', 'Download a polished PDF']
      : (lowerTitle.includes('edit')
        ? ['Edit text and add new content', 'Sign and annotate in your browser', 'Organise pages visually', 'Download a polished PDF']
        : ['Fast document conversion', 'Preserve clean page formatting', 'Secure processing', 'Works on desktop and mobile']);
    if (list) list.innerHTML = items.map(item => `<li>${item}</li>`).join('');
  }
  const dropTitle = heroCard.querySelector('h2');
  const dropCopy = heroCard.querySelector('p');
  const dropSmall = heroCard.querySelector('small');
  if (dropTitle) dropTitle.textContent = 'Drag & drop your document to start';
  if (dropCopy) dropCopy.textContent = 'or choose a file from your device';
  if (dropSmall) dropSmall.textContent = 'Secure processing · files up to 100 MB';
  heroCard.tabIndex = 0;
  heroCard.setAttribute('role', 'button');
  heroCard.setAttribute('aria-label', 'Choose a document to upload');
  heroCard.addEventListener('click', event => {
    if (event.target.closest('input, label, button, a')) return;
    heroInput.click();
  });
  heroCard.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    heroInput.click();
  });
['dragenter','dragover'].forEach(name => heroCard.addEventListener(name, event => {
  event.preventDefault(); heroCard.classList.add('dragover');
}));
['dragleave','drop'].forEach(name => heroCard.addEventListener(name, event => {
  event.preventDefault(); heroCard.classList.remove('dragover');
}));
heroCard.addEventListener('drop', event => {
  const file = event.dataTransfer.files[0];
  if (!file) return;
  if (
    document.body.dataset.compressFlow === 'true' ||
    document.body.dataset.compressImageFlow === 'true'
  ) {
    window.dispatchEvent(new CustomEvent('pdfmint:compression-drop', { detail: { file } }));
    return;
  }
  if (document.body.dataset.mergeFlow === 'true') {
    window.dispatchEvent(new CustomEvent('pdfmint:merge-drop', { detail: { files: event.dataTransfer.files } }));
    return;
  }
  if (document.body.dataset.ocrFlow === 'true') {
    window.dispatchEvent(new CustomEvent('pdfmint:ocr-drop', { detail: { file } }));
    return;
  }
  // Same destination as choosing a file: the primary (PDFium) editor.
  // Previously a drop opened the legacy editor embedded in the landing page.
  if (document.body.dataset.editorRoute !== 'true') {
    if (!validPdf(file)) {
      if (heroStatus) heroStatus.textContent = 'Please select a valid PDF file.';
      return;
    }
    routeLandingUploadToEditor(file);
    return;
  }
  loadEditorPdf(file);
});
}
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
    await ensurePdfLibraries('pdflib');
    const output = await PDFLib.PDFDocument.create();
    for (const file of mergeFiles) {
      const source = await PDFLib.PDFDocument.load(await file.arrayBuffer());
      const pages = await output.copyPages(source, source.getPageIndices());
      pages.forEach(page => output.addPage(page));
    }
    downloadPdf(await output.save(), 'pdfbreeze-merged.pdf');
  } catch (_) { showAlert('The files could not be merged.'); }
  finally { button.disabled = false; button.textContent = 'Merge and download'; }
});

async function setSplitFile(file) {
  if (!validPdf(file)) return showAlert('Please select a valid PDF file.');
  try {
    await ensurePdfLibraries('pdflib');
    const source = await PDFLib.PDFDocument.load(await file.arrayBuffer());
    splitFile = file; splitPageCount = source.getPageCount();
    document.getElementById('split-file-summary').textContent =
      `${file.name} · ${splitPageCount} page${splitPageCount === 1 ? '' : 's'} · ${formatBytes(file.size)}`;
    document.getElementById('split-help').textContent = `Choose pages from 1 to ${splitPageCount}.`;
    document.getElementById('split-button').disabled = false;
  } catch (_) { showAlert('PDFBreeze could not open this file.'); }
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


/* PDFBreeze v3.1.2 — basic Image tool
   Reuses the proven Signature image object pipeline without modifying PDF loading. */
(function initialiseBasicImageTool() {
  const button = document.getElementById('image-tool');
  const input = document.getElementById('image-file-input');
  if (!button || !input) return;

  button.addEventListener('click', () => {
    if (!editor.pages.length) {
      showAlert('Upload a PDF before adding an image.');
      return;
    }
    input.click();
  });

  input.addEventListener('change', event => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showAlert('Please select an image file.');
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => showAlert('The selected image could not be read.');
    reader.onload = () => {
      const uploadedImage = new Image();
      uploadedImage.onerror = () => showAlert('The selected image could not be loaded.');
      uploadedImage.onload = () => {
        try {
          // Convert every browser-supported image format to PNG so the existing
          // pdf-lib export path remains reliable for JPG, PNG, WebP, GIF, HEIC
          // where the browser can decode it, and other device image formats.
          const conversionCanvas = document.createElement('canvas');
          conversionCanvas.width = uploadedImage.naturalWidth;
          conversionCanvas.height = uploadedImage.naturalHeight;
          const context = conversionCanvas.getContext('2d');
          context.drawImage(uploadedImage, 0, 0);
          const pngDataUrl = conversionCanvas.toDataURL('image/png');
          const aspect = uploadedImage.naturalWidth / Math.max(1, uploadedImage.naturalHeight);

          editor.pendingSignature = {
            dataUrl: pngDataUrl,
            source: 'image-tool',
            aspect,
            defaultWidth: aspect > 2.5 ? .46 : aspect < .7 ? .24 : .34
          };

          // This stable function already places, selects, moves, resizes,
          // records history and exports image-based page objects correctly.
          placePendingSignatureCentered();
          showEditorHint('Image added. Drag it to move or use the blue handles to resize.');
        } catch (error) {
          console.error('Image placement failed', error);
          showAlert('The selected image could not be added.');
        }
      };
      uploadedImage.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
})();


/* PDFBreeze v3.2 — Stamp tool
   Premade and custom stamps reuse the stable Signature placement/resize/export pipeline. */
(function initialiseStampTool() {
  const button = document.getElementById('stamp-tool');
  const modal = document.getElementById('stamp-modal');
  const grid = document.getElementById('stamp-grid');
  const libraryView = document.getElementById('stamp-library-view');
  const customView = document.getElementById('stamp-custom-view');
  const modeButton = document.getElementById('stamp-mode-button');
  const title = document.getElementById('stamp-modal-title');
  const cancel = document.getElementById('stamp-cancel');
  const create = document.getElementById('stamp-create');
  const customText = document.getElementById('stamp-custom-text');
  const includeDate = document.getElementById('stamp-include-date');
  const includeTime = document.getElementById('stamp-include-time');
  const preview = document.getElementById('stamp-custom-preview');

  if (!button || !modal || !grid || !preview) return;

  let selectedColour = '#ef3f43';
  let customMode = false;

  const presets = [
    {text:'APPROVED', colour:'#4f8a2c', fill:'#b8dda5'},
    {text:'NOT APPROVED', colour:'#9d1022', fill:'#f47b8d', scale:.78},
    {text:'DRAFT', colour:'#18276b', fill:'#9ba5dc', scale:1.18},
    {text:'FINAL', colour:'#356716', fill:'#badf9f', scale:1.18},
    {text:'COMPLETED', colour:'#397124', fill:'#b8dda5', scale:.82},
    {text:'CONFIDENTIAL', colour:'#18276b', fill:'#9ba5dc', scale:.72},
    {text:'DEPARTMENTAL', colour:'#18276b', fill:'#9ba5dc', scale:.7},
    {text:'EXPERIMENTAL', colour:'#18276b', fill:'#9ba5dc', scale:.72},
    {text:'EXPIRED', colour:'#18276b', fill:'#9ba5dc', scale:1.08},
    {text:'SOLD', colour:'#18276b', fill:'#9ba5dc', scale:1.25},
    {text:'TOP SECRET', colour:'#8b1020', fill:'#f77c8b', scale:.82},
    {text:'REVISED', colour:'#18276b', fill:'#9ba5dc', scale:1.05, date:true},
    {text:'REJECTED', colour:'#8b1020', fill:'#f77c8b', scale:.95, date:true},
    {text:'FOR PUBLIC RELEASE', colour:'#18276b', fill:'#9ba5dc', scale:.57},
    {text:'NOT FOR PUBLIC RELEASE', colour:'#18276b', fill:'#9ba5dc', scale:.48},
    {text:'FOR COMMENT', colour:'#18276b', fill:'#9ba5dc', scale:.75},
    {text:'VOID', colour:'#9d1022', fill:'#f47b8d', scale:1.35},
    {text:'PRELIMINARY RESULTS', colour:'#18276b', fill:'#9ba5dc', scale:.52},
    {text:'INFORMATION ONLY', colour:'#18276b', fill:'#9ba5dc', scale:.58},
    {text:'✕', colour:'#8e0d1d', fill:'#e56874', symbol:true},
    {text:'✓', colour:'#356716', fill:'#a8ce91', symbol:true},
    {text:'INITIAL HERE', colour:'#403184', fill:'#b1a4ef', tag:'left'},
    {text:'SIGN HERE', colour:'#7a1823', fill:'#df929b', tag:'left'},
    {text:'WITNESS', colour:'#c49734', fill:'#fff0a3', tag:'left'},
    {text:'AS IS', colour:'#18276b', fill:'#9ba5dc', scale:1.25}
  ];

  function deviceDate() {
    return new Intl.DateTimeFormat(undefined, {
      year:'numeric', month:'2-digit', day:'2-digit'
    }).format(new Date());
  }

  function deviceTime() {
    return new Intl.DateTimeFormat(undefined, {
      hour:'2-digit', minute:'2-digit'
    }).format(new Date());
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function colourWithAlpha(hex, alpha) {
    const value = hex.replace('#','');
    const r = parseInt(value.slice(0,2),16);
    const g = parseInt(value.slice(2,4),16);
    const b = parseInt(value.slice(4,6),16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function drawStamp(canvas, options) {
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0,0,width,height);

    const pad = Math.round(width * .055);
    const x = pad;
    const y = pad;
    const w = width - pad * 2;
    const h = height - pad * 2;
    const colour = options.colour || '#ef3f43';
    const fill = options.fill || colourWithAlpha(colour,.5);
    const text = String(options.text || '').trim();
    const dateLine = options.dateLine || '';

    ctx.save();
    ctx.fillStyle = fill;
    ctx.strokeStyle = colour;
    ctx.lineWidth = Math.max(4, width * .012);

    if (options.tag === 'left') {
      const point = Math.round(w * .16);
      ctx.beginPath();
      ctx.moveTo(x + point, y);
      ctx.lineTo(x + w, y);
      ctx.quadraticCurveTo(x + w + 8, y, x + w + 8, y + 10);
      ctx.lineTo(x + w + 8, y + h - 10);
      ctx.quadraticCurveTo(x + w + 8, y + h, x + w, y + h);
      ctx.lineTo(x + point, y + h);
      ctx.lineTo(x, y + h/2);
      ctx.closePath();
    } else {
      roundedRect(ctx,x,y,w,h,Math.round(height*.07));
    }

    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colour;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (options.symbol) {
      ctx.font = `700 ${Math.round(height*.62)}px Arial`;
      ctx.fillText(text, width/2, height/2 + height*.015);
    } else {
      let fontSize = Math.round(height * .37 * (options.scale || 1));
      ctx.font = `italic 700 ${fontSize}px Arial`;
      while (ctx.measureText(text).width > w * .82 && fontSize > 18) {
        fontSize -= 2;
        ctx.font = `italic 700 ${fontSize}px Arial`;
      }
      const mainY = dateLine ? height*.44 : height*.52;
      ctx.fillText(text || deviceDate(), width/2 + (options.tag === 'left' ? width*.035 : 0), mainY);

      if (dateLine) {
        ctx.font = `700 ${Math.round(height*.12)}px Arial`;
        ctx.fillText(dateLine, width/2, height*.72);
      }
    }

    ctx.restore();
    return canvas.toDataURL('image/png');
  }

  function makePresetDataUrl(preset, canvasWidth=620, canvasHeight=230) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    return drawStamp(canvas, {
      ...preset,
      dateLine:preset.date ? `${deviceDate()}, ${deviceTime()}` : ''
    });
  }

  function placeStamp(dataUrl, aspect=2.7) {
    editor.pendingSignature = {
      dataUrl,
      source:'stamp-tool',
      aspect,
      defaultWidth:.34
    };
    placePendingSignatureCentered();
    closeModal();
    showEditorHint('Stamp added. Drag it to move or use the blue handles to resize.');
  }

  function renderPresetGrid() {
    grid.innerHTML = '';
    presets.forEach(preset => {
      const choice = document.createElement('button');
      choice.type = 'button';
      choice.className = 'stamp-choice';
      choice.setAttribute('aria-label', `Add ${preset.text} stamp`);

      const canvas = document.createElement('canvas');
      canvas.width = 360;
      canvas.height = 135;
      drawStamp(canvas, {
        ...preset,
        dateLine:preset.date ? `${deviceDate()}, ${deviceTime()}` : ''
      });

      choice.appendChild(canvas);
      choice.addEventListener('click', () => {
        placeStamp(makePresetDataUrl(preset), 620/230);
      });
      grid.appendChild(choice);
    });
  }

  function customStampOptions() {
    const lines = [];
    if (includeDate.checked) lines.push(deviceDate());
    if (includeTime.checked) lines.push(deviceTime());

    return {
      text:customText.value.trim(),
      colour:selectedColour,
      fill:colourWithAlpha(selectedColour,.53),
      dateLine:lines.join(', ')
    };
  }

  function renderCustomPreview() {
    drawStamp(preview, customStampOptions());
  }

  function setMode(isCustom) {
    customMode = isCustom;
    libraryView.hidden = isCustom;
    customView.hidden = !isCustom;
    create.hidden = !isCustom;
    title.textContent = isCustom ? 'Custom Stamp' : 'Use an existing stamp design';
    modeButton.textContent = isCustom ? 'Use an existing stamp design' : 'Custom Stamp';
    if (isCustom) renderCustomPreview();
  }

  function openModal() {
    if (!editor.pages.length) {
      showAlert('Upload a PDF before adding a stamp.');
      return;
    }
    renderPresetGrid();
    setMode(false);
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.hidden = true;
    document.body.style.overflow = '';
  }

  button.addEventListener('click', openModal);
  modeButton.addEventListener('click', () => setMode(!customMode));
  cancel.addEventListener('click', closeModal);
  modal.querySelectorAll('[data-close-stamp]').forEach(node => node.addEventListener('click', closeModal));

  customText.addEventListener('input', renderCustomPreview);
  includeDate.addEventListener('change', renderCustomPreview);
  includeTime.addEventListener('change', renderCustomPreview);

  document.querySelectorAll('[data-stamp-colour]').forEach(colourButton => {
    colourButton.addEventListener('click', () => {
      selectedColour = colourButton.dataset.stampColour;
      document.querySelectorAll('[data-stamp-colour]').forEach(node => {
        node.classList.toggle('active', node === colourButton);
      });
      renderCustomPreview();
    });
  });

  create.addEventListener('click', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 760;
    canvas.height = 300;
    const dataUrl = drawStamp(canvas, customStampOptions());
    placeStamp(dataUrl, 760/300);
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });
})();



document.getElementById('send-to-email')?.addEventListener('click', function(event) {
  event.preventDefault();
  document.getElementById('download-edited-pdf')?.click();
});

document.getElementById('annotation-layer')?.addEventListener('pointerdown', event => {
  if (editor.mode === 'note') placeNoteAt(event);
}, true);


/* PDFBreeze v3.8.0 — one shared editor route */
const PDFMINT_TRANSFER_DB = 'pdfmint-editor-transfer';
const PDFMINT_TRANSFER_STORE = 'uploads';
const PDFMINT_TRANSFER_KEY = 'pending-pdf';

function openPdfMintTransferDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(PDFMINT_TRANSFER_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PDFMINT_TRANSFER_STORE)) {
        db.createObjectStore(PDFMINT_TRANSFER_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function storePdfForSharedEditor(file, completionNotice = null, progress = () => {}) {
  const db = await openPdfMintTransferDb();
  const bytes = await file.arrayBuffer();
  await progress('process', 62, 'Processing document');
  await new Promise((resolve, reject) => {
    const tx = db.transaction(PDFMINT_TRANSFER_STORE, 'readwrite');
    tx.objectStore(PDFMINT_TRANSFER_STORE).put({
      name: file.name,
      type: file.type || 'application/pdf',
      lastModified: file.lastModified || Date.now(),
      bytes,
      completionNotice
    }, PDFMINT_TRANSFER_KEY);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function routeFileToSharedEditor(file, options = {}) {
  if (!file) throw new Error('No file was provided for the editor.');

  const progress = typeof options.onProgress === 'function' ? options.onProgress : () => {};
  await progress('upload', 34, 'Uploading file');
  await storePdfForSharedEditor(file, options.completionNotice || null, progress);
  await progress('open', 86, 'Opening editor');

  const params = new URLSearchParams();
  if (options.tool && options.tool !== 'none') params.set('tool', options.tool);
  if (options.source) params.set('source', options.source);
  if (options.managerAction) params.set('action', options.managerAction);
  if (options.exportFormat) {
    params.set('export', '1');
    params.set('format', options.exportFormat);
  }
  if (options.imageConvertFormat) {
    params.set('convert', 'image');
    params.set('format', options.imageConvertFormat);
  }
  if (options.documentConvertType) {
    params.set('convert', options.documentConvertType);
  }

  const query = params.toString();
  const editorChoice = new URLSearchParams(window.location.search).get('editor');
  const editorRoute = editorChoice === 'next'
    ? 'editor-next.html'
    : editorChoice === 'legacy'
      ? 'editor.html'
      : 'editor-pdfium.html';
  if (typeof options.beforeNavigate === 'function') await options.beforeNavigate();
  window.location.href = `${editorRoute}${query ? `?${query}` : ''}`;
}

window.PDFMintShared = Object.assign(window.PDFMintShared || {}, {
  compressPdfThroughEngine(file, level) {
    const safeLevel = ['light', 'standard', 'high'].includes(level) ? level : 'standard';
    const baseName = String(file?.name || 'document').replace(/\.pdf$/i, '');
    return convertPdfThroughPdfMintEngine(file, `compress-pdf-${safeLevel}`, baseName);
  },
  openEditorWithExport(file, format, completionNotice = null) {
    return routeFileToSharedEditor(file, { exportFormat: format, completionNotice });
  }
});

async function takePdfForSharedEditor() {
  const db = await openPdfMintTransferDb();
  const record = await new Promise((resolve, reject) => {
    const tx = db.transaction(PDFMINT_TRANSFER_STORE, 'readwrite');
    const store = tx.objectStore(PDFMINT_TRANSFER_STORE);
    const request = store.get(PDFMINT_TRANSFER_KEY);
    request.onsuccess = () => {
      const value = request.result || null;
      store.delete(PDFMINT_TRANSFER_KEY);
      resolve(value);
    };
    request.onerror = () => reject(request.error);
  });
  db.close();

  if (!record) return null;
  return new File([record.bytes], record.name, {
    type: record.type || 'application/pdf',
    lastModified: record.lastModified || Date.now()
  });
}

function sharedEditorUrl(tool) {
  if (!tool || tool === 'none') return 'editor-pdfium.html';
  return `editor-pdfium.html?tool=${encodeURIComponent(tool)}`;
}

// Processing popup shown while a landing-page upload is handed to the editor.
// Built on first use; progress follows the real steps (read file, store it, open editor).
const uploadProgress = (() => {
  let root = null;
  let lastStepAt = 0;
  const STEP_MS = 320; // each step stays visible briefly, so the whole popup lasts about a second
  const steps = ['upload', 'process', 'open'];
  const build = () => {
    root = document.createElement('div');
    root.className = 'upload-progress';
    root.hidden = true;
    root.innerHTML = `
      <div class="upload-progress-card" role="dialog" aria-modal="true" aria-labelledby="upload-progress-title">
        <h2 id="upload-progress-title">Processing your document</h2>
        <div class="upload-progress-body">
          <div class="upload-progress-file">
            <span class="upload-progress-file-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg></span>
            <span class="upload-progress-name" data-up-name></span>
          </div>
          <div class="upload-progress-spinner" aria-hidden="true"><span></span></div>
          <p class="upload-progress-label" data-up-label>Uploading file</p>
          <div class="upload-progress-meter">
            <div class="upload-progress-meta"><span>Progress</span><span data-up-pct>0%</span></div>
            <div class="upload-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="upload-progress-bar" data-up-bar></div></div>
          </div>
          <ol class="upload-progress-steps">
            <li data-up-step="upload"><span class="upload-progress-dot"></span>Upload file</li>
            <li data-up-step="process"><span class="upload-progress-dot"></span>Process document</li>
            <li data-up-step="open"><span class="upload-progress-dot"></span>Open in editor</li>
          </ol>
        </div>
        <p class="upload-progress-foot">This may take a few moments. Please don't close this window.</p>
      </div>`;
    document.body.appendChild(root);
  };
  const set = async (step, pct, label) => {
    const wait = STEP_MS - (performance.now() - lastStepAt);
    if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
    lastStepAt = performance.now();
    const index = steps.indexOf(step);
    root.querySelectorAll('[data-up-step]').forEach((item, i) => {
      item.classList.toggle('is-done', i < index || pct >= 100);
      item.classList.toggle('is-active', i === index && pct < 100);
    });
    root.querySelector('[data-up-label]').textContent = label;
    root.querySelector('[data-up-pct]').textContent = `${Math.round(pct)}%`;
    root.querySelector('[data-up-bar]').style.width = `${pct}%`;
    root.querySelector('[role="progressbar"]').setAttribute('aria-valuenow', String(Math.round(pct)));
  };
  // Back/forward cache: hide the popup if the visitor returns to this page.
  window.addEventListener('pageshow', () => { if (root) root.hidden = true; document.documentElement.classList.remove('upload-progress-open'); });
  return {
    open(name) {
      if (!root) build();
      root.querySelector('[data-up-name]').textContent = name;
      lastStepAt = 0;
      set('upload', 8, 'Uploading file');
      root.hidden = false;
      document.documentElement.classList.add('upload-progress-open');
    },
    set,
    close() {
      if (root) root.hidden = true;
      document.documentElement.classList.remove('upload-progress-open');
    }
  };
})();

async function routeLandingUploadToEditor(file) {
  if (!file) return;
  const status = document.getElementById('file-status');
  if (status) status.textContent = '';
  uploadProgress.open(file.name);

  try {
    let tool = document.body.dataset.landingTool || 'edit';
    if (tool === 'none' && /(?:^|\/)add-watermark\.html$/i.test(window.location.pathname)) {
      tool = 'watermark';
    }
    if (tool === 'none' && /(?:^|\/)crop-pdf\.html$/i.test(window.location.pathname)) {
      tool = 'crop';
    }
    const path = window.location.pathname.toLowerCase();
    const imageConvertFormat = /(?:^|\/)pdf-to-jpg\.html$/.test(path) ? 'jpg'
      : /(?:^|\/)pdf-to-png\.html$/.test(path) ? 'png'
      : '';
    const documentConvertType = /(?:^|\/)pdf-to-word\.html$/.test(path) ? 'word'
      : /(?:^|\/)pdf-to-excel\.html$/.test(path) ? 'excel'
      : /(?:^|\/)pdf-to-pptx\.html$/.test(path) ? 'powerpoint'
      : '';
    const exportFormat = /(?:^|\/)pdf-to-(?:jpg|jpeg|image|picture)\.html$/.test(path) ? 'jpg'
      : /(?:^|\/)pdf-to-png\.html$/.test(path) ? 'png'
      : /(?:^|\/)pdf-to-txt\.html$/.test(path) ? 'txt'
      : /(?:^|\/)pdf-to-xls\.html$/.test(path) ? 'xls'
      : /(?:^|\/)pdf-to-xlsx\.html$/.test(path) ? 'xlsx'
      : /(?:^|\/)pdf-to-word\.html$/.test(path) ? 'docx'
      : /(?:^|\/)pdf-to-excel\.html$/.test(path) ? 'xlsx'
      : /(?:^|\/)pdf-to-pptx\.html$/.test(path) ? 'pptx'
      : '';
    let managerAction = '';
    if (/(?:^|\/)rotate-pdf\.html$/.test(path)) managerAction = 'rotate';
    if (/(?:^|\/)delete-pdf-pages\.html$/.test(path)) managerAction = 'delete';
    if (/(?:^|\/)split-pdf\.html$/.test(path)) managerAction = 'split';
    if (managerAction) tool = 'manage';
    await routeFileToSharedEditor(file, {
      tool, managerAction, imageConvertFormat, documentConvertType, exportFormat,
      onProgress: (step, pct, label) => uploadProgress.set(step, pct, label),
      beforeNavigate: () => uploadProgress.set('open', 100, 'Opening editor')
    });
  } catch (error) {
    console.error('Could not transfer PDF to editor:', error);
    uploadProgress.close();
    if (status) status.textContent = 'Could not open the editor. Please try again.';
  }
}

function activateSharedEditorTool(tool) {
  const buttonIds = {
    edit: 'edit-text-tool',
    text: 'add-text-tool',
    sign: 'sign-tool',
    image: 'image-tool',
    link: 'link-tool',
    note: 'note-tool',
    watermark: 'watermark-tool',
    crop: 'crop-tool',
    highlight: 'text-highlight-tool',
    stamp: 'stamp-tool',
    split: 'manage-tool',
    manage: 'manage-tool'
  };
  const id = buttonIds[tool];
  if (id) requestAnimationFrame(() => document.getElementById(id)?.click());
}

function openImageConvertModal(preferredFormat = 'jpg') {
  const modal = document.getElementById('image-convert-modal');
  if (!modal || !editor.pages.length) return;
  const format = ['jpg', 'png', 'webp', 'tiff'].includes(preferredFormat) ? preferredFormat : 'jpg';
  const radio = modal.querySelector(`input[name="image-convert-format"][value="${format}"]`);
  if (radio) radio.checked = true;
  modal.querySelectorAll('.image-convert-choice').forEach(choice => {
    choice.classList.toggle('active', choice.querySelector('input')?.checked);
  });
  const filename = document.getElementById('image-convert-filename');
  filename.value = String(editor.file?.name || 'document').replace(/\.pdf$/i, '');
  document.getElementById('image-convert-extension').textContent = `.${format}`;
  modal.hidden = false;
}

const imageConvertModal = document.getElementById('image-convert-modal');
if (imageConvertModal) {
  imageConvertModal.querySelectorAll('input[name="image-convert-format"]').forEach(input => {
    input.addEventListener('change', () => {
      imageConvertModal.querySelectorAll('.image-convert-choice').forEach(choice => {
        choice.classList.toggle('active', choice.contains(input) && input.checked);
      });
      document.getElementById('image-convert-extension').textContent = `.${input.value}`;
    });
  });
  imageConvertModal.querySelectorAll('[data-close-image-convert]').forEach(button => {
    button.addEventListener('click', () => { imageConvertModal.hidden = true; });
  });
  document.getElementById('image-convert-download')?.addEventListener('click', () => {
    const format = imageConvertModal.querySelector('input[name="image-convert-format"]:checked')?.value || 'jpg';
    const exportRadio = document.querySelector(`input[name="export-format"][value="${format}"]`);
    if (exportRadio) {
      exportRadio.checked = true;
      exportRadio.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const rawName = String(document.getElementById('image-convert-filename').value || 'document').trim();
    document.getElementById('export-filename').value = rawName || 'document';
    imageConvertModal.hidden = true;
    openEmailModal();
  });
}

const documentConversionPresets = {
  word: {
    title: 'Convert PDF to Word',
    defaultFormat: 'docx',
    formats: [
      ['docx', 'DOCX', 'Editable document for modern Microsoft Word.'],
      ['doc', 'DOC', 'Compatible with older versions of Microsoft Word.'],
      ['png', 'PNG', 'Crisp page images with lossless quality.'],
      ['jpg', 'JPG', 'Compact page images that are easy to share.']
    ]
  },
  excel: {
    title: 'Convert PDF to Excel',
    defaultFormat: 'xlsx',
    formats: [
      ['xlsx', 'XLSX', 'Editable spreadsheets for calculations and data analysis.'],
      ['xls', 'XLS', 'Compatible with older versions of Microsoft Excel.'],
      ['docx', 'DOCX', 'Editable Word document with reconstructed content.'],
      ['txt', 'TXT', 'Plain text for quick reuse and data processing.']
    ]
  },
  powerpoint: {
    title: 'Convert PDF to PowerPoint',
    defaultFormat: 'pptx',
    formats: [
      ['pptx', 'PPTX', 'Editable slides for modern PowerPoint.'],
      ['ppt', 'PPT', 'Compatible with older versions of PowerPoint.'],
      ['png', 'PNG', 'Crisp page images for slides and presentations.'],
      ['jpg', 'JPG', 'Compact page images that are easy to share.']
    ]
  }
};

function openDocumentConvertModal(type) {
  const modal = document.getElementById('document-convert-modal');
  const preset = documentConversionPresets[type];
  if (!modal || !preset || !editor.pages.length) return;
  modal.dataset.conversionType = type;
  document.getElementById('document-convert-title').textContent = preset.title;
  document.getElementById('document-convert-options').innerHTML = preset.formats.map((format, index) => {
    const [value, label, description] = format;
    return `<label class="image-convert-choice${index === 0 ? ' active' : ''}"><input type="radio" name="document-convert-format" value="${value}"${index === 0 ? ' checked' : ''}><span class="image-convert-icon format-${value}">${label}</span><strong>${label}<small>${description}</small></strong><i aria-hidden="true"></i></label>`;
  }).join('');
  const filename = document.getElementById('document-convert-filename');
  filename.value = String(editor.file?.name || 'document').replace(/\.pdf$/i, '');
  document.getElementById('document-convert-extension').textContent = `.${preset.defaultFormat}`;
  const wordMethod = document.getElementById('word-convert-method');
  if (wordMethod) {
    wordMethod.hidden = type !== 'word';
    const standard = wordMethod.querySelector('input[value="standard"]');
    if (standard) standard.checked = true;
    pendingWordOcr = false;
    wordMethod.querySelectorAll('.word-convert-method-choice').forEach(choice => {
      choice.classList.toggle('active', choice.querySelector('input')?.checked);
      choice.classList.remove('disabled');
    });
  }
  modal.querySelectorAll('input[name="document-convert-format"]').forEach(input => {
    input.addEventListener('change', () => {
      modal.querySelectorAll('.image-convert-choice').forEach(choice => {
        choice.classList.toggle('active', choice.contains(input) && input.checked);
      });
      document.getElementById('document-convert-extension').textContent = `.${input.value}`;
      updateWordConversionMethodAvailability(input.value);
    });
  });
  updateWordConversionMethodAvailability(preset.defaultFormat);
  modal.hidden = false;
}

function updateWordConversionMethodAvailability(format) {
  const method = document.getElementById('word-convert-method');
  if (!method || method.hidden) return;
  const ocrInput = method.querySelector('input[value="ocr"]');
  const ocrChoice = ocrInput?.closest('.word-convert-method-choice');
  const supportsOcr = format === 'docx';
  if (ocrInput) ocrInput.disabled = !supportsOcr;
  ocrChoice?.classList.toggle('disabled', !supportsOcr);
  if (!supportsOcr && ocrInput?.checked) {
    const standard = method.querySelector('input[value="standard"]');
    if (standard) standard.checked = true;
  }
  method.querySelectorAll('.word-convert-method-choice').forEach(choice => {
    choice.classList.toggle('active', choice.querySelector('input')?.checked);
  });
  const help = document.getElementById('word-convert-method-help');
  if (help) help.textContent = supportsOcr
    ? 'Choose OCR only for scanned PDFs or photographed pages.'
    : 'OCR is available when DOCX is selected.';
}

const documentConvertModal = document.getElementById('document-convert-modal');
if (documentConvertModal) {
  documentConvertModal.querySelectorAll('input[name="word-convert-method"]').forEach(input => {
    input.addEventListener('change', () => {
      documentConvertModal.querySelectorAll('.word-convert-method-choice').forEach(choice => {
        choice.classList.toggle('active', choice.contains(input) && input.checked);
      });
    });
  });
  documentConvertModal.querySelectorAll('[data-close-document-convert]').forEach(button => {
    button.addEventListener('click', () => { documentConvertModal.hidden = true; });
  });
  document.getElementById('document-convert-download')?.addEventListener('click', () => {
    const format = documentConvertModal.querySelector('input[name="document-convert-format"]:checked')?.value;
    if (!format) return;
    const exportRadio = document.querySelector(`input[name="export-format"][value="${format}"]`);
    if (!exportRadio) return showAlert('That conversion format is not available.');
    exportRadio.checked = true;
    exportRadio.dispatchEvent(new Event('change', { bubbles: true }));
    pendingWordOcr = documentConvertModal.dataset.conversionType === 'word'
      && format === 'docx'
      && documentConvertModal.querySelector('input[name="word-convert-method"]:checked')?.value === 'ocr';
    const rawName = String(document.getElementById('document-convert-filename').value || 'document').trim();
    document.getElementById('export-filename').value = rawName || 'document';
    documentConvertModal.hidden = true;
    openEmailModal();
  });
}

async function initialiseSharedEditorRoute() {
  if (document.body.dataset.editorRoute !== 'true') return;

  const requestedTool = new URLSearchParams(window.location.search).get('tool') || 'none';
  const tool = requestedTool === 'edit' ? 'none' : requestedTool;

  try {
    const file = await takePdfForSharedEditor();
    if (!file) {
      const previewMode = new URLSearchParams(window.location.search).get('preview');
      if (['plans', 'payment', 'zendocs-payment'].includes(previewMode)) {
        document.body.classList.remove('editor-route-loading');
        return;
      }
      window.location.replace('index.html');
      return;
    }

    await loadEditorPdf(file);
    activateSharedEditorTool(tool);

    const routeParams = new URLSearchParams(window.location.search);
    if (routeParams.get('pdfiumCheckout') === '1') {
      document.body.classList.remove('editor-route-loading');
      const preferredFormat = routeParams.get('format') || sessionStorage.getItem('pdfbreezePdfiumExportFormat') || 'pdf';
      const preferredRadio = document.querySelector(`input[name="export-format"][value="${CSS.escape(preferredFormat)}"]`);
      const fallbackRadio = document.querySelector('input[name="export-format"][value="pdf"]');
      const radio = preferredRadio || fallbackRadio;
      if (radio) {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const transferredName = sessionStorage.getItem('pdfbreezePdfiumExportName');
      if (transferredName) document.getElementById('export-filename').value = transferredName;
      // Split points chosen in the PDF editor's Pages window: the PDF download becomes a ZIP of the parts.
      const transferredSplit = sessionStorage.getItem('pdfbreezePdfiumSplitPoints');
      sessionStorage.removeItem('pdfbreezePdfiumSplitPoints');
      if (transferredSplit && preferredFormat === 'pdf') {
        try {
          const total = editor.pages?.length || 0;
          const points = [...new Set(JSON.parse(transferredSplit).map(Number))].filter(n => Number.isInteger(n) && n > 0 && n < total).sort((a, b) => a - b);
          if (points.length) { editor.splitPoints = points; editor.splitApplied = true; }
        } catch (_) {}
      }
      sessionStorage.removeItem('pdfbreezePdfiumExportName');
      sessionStorage.removeItem('pdfbreezePdfiumExportFormat');
      const signedInUser = await window.PDFMintAuth?.getUser?.();
      if (signedInUser) {
        if (routeParams.get('source') === 'dashboard' || await hasUnlimitedPaidAccess()) {
          pdfiumAuthenticatedCheckout = true;
          requestAnimationFrame(() => document.getElementById('continue-to-email')?.click());
        } else {
          const emailInput = document.getElementById('download-email');
          if (emailInput) emailInput.value = signedInUser.email || '';
          requestAnimationFrame(() => document.getElementById('final-download')?.click());
        }
      } else if (routeParams.get('googleBridge') === '1') {
        preparedExportFilename = `${transferredName || safeExportBaseName()}.${preferredFormat}`;
        await exportEditedDocument(preferredFormat);
      } else if (routeParams.get('emailBridge') === '1') {
        const bridgedEmail = sessionStorage.getItem('pdfbreezePdfiumBridgeEmail') || sessionStorage.getItem('pdfmintPendingEmail') || '';
        sessionStorage.removeItem('pdfbreezePdfiumBridgeEmail');
        const emailInput = document.getElementById('download-email');
        const validBridgedEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bridgedEmail);
        if (validBridgedEmail) {
          if (emailInput) emailInput.value = bridgedEmail;
          requestAnimationFrame(() => document.getElementById('final-download')?.click());
        } else {
          requestAnimationFrame(() => document.getElementById('continue-to-email')?.click());
        }
      } else {
        requestAnimationFrame(() => document.getElementById('continue-to-email')?.click());
      }
      return;
    }
    document.body.classList.remove('editor-route-loading');
    if (routeParams.get('convert') === 'image') {
      requestAnimationFrame(() => openImageConvertModal(routeParams.get('format') || 'jpg'));
    }
    if (['word', 'excel', 'powerpoint'].includes(routeParams.get('convert'))) {
      requestAnimationFrame(() => openDocumentConvertModal(routeParams.get('convert')));
    }

    if (new URLSearchParams(window.location.search).get('export') === '1') {
      const params = new URLSearchParams(window.location.search);
      const preferredFormat = params.get('format') || 'pdf';
      const preferredRadio = document.querySelector(
        `input[name="export-format"][value="${CSS.escape(preferredFormat)}"]`
      );
      const fallbackRadio = document.querySelector('input[name="export-format"][value="pdf"]');
      const radio = preferredRadio || fallbackRadio;

      if (radio) {
        radio.checked = true;
        document.querySelectorAll('.format-choice').forEach(choice => {
          choice.classList.toggle('active', choice.contains(radio));
        });
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      }

      requestAnimationFrame(() => openFormatModal());
    }
  } catch (error) {
    console.error('Shared editor failed:', error);
    document.body.classList.remove('editor-route-loading');
    document.documentElement.classList.remove('pdfium-checkout-route');
    showAlert('PDFBreeze could not open this document in the editor.');
  }
}

const mergeLandingFiles = [];
function renderMergeLandingFiles() {
  if (document.body.dataset.mergeFlow !== 'true') return;
  const initial=document.getElementById('merge-initial-upload');
  const selected=document.getElementById('merge-selected-state');
  const grid=document.getElementById('merge-file-grid');
  const button=document.getElementById('merge-main-button');
  const hasFiles=mergeLandingFiles.length>0;
  initial.hidden=hasFiles; selected.hidden=!hasFiles;
  grid.innerHTML=mergeLandingFiles.map((file,index)=>`<article class="merge-file-card"><button class="merge-file-remove" type="button" data-merge-remove="${index}" aria-label="Remove ${escapeHtml(file.name)}">×</button><div class="merge-file-preview"><span>PDF</span></div><strong class="merge-file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</strong></article>`).join('')+(mergeLandingFiles.length<12?'<button class="merge-add-file" id="merge-add-file" type="button"><b>＋</b><span>Add file</span></button>':'');
  button.disabled=mergeLandingFiles.length<2;
  grid.querySelectorAll('[data-merge-remove]').forEach(remove=>remove.addEventListener('click',()=>{mergeLandingFiles.splice(Number(remove.dataset.mergeRemove),1);renderMergeLandingFiles()}));
  document.getElementById('merge-add-file')?.addEventListener('click',()=>document.getElementById('file-input').click());
  document.getElementById('file-status').textContent=hasFiles?`${mergeLandingFiles.length} PDF${mergeLandingFiles.length===1?'':'s'} selected`:'';
}
function addMergeLandingFiles(fileList) {
  const candidates=Array.from(fileList||[]);
  const valid=candidates.filter(file=>validPdf(file)&&file.size<=100*1024*1024);
  const remaining=Math.max(0,12-mergeLandingFiles.length);
  mergeLandingFiles.push(...valid.slice(0,remaining));
  if(valid.length<candidates.length) document.getElementById('file-status').textContent='Only PDF files up to 100 MB can be added.';
  else if(valid.length>remaining) document.getElementById('file-status').textContent='You can merge up to 12 PDF files at once.';
  renderMergeLandingFiles();
}
if (document.body.dataset.mergeFlow === 'true') {
  const input=document.getElementById('file-input');
  document.getElementById('merge-first-file').addEventListener('click',()=>input.click());
  input.addEventListener('change',event=>{addMergeLandingFiles(event.target.files);event.target.value=''});
  window.addEventListener('pdfmint:merge-drop',event=>addMergeLandingFiles(event.detail.files));
  document.getElementById('merge-main-button').addEventListener('click',async event=>{
    if(mergeLandingFiles.length<2)return;
    const button=event.currentTarget;button.disabled=true;button.textContent='Merging…';
    try{
      await ensurePdfLibraries('pdflib');
      const output=await PDFLib.PDFDocument.create();
      for(const file of mergeLandingFiles){
        const source=await PDFLib.PDFDocument.load(await file.arrayBuffer());
        const pages=await output.copyPages(source,source.getPageIndices());
        pages.forEach(page=>output.addPage(page));
      }
      const bytes=await output.save();
      const firstName=mergeLandingFiles[0].name.replace(/\.pdf$/i,'');
      const mergedFile=new File([bytes],`${firstName}-merged.pdf`,{type:'application/pdf',lastModified:Date.now()});
      await routeFileToSharedEditor(mergedFile,{completionNotice:{kind:'merge'},source:'merge'});
    }catch(error){console.error('Could not merge PDFs:',error);document.getElementById('file-status').textContent='PDFBreeze could not merge these files. Please try again.';button.disabled=false;button.textContent='Merge PDF'}
  });
  renderMergeLandingFiles();
}

if (document.body.dataset.ocrFlow === 'true') {
  let ocrPendingFile = null;
  let ocrOutputFormat = 'docx';
  const ocrModal = document.getElementById('ocr-format-modal');
  const ocrInput = document.getElementById('file-input');
  const ocrStatus = document.getElementById('file-status');

  function openOcrFormatModal(file) {
    if (!validPdf(file)) {
      ocrStatus.textContent = 'Please select a valid PDF file.';
      return;
    }
    if (file.size > 100 * 1024 * 1024) {
      ocrStatus.textContent = 'Please select a PDF no larger than 100 MB.';
      return;
    }
    ocrPendingFile = file;
    ocrOutputFormat = 'docx';
    document.getElementById('ocr-file-name').textContent = file.name;
    document.getElementById('ocr-file-size').textContent = formatBytes(file.size);
    document.querySelectorAll('input[name="ocr-format"]').forEach(input => { input.checked = input.value === 'docx'; });
    document.querySelectorAll('.ocr-format-choice').forEach(choice => choice.classList.toggle('active', choice.querySelector('input').checked));
    ocrStatus.textContent = `${file.name} selected`;
    ocrModal.hidden = false;
  }
  function closeOcrFormatModal() { ocrModal.hidden = true; }

  ocrInput.addEventListener('change', event => {
    const file = event.target.files?.[0];
    if (file) openOcrFormatModal(file);
    event.target.value = '';
  });
  window.addEventListener('pdfmint:ocr-drop', event => openOcrFormatModal(event.detail.file));
  // Swap in a different PDF from the options pop-up.
  document.getElementById('ocr-change-file')?.addEventListener('click', () => ocrInput.click());
  // Arrived from the editor's All PDF tools: pick up the PDF it handed over (edits included).
  if (new URLSearchParams(location.search).get('from') === 'editor' && window.indexedDB) {
    const open = indexedDB.open('pdfmint-editor-transfer');
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains('uploads')) { db.close(); return; }
      const tx = db.transaction('uploads', 'readwrite'), store = tx.objectStore('uploads'), get = store.get('tool-handoff');
      get.onsuccess = () => {
        const record = get.result;
        if (record?.bytes) {
          store.delete('tool-handoff');
          openOcrFormatModal(new File([record.bytes], record.name || 'document.pdf', { type: 'application/pdf', lastModified: record.lastModified || Date.now() }));
        }
      };
      tx.oncomplete = () => db.close();
    };
  }
  document.querySelectorAll('[data-close-ocr-format]').forEach(button => button.addEventListener('click', closeOcrFormatModal));
  document.querySelectorAll('input[name="ocr-format"]').forEach(input => input.addEventListener('change', () => {
    ocrOutputFormat = input.value;
    document.querySelectorAll('.ocr-format-choice').forEach(choice => choice.classList.toggle('active', choice.contains(input) && input.checked));
  }));
  document.getElementById('ocr-apply').addEventListener('click', () => {
    if (!ocrPendingFile) return;
    ocrOutputFormat = document.querySelector('input[name="ocr-format"]:checked')?.value || 'docx';
    closeOcrFormatModal();
    document.getElementById('download-email').value = '';
    document.getElementById('email-error').hidden = true;
    document.getElementById('ocr-progress').hidden = true;
    openEmailModal();
  });

  document.getElementById('final-download').addEventListener('click', async event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const emailInput = document.getElementById('download-email');
    const error = document.getElementById('email-error');
    const email = String(emailInput.value || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      error.textContent = 'Please enter a valid email address.';
      error.hidden = false;
      emailInput.focus();
      return;
    }
    if (!ocrPendingFile) return;
    error.hidden = true;
    const button = event.currentTarget;
    const originalText = button.textContent;
    const operation = {docx:'ocr-docx',pdf:'ocr-pdf',txt:'ocr-txt'}[ocrOutputFormat] || 'ocr-docx';
    const extension = {docx:'docx',pdf:'pdf',txt:'txt'}[ocrOutputFormat] || 'docx';
    const baseName = ocrPendingFile.name.replace(/\.pdf$/i,'').replace(/[<>:"/\\|?*\u0000-\u001F]/g,'_') || 'document';
    const progress = document.getElementById('ocr-progress');
    const progressBar = document.getElementById('ocr-progress-bar');
    const progressTrack = progress.querySelector('[role="progressbar"]');
    const progressPercent = document.getElementById('ocr-progress-percent');
    const progressLabel = document.getElementById('ocr-progress-label');
    let progressValue = 8;
    const setOcrProgress = value => {
      progressValue = Math.max(0, Math.min(100, Math.round(value)));
      progressBar.style.width = `${progressValue}%`;
      progressPercent.textContent = `${progressValue}%`;
      progressTrack.setAttribute('aria-valuenow', String(progressValue));
    };
    button.disabled = true;
    button.textContent = 'Applying OCR…';
    progress.hidden = false;
    progressLabel.textContent = 'Recognising text…';
    setOcrProgress(progressValue);
    const progressTimer = window.setInterval(() => {
      if (progressValue < 70) setOcrProgress(progressValue + Math.max(2, (70 - progressValue) * .12));
      else if (progressValue < 92) setOcrProgress(progressValue + 1);
    }, 350);
    ocrStatus.textContent = 'Recognising text and preparing your download…';
    try {
      const result = await convertPdfThroughPdfMintEngine(ocrPendingFile, operation, baseName);
      window.clearInterval(progressTimer);
      progressLabel.textContent = 'Download ready';
      setOcrProgress(100);
      downloadBlob(result, `${baseName}-ocr.${extension}`);
      await new Promise(resolve => window.setTimeout(resolve, 450));
      closeEmailModal();
      ocrStatus.textContent = `${baseName}-ocr.${extension} downloaded successfully.`;
    } catch (ocrError) {
      window.clearInterval(progressTimer);
      progress.hidden = true;
      console.error('OCR failed:', ocrError);
      error.textContent = ocrError?.message || 'PDFBreeze could not recognise this document. Please try again.';
      error.hidden = false;
      ocrStatus.textContent = 'OCR could not be completed. Please try again.';
    } finally {
      window.clearInterval(progressTimer);
      button.disabled = false;
      button.textContent = originalText;
    }
  }, true);
}

function pdfMintLandingUploadLabel() {
  const path = window.location.pathname.toLowerCase();

  if (path.endsWith('/pdf-to-jpg.html') || path.endsWith('pdf-to-jpg.html')) return 'Upload to convert';
  if (path.endsWith('/pdf-to-png.html') || path.endsWith('pdf-to-png.html')) return 'Upload to convert';
  if (path.endsWith('/pdf-to-excel.html') || path.endsWith('pdf-to-excel.html')) return 'Upload to convert';
  if (path.endsWith('/pdf-to-pptx.html') || path.endsWith('pdf-to-pptx.html')) return 'Upload to convert';
  if (path.endsWith('/pdf-to-word.html') || path.endsWith('pdf-to-word.html')) return 'Upload to convert';
  if (path.endsWith('/sign-pdf.html') || path.endsWith('sign-pdf.html')) return 'Upload to sign';
  if (path.endsWith('/rotate-pdf.html') || path.endsWith('rotate-pdf.html')) return 'Upload to rotate';
  if (path.endsWith('/merge-pdf.html') || path.endsWith('merge-pdf.html')) return 'Upload to merge';
  if (path.endsWith('/split-pdf.html') || path.endsWith('split-pdf.html')) return 'Upload to split';
  if (path.endsWith('/crop-pdf.html') || path.endsWith('crop-pdf.html')) return 'Upload to crop';
  if (path.endsWith('/add-watermark.html') || path.endsWith('add-watermark.html')) return 'Upload to watermark';
  if (path.endsWith('/compress-image.html') || path.endsWith('compress-image.html')) return 'Upload to compress';
  if (path.endsWith('/compress-pdf.html') || path.endsWith('compress-pdf.html')) return 'Upload to compress';

  return null;
}

function applyPdfMintLandingUploadLabel() {
  const label = pdfMintLandingUploadLabel();
  if (!label) return;

  const candidates = [
    document.querySelector('[data-upload-button]'),
    document.querySelector('.upload-btn'),
    document.querySelector('.upload-button'),
    document.querySelector('.hero-upload-button'),
    document.querySelector('.landing-upload-button')
  ].filter(Boolean);

  for (const button of candidates) {
    const currentText = (button.textContent || '').trim().toLowerCase();

    if (
      currentText.includes('upload to edit') ||
      currentText === 'upload' ||
      currentText.includes('upload pdf') ||
      currentText.includes('upload to sign') ||
      currentText.includes('upload to rotate') ||
      currentText.includes('upload to merge') ||
      currentText.includes('upload to split') ||
      currentText.includes('upload to crop') ||
      currentText.includes('upload to watermark') ||
      currentText.includes('upload to compress')
    ) {
      // IMPORTANT: many landing-page upload buttons are <label> elements
      // containing the hidden <input type="file">. Never use
      // button.textContent = ... here, because that deletes the file input.
      const textNodes = Array.from(button.childNodes).filter(
        node => node.nodeType === Node.TEXT_NODE && node.textContent.trim()
      );

      if (textNodes.length) {
        textNodes[0].textContent = `\n            ${label}\n            `;
        return;
      }

      // If the visible label is in a span, change only that span.
      const spans = Array.from(button.querySelectorAll('span'));
      const textSpan = spans.find(span =>
        (span.textContent || '').toLowerCase().includes('upload')
      );

      if (textSpan) {
        textSpan.textContent = label;
        return;
      }
    }
  }
}

function addUploadPageSupportDetails() {
  const path = window.location.pathname.toLowerCase();
  const isHome = path === '/' || path.endsWith('/index.html') || path.endsWith('index.html');
  const hasPrimaryUpload = Boolean(document.querySelector('.hero #file-input, .upload-card #file-input'));
  const heroCopy = document.querySelector('.hero-copy');
  if (isHome || !hasPrimaryUpload || !heroCopy || heroCopy.querySelector('.upload-support-details')) return;

  const details = document.createElement('div');
  details.className = 'upload-support-details';
  details.setAttribute('aria-label', 'PDFBreeze support');
  details.innerHTML = '<span>Phone Support 24/7</span><span class="support-divider">|</span><a href="mailto:support@pdfbreeze.net">Email Support 24/7</a>';
  heroCopy.appendChild(details);
}

document.addEventListener('DOMContentLoaded', initialiseSharedEditorRoute);

document.querySelectorAll('input[name="export-format"]').forEach(input => {
  input.addEventListener('change', () => {
    document.querySelectorAll('.format-choice').forEach(choice => {
      choice.classList.toggle('active', choice.contains(input) && input.checked);
    });

    const extension = document.getElementById('export-extension');
    if (extension) {
      const format = document.querySelector('input[name="export-format"]:checked')?.value || 'pdf';
      extension.textContent = `.${format}`;
    }
  });
});

/* PDFBreeze v3.9.6 — Contact page */
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const status = document.getElementById('contact-form-status');
  const button = form.querySelector('.contact-submit-button');

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const name = form.querySelector('#contact-name')?.value.trim() || '';
    const email = form.querySelector('#contact-email')?.value.trim() || '';
    const subject = form.querySelector('#contact-subject')?.value.trim() || '';
    const message = form.querySelector('#contact-message')?.value.trim() || '';
    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    if (!name || !validEmail || !subject || !message) {
      status.hidden = false;
      status.className = 'contact-form-status error';
      status.textContent = 'Please complete all fields and enter a valid email address.';
      return;
    }

    status.hidden = false;
    status.className = 'contact-form-status success';
    status.textContent = 'Opening your email app to send this message to PDFBreeze Support…';
    status.textContent = 'Sending your message…';
    button.disabled = true;
    try {
      const engine = (window.PDFMINT_CONFIG?.engineBaseUrl || '').replace(/\/$/, '');
      const response = await fetch(`${engine}/v1/support/message`, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({name,email,subject,message,source:'contact-page',website:form.elements.website?.value || ''})});
      if (!response.ok) throw new Error();
      form.reset(); status.textContent = 'Your message has been sent. PDFBreeze Support will reply by email.';
    } catch (_) {
      status.className = 'contact-form-status error'; status.textContent = 'Your message could not be sent. Please try again.';
    } finally { button.disabled = false; }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  applyPdfMintLandingUploadLabel();
  // Support line under the hero removed (November 2026 redesign).

  const input = document.getElementById('file-input');
  const usesDedicatedUploadFlow =
    document.body.dataset.editorRoute === 'true' ||
    document.body.dataset.compressFlow === 'true' ||
    document.body.dataset.compressImageFlow === 'true' ||
    document.body.dataset.mergeFlow === 'true' ||
    document.body.dataset.ocrFlow === 'true';

  if (input && !usesDedicatedUploadFlow) {
    input.addEventListener('change', event => {
      const file = event.currentTarget.files?.[0];
      if (!file) return;
      routeLandingUploadToEditor(file);
      event.currentTarget.value = '';
    });
  }
});
