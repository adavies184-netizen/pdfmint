/* PDFBreeze simple editor layouts (November 2026 trial).
   Two optional desktop layouts on top of the existing editor:
     editor-pdfium.html?ui=panel  -> task panel on the right
     editor-pdfium.html?ui=dock   -> bottom dock
     ?ui=advanced                 -> the full editor (today's layout)
     ?ui=off                      -> forget the trial choice
   The choice is remembered in this browser. With no choice saved, the editor is unchanged.
   Every new button simply clicks the editor's own button, so behaviour is identical. */
(() => {
  const KEY = 'pdfbreezeEditorUi';
  const LAYOUTS = ['panel', 'dock'];
  const read = () => { try { return localStorage.getItem(KEY) || ''; } catch (_) { return ''; } };
  const save = value => { try { localStorage.setItem(KEY, value); } catch (_) {} };
  const asked = new URLSearchParams(location.search).get('ui');
  if (asked === 'off') { try { localStorage.removeItem(KEY); localStorage.removeItem(KEY + 'Last'); } catch (_) {} return; }
  if (asked && [...LAYOUTS, 'advanced'].includes(asked)) save(asked);
  let layout = read();
  if (!LAYOUTS.includes(layout) && layout !== 'advanced') return; // no trial chosen: leave the editor as it is
  // Remember which simple layout to return to from Advanced mode.
  let simpleLayout = LAYOUTS.includes(layout) ? layout : (() => { try { return localStorage.getItem(KEY + 'Last') || 'panel'; } catch (_) { return 'panel'; } })();

  const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
  const ICON = {
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    add: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
    sign: '<path d="M3 17c3-1 4-9 7-9s0 8 3 8 3-4 5-4 2 2 3 2"/><path d="M3 21h18"/>',
    highlight: '<path d="m9 11-4 4v3h3l4-4"/><path d="m9 11 6-6 4 4-6 6z"/><path d="M14 20h7"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>',
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
    ['add', 'Add text', 'Type anywhere, like filling in a form', 'c-blue'],
    ['edit', 'Edit text', 'Click text on the page to change it', 'c-mint'],
    ['sign', 'Sign', 'Draw, type or upload your signature', 'c-violet'],
    ['draw', 'Draw', 'Pen, highlighter and rubber', 'c-amber'],
    ['image', 'Add image', 'Logo, photo or scan', 'c-blue'],
    ['manage', 'Pages', 'Rotate, reorder or delete pages', 'c-mint']
  ];
  const MORE = [
    ['highlight', 'Highlight text', 'Highlight, underline or strike out words'],
    ['shapes', 'Shapes & arrows', 'Boxes, circles, lines, ticks'],
    ['note', 'Sticky note', 'Leave a comment'],
    ['link', 'Link', 'Add a web link'],
    ['stamp', 'Stamp', 'Approved, paid and more'],
    ['watermark', 'Watermark', 'Brand every page'],
    ['crop', 'Crop', 'Trim page edges'],
    ['redact', 'Redact', 'Black out text for good']
  ];
  const HINT = {
    edit: 'Click any text on the page, type your new wording, then press Replace text.',
    add: 'Click on the page where you want to type.',
    sign: 'Create your signature, then click where it should go.',
    highlight: 'Drag across the words you want to mark.',
    image: 'Choose an image, then drag it into place.',
    draw: 'Draw on the page with your mouse.',
    shapes: 'Drag on the page to draw the shape.',
    note: 'Click on the page to place a note.',
    link: 'Drag over the area that should open the link.',
    stamp: 'Pick a stamp, then click where it goes.',
    watermark: 'Type your watermark, then apply it to the pages.',
    crop: 'Drag over the part of the page you want to keep.',
    redact: 'Drag across the text you want to black out.'
  };
  const TIPS = {
    add: ['Click on the page where you want to type.', 'Type your text.', 'Change the font, size or colour in the settings. Drag the box to move it.'],
    edit: ['Click the text you want to change.', 'Type your new wording in the New text box.', 'Press Replace text.'],
    sign: ['Draw, type or upload your signature.', 'Press Add signature.', 'Move it into place on the page.'],
    draw: ['Choose marker, highlighter or rubber.', 'Pick a colour and thickness.', 'Draw on the page with your mouse.'],
    image: ['Choose an image from your device.', 'Drag it into place on the page.'],
    manage: ['Click pages to select them.', 'Rotate, move, duplicate or delete them.', 'Press Apply to save the changes.'],
    highlight: ['Choose highlight, underline, squiggly or strikethrough.', 'Drag across the words you want to mark.'],
    shapes: ['Pick a shape: box, circle, line, tick or cross.', 'Drag on the page to draw it.'],
    note: ['Click on the page where the note should go.', 'Type your message in the box that opens.'],
    link: ['Drag over the area that should be clickable.', 'Enter the web address or page to open.'],
    stamp: ['Pick a stamp design, or make your own.', 'Click on the page where it should go.'],
    watermark: ['Type your watermark text.', 'Choose its size, colour and angle.', 'Apply it to your pages.'],
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
    modeSwitch.textContent = 'Simple mode';
    modeSwitch.title = 'Back to the simple editor';
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
        <ol>${steps.map(step => `<li>${step}</li>`).join('')}</ol>
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
      <div class="ui-panel-top">${fileHtml}${historyHtml}</div>
      <div class="ui-panel-head"><h2>What would you like to do?</h2><p>Pick a tool, then click on the page.</p></div>
      <div class="ui-panel-scroll">
        <div class="ui-tasks">${MAIN.map(([tool, title, text, colour]) => `<button type="button" class="ui-task" data-ui-tool="${tool}"><span class="ui-task-icon ${colour}">${svg(ICON[tool])}</span><span><b>${title}</b><small>${text}</small></span></button>`).join('')}</div>
        <div class="ui-options"><div class="ui-options-head">${svg(ICON.sliders)}<b data-ui-options-title>Tool settings</b></div><div class="ui-options-slot"></div></div>
        <button type="button" class="ui-more-toggle" aria-expanded="false">${svg(ICON.more)}<span>More tools <small>highlight, shapes, notes, stamps…</small></span>${svg(ICON.chev)}</button>
        <div class="ui-more-list" hidden>${MORE.map(([tool, title, text]) => `<button type="button" class="ui-more-item" data-ui-tool="${tool}">${svg(ICON[tool])}<span><b>${title}</b><small>${text}</small></span></button>`).join('')}</div>
      </div>
      <div class="ui-panel-foot"><button type="button" class="ui-download" data-proxy="download">${svg(ICON.download)}<span>Download</span></button>
        <div class="ui-foot-links"><span class="ui-open-slot"></span><button type="button" class="ui-link" data-ui-advanced>Advanced mode</button></div></div>`;

    // Layout B: bottom dock, with two small floating corners
    const dockLeft = mount(document.createElement('div'));
    dockLeft.className = 'ui-corner ui-corner-left';
    dockLeft.innerHTML = fileHtml;
    const dockRight = mount(document.createElement('div'));
    dockRight.className = 'ui-corner ui-corner-right';
    dockRight.innerHTML = `${historyHtml}<button type="button" class="ui-link" data-ui-advanced>Advanced mode</button><button type="button" class="ui-download ui-download-sm" data-proxy="download">${svg(ICON.download)}<span>Download</span></button>`;
    const dock = mount(document.createElement('nav'));
    dock.className = 'ui-dock';
    dock.setAttribute('aria-label', 'Editing tools');
    dock.innerHTML = `${MAIN.map(([tool, title, , colour]) => `<button type="button" class="ui-dock-item" data-ui-tool="${tool}"><span class="ui-dock-icon ${colour}">${svg(ICON[tool])}</span>${title}</button>`).join('')}
      <span class="ui-dock-sep" aria-hidden="true"></span>
      <button type="button" class="ui-dock-item ui-dock-more" aria-expanded="false"><span class="ui-dock-icon c-grey">${svg(ICON.more)}</span>More</button>
      <div class="ui-dock-menu" hidden><div class="ui-dock-menu-head">More tools</div>${MORE.map(([tool, title, text]) => `<button type="button" class="ui-more-item" data-ui-tool="${tool}">${svg(ICON[tool])}<span><b>${title}</b><small>${text}</small></span></button>`).join('')}<div class="ui-dock-menu-foot ui-open-slot"></div></div>`;
    const dockCard = mount(document.createElement('div'));
    dockCard.className = 'ui-dock-card';

    // Behaviour
    const isOwn = node => own.some(el => el.contains(node));
    document.addEventListener('click', event => {
      if (!isOwn(event.target)) { if (!event.target.closest('.ui-dock-more,.ui-dock-menu')) closeDockMenu(); return; }
      const proxy = event.target.closest('[data-proxy]');
      if (proxy) { $('#' + proxy.dataset.proxy)?.click(); return; }
      if (event.target.closest('[data-ui-advanced]')) { apply('advanced'); return; }
      if (event.target.closest('.ui-thumbs-toggle')) { const open = !body.classList.contains('ui-thumbs-open'); body.classList.toggle('ui-thumbs-open', open); $('.ui-thumbs-toggle').setAttribute('aria-pressed', String(open)); window.dispatchEvent(new Event('resize')); return; }
      const pick = event.target.closest('[data-ui-tool]');
      if (pick) { clickTool(pick.dataset.uiTool); closeDockMenu(); return; }
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

    // Keep the new controls in step with the editor's own state.
    const sync = () => {
      const active = $('.tool-ribbon .tool.active')?.dataset.tool || 'edit';
      document.querySelectorAll('[data-ui-tool]').forEach(button => button.classList.toggle('is-active', button.dataset.uiTool === active));
      dockMore.classList.toggle('is-active', moreTools.has(active));
      if (moreTools.has(active) && moreList.hidden) { moreList.hidden = false; moreToggle.setAttribute('aria-expanded', 'true'); }
      const title = $('[data-ui-options-title]', panel);
      if (title) title.textContent = `${nameOf(active)} settings`;
      if (active !== lastTool && body.classList.contains('ui-simple') && !body.classList.contains('no-document')) { lastTool = active; showTip(active); }
      hint.innerHTML = `${svg(ICON.hint)}<span>${HINT[active] || 'Pick a tool, then click on the page.'} <b>Done? Press Download.</b></span>`;
      for (const id of ['undo', 'redo', 'download', 'prev', 'next', 'zoomOut', 'zoomIn']) {
        const disabled = !!$('#' + id)?.disabled;
        document.querySelectorAll(`[data-proxy="${id}"]`).forEach(button => { button.disabled = disabled; });
      }
      for (const id of ['pageLabel', 'zoomLabel']) {
        const text = $('#' + id)?.textContent || '';
        document.querySelectorAll(`[data-mirror="${id}"]`).forEach(node => { node.textContent = text; });
      }
      const name = $('#fileName')?.textContent || 'Document';
      document.querySelectorAll('[data-ui-filename]').forEach(node => { node.textContent = name; node.parentElement.title = name; });
    };
    const observer = new MutationObserver(sync);
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

    const desktop = window.matchMedia('(min-width: 901px)');
    function apply(next) {
      layout = next;
      save(next);
      if (LAYOUTS.includes(next)) { simpleLayout = next; try { localStorage.setItem(KEY + 'Last', next); } catch (_) {} }
      // Phones keep today's editor; the trial layouts are desktop only.
      const shown = desktop.matches ? next : 'advanced';
      body.classList.toggle('ui-simple', shown !== 'advanced');
      body.classList.toggle('ui-layout-panel', shown === 'panel');
      body.classList.toggle('ui-layout-dock', shown === 'dock');
      body.classList.toggle('ui-trial', desktop.matches);
      // Move the tool settings bar and "Open another PDF" into the active layout; put them back for Advanced mode.
      if (shown === 'panel') $('.ui-options-slot', panel).appendChild(contextBar);
      else if (shown === 'dock') dockCard.appendChild(contextBar);
      else contextHome.parent.insertBefore(contextBar, contextHome.next);
      if (openAnother && openHome) {
        if (shown === 'panel') $('.ui-open-slot', panel).appendChild(openAnother);
        else if (shown === 'dock') $('.ui-open-slot', dock).appendChild(openAnother);
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
