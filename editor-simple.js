/* PDFBreeze simple editor (default on desktop and phones, November 2026).
   Every upload opens the simple editor. "Full editor" (bottom of More tools) switches to the full
   editor for the document that's open; "Simple mode" comes back.
   The desktop layout is set in Admin: left toolbar (default) or centred bottom bar.
   ?ui=rail / ?ui=dock / ?ui=panel previews a layout for one visit; ?ui=advanced opens the full editor.
   Every simple-mode button clicks the editor's own button, so behaviour is identical. */
(() => {
  const LAYOUTS = ['rail', 'dock', 'panel'];
  const SETTING_CACHE = 'pdfbreeze_editor_layout_v1';
  const params = new URLSearchParams(location.search);
  const asked = params.get('ui');
  const preview = LAYOUTS.includes(asked) ? asked : '';
  const cachedLayout = (() => {
    try {
      const cached = JSON.parse(localStorage.getItem(SETTING_CACHE) || 'null');
      return cached && ['rail', 'dock'].includes(cached.layout) ? cached : null;
    } catch (_) { return null; }
  })();
  let simpleLayout = preview || (cachedLayout ? cachedLayout.layout : 'rail');
  let layout = asked === 'advanced' ? 'advanced' : simpleLayout;
  try { localStorage.removeItem('pdfbreezeEditorUiLast'); } catch (_) {}
  // Admin setting (cached for a minute). Missing or unreachable means the left toolbar.
  const fetchLayoutSetting = async () => {
    if (preview || (cachedLayout && Date.now() - Number(cachedLayout.cachedAt || 0) < 60000)) return null;
    const base = String(window.PDFMINT_CONFIG?.engineBaseUrl || '').replace(/\/+$/, '');
    if (!base) return null;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(`${base}/v1/site/editor-layout`, { cache: 'no-store', signal: controller.signal });
      const result = await response.json();
      if (!response.ok) return null;
      const value = result.layout === 'dock' ? 'dock' : 'rail';
      try { localStorage.setItem(SETTING_CACHE, JSON.stringify({ layout: value, cachedAt: Date.now() })); } catch (_) {}
      return value;
    } catch (_) { return null; } finally { clearTimeout(timer); }
  };

  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICON = {
    compress: '<path d="M8 3v5l4 3 4-3V3M8 21v-5l4-3 4 3v5M4 12h3M17 12h3"/>',
    merge: '<rect x="3" y="4" width="9" height="12" rx="1.5"/><rect x="12" y="8" width="9" height="12" rx="1.5"/><path d="M16.5 11.5v5M14 14h5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    add: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
    sign: '<path d="M3 17c3-1 4-9 7-9s0 8 3 8 3-4 5-4 2 2 3 2"/><path d="M3 21h18"/>',
    highlight: '<path d="m9 11-4 4v3h3l4-4"/><path d="m9 11 6-6 4 4-6 6z"/><path d="M14 20h7"/>',
    image: '<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5"/><path d="M12 12v8m0-8-3 3m3-3 3 3"/>',
    layoutPanel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    layoutDock: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 16h10"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    manage: '<rect x="4" y="3" width="11" height="14" rx="2"/><path d="M9 21h9a2 2 0 0 0 2-2V8"/>',
    more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
    draw: '<path d="M3 21c2-6 6-14 9-14s-1 9 2 9 3-5 7-6"/>',
    shapes: '<rect x="3" y="12" width="8" height="8" rx="1"/><circle cx="16.5" cy="7.5" r="4.5"/>',
    note: '<path d="M5 4h14v11l-5 5H5z"/><path d="M14 20v-5h5"/>',
    link: '<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1"/><path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>',
    stamp: '<path d="M9 3h6v6l3 3v3H6v-3l3-3z"/><path d="M5 20h14"/>',
    watermark: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    crop: '<path d="M6 2v16h16"/><path d="M2 6h16v16"/>',
    redact: '<rect x="3" y="9" width="18" height="6" rx="1"/><path d="M6 5h6M6 19h9"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9a5 5 0 0 0 0 10h3"/>',
    download: '<path d="M12 4v11m0 0 5-5m-5 5-5-5M5 20h14"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
    hint: '<path d="m5 3 14 7-6 2-2 6z"/>'
  };
  const MAIN = [
    ['add', 'Text', 'Click any text to edit it, or add new text', 'c-blue'],
    ['sign', 'Sign', 'Draw, type or upload your signature', 'c-violet'],
    ['draw', 'Draw', 'Pen, highlighter and rubber', 'c-amber'],
    ['image', 'Insert', 'Add a logo, photo or scan', 'c-blue'],
    ['manage', 'Pages', 'Rotate, reorder or delete pages', 'c-mint']
  ];
  const MORE = [
    ['merge', 'Merge PDFs', 'Join other PDFs to this one'],
    ['compress', 'Compress PDF', 'Make this PDF smaller'],
    ['highlight', 'Highlight text', 'Highlight, underline or strike out words'],
    ['shapes', 'Shapes & arrows', 'Boxes, ellipses, lines, arrows'],
    ['note', 'Sticky note', 'Leave a comment'],
    ['link', 'Link', 'Add a web link'],
    ['stamp', 'Stamp', 'Approved, paid and more'],
    ['watermark', 'Watermark', 'Brand every page'],
    ['crop', 'Crop', 'Trim page edges'],
    ['redact', 'Redact', 'Black out text for good']
  ];
  const HINT = {
    edit: 'Click any text on the page, type your new wording, then press Replace text.',
    add: 'Click any text to edit it. Press + Add text to add new text.',
    sign: 'Create your signature, then click where it should go.',
    highlight: 'Drag across the words you want to mark.',
    image: 'Choose an image, then drag it into place.',
    draw: 'Draw on the page with your mouse.',
    shapes: 'Drag on the page to draw the shape.',
    note: 'Click on the page to place a note.',
    link: 'Drag over the area that should open the link.',
    stamp: 'Pick a stamp, then click where it goes.',
    watermark: 'Type your watermark text and pick a colour.',
    crop: 'Drag over the part of the page you want to keep.',
    redact: 'Drag across the text you want to black out.'
  };
  const TIPS = {
    add: ['Click any text on the page to edit it right there.', 'To add new text, press + Add text, then click where it should go.', 'Drag the top edge of a box to move it, or its sides to resize it. Click outside to finish.'],
    edit: ['Click the text you want to change.', 'Type your new wording in the New text box.', 'Press Replace text.'],
    sign: ['Draw, type or upload your signature.', 'Press Add signature.', 'Move it into place on the page.'],
    draw: ['Choose marker, highlighter or rubber.', 'Pick a colour and thickness.', 'Draw on the page with your mouse.'],
    image: ['Choose an image from your device: a logo, photo or scan.', 'Drag it into place on the page.'],
    manage: ['Click pages to select them.', 'Rotate, move, duplicate or delete them.', 'Press Apply to save the changes.'],
    highlight: ['Choose highlight, underline, squiggly or strikethrough.', 'Drag across the words you want to mark.'],
    shapes: ['Pick a shape: box, ellipse, line or arrow.', 'Drag on the page to draw it.'],
    note: ['Click on the page where the note should go.', 'Type your message in the box that opens.'],
    link: ['Drag over the area that should be clickable.', 'Enter the web address or page to open.'],
    stamp: ['Pick a stamp design, or make your own.', 'Click on the page where it should go.'],
    watermark: ['Type your watermark text.', 'Pick a colour. It appears on the page as you type.', 'For size, angle or position, use More options.'],
    crop: ['Drag over the part of the page you want to keep.', 'Confirm the crop.'],
    redact: ['Drag across the text you want to black out.', 'Check the black boxes cover everything you need hidden.']
  };
  const TIP_KEY = 'pdfbreezeEditorSnackSeen';
  const tipsSeen = (() => { try { return JSON.parse(localStorage.getItem(TIP_KEY) || '{}') || {}; } catch (_) { return {}; } })();
  const saveTips = () => { try { localStorage.setItem(TIP_KEY, JSON.stringify(tipsSeen)); } catch (_) {} };
  const moreTools = new Set(MORE.map(item => item[0]));
  const $ = (sel, root = document) => root.querySelector(sel);
  const toolButton = tool => $(`.tool-ribbon .tool[data-tool="${tool}"]`);
  const clickTool = tool => { toolButton(tool)?.click(); };
  const nameOf = tool => (MAIN.find(item => item[0] === tool) || MORE.find(item => item[0] === tool) || [tool, ''])[1];

  function build() {
    const body = document.body;
    const contextBar = $('#contextBar');
    const topActions = $('.top-actions');
    const download = $('#download');
    const openAnother = $('.open-another-button');
    if (!contextBar || !topActions || !download) return;
    const contextHome = { parent: contextBar.parentNode, next: contextBar.nextSibling };
    const openHome = openAnother ? { parent: openAnother.parentNode, next: openAnother.nextSibling } : null;
    const PLANE = '<svg class="ui-plane" viewBox="0 0 64 64" aria-hidden="true"><path d="M5 31 58 8 45 55 31 39z" fill="#34c79a"/><path d="M58 8 31 39l4 15z" fill="#299b78"/><path d="M58 8 31 39" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/><path d="M6 46h11M10 55h15" fill="none" stroke="#299b78" stroke-width="3.5" stroke-linecap="round"/></svg>';
    const historyHtml = `<div class="ui-history"><button type="button" data-proxy="undo" aria-label="Undo" title="Undo">${svg(ICON.undo)}</button><button type="button" data-proxy="redo" aria-label="Redo" title="Redo">${svg(ICON.redo)}</button></div>`;
    const fileHtml = `<a class="ui-file" href="index.html" title="PDFBreeze home">${PLANE}<span data-ui-filename>Document</span></a>`;
    const own = [];
    const mount = el => { body.appendChild(el); own.push(el); return el; };

    // Mode switch for Advanced mode (lives in the normal header, which Advanced mode shows)
    const modeSwitch = document.createElement('button');
    modeSwitch.type = 'button';
    modeSwitch.className = 'button secondary ui-mode-switch';
        modeSwitch.title = 'Back to the simple editor';
    modeSwitch.innerHTML = `${svg('<path d="M15 18 9 12l6-6"/>')}<span>Simple mode</span>`;
    topActions.prepend(modeSwitch);

    // Hint pill above the page
    const hint = document.createElement('div');
    hint.className = 'ui-hint';
    hint.setAttribute('role', 'status');
    $('.viewer-area')?.prepend(hint);

    // Floating page/zoom pill (stands in for the hidden viewer toolbar)
    const view = mount(document.createElement('div'));
    view.className = 'ui-view';
    view.innerHTML = `<button type="button" class="ui-thumbs-toggle" aria-pressed="false" title="Show all pages down the side" aria-label="Show all pages">${svg('<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9 4v16"/><rect x="4.9" y="7" width="2.2" height="3" rx=".6" fill="currentColor" stroke="none"/><rect x="4.9" y="12" width="2.2" height="3" rx=".6" fill="currentColor" stroke="none"/>')}<span class="ui-thumbs-label">All pages</span></button><span class="ui-view-sep"></span>
      <button type="button" data-proxy="prev" aria-label="Previous page">${svg('<path d="m15 18-6-6 6-6"/>')}</button><span data-mirror="pageLabel">Page 1</span><button type="button" data-proxy="next" aria-label="Next page">${svg('<path d="m9 18 6-6-6-6"/>')}</button><span class="ui-view-sep"></span>
      <button type="button" data-proxy="zoomOut" aria-label="Zoom out">${svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6"/>')}</button><span data-mirror="zoomLabel">100%</span><button type="button" data-proxy="zoomIn" aria-label="Zoom in">${svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>')}</button>`;

    // Snackbar: one line on how to use the chosen tool, under the top bar on the left.
    // Shown the first time each tool is picked; fades away after a few seconds or on close.
    const SNACK = {
      add: 'Click any text to edit it, or press + Add text and click where it should go.',
      sign: 'Create your signature, then drag it into place on the page.',
      draw: 'Pick Marker, Highlighter or Rubber, then draw on the page.',
      image: 'Choose an image from your device, then drag it into place.',
      manage: 'Select pages to rotate, move, duplicate or delete them, then press Apply.',
      highlight: 'Pick a style, then drag across the words you want to mark.',
      shapes: 'Pick a shape, then drag on the page to draw it.',
      note: 'Click on the page where the note should go.',
      link: 'Drag a box over the area that should open the link.',
      stamp: 'Choose a stamp. You can move and resize it afterwards.',
      watermark: 'Type your text, then pick its size, colour and angle.',
      crop: 'Drag over the part of the page you want to keep.',
      redact: 'Drag across text to black it out, or drag a box over any area (scans too).'
    };
    const tip = document.createElement('div');
    tip.className = 'ui-snack';
    tip.setAttribute('role', 'status');
    tip.setAttribute('aria-live', 'polite');
    document.body.append(tip);
    let tipTool = '', snackTimer = 0, snackHover = false;
    const hideTip = () => { clearTimeout(snackTimer); tip.classList.remove('is-on'); };
    const armSnackTimer = () => { clearTimeout(snackTimer); snackTimer = setTimeout(() => { if (snackHover) armSnackTimer(); else hideTip(); }, 6000); };
    const placeSnack = () => {
      const bar = $('.ui-topfloat'), mid = $('.ui-tf-mid');
      if (!bar || !bar.getClientRects().length) return;
      const r = bar.getBoundingClientRect(), m = mid?.getBoundingClientRect();
      tip.style.left = `${Math.round(r.left)}px`;
      tip.style.top = `${Math.round(r.bottom + 10)}px`;
      const caret = m && m.width ? Math.max(14, Math.min(220, m.left - r.left + 16)) : 24;
      tip.style.setProperty('--snack-caret', `${Math.round(caret)}px`);
    };
    // Text tool helper: a small mascot in the bottom-right corner with a speech bubble.
    // Two looks for now (Page and Puff) with a temporary switch so the owner can pick one.
    const MASCOTS = {
      page: '<svg viewBox="0 0 50 60" aria-hidden="true"><path d="M6 4h26l12 12v38a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" fill="#fff" stroke="#20aa7d" stroke-width="2.2"/><path d="M32 4v12h12" fill="#d8f3e8" stroke="#20aa7d" stroke-width="2.2" stroke-linejoin="round"/><path d="M11 21h13M11 25h9" stroke="#cfe7dd" stroke-width="1.6" stroke-linecap="round"/><path class="ui-mascot-eyes" d="M14 33q3-3 6 0M28 33q3-3 6 0" stroke="#14241f" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M18 39q6 6 12 0z" fill="#14241f"/><circle cx="12" cy="38.5" r="2.4" fill="#ffc7c7"/><circle cx="36" cy="38.5" r="2.4" fill="#ffc7c7"/><path class="ui-mascot-arm" d="M44 30q7-4 5-12" stroke="#20aa7d" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>',
      puff: '<svg viewBox="0 0 66 50" aria-hidden="true"><path d="M14 40a11 11 0 0 1 1-22 14 14 0 0 1 26-5 11 11 0 0 1 13 13 8 8 0 0 1-2 14z" fill="#5fd3a8"/><path d="M18 20a10 10 0 0 1 9-7" stroke="#bff0dc" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="27" cy="27" r="2.5" fill="#14241f"/><circle cx="39" cy="27" r="2.5" fill="#14241f"/><circle cx="28" cy="26" r=".8" fill="#fff"/><circle cx="40" cy="26" r=".8" fill="#fff"/><path d="M29 33q4 3 8 0" stroke="#14241f" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="22" cy="32" r="2" fill="#ffb3b3"/><circle cx="44" cy="32" r="2" fill="#ffb3b3"/><path class="ui-mascot-wind" d="M2 22h8M0 30h7M3 38h6" stroke="#20aa7d" stroke-width="2.2" stroke-linecap="round"/></svg>'
    };
    const MASCOT_KEY = 'pdfbreezeMascot';
    let mascotLook = (() => { try { return localStorage.getItem(MASCOT_KEY) === 'puff' ? 'puff' : 'page'; } catch (_) { return 'page'; } })();
    const mascot = document.createElement('div');
    mascot.className = 'ui-mascot';
    mascot.setAttribute('role', 'status');
    mascot.setAttribute('aria-live', 'polite');
    document.body.append(mascot);
    let mascotTimer = 0, mascotHover = false;
    const hideMascot = () => { clearTimeout(mascotTimer); mascot.classList.remove('is-on'); };
    const armMascotTimer = () => { clearTimeout(mascotTimer); mascotTimer = setTimeout(() => { if (mascotHover) armMascotTimer(); else hideMascot(); }, 9000); };
    const drawMascot = () => {
      const phone = body.classList.contains('ui-mobile');
      const line = phone ? 'Tap any text to edit it, or add your own text.' : 'Hover over any text and click to edit it, or add your own text.';
      mascot.dataset.look = mascotLook;
      mascot.innerHTML = `<div class="ui-mascot-bubble"><button type="button" class="ui-mascot-x" aria-label="Close">${svg('<path d="M6 6l12 12M18 6 6 18"/>')}</button><p>${line}</p><div class="ui-mascot-pick" role="group" aria-label="Choose a helper (temporary)"><button type="button" data-look="page" aria-pressed="${mascotLook === 'page'}">Page</button><button type="button" data-look="puff" aria-pressed="${mascotLook === 'puff'}">Puff</button></div></div><div class="ui-mascot-figure">${MASCOTS[mascotLook]}</div>`;
    };
    const showMascot = () => {
      if (tipsSeen.__off) return;
      hideTip();
      drawMascot();
      mascot.classList.remove('is-on');
      void mascot.offsetWidth;
      mascot.classList.add('is-on');
      armMascotTimer();
    };
    document.addEventListener('pointerdown', event => { if (mascot.classList.contains('is-on') && event.target.closest?.('.text-hit, #pageWrap')) hideMascot(); }, true);
    mascot.addEventListener('mouseenter', () => { mascotHover = true; });
    mascot.addEventListener('mouseleave', () => { mascotHover = false; });
    mascot.addEventListener('click', event => {
      if (event.target.closest('.ui-mascot-x')) { hideMascot(); return; }
      const pick = event.target.closest('.ui-mascot-pick [data-look]');
      if (pick) {
        mascotLook = pick.dataset.look === 'puff' ? 'puff' : 'page';
        try { localStorage.setItem(MASCOT_KEY, mascotLook); } catch (_) {}
        drawMascot();
        armMascotTimer();
      }
    });

    const showTip = tool => {
      if (tool !== 'add') hideMascot();
      if (tool === 'add') { showMascot(); return; }
      const text = SNACK[tool];
      if (!text || tipsSeen[tool] || tipsSeen.__off) return hideTip();
      tipTool = tool;
      tipsSeen[tool] = true;
      saveTips();
      const phone = body.classList.contains('ui-mobile');
      const line = phone ? text.replace(/\bClick\b/g, 'Tap').replace(/\bclick\b/g, 'tap') : text;
      tip.innerHTML = `<span class="ui-snack-i" aria-hidden="true">i</span><span class="ui-snack-text"><b>${nameOf(tool)}</b>${line}</span><button type="button" class="ui-snack-x" aria-label="Close">${svg('<path d="M6 6l12 12M18 6 6 18"/>')}</button>`;
      placeSnack();
      tip.classList.remove('is-on');
      void tip.offsetWidth;
      tip.classList.add('is-on');
      armSnackTimer();
    };
    tip.addEventListener('mouseenter', () => { snackHover = true; });
    tip.addEventListener('mouseleave', () => { snackHover = false; });
    tip.addEventListener('click', event => { if (event.target.closest('.ui-snack-x')) hideTip(); });
    window.addEventListener('resize', () => { if (tip.classList.contains('is-on')) placeSnack(); });

    // Scanned pages: offer to recognise the text so it can be edited.
    const scanBar = document.createElement('div');
    scanBar.className = 'ui-scanbar';
    scanBar.setAttribute('role', 'status');
    document.body.append(scanBar);
    const scanDismissed = new Set();
    const placeScanBar = () => {
      const bar = $('.ui-topfloat');
      if (!bar || !bar.getClientRects().length) return;
      const r = bar.getBoundingClientRect();
      scanBar.style.left = `${Math.round(r.left)}px`;
      scanBar.style.top = `${Math.round(r.bottom + 10)}px`;
    };
    const hideScanBar = () => scanBar.classList.remove('is-on');
    const showScanBar = html => { scanBar.innerHTML = html; placeScanBar(); hideTip(); scanBar.classList.add('is-on'); };
    const docKey = () => $('#fileName')?.textContent || '';
    window.addEventListener('pdfbreeze:pagekind', event => {
      const kind = event.detail?.kind;
      if (!body.classList.contains('ui-simple') || kind === 'text' || scanDismissed.has(`${docKey()}:${kind}`)) { hideScanBar(); return; }
      if (kind === 'scan') {
        showScanBar(`<span class="ui-snack-i" aria-hidden="true">i</span><span class="ui-snack-text"><b>Scanned page</b>This page is a picture, so its text can't be edited yet.</span><button type="button" class="ui-scan-go" data-scan="go">Make text editable</button><button type="button" class="ui-snack-x" data-scan="close" aria-label="Close">${svg('<path d="M6 6l12 12M18 6 6 18"/>')}</button>`);
      } else if (kind === 'scan-ocr') {
        showScanBar(`<span class="ui-snack-i" aria-hidden="true">i</span><span class="ui-snack-text"><b>Scanned page</b>${body.classList.contains('ui-mobile') ? 'Tap' : 'Click'} any text to edit it. Your new wording is placed over the scan.</span><button type="button" class="ui-snack-x" data-scan="close" aria-label="Close">${svg('<path d="M6 6l12 12M18 6 6 18"/>')}</button>`);
        scanDismissed.add(`${docKey()}:scan-ocr`);
      }
    });
    scanBar.addEventListener('click', async event => {
      const action = event.target.closest('[data-scan]')?.dataset.scan;
      if (action === 'close') { scanDismissed.add(`${docKey()}:scan`); hideScanBar(); return; }
      if (action !== 'go' || !window.pdfbreezeOcrDocument) return;
      const go = event.target.closest('[data-scan]');
      go.disabled = true;
      go.innerHTML = '<span class="ui-scan-spin" aria-hidden="true"></span>Recognising text…';
      scanBar.querySelector('.ui-snack-text').innerHTML = '<b>Scanned page</b>Reading the words on your pages. This can take up to a minute.';
      const result = await window.pdfbreezeOcrDocument();
      if (result?.ok) {
        hideScanBar();
        toast.textContent = `Text recognised. ${body.classList.contains('ui-mobile') ? 'Tap' : 'Click'} any text to edit it.`;
        toast.classList.add('is-on', 'is-good'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('is-on', 'is-good'), 4500);
      } else {
        go.disabled = false;
        go.textContent = 'Try again';
        scanBar.querySelector('.ui-snack-text').innerHTML = `<b>Scanned page</b>${result?.message || 'Text recognition failed.'}`;
      }
    });
    window.addEventListener('resize', () => { if (scanBar.classList.contains('is-on')) placeScanBar(); });
    setTimeout(() => { const kind = document.body.dataset.pageKind; if (kind) window.dispatchEvent(new CustomEvent('pdfbreeze:pagekind', { detail: { kind } })); }, 300);
    let lastTool = '';
    let thumbsDecided = false;

    // Short pop-up for error messages (the status line is hidden in simple mode)
    const toast = mount(document.createElement('div'));
    toast.className = 'ui-toast';
    toast.setAttribute('role', 'alert');
    let toastTimer = 0;

    // Layout A: task panel
    const panel = mount(document.createElement('aside'));
    panel.className = 'ui-panel';
    panel.setAttribute('aria-label', 'Editing tools');
    panel.innerHTML = `
      <div class="ui-panel-top">${fileHtml}<button type="button" class="ui-layout-switch" data-ui-layout="dock" title="Switch to the bottom dock layout" aria-label="Switch to the bottom dock layout">${svg(ICON.layoutDock)}</button>${historyHtml}</div>
      <div class="ui-panel-head"><h2>What would you like to do?</h2><p>Pick a tool, then click on the page.</p></div>
      <div class="ui-panel-scroll">
        <div class="ui-tasks">${MAIN.map(([tool, title, text, colour]) => `<button type="button" class="ui-task" data-ui-tool="${tool}"><span class="ui-task-icon ${colour}">${svg(ICON[tool])}</span><span><b>${title}</b><small>${text}</small></span></button>`).join('')}</div>
        <button type="button" class="ui-full-card" data-ui-advanced><span class="ui-full-icon">${svg(ICON.sliders)}</span><span><b>Need more control?</b><small>Open the full editor: every tool and setting.</small></span>${svg(ICON.right)}</button>
        <div class="ui-options"><div class="ui-options-head">${svg(ICON.sliders)}<b data-ui-options-title>Tool settings</b></div><div class="ui-options-slot"></div></div>
        <button type="button" class="ui-more-toggle" aria-expanded="false">${svg(ICON.more)}<span>More tools <small>highlight, shapes, notes, stamps…</small></span>${svg(ICON.chev)}</button>
        <div class="ui-more-list" hidden>${MORE.map(([tool, title, text]) => `<button type="button" class="ui-more-item" data-ui-tool="${tool}">${svg(ICON[tool])}<span><b>${title}</b><small>${text}</small></span></button>`).join('')}</div>
      </div>
      <div class="ui-panel-foot"><button type="button" class="ui-download" data-proxy="download">${svg(ICON.download)}<span>Download</span></button>
        <div class="ui-foot-links"><span class="ui-open-slot"></span><button type="button" class="ui-link" data-ui-advanced>Full editor</button></div></div>`;

    // Layout B: bottom dock, with one floating bar at the top (file, tool settings, actions)
    const topFloat = mount(document.createElement('div'));
    topFloat.className = 'ui-topfloat';
    topFloat.innerHTML = `<div class="ui-tf-left">${fileHtml}<button type="button" class="ui-layout-switch" data-ui-layout="panel" title="Switch layout" aria-label="Switch layout">${svg(ICON.layoutPanel)}</button>${historyHtml}</div>
      <div class="ui-tf-mid"><span class="ui-tf-name" data-ui-tool-name></span><div class="ui-tf-slot"></div></div>
      <div class="ui-tf-right"><button type="button" class="ui-full-btn" data-ui-advanced>${svg(ICON.sliders)}<span>Full editor</span></button><button type="button" class="ui-download ui-download-sm" data-proxy="download">${svg(ICON.download)}<span>Download</span></button></div>`;
    const dock = mount(document.createElement('nav'));
    dock.className = 'ui-dock';
    dock.setAttribute('aria-label', 'Editing tools');
    dock.innerHTML = `<a class="ui-rail-logo" href="index.html" title="PDFBreeze home">${PLANE}</a>${MAIN.map(([tool, title, , colour]) => `<button type="button" class="ui-dock-item" data-ui-tool="${tool}"><span class="ui-dock-icon ${colour}">${svg(ICON[tool])}</span>${title}</button>`).join('')}
      <span class="ui-dock-sep" aria-hidden="true"></span>
      <button type="button" class="ui-dock-item ui-dock-more" aria-expanded="false"><span class="ui-dock-icon c-grey">${svg(ICON.more)}</span>More tools</button>
      <div class="ui-dock-menu" hidden><div class="ui-dock-menu-head">More tools</div>${MORE.map(([tool, title, text]) => `<button type="button" class="ui-more-item" data-ui-tool="${tool}">${svg(ICON[tool])}<span><b>${title}</b><small>${text}</small></span></button>`).join('')}<button type="button" class="ui-more-item ui-more-full" data-ui-advanced>${svg(ICON.sliders)}<span><b>Full editor</b><small>Full toolset and options</small></span></button><div class="ui-dock-menu-foot ui-open-slot"></div></div>`;
    const dockCard = $('.ui-tf-slot', topFloat);

    // Behaviour
    const isOwn = node => own.some(el => el.contains(node));
    document.addEventListener('click', event => {
      if (!isOwn(event.target)) { if (!event.target.closest('.ui-dock-more,.ui-dock-menu')) closeDockMenu(); return; }
      const proxy = event.target.closest('[data-proxy]');
      if (proxy) { $('#' + proxy.dataset.proxy)?.click(); return; }
      if (event.target.closest('[data-ui-advanced]')) { apply('advanced'); return; }
      const swap = event.target.closest('[data-ui-layout]');
      if (swap) { apply(swap.dataset.uiLayout); return; }
      if (event.target.closest('.ui-thumbs-toggle')) { const open = !body.classList.contains('ui-thumbs-open'); body.classList.toggle('ui-thumbs-open', open); $('.ui-thumbs-toggle').setAttribute('aria-pressed', String(open)); $('.ui-thumbs-label').textContent = open ? 'Hide pages' : 'All pages'; window.dispatchEvent(new Event('resize')); return; }
      const pick = event.target.closest('[data-ui-tool]');
      if (pick) {
        const live = document.getElementById('liveTextEditor');
        if (live && !live.hidden) document.getElementById('textOverlay')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: -9999, clientY: -9999 }));
        if (pick.dataset.uiTool === 'compress') { closeDockMenu(); window.pdfbreezeOpenInTool?.('compress-pdf'); return; }
        if (pick.dataset.uiTool === 'merge') {
          closeDockMenu();
          const manageWindow = document.getElementById('manageModal');
          if (manageWindow?.hidden) clickTool('manage');
          manageWindow?.dispatchEvent(new CustomEvent('pdfbreeze:merge'));
          return;
        }
        clickTool(pick.dataset.uiTool); closeDockMenu(); return;
      }
      if (!event.target.closest('.ui-dock-more,.ui-dock-menu')) closeDockMenu();
    });
    const moreToggle = $('.ui-more-toggle', panel), moreList = $('.ui-more-list', panel);
    moreToggle.addEventListener('click', () => {
      const open = moreList.hidden;
      moreList.hidden = !open;
      moreToggle.setAttribute('aria-expanded', String(open));
    });
    const dockMore = $('.ui-dock-more', dock), dockMenu = $('.ui-dock-menu', dock);
    function closeDockMenu() { dockMenu.hidden = true; dockMore.setAttribute('aria-expanded', 'false'); body.classList.remove('ui-menu-open'); }
    dockMore.addEventListener('click', () => { dockMenu.hidden = !dockMenu.hidden; dockMore.setAttribute('aria-expanded', String(!dockMenu.hidden)); body.classList.toggle('ui-menu-open', !dockMenu.hidden); });
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeDockMenu(); });
    modeSwitch.addEventListener('click', () => apply(simpleLayout));

    // "More options": shows this tool's extra settings in the bar (click again to hide them).
    const EXTRAS = { addControls: 'Fill colour, opacity, alignment', shapeControls: 'Fill colour', highlightControls: 'Squiggly, custom colour, opacity', };
    for (const [id, extra] of Object.entries(EXTRAS)) {
      const box = document.getElementById(id);
      if (!box) continue;
      const more = document.createElement('button');
      more.type = 'button';
      more.className = 'ui-more-options';
      more.title = `More options: ${extra}`;
      more.innerHTML = `${svg(ICON.sliders)}`;
      more.setAttribute('aria-label', `More options: ${extra}`);
      more.setAttribute('aria-pressed', 'false');
      more.addEventListener('click', () => {
        const on = !box.classList.contains('ui-extras-on');
        box.classList.toggle('ui-extras-on', on);
        more.classList.toggle('is-on', on);
        more.setAttribute('aria-pressed', String(on));
        requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
      });
      box.appendChild(more);
    }

    // Watermark: plain-English choices instead of sliders (they drive the editor's own controls).
    const wmBox = document.getElementById('watermarkControls');
    if (wmBox) {
      // Segmented icon choices that drive a range input.
      const segmented = (label, id, options, cls) => {
        const input = document.getElementById(id);
        if (!input) return null;
        const group = document.createElement('div');
        group.className = `ui-wm-seg ${cls}`;
        group.setAttribute('role', 'radiogroup');
        group.setAttribute('aria-label', label);
        group.innerHTML = options.map(([value, title, inner]) => `<button type="button" role="radio" data-value="${value}" title="${label}: ${title}" aria-label="${label}: ${title}">${inner}</button>`).join('');
        const sync = () => {
          const current = Number(input.value);
          let best = options[0][0];
          for (const [value] of options) if (Math.abs(Number(value) - current) < Math.abs(Number(best) - current)) best = value;
          group.querySelectorAll('button').forEach(button => { const on = button.dataset.value === String(best); button.classList.toggle('is-on', on); button.setAttribute('aria-checked', String(on)); });
        };
        group.addEventListener('click', event => {
          const button = event.target.closest('button');
          if (!button) return;
          input.value = button.dataset.value;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          sync();
        });
        input.addEventListener('input', sync);
        input.addEventListener('ui-sync', sync);
        sync();
        return group;
      };
      const size = segmented('Size', 'watermarkSize', [['40', 'Small', '<span style="font-size:11px">A</span>'], ['65', 'Medium', '<span style="font-size:15px">A</span>'], ['90', 'Large', '<span style="font-size:20px">A</span>']], 'is-size');
      // Opacity lives inside the colour picker: one small slider under the swatches.
      const opacityInput = document.getElementById('watermarkOpacity');
      const swatchBox = wmBox.querySelector('.watermark-swatches');
      if (opacityInput && swatchBox) {
        const row = document.createElement('label');
        row.className = 'ui-dd-opacity';
        row.innerHTML = '<span>Opacity</span><input type="range" min="10" max="100" step="5" aria-label="Watermark opacity"><output></output>';
        const range = row.querySelector('input'), out = row.querySelector('output');
        const show = () => { range.value = opacityInput.value; out.textContent = `${opacityInput.value}%`; swatchBox.style.setProperty('--wm-alpha', String(Number(opacityInput.value) / 100)); };
        range.addEventListener('input', () => { opacityInput.value = range.value; opacityInput.dispatchEvent(new Event('input', { bubbles: true })); show(); });
        range.addEventListener('change', () => opacityInput.dispatchEvent(new Event('change', { bubbles: true })));
        row.addEventListener('click', event => event.stopPropagation());
        opacityInput.addEventListener('input', show);
        swatchBox.append(row);
        // Keep the dot's place in the bar; the open picker floats over the page.
        const holder = document.createElement('span');
        holder.className = 'ui-wm-colour-holder';
        swatchBox.before(holder);
        holder.append(swatchBox);
        show();
      }
      const opacity = null;
      // Angle dial: a circle with a needle; drag (or click) to set the angle.
      const angleInput = document.getElementById('watermarkAngle');
      let angle = null;
      if (angleInput) {
        angle = document.createElement('div');
        angle.className = 'ui-wm-angle';
        angle.innerHTML = '<button type="button" class="ui-dial" title="Drag to set the angle" aria-label="Watermark angle"><span class="ui-dial-needle"></span><span class="ui-dial-hub"></span></button><output></output>';
        const dial = angle.querySelector('.ui-dial'), needle = angle.querySelector('.ui-dial-needle'), out = angle.querySelector('output');
        const show = () => { const value = Math.round(Number(angleInput.value) || 0); needle.style.transform = `rotate(${value}deg)`; out.textContent = `${value}°`; dial.setAttribute('aria-valuenow', String(value)); };
        const setFrom = (event, commit) => {
          const r = dial.getBoundingClientRect();
          let deg = Math.atan2(event.clientY - (r.top + r.height / 2), event.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
          deg = Math.round(deg / 5) * 5;
          if (deg > 180) deg -= 360;
          angleInput.value = String(deg);
          angleInput.dispatchEvent(new Event('input', { bubbles: true }));
          if (commit) angleInput.dispatchEvent(new Event('change', { bubbles: true }));
          show();
        };
        let dragging = false;
        dial.addEventListener('pointerdown', event => { dragging = true; dial.setPointerCapture(event.pointerId); setFrom(event, false); event.preventDefault(); });
        dial.addEventListener('pointermove', event => { if (dragging) setFrom(event, false); });
        dial.addEventListener('pointerup', event => { if (!dragging) return; dragging = false; setFrom(event, true); });
        dial.addEventListener('keydown', event => {
          const step = event.key === 'ArrowLeft' || event.key === 'ArrowDown' ? -5 : event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 5 : 0;
          if (!step) return;
          event.preventDefault();
          angleInput.value = String(Math.max(-180, Math.min(180, (Number(angleInput.value) || 0) + step)));
          angleInput.dispatchEvent(new Event('input', { bubbles: true }));
          angleInput.dispatchEvent(new Event('change', { bubbles: true }));
          show();
        });
        angleInput.addEventListener('input', show);
        show();
      }
      const text = wmBox.querySelector('label.wide');
      const swatches = wmBox.querySelector('.watermark-swatches');
      if (text && size) text.after(size);
      if (swatches && angle) (swatches.closest('.ui-wm-colour-holder') || swatches).after(angle);
    }

    // Draw: illustrated pen, highlighter and rubber that stand up from the bottom of the bar.
    const DRAW_ICONS = {
      marker: '<svg class="ui-tool-art" viewBox="0 0 16 44" aria-hidden="true"><rect x="3.5" y="15" width="9" height="30" rx="2.6" fill="#eef1f4" stroke="#9aa4ae" stroke-width=".9"/><rect x="3.5" y="15" width="3" height="30" rx="1.4" fill="#fff"/><rect x="10.2" y="15" width="2.3" height="30" rx="1" fill="#d5dbe1"/><rect x="3.5" y="18" width="9" height="1.8" fill="#c6ced6"/><path d="M3.8 15.2 L6.6 7.8 Q8 6.6 9.4 7.8 L12.2 15.2 Z" fill="#e3e8ec" stroke="#9aa4ae" stroke-width=".9" stroke-linejoin="round"/><path d="M6.2 9.6 L8 4.6 L9.8 9.6 Z" fill="var(--ink,#2f7ae5)"/></svg>',
      highlighter: '<svg class="ui-tool-art" viewBox="0 0 16 44" aria-hidden="true"><rect x="2.5" y="19" width="11" height="26" rx="2.4" fill="#f6c343" stroke="#b8891a" stroke-width=".9"/><rect x="2.5" y="19" width="3.4" height="26" rx="1.6" fill="#ffe08a"/><rect x="10.6" y="19" width="2.9" height="26" rx="1.2" fill="#e0a92a"/><rect x="2.5" y="15.5" width="11" height="4.5" rx="1" fill="#e9eef2" stroke="#9aa4ae" stroke-width=".8"/><path d="M3.6 15.6 L5.4 9.8 L10.6 9.8 L12.4 15.6 Z" fill="#dfe5ea" stroke="#9aa4ae" stroke-width=".9" stroke-linejoin="round"/><path d="M5.4 9.8 L6 4.6 L10.6 6.4 L10.6 9.8 Z" fill="var(--ink,#f6c343)" stroke="#b8891a" stroke-width=".7" stroke-linejoin="round"/></svg>',
      rubber: '<svg class="ui-tool-art" viewBox="0 0 16 44" aria-hidden="true"><path d="M2.4 13.5 L4.6 8.2 Q5 7.4 5.9 7.4 L10.1 7.4 Q11 7.4 11.4 8.2 L13.6 13.5 Z" fill="#f48ea0" stroke="#c45a70" stroke-width=".9" stroke-linejoin="round"/><path d="M4.4 9.4 L5.4 8.2 L8 8.2 L7 9.4 Z" fill="#ffc6d0"/><rect x="2.4" y="13.5" width="11.2" height="14" fill="#f48ea0" stroke="#c45a70" stroke-width=".9"/><rect x="2.4" y="13.5" width="3.2" height="14" fill="#ffb3c0"/><rect x="11" y="13.5" width="2.6" height="14" fill="#e07489"/><rect x="2.4" y="27.5" width="11.2" height="17.5" fill="#3b6fd8" stroke="#274fa3" stroke-width=".9"/><rect x="2.4" y="27.5" width="3.2" height="17.5" fill="#6d97ec"/><rect x="11" y="27.5" width="2.6" height="17.5" fill="#2a58b8"/><path d="M4 32 H12 M4 35 H12" stroke="#a9c3f7" stroke-width=".7"/></svg>'
    };
    document.querySelectorAll('#drawControls .draw-mode').forEach(button => {
      const art = DRAW_ICONS[button.dataset.mode];
      if (!art) return;
      button.querySelector('svg')?.remove();
      button.insertAdjacentHTML('afterbegin', art);
      // The editor styles toolbar icons as outlines; keep these drawings' own colours.
      button.querySelectorAll('svg.ui-tool-art *').forEach(node => {
        for (const prop of ['fill', 'stroke', 'stroke-width', 'stroke-linejoin', 'opacity']) {
          const value = node.getAttribute(prop);
          if (value) node.style.setProperty(prop, value, 'important');
        }
        if (!node.getAttribute('stroke')) node.style.setProperty('stroke', 'none', 'important');
      });
      button.setAttribute('aria-label', button.title || button.textContent.trim());
      button.classList.add('ui-art-tool');
    });
    // Draw colours: four quick colours plus a full colour picker.
    const drawColours = document.querySelector('#drawControls .draw-colours');
    if (drawColours) {
      const keep = ['#142038', '#ef4444', '#16a34a', '#2563eb'];
      drawColours.querySelectorAll('.draw-swatch').forEach(swatch => { if (!keep.includes(swatch.dataset.colour)) swatch.classList.add('ui-extra-swatch'); });
      const custom = document.getElementById('drawColour');
      const rgb = document.createElement('label');
      rgb.className = 'ui-rgb';
      rgb.title = 'Any colour';
      rgb.innerHTML = '<input type="color" aria-label="Pick any colour">';
      const picker = rgb.querySelector('input');
      picker.value = custom?.value || '#142038';
      picker.addEventListener('input', () => {
        if (!custom) return;
        custom.value = picker.value;
        custom.dispatchEvent(new Event('input', { bubbles: true }));
        custom.dispatchEvent(new Event('change', { bubbles: true }));
        rgb.classList.add('is-on');
        rgb.style.setProperty('--picked', picker.value);
      });
      drawColours.addEventListener('click', event => { if (event.target.closest('.draw-swatch')) rgb.classList.remove('is-on'); });
      drawColours.append(rgb);
    }
    // Clear page drawings: a bin icon in the bar (undo brings them back).
    const clearBtn = document.getElementById('clearDrawings');
    if (clearBtn) {
      clearBtn.classList.add('ui-clear-draw');
      clearBtn.title = 'Clear page drawings';
      clearBtn.setAttribute('aria-label', 'Clear page drawings');
      clearBtn.innerHTML = `${svg('<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6"/>')}<span>Clear page drawings</span>`;
    }
    const drawBox = document.getElementById('drawControls');
    const drawColourInput = document.getElementById('drawColour');
    const inkSync = () => { if (drawBox && drawColourInput) drawBox.style.setProperty('--ink', drawColourInput.value); };
    drawColourInput?.addEventListener('input', inkSync);
    drawBox?.addEventListener('click', () => setTimeout(inkSync, 0));
    inkSync();

    // Thickness: an icon button that opens a small slider (drives the editor's own Thickness menu).
    const thicknessPicker = select => {
      if (!select) return;
      const values = [...select.options].map(option => option.value);
      const holder = document.createElement('span');
      holder.className = 'ui-thick';
      holder.innerHTML = `<button type="button" class="ui-thick-btn" aria-haspopup="true" aria-expanded="false" title="Thickness" aria-label="Thickness">${svg('<path d="M4 6h16" stroke-width="1.2"/><path d="M4 11.5h16" stroke-width="2.4"/><path d="M4 18h16" stroke-width="4"/>')}</button>
        <div class="ui-thick-pop" hidden><div class="ui-thick-row"><span>Thickness</span><output></output></div><input type="range" min="0" max="${values.length - 1}" step="1" aria-label="Thickness"><div class="ui-thick-preview"><i></i></div></div>`;
      const button = holder.querySelector('.ui-thick-btn'), pop = holder.querySelector('.ui-thick-pop'), range = holder.querySelector('input'), out = holder.querySelector('output'), line = holder.querySelector('.ui-thick-preview i');
      const show = () => {
        const index = Math.max(0, values.indexOf(select.value));
        range.value = String(index);
        out.textContent = `${select.value} px`;
        line.style.height = `${Math.min(22, Math.max(1, Number(select.value)))}px`;
      };
      const setOpen = open => { pop.hidden = !open; button.setAttribute('aria-expanded', String(open)); button.classList.toggle('is-on', open); if (open) show(); };
      button.addEventListener('click', event => { event.stopPropagation(); setOpen(pop.hidden); });
      pop.addEventListener('click', event => event.stopPropagation());
      range.addEventListener('input', () => {
        select.value = values[Number(range.value)] || select.value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        show();
      });
      document.addEventListener('click', () => setOpen(false));
      document.addEventListener('keydown', event => { if (event.key === 'Escape') setOpen(false); });
      select.addEventListener('change', show);
      select.closest('label')?.after(holder);
      show();
    };
    thicknessPicker(document.getElementById('drawThickness'));
    thicknessPicker(document.getElementById('shapeThickness'));

    // Pages window (simple mode): friendly heading, drag demo, a short toolbar; undo, redo and size at the bottom.
    const manage = document.getElementById('manageModal');
    if (manage) {
      const dialog = manage.querySelector('.manage-dialog');
      const title = document.getElementById('manageTitle');
      const intro = title?.nextElementSibling;
      const simpleOn = () => body.classList.contains('ui-simple');
      const originalTitle = title?.textContent, originalIntro = intro?.textContent;
      const applyBtn = document.getElementById('manageApply');
      const originalApply = applyBtn?.textContent;
      let merging = false;
      const words = () => {
        const on = simpleOn();
        const split = window.pdfbreezeManagerSplit, splitting = Boolean(split?.mode), parts = splitting ? split.parts : 1;
        if (title) title.textContent = splitting ? 'Split your PDF' : merging ? 'Merge PDFs' : on ? 'Arrange your pages' : originalTitle;
        if (intro) intro.textContent = splitting ? 'Click the scissors between two pages to split there. Each part downloads as its own PDF.' : merging ? 'Add the PDFs you want to join to this one, then drag the pages into the order you want.' : on ? (body.classList.contains('ui-mobile') ? 'Select a page, then move, rotate, copy or delete it. Add pages to join another PDF.' : 'Drag pages to reorder, add pages from another PDF, or select pages to rotate, copy or delete them.') : originalIntro;
        if (applyBtn) applyBtn.textContent = parts > 1 ? `Split into ${parts} PDFs` : on ? 'Save page changes' : originalApply;
        manage.classList.toggle('is-splitting', splitting);
        manage.querySelector('[data-mp-split]')?.classList.toggle('is-on', splitting);
        manage.querySelector('[data-mp-split]')?.setAttribute('aria-pressed', String(splitting));
      };
      const icon = d => `<svg class="ui-mp-ico" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
      const demo = document.createElement('div');
      demo.className = 'ui-mp-demo';
      demo.innerHTML = `<div class="ui-mp-stage" aria-hidden="true"><div class="ui-mp-p a">1</div><div class="ui-mp-p b">2</div><div class="ui-mp-p c">3</div><svg class="ui-mp-hand" viewBox="0 0 24 24"><path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5c0 3.6-2.4 6.5-6 6.5h-.6c-2 0-3.4-.8-4.6-2.4l-2.6-3.6a1.5 1.5 0 0 1 2.3-1.9L9 15V11"/></svg></div><div><b>Drag a page to move it</b><span>Pick it up, slide it left or right, and let go.</span></div>`;
      const tools = document.createElement('div');
      tools.className = 'ui-mp-tools';
      const proxy = (id, label, art, cls = '') => `<button type="button" class="ui-mp-tool ${cls}" data-mp="${id}">${icon(art)}<span>${label}</span></button>`;
      tools.innerHTML = `<button type="button" class="ui-mp-tool is-add" data-mp-add>${icon('<path d="M12 5v14M5 12h14"/>')}<span>Add pages</span></button><span class="ui-mp-sep"></span><span class="ui-mp-count"></span>
        ${proxy('manageRotateRight', 'Rotate', '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>')}
        ${proxy('manageDuplicate', 'Duplicate', '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 0 1 2-2h10"/>')}
        ${proxy('manageDelete', 'Delete', '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>', 'is-danger')}
        <button type="button" class="ui-mp-tool ui-mp-split" data-mp-split aria-pressed="false">${icon('<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12"/>')}<span>Split</span></button>
        ${proxy('manageMoveLeft', 'Move left', '<path d="M15 18l-6-6 6-6"/>', 'is-phone')}
        ${proxy('manageMoveRight', 'Move right', '<path d="M9 18l6-6-6-6"/>', 'is-phone')}
        <span class="ui-mp-sep"></span>
        <button type="button" class="ui-mp-tool" data-mp="manageSelectAll"><span>Select all</span></button>
        <button type="button" class="ui-mp-tool" data-mp="manageSelectNone"><span>Clear selection</span></button>`;
      const footExtras = document.createElement('div');
      footExtras.className = 'ui-mp-foot';
      footExtras.innerHTML = `${proxy('manageUndo', 'Undo', '<path d="M9 14 4 9l5-5M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>')}${proxy('manageRedo', 'Redo', '<path d="m15 14 5-5-5-5M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>')}<label class="ui-mp-size">Size <input type="range" min="0" max="8" step="1" value="3" aria-label="Page size"></label>`;
      const head = manage.querySelector('.signature-head');
      head?.after(demo);
      demo.after(tools);
      manage.querySelector('.signature-foot')?.prepend(footExtras);
      const count = document.getElementById('manageSelectionCount');
      const syncTools = () => {
        manage.querySelectorAll('[data-mp]').forEach(button => { const target = document.getElementById(button.dataset.mp); button.disabled = Boolean(target?.disabled); });
        const n = parseInt(count?.textContent || '0', 10) || 0;
        tools.querySelector('.ui-mp-count').textContent = n ? `${n} page${n === 1 ? '' : 's'} selected` : (body.classList.contains('ui-mobile') ? 'Tap a page to select it' : 'Click a page to select it');
        tools.classList.toggle('has-selection', n > 0);
      };
      // Add pages from other PDFs (merge): button in the toolbar and a tile after the last page.
      const addInput = document.createElement('input');
      addInput.type = 'file';
      addInput.accept = 'application/pdf,.pdf';
      addInput.multiple = true;
      addInput.hidden = true;
      manage.append(addInput);
      addInput.addEventListener('change', async () => {
        const files = [...addInput.files];
        addInput.value = '';
        if (!files.length || !window.pdfbreezeManagerAddPdf) return;
        const added = await window.pdfbreezeManagerAddPdf(files);
        if (added) { toast.textContent = added === 1 ? '1 page added. Drag it into place, then press Save page changes.' : `${added} pages added. Drag them into place, then press Save page changes.`; toast.classList.add('is-on', 'is-good'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('is-on', 'is-good'), 4500); }
        syncTools();
      });
      const grid = document.getElementById('manageGrid');
      const addTile = () => {
        if (!grid || grid.querySelector('.ui-mp-addtile')) return;
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'ui-mp-addtile';
        tile.dataset.mpAdd = '';
        tile.innerHTML = `${icon('<path d="M12 5v14M5 12h14"/>')}<b>Add pages</b><small>from another PDF</small>`;
        grid.append(tile);
      };
      if (grid) new MutationObserver(addTile).observe(grid, { childList: true });
      // More tools → Merge PDFs: open this window as the merge tool and go straight to choosing files.
      manage.addEventListener('pdfbreeze:merge', () => { merging = true; words(); addInput.click(); });
      manage.addEventListener('click', event => {
        if (event.target.closest('[data-mp-add]')) { addInput.click(); return; }
        if (event.target.closest('[data-mp-split]') && window.pdfbreezeManagerSplit) { window.pdfbreezeManagerSplit.mode = !window.pdfbreezeManagerSplit.mode; words(); return; }
        const button = event.target.closest('[data-mp]');
        if (!button) return;
        document.getElementById(button.dataset.mp)?.click();
        setTimeout(syncTools, 0);
      });
      // Size slider: steps the editor's zoom buttons (70% to 150%).
      const size = footExtras.querySelector('input');
      let sizeStep = 3;
      size.addEventListener('input', () => {
        const target = Number(size.value);
        while (sizeStep < target) { document.getElementById('manageZoomIn')?.click(); sizeStep++; }
        while (sizeStep > target) { document.getElementById('manageZoomOut')?.click(); sizeStep--; }
      });
      const watch = new MutationObserver(syncTools);
      ['manageDelete', 'manageDuplicate', 'manageRotateRight', 'manageMoveLeft', 'manageMoveRight', 'manageUndo', 'manageRedo'].forEach(id => { const el = document.getElementById(id); if (el) watch.observe(el, { attributes: true, attributeFilter: ['disabled'] }); });
      if (count) watch.observe(count, { childList: true, characterData: true, subtree: true });
      new MutationObserver(() => { if (manage.hidden) merging = false; if (!manage.hidden) { words(); syncTools(); const z = parseFloat(document.getElementById('manageGrid')?.style.getPropertyValue('--manage-zoom')) || 1; sizeStep = Math.round((z - 0.7) / 0.1); size.value = String(sizeStep); } }).observe(manage, { attributes: true, attributeFilter: ['hidden'] });
      manage.addEventListener('pdfbreeze:split', words);
      words();
      syncTools();
    }

    // Short instructions shown in the bar for tools with few settings.
    const HINTS = {
      noteControls: 'Click on the page where the note should go.',
      linkControls: 'Drag a box over the text or area that should open the link.',
      cropControls: 'Drag over the part of the page you want to keep.',
      redactControls: 'Drag across text, or drag a box over any area. Box colour:',
      stampControls: 'Choose a stamp. You can move and resize it afterwards.'
    };
    for (const [id, text] of Object.entries(HINTS)) {
      const hint = document.querySelector(`#${id} > span:not(.annotation-icon):not(.context-icon)`);
      if (hint) hint.textContent = text;
    }

    // Bold as a single B button (drives the editor's own Regular/Bold menu).
    const weight = document.getElementById('addFontWeight');
    if (weight) {
      const bold = document.createElement('button');
      bold.type = 'button';
      bold.className = 'ui-bold';
      bold.title = 'Bold';
      bold.setAttribute('aria-label', 'Bold');
      bold.textContent = 'B';
      const syncBold = () => { const on = weight.value === '700'; bold.classList.toggle('is-on', on); bold.setAttribute('aria-pressed', String(on)); };
      bold.addEventListener('click', () => {
        weight.value = weight.value === '700' ? '400' : '700';
        weight.dispatchEvent(new Event('input', { bubbles: true }));
        weight.dispatchEvent(new Event('change', { bubbles: true }));
        syncBold();
      });
      weight.addEventListener('change', syncBold);
      weight.closest('label')?.after(bold);
      syncBold();
    }

    // "+ Add text": the next click on the page places a new "Text" box there.
    const addBox = document.getElementById('addControls');
    if (addBox) {
      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.className = 'ui-add-text';
      addBtn.innerHTML = `${svg('<path d="M12 5v14M5 12h14"/>')}<span>Add text</span>`;
      addBtn.addEventListener('click', () => {
        if ($('.tool-ribbon .tool.active')?.dataset.tool !== 'add') clickTool('add');
        setTimeout(() => window.pdfbreezeArmAddText?.(), 0);
      });
      addBox.prepend(addBtn);

      // Size as a simple dropdown (drives the editor's own size box).
      const sizeInput = document.getElementById('addFontSize');
      if (sizeInput) {
        const sizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72];
        const sizeSel = document.createElement('select');
        sizeSel.className = 'ui-size-select';
        sizeSel.setAttribute('aria-label', 'Text size');
        const fill = () => {
          const v = Number(sizeInput.value) || 18;
          const list = sizes.includes(v) ? sizes : [...sizes, v].sort((a, b) => a - b);
          sizeSel.innerHTML = list.map(n => `<option value="${n}"${n === v ? ' selected' : ''}>${n}</option>`).join('');
        };
        fill();
        sizeSel.addEventListener('change', () => {
          sizeInput.value = sizeSel.value;
          sizeInput.dispatchEvent(new Event('input', { bubbles: true }));
          sizeInput.dispatchEvent(new Event('change', { bubbles: true }));
        });
        sizeInput.addEventListener('change', fill);
        sizeInput.closest('label')?.after(sizeSel);
      }
    }

    // Clicking the grey area around the page finishes a text box (the editor only listens on the page).
    const stageEl = document.getElementById('stage');
    stageEl?.addEventListener('mousedown', event => {
      if (!body.classList.contains('ui-simple')) return;
      const live = document.getElementById('liveTextEditor');
      if (!live || live.hidden) return;
      if (event.target.closest('#pageWrap')) return;
      document.getElementById('textOverlay')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: -9999, clientY: -9999 }));
    });

    // Colour rows collapse to one colour dot; click it to open the palette.
    document.querySelectorAll('.shape-colours, .highlight-colours, .watermark-swatches, .redact-colours').forEach(group => {
      group.classList.add('ui-colour-dd');
      group.addEventListener('click', event => {
        if (!body.classList.contains('ui-simple')) return;
        const swatch = event.target.closest('button');
        if (!swatch) return;
        if (!group.classList.contains('is-open')) { event.preventDefault(); event.stopPropagation(); document.querySelectorAll('.ui-colour-dd.is-open').forEach(g => g.classList.remove('is-open')); group.classList.add('is-open'); return; }
        setTimeout(() => group.classList.remove('is-open'), 0);
      }, true);
    });
    document.addEventListener('click', event => { if (!event.target.closest('.ui-colour-dd')) document.querySelectorAll('.ui-colour-dd.is-open').forEach(g => g.classList.remove('is-open')); });

    // Keep the new controls in step with the editor's own state.
    const sync = () => {
      const active = $('.tool-ribbon .tool.active')?.dataset.tool || '';
      if (!active && lastTool === 'add' && body.classList.contains('ui-simple') && !body.classList.contains('no-document')) { setTimeout(() => { if (!$('.tool-ribbon .tool.active')) clickTool('add'); }, 30); }
      document.querySelectorAll('[data-ui-tool]').forEach(button => button.classList.toggle('is-active', button.dataset.uiTool === active));
      dockMore.classList.toggle('is-active', moreTools.has(active));
      // When a tool from More tools is in use, the More button shows that tool (it still opens the menu).
      const moreKey = moreTools.has(active) ? active : '';
      if (dockMore.dataset.showing !== moreKey) {
        dockMore.dataset.showing = moreKey;
        dockMore.innerHTML = moreKey
          ? `<span class="ui-dock-icon c-mint">${svg(ICON[moreKey] || ICON.more)}<i class="ui-more-dot" aria-hidden="true">•••</i></span>${nameOf(moreKey)}`
          : `<span class="ui-dock-icon c-grey">${svg(ICON.more)}</span>More tools`;
        dockMore.title = moreKey ? `${nameOf(moreKey)} (click for more tools)` : 'More tools';
      }
      if (moreTools.has(active) && moreList.hidden) { moreList.hidden = false; moreToggle.setAttribute('aria-expanded', 'true'); }
      const title = $('[data-ui-options-title]', panel);
      if (title) title.textContent = `${nameOf(active)} settings`;
      document.querySelectorAll('[data-ui-tool-name]').forEach(node => { node.textContent = nameOf(active); });
      if (active && active !== lastTool && body.classList.contains('ui-simple') && !body.classList.contains('no-document')) { lastTool = active; showTip(active); }
      hint.innerHTML = `${svg(ICON.hint)}<span>${HINT[active] || 'Pick a tool, then click on the page.'} <b>Done? Press Download.</b></span>`;
      for (const id of ['undo', 'redo', 'download', 'prev', 'next', 'zoomOut', 'zoomIn']) {
        const disabled = !!$('#' + id)?.disabled;
        document.querySelectorAll(`[data-proxy="${id}"]`).forEach(button => { button.disabled = disabled; });
      }
      for (const id of ['pageLabel', 'zoomLabel']) {
        const text = $('#' + id)?.textContent || '';
        document.querySelectorAll(`[data-mirror="${id}"]`).forEach(node => { node.textContent = text; });
      }
      const pages = Number((($('#pageLabel')?.textContent || '').match(/of\s+(\d+)/) || [])[1] || 0);
      if (pages && !thumbsDecided && body.classList.contains('ui-simple')) {
        thumbsDecided = true;
        const phone = body.classList.contains('ui-mobile');
        const open = pages > 1 && !phone && !body.classList.contains('ui-layout-rail');
        body.classList.toggle('ui-thumbs-open', open);
        // Start at 70% for A4/Letter-size pages. Smaller pages (labels, receipts) are enlarged to fill the
        // space so they're readable.
        const startZoom = () => {
          const size = window.pdfbreezePageSize?.();
          const stage = $('#stage');
          if (!size || !window.pdfbreezeSetZoom || !stage) return;
          const [w, h] = size;
          let target = 0.7;
          if (w < 500 && h < 760) {
            const room = Math.min(stage.clientWidth - 96, 1000);
            target = Math.max(0.7, Math.min(2.5, Math.floor((room / (w * 1.35)) * 10) / 10));
          }
          window.pdfbreezeSetZoom(target);
        };
        if (!phone) setTimeout(startZoom, 60);
        $('.ui-thumbs-toggle')?.setAttribute('aria-pressed', String(open)); const thumbsLabel = $('.ui-thumbs-label'); if (thumbsLabel) thumbsLabel.textContent = open ? 'Hide pages' : 'All pages';
        window.dispatchEvent(new Event('resize'));
      }
      const name = $('#fileName')?.textContent || 'Document';
      document.querySelectorAll('[data-ui-filename]').forEach(node => { node.textContent = name; node.parentElement.title = name; });
    };
    const spaceForCard = () => {
      if (!body.classList.contains('ui-layout-dock')) return;
      // Layout position (ignores the slide-in animation, so the page doesn't jump once it finishes).
      const bottom = topFloat.offsetHeight ? topFloat.offsetTop + topFloat.offsetHeight : 72;
      body.style.setProperty('--ui-card-space', `${Math.max(84, Math.round(bottom + 14))}px`);
    };
    if ('ResizeObserver' in window) new ResizeObserver(spaceForCard).observe(topFloat);
    window.addEventListener('resize', spaceForCard);
    const observer = new MutationObserver(() => { sync(); requestAnimationFrame(spaceForCard); });
    observer.observe($('.tool-ribbon'), { attributes: true, subtree: true, attributeFilter: ['class', 'disabled'] });
    for (const id of ['download', 'prev', 'next', 'zoomOut', 'zoomIn']) { const el = $('#' + id); if (el) observer.observe(el, { attributes: true, attributeFilter: ['disabled'] }); }
    for (const id of ['pageLabel', 'zoomLabel', 'fileName']) { const el = $('#' + id); if (el) observer.observe(el, { childList: true, characterData: true, subtree: true }); }
    const status = $('#status');
    if (status) new MutationObserver(() => {
      if (!body.classList.contains('ui-simple')) return;
      const bad = /163,\s*38,\s*38|#a32626/i.test(status.style.color || '');
      if (!bad || !status.textContent.trim()) return;
      toast.textContent = status.textContent;
      toast.classList.add('is-on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('is-on'), 5000);
    }).observe(status, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['style'] });

    body.classList.add('dock-light'); // chosen dock style: light
    const desktop = window.matchMedia('(min-width: 901px)');
    function apply(next) {
      layout = next;
      if (LAYOUTS.includes(next)) simpleLayout = next;
      // Phones get the bottom-dock layout (styled for small screens); Full editor stays available.
      const shown = desktop.matches ? next : (next === 'advanced' ? 'advanced' : 'mobile');
      body.classList.toggle('ui-mobile', shown === 'mobile');
      body.classList.toggle('ui-simple', shown !== 'advanced');
      body.classList.toggle('ui-layout-panel', shown === 'panel');
      body.classList.toggle('ui-layout-dock', shown === 'dock' || shown === 'rail' || shown === 'mobile');
      body.classList.toggle('ui-layout-rail', shown === 'rail');
      // Layout icon cycles: left rail -> bottom dock -> task panel -> left rail
      const nextOf = { rail: 'dock', dock: 'panel', panel: 'rail' };
      const label = { rail: 'left toolbar', dock: 'bottom toolbar', panel: 'task panel' };
      document.querySelectorAll('[data-ui-layout]').forEach(button => {
        const target = nextOf[LAYOUTS.includes(next) ? next : simpleLayout];
        button.dataset.uiLayout = target;
        button.title = `Switch to the ${label[target]} layout`;
        button.setAttribute('aria-label', button.title);
      });
      body.classList.toggle('ui-trial', true);
      // Move the tool settings bar and "Open another PDF" into the active layout; put them back for Advanced mode.
      if (shown === 'panel') $('.ui-options-slot', panel).appendChild(contextBar);
      else if (shown === 'dock' || shown === 'rail' || shown === 'mobile') dockCard.appendChild(contextBar);
      else contextHome.parent.insertBefore(contextBar, contextHome.next);
      if (openAnother && openHome) {
        if (shown === 'panel') $('.ui-open-slot', panel).appendChild(openAnother);
        else if (shown === 'dock' || shown === 'rail' || shown === 'mobile') $('.ui-open-slot', dock).appendChild(openAnother);
        else openHome.parent.insertBefore(openAnother, openHome.next);
      }
      closeDockMenu();
      if (shown === 'advanced') hideTip();
      lastTool = '';
      sync();
      window.dispatchEvent(new Event('resize'));
    }
    apply(layout);
    desktop.addEventListener('change', () => apply(layout));
    fetchLayoutSetting().then(value => {
      if (!value || value === simpleLayout) return;
      simpleLayout = value;
      if (layout !== 'advanced') apply(value);
    });

    // Simple layouts open on Add text, unless the tool page asked for a specific tool.
    const askedTool = new URLSearchParams(location.search).get('tool');
    const wantsDefault = !askedTool || askedTool === 'edit' || askedTool === 'add';
    let defaulted = false;
    const pickDefault = () => {
      if (defaulted || body.classList.contains('no-document') || !body.classList.contains('ui-simple')) return;
      defaulted = true;
      if (wantsDefault) setTimeout(() => clickTool('add'), 60);
    };
    new MutationObserver(() => { pickDefault(); sync(); }).observe(body, { attributes: true, attributeFilter: ['class'] });
    pickDefault();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
