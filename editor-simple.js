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
  const TIP_KEY = 'pdfbreezeEditorTipsSeen';
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
    view.innerHTML = `<button type="button" class="ui-thumbs-toggle" aria-pressed="false" title="Show pages">${svg(ICON.manage)}</button><span class="ui-view-sep"></span>
      <button type="button" data-proxy="prev" aria-label="Previous page">${svg('<path d="m15 18-6-6 6-6"/>')}</button><span data-mirror="pageLabel">Page 1</span><button type="button" data-proxy="next" aria-label="Next page">${svg('<path d="m9 18 6-6-6-6"/>')}</button><span class="ui-view-sep"></span>
      <button type="button" data-proxy="zoomOut" aria-label="Zoom out">${svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M8 11h6"/>')}</button><span data-mirror="zoomLabel">100%</span><button type="button" data-proxy="zoomIn" aria-label="Zoom in">${svg('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3M11 8v6M8 11h6"/>')}</button>`;

    // Tip card: how to use the chosen tool (first time per tool)
    const tip = document.createElement('div');
    tip.className = 'ui-tip';
    tip.setAttribute('role', 'dialog');
    tip.setAttribute('aria-label', 'How to use this tool');
    $('.viewer-area')?.prepend(tip);
    let tipTool = '';
    const hideTip = () => { tip.classList.remove('is-on'); body.classList.remove('ui-tip-on'); };
    const showTip = tool => {
      const steps = TIPS[tool];
      if (!steps || tipsSeen[tool] || tipsSeen.__off) return hideTip();
      tipTool = tool;
      tip.innerHTML = `<div class="ui-tip-head"><span class="ui-tip-icon">${svg(ICON[tool] || ICON.hint)}</span><div><small>How to use</small><b>${nameOf(tool)}</b></div><button type="button" class="ui-tip-x" data-tip="close" aria-label="Close tip">${svg('<path d="M6 6l12 12M18 6 6 18"/>')}</button></div>
        <ol>${steps.map(step => `<li><span>${body.classList.contains('ui-mobile') ? step.replace(/\bClick\b/g, 'Tap').replace(/\bclick\b/g, 'tap').replace(/your mouse/g, 'your finger') : step}</span></li>`).join('')}</ol>
        <div class="ui-tip-foot"><button type="button" class="ui-tip-off" data-tip="off">Turn off tips</button><button type="button" class="ui-tip-ok" data-tip="ok">Got it</button></div>`;
      tip.classList.add('is-on');
      body.classList.add('ui-tip-on');
    };
    tip.addEventListener('click', event => {
      const action = event.target.closest('[data-tip]')?.dataset.tip;
      if (!action) return;
      if (action === 'off') tipsSeen.__off = true;
      else tipsSeen[tipTool] = true;
      saveTips();
      hideTip();
    });
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
      if (event.target.closest('.ui-thumbs-toggle')) { const open = !body.classList.contains('ui-thumbs-open'); body.classList.toggle('ui-thumbs-open', open); $('.ui-thumbs-toggle').setAttribute('aria-pressed', String(open)); window.dispatchEvent(new Event('resize')); return; }
      const pick = event.target.closest('[data-ui-tool]');
      if (pick) {
        const live = document.getElementById('liveTextEditor');
        if (live && !live.hidden) document.getElementById('textOverlay')?.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: -9999, clientY: -9999 }));
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
    const EXTRAS = { addControls: 'Fill colour, opacity, alignment', drawControls: 'Custom colour, clear page drawings', shapeControls: 'Fill colour', highlightControls: 'Squiggly, custom colour, opacity', };
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
        sync();
        return group;
      };
      const size = segmented('Size', 'watermarkSize', [['40', 'Small', '<span style="font-size:11px">A</span>'], ['65', 'Medium', '<span style="font-size:15px">A</span>'], ['90', 'Large', '<span style="font-size:20px">A</span>']], 'is-size');
      const opacity = segmented('Opacity', 'watermarkOpacity', [['18', 'Faint', '<i style="opacity:.25"></i>'], ['35', 'Light', '<i style="opacity:.5"></i>'], ['60', 'Strong', '<i style="opacity:.9"></i>']], 'is-opacity');
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
      if (text) text.after(...[size, opacity].filter(Boolean));
      if (swatches && angle) swatches.after(angle);
      // Opacity dots use the chosen watermark colour.
      const colourInput = document.getElementById('watermarkColour');
      const tint = () => { if (opacity && colourInput) opacity.style.setProperty('--wm-colour', colourInput.value); };
      colourInput?.addEventListener('input', tint);
      wmBox.addEventListener('click', () => setTimeout(tint, 0));
      tint();
    }

    // Short instructions shown in the bar for tools with few settings.
    const HINTS = {
      noteControls: 'Click on the page where the note should go.',
      linkControls: 'Drag a box over the text or area that should open the link.',
      cropControls: 'Drag over the part of the page you want to keep.',
      redactControls: 'Drag across the text to black it out. Box colour:',
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
    document.querySelectorAll('.draw-colours, .shape-colours, .highlight-colours, .watermark-swatches, .redact-colours').forEach(group => {
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
        $('.ui-thumbs-toggle')?.setAttribute('aria-pressed', String(open));
        window.dispatchEvent(new Event('resize'));
      }
      const name = $('#fileName')?.textContent || 'Document';
      document.querySelectorAll('[data-ui-filename]').forEach(node => { node.textContent = name; node.parentElement.title = name; });
    };
    const spaceForCard = () => {
      if (!body.classList.contains('ui-layout-dock')) return;
      const bottom = topFloat.getBoundingClientRect().bottom || 72;
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
