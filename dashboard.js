(() => {
  const tools = [
    ['Edit PDF','Update text and content','edit-pdf.html','i-edit'],
    ['Convert files','Choose from every converter','all-converters.html','i-convert'],
    ['Compress PDF','Reduce PDF file size','compress-pdf.html','i-compress'],
    ['Merge PDF','Combine documents','merge-pdf.html','i-convert'],
    ['Sign PDF','Add an electronic signature','sign-pdf.html','i-sign'],
    ['OCR PDF','Recognise scanned text','ocr-pdf.html','i-scan'],
    ['Add watermark','Add text across PDF pages','add-watermark.html','i-edit'],
    ['Crop PDF','Trim page margins','crop-pdf.html','i-grid'],
    ['Split PDF','Separate document pages','split-pdf.html','i-grid'],
    ['PDF to Word','Create an editable document','pdf-to-word.html','i-file']
  ];

  document.querySelectorAll('[data-tool-search]').forEach((search) => {
    const input = search.querySelector('input');
    const menu = search.querySelector('.tool-search-menu');
    const render = () => {
      const query = input.value.trim().toLowerCase();
      const matches = tools.filter(t => !query || (t[0] + ' ' + t[1]).toLowerCase().includes(query));
      menu.innerHTML = `<div class="tool-search-caption">${query ? 'MATCHING TOOLS' : 'POPULAR TOOLS'}</div>` + matches.slice(0,8).map(t => `<a class="tool-result" href="${t[2]}"><i><svg><use href="#${t[3]}"></use></svg></i><span><b>${t[0]}</b><small>${t[1]}</small></span></a>`).join('');
      menu.hidden = false;
    };
    input.addEventListener('focus', render);
    input.addEventListener('input', render);
    document.addEventListener('pointerdown', e => { if (!search.contains(e.target)) menu.hidden = true; });
  });

  const layer = document.querySelector('[data-account-layer]');
  const openAccount = (tab = 'account') => {
    layer.hidden = false;
    document.body.style.overflow = 'hidden';
    selectTab(tab);
  };
  const closeAccount = () => { layer.hidden = true; document.body.style.overflow = ''; };
  const selectTab = (tab) => {
    layer.querySelectorAll('[data-account-tab]').forEach(b => b.classList.toggle('active', b.dataset.accountTab === tab));
    layer.querySelectorAll('[data-account-panel]').forEach(p => p.classList.toggle('active', p.dataset.accountPanel === tab));
  };
  document.querySelectorAll('[data-open-account]').forEach(b => b.addEventListener('click', () => openAccount('account')));
  layer.querySelectorAll('[data-close-account]').forEach(b => b.addEventListener('click', closeAccount));
  layer.querySelectorAll('[data-account-tab]').forEach(b => b.addEventListener('click', () => selectTab(b.dataset.accountTab)));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !layer.hidden) closeAccount(); });
  document.querySelectorAll('[data-placeholder]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  const params = new URLSearchParams(location.search);
  if (params.get('account') === 'open') openAccount(params.get('tab') || 'account');
})();
