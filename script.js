
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
  selectedNoteId: null
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
      selectedNoteId: null
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
        : 'PDFMint could not finish loading the PDF preview. Please try the file again.'
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
  document.getElementById('draw-tool')?.classList.toggle('active', mode === 'draw');
  document.getElementById('line-tool')?.classList.toggle('active', mode === 'shape');
  document.getElementById('text-highlight-tool')?.classList.toggle('active', mode === 'text-highlight');
  document.getElementById('link-tool')?.classList.toggle('active', mode === 'link');
  document.getElementById('note-tool')?.classList.toggle('active', mode === 'note');

  const addOptionsBar = document.getElementById('text-options-bar');
  const editOptionsBar = document.getElementById('edit-text-options-bar');
  const drawOptionsBar = document.getElementById('draw-options-bar');
  const lineOptionsBar = document.getElementById('line-options-bar');
  const highlightOptionsBar = document.getElementById('text-highlight-options-bar');
  if (addOptionsBar) addOptionsBar.hidden = mode !== 'text';
  if (editOptionsBar) editOptionsBar.hidden = mode !== 'edit-existing';
  if (drawOptionsBar) drawOptionsBar.hidden = mode !== 'draw';
  if (lineOptionsBar) lineOptionsBar.hidden = mode !== 'shape';
  if (highlightOptionsBar) highlightOptionsBar.hidden = mode !== 'text-highlight';

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

    // Character-level geometry shared by text annotation tools.
    // Widths are measured per glyph and then normalised to the exact PDF run width.
    const highlightCharacters = [];
    const measurementCanvas = document.createElement('canvas');
    const measurementContext = measurementCanvas.getContext('2d');

    paragraph.lines.forEach(({line}, paragraphLineIndex) => {
      line.runs.forEach(run => {
        const characters = Array.from(String(run.text || ''));
        if (!characters.length) return;

        const family =
          run.font === 'TimesRoman' ? 'Times New Roman' :
          run.font === 'Courier' ? 'Courier New' :
          'Arial';

        measurementContext.font =
          `${run.italic ? 'italic ' : ''}${run.bold ? '700 ' : '400 '}${run.height}px "${family}"`;

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
            lineIndex: paragraphLineIndex,
            runIndex: run.index,
            characterIndex,
            x: Math.max(0, cursorX / viewport.width),
            y: Math.max(0, highlightTop / viewport.height),
            w: Math.min(1, Math.max(.0005, characterWidth / viewport.width)),
            h: Math.min(1, Math.max(.004, highlightHeight / viewport.height))
          });

          cursorX += characterWidth;
        });
      });
    });

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
  renderSavedTextHighlights(layer, metrics);
  renderExistingTextBoxes(layer, metrics);
  renderEditCreatedTextBoxes(layer, metrics);
  renderSignatures(layer, metrics);
  renderLinks(layer, metrics);
  renderShapes(layer, metrics);
  renderNotes(layer, metrics);
  attachDrawingCanvas(layer);
  renderTextHighlightInteraction(layer, metrics);
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
document.getElementById('note-tool')?.addEventListener('click', () => {
  editor.selectedNoteId = null;
  setEditorMode('note');
  renderAnnotations();
  showEditorHint('Click anywhere on the PDF to place a note.');
});

document.getElementById('edit-text-tool').addEventListener('click', () => setEditorMode('edit-existing'));

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
    '.editor-tool-button, .tool-button, [data-editor-tool], #add-text-tool, #edit-text-tool, #sign-tool, #draw-tool, #line-tool'
  );

  if (!toolButton || toolButton.id === 'edit-text-tool' || toolButton.id === 'sign-tool' || toolButton.id === 'draw-tool' || toolButton.id === 'text-highlight-tool' || toolButton.id === 'line-tool') return;

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


/* PDFMint v3.1.2 — basic Image tool
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


/* PDFMint v3.2 — Stamp tool
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
