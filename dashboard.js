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

  const dashboardMenus = {
    edit: {
      title: 'Edit PDF', copy: 'Choose the change you want to make.', icon: 'i-edit',
      tools: [
        ['Add text','Insert new text anywhere','i-text','text',''],
        ['Edit text','Modify existing PDF text','i-edit','edit',''],
        ['Add watermark','Brand or protect every page','i-water','watermark',''],
        ['Text highlight','Mark important passages','i-highlight','highlight',''],
        ['Add image','Place an image on the PDF','i-image','image',''],
        ['Crop pages','Trim page margins','i-crop','crop',''],
        ['Add stamp','Insert a stamp on any page','i-stamp','stamp',''],
        ['Add hyperlink','Insert a clickable link','i-link','link',''],
        ['Add note','Leave a note or comment','i-note','note','']
      ]
    },
    organize: {
      title: 'Organize Pages', copy: 'Arrange and restructure your PDF pages.', icon: 'i-grid',
      tools: [
        ['Merge PDFs','Combine files into one document','i-merge','manage','merge'],
        ['Split PDF','Divide one PDF into separate files','i-split','manage','split'],
        ['Rotate pages','Change page orientation','i-rotate','manage','rotate'],
        ['Reorder pages','Drag pages into a new order','i-reorder','manage','reorder'],
        ['Delete pages','Remove pages you no longer need','i-delete','manage','delete']
      ]
    }
  };
  const drawer = document.querySelector('[data-tool-drawer]');
  const drawerTools = drawer?.querySelector('[data-drawer-tools]');
  const pickerLayer = document.querySelector('[data-document-picker]');
  const pickerInput = pickerLayer?.querySelector('[data-picker-input]');
  const progressLayer = document.querySelector('[data-dashboard-progress]');
  let selectedDashboardTool = null;

  const closeDrawer = () => {
    drawer?.classList.remove('open');
    drawer?.setAttribute('aria-hidden','true');
    document.querySelectorAll('[data-dashboard-menu]').forEach(button => button.classList.remove('active'));
  };
  const openDrawer = (name) => {
    const menu = dashboardMenus[name];
    if (!drawer || !menu) return;
    const trigger = document.querySelector(`[data-dashboard-menu="${name}"]`);
    document.querySelectorAll('[data-dashboard-menu]').forEach(button => button.classList.toggle('active', button === trigger));
    drawer.querySelector('[data-drawer-title]').textContent = menu.title;
    drawer.querySelector('[data-drawer-copy]').textContent = menu.copy;
    drawer.querySelector('.drawer-icon use').setAttribute('href', `#${menu.icon}`);
    drawerTools.innerHTML = menu.tools.map((tool,index) => `<button class="drawer-tool" type="button" data-drawer-tool="${name}-${index}"><i><svg><use href="#${tool[2]}"></use></svg></i><span><b>${tool[0]}</b><small>${tool[1]}</small></span><svg><use href="#i-chevron"></use></svg></button>`).join('');
    drawerTools.querySelectorAll('[data-drawer-tool]').forEach((button,index) => button.addEventListener('click', () => openDocumentPicker(menu.tools[index])));
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden','false');
  };
  window.openDashboardMenu = openDrawer;
  document.querySelectorAll('[data-dashboard-menu]').forEach(button => button.addEventListener('click', event => {
    event.preventDefault();
    openDrawer(button.dataset.dashboardMenu);
  }));
  drawer?.querySelector('[data-close-drawer]')?.addEventListener('click', closeDrawer);

  const openDocumentPicker = (tool) => {
    selectedDashboardTool = tool;
    if (!pickerLayer) return;
    pickerLayer.querySelector('[data-picker-title]').textContent = tool[0];
    pickerLayer.querySelector('[data-picker-copy]').textContent = tool[1] + '. Upload a new PDF or continue with a file from My Files.';
    pickerLayer.querySelector('[data-picker-icon] use').setAttribute('href', `#${tool[2]}`);
    pickerLayer.hidden = false;
    document.body.style.overflow = 'hidden';
  };
  const closePicker = () => { if (pickerLayer) pickerLayer.hidden = true; document.body.style.overflow = ''; };
  pickerLayer?.querySelectorAll('[data-close-picker]').forEach(button => button.addEventListener('click', closePicker));

  function simplePdfFile(name) {
    const safeName = String(name || 'PDFMint document.pdf').replace(/[^\x20-\x7e]/g,'');
    const text = `PDFMint file: ${safeName}`.replace(/[()\\]/g, value => `\\${value}`);
    const objects = [
      '<< /Type /Catalog /Pages 2 0 R >>',
      '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
      `<< /Length ${38 + text.length} >>\nstream\nBT /F1 18 Tf 72 700 Td (${text}) Tj ET\nendstream`,
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
    ];
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object,index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach(offset => { pdf += `${String(offset).padStart(10,'0')} 00000 n \n`; });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
    return new File([new TextEncoder().encode(pdf)], safeName, { type:'application/pdf', lastModified:Date.now() });
  }

  function openDashboardTransferDb() {
    return new Promise((resolve,reject) => {
      const request = indexedDB.open('pdfmint-editor-transfer',1);
      request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('uploads')) request.result.createObjectStore('uploads'); };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function storeDashboardPdf(file) {
    const db = await openDashboardTransferDb();
    const bytes = await file.arrayBuffer();
    await new Promise((resolve,reject) => {
      const transaction = db.transaction('uploads','readwrite');
      transaction.objectStore('uploads').put({name:file.name,type:file.type || 'application/pdf',lastModified:file.lastModified || Date.now(),bytes},'pending-pdf');
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }
  async function continueToDashboardTool(file) {
    if (!file || !selectedDashboardTool) return;
    closePicker(); closeDrawer();
    progressLayer.hidden = false;
    progressLayer.querySelector('[data-progress-title]').textContent = `Opening ${selectedDashboardTool[0]}`;
    progressLayer.querySelector('[data-progress-copy]').textContent = 'Securely preparing your document. No email confirmation is needed.';
    const bar = progressLayer.querySelector('[data-progress-bar]');
    const percent = progressLayer.querySelector('[data-progress-percent]');
    let value = 8; bar.style.width = `${value}%`; percent.textContent = `${value}%`;
    const timer = window.setInterval(() => { value = Math.min(92,value + Math.ceil(Math.random() * 12)); bar.style.width = `${value}%`; percent.textContent = `${value}%`; },150);
    try {
      await storeDashboardPdf(file);
      await new Promise(resolve => window.setTimeout(resolve,650));
      window.clearInterval(timer); bar.style.width = '100%'; percent.textContent = '100%';
      await new Promise(resolve => window.setTimeout(resolve,250));
      const params = new URLSearchParams({tool:selectedDashboardTool[3]});
      if (selectedDashboardTool[4]) params.set('action',selectedDashboardTool[4]);
      window.location.href = `editor.html?${params}`;
    } catch (error) {
      window.clearInterval(timer); console.error(error); progressLayer.hidden = true; document.body.style.overflow = '';
    }
  }
  pickerInput?.addEventListener('change', () => { const file = pickerInput.files?.[0]; if (file) continueToDashboardTool(file); pickerInput.value = ''; });
  pickerLayer?.querySelectorAll('[data-library-file]').forEach(button => button.addEventListener('click', () => continueToDashboardTool(simplePdfFile(button.dataset.libraryFile))));

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

  const closeExpanders = (except = null) => {
    layer.querySelectorAll('[data-expander]').forEach(panel => {
      if (panel === except) return;
      panel.classList.remove('open');
      const trigger = layer.querySelector(`[data-expand="${panel.dataset.expander}"]`);
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    });
  };
  const setExpander = (name, forceOpen) => {
    const panel = layer.querySelector(`[data-expander="${name}"]`);
    const trigger = layer.querySelector(`[data-expand="${name}"]`);
    if (!panel || !trigger) return;
    const shouldOpen = forceOpen ?? !panel.classList.contains('open');
    closeExpanders(shouldOpen ? panel : null);
    panel.classList.toggle('open', shouldOpen);
    trigger.setAttribute('aria-expanded', String(shouldOpen));
    if (shouldOpen) window.setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 180);
  };
  layer.querySelectorAll('[data-expand]').forEach(button => button.addEventListener('click', () => setExpander(button.dataset.expand)));
  layer.querySelectorAll('[data-collapse]').forEach(button => button.addEventListener('click', () => {
    const panel = button.closest('[data-expander]');
    if (panel) setExpander(panel.dataset.expander, false);
  }));

  const profileForm = layer.querySelector('[data-profile-form]');
  profileForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (!profileForm.reportValidity()) return;
    const data = new FormData(profileForm);
    const first = String(data.get('firstName')).trim();
    const last = String(data.get('lastName')).trim();
    const email = String(data.get('email')).trim();
    const fullName = `${first} ${last}`.trim();
    layer.querySelector('[data-profile-name]').textContent = fullName;
    layer.querySelector('[data-profile-email]').textContent = email;
    layer.querySelector('[data-profile-initials]').textContent = `${first[0] || ''}${last[0] || ''}`.toUpperCase();
    profileForm.querySelector('.form-message').textContent = 'Profile updated.';
    try { localStorage.setItem('pdfmintProfile', JSON.stringify({ first, last, email })); } catch (_) {}
    window.setTimeout(() => setExpander('profile-editor', false), 650);
  });

  const securityForm = layer.querySelector('[data-security-form]');
  securityForm?.addEventListener('submit', event => {
    event.preventDefault();
    const message = securityForm.querySelector('.form-message');
    const next = securityForm.elements.newPassword.value;
    const confirm = securityForm.elements.confirmPassword.value;
    if (!securityForm.reportValidity()) return;
    if (!/\d/.test(next)) { message.textContent = 'Add at least one number to your new password.'; message.classList.add('error'); return; }
    if (next !== confirm) { message.textContent = 'The new passwords do not match.'; message.classList.add('error'); return; }
    message.classList.remove('error'); message.textContent = 'Password updated securely.';
    securityForm.reset(); securityForm.elements.loginAlerts.checked = true;
    window.setTimeout(() => setExpander('security-editor', false), 700);
  });

  const regionForm = layer.querySelector('[data-region-form]');
  const timezoneSelect = layer.querySelector('[data-timezone-select]');
  const detectedTimezone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (_) { return 'Europe/London'; } })();
  let savedTimezone = detectedTimezone;
  try { savedTimezone = localStorage.getItem('pdfmintPaymentTimezone') || detectedTimezone; } catch (_) {}
  if (timezoneSelect && [...timezoneSelect.options].some(option => option.value === savedTimezone)) timezoneSelect.value = savedTimezone;
  regionForm?.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(regionForm);
    const language = String(data.get('language'));
    const currency = String(data.get('currency'));
    const timezone = String(data.get('timezone'));
    layer.querySelector('[data-region-summary]').textContent = `${language}, ${currency} · ${timezone}`;
    regionForm.querySelector('.form-message').textContent = 'Language and regional preferences saved.';
    try { localStorage.setItem('pdfmintRegion', JSON.stringify({ language, currency, timezone })); } catch (_) {}
    window.setTimeout(() => setExpander('region-editor', false), 650);
  });

  const cardForm = layer.querySelector('[data-card-form]');
  const addCardButton = layer.querySelector('[data-show-card-form]');
  const savedCards = layer.querySelector('[data-saved-cards]');
  addCardButton?.addEventListener('click', () => { cardForm.hidden = false; addCardButton.hidden = true; cardForm.elements.cardNumber.focus(); });
  layer.querySelector('[data-hide-card-form]')?.addEventListener('click', () => { cardForm.hidden = true; addCardButton.hidden = false; cardForm.reset(); });
  cardForm?.addEventListener('input', event => {
    if (event.target.name === 'cardNumber') event.target.value = event.target.value.replace(/\D/g, '').slice(0,16).replace(/(.{4})/g, '$1 ').trim();
    if (event.target.name === 'expiry') event.target.value = event.target.value.replace(/\D/g, '').slice(0,4).replace(/^(\d{2})(\d)/, '$1/$2');
    if (event.target.name === 'cvc') event.target.value = event.target.value.replace(/\D/g, '').slice(0,4);
  });
  cardForm?.addEventListener('submit', event => {
    event.preventDefault();
    if (!cardForm.reportValidity()) return;
    if (savedCards.children.length >= 2) return;
    const data = new FormData(cardForm);
    const digits = String(data.get('cardNumber')).replace(/\D/g, '');
    if (digits.length < 12) { const message = cardForm.querySelector('.form-message'); message.textContent = 'Enter a valid card number.'; message.classList.add('error'); return; }
    const lastFour = digits.slice(-4);
    const expiry = String(data.get('expiry'));
    savedCards.querySelectorAll('input').forEach(input => input.checked = false);
    savedCards.querySelectorAll('small').forEach(small => { small.textContent = small.textContent.replace(' · Default',''); });
    const label = document.createElement('label');
    label.className = 'saved-card';
    label.innerHTML = `<input type="radio" name="defaultCard" value="${lastFour}" checked><span class="mini-card">CARD</span><span><b>Card ending in ${lastFour}</b><small>Expires ${expiry} · Default</small></span>`;
    savedCards.appendChild(label);
    cardForm.reset(); cardForm.hidden = true; addCardButton.hidden = false; addCardButton.disabled = true; addCardButton.textContent = 'Maximum of two cards saved';
    const topCard = layer.querySelector('.payment-card');
    topCard.querySelector('b').textContent = `Card ending in ${lastFour}`;
    topCard.querySelector('span').textContent = `Expires ${expiry} · Last used`;
  });
  savedCards?.addEventListener('change', event => {
    if (!event.target.matches('input[name="defaultCard"]')) return;
    savedCards.querySelectorAll('small').forEach(small => { small.textContent = small.textContent.replace(' · Default',''); });
    const chosen = event.target.closest('.saved-card');
    chosen.querySelector('small').textContent += ' · Default';
    const topCard = layer.querySelector('.payment-card');
    topCard.querySelector('b').textContent = chosen.querySelector('b').textContent;
    topCard.querySelector('span').textContent = chosen.querySelector('small').textContent.replace(' · Default','') + ' · Last used';
  });

  try {
    const savedProfile = JSON.parse(localStorage.getItem('pdfmintProfile') || 'null');
    if (savedProfile) {
      profileForm.elements.firstName.value = savedProfile.first || '';
      profileForm.elements.lastName.value = savedProfile.last || '';
      profileForm.elements.email.value = savedProfile.email || '';
      layer.querySelector('[data-profile-name]').textContent = `${savedProfile.first || ''} ${savedProfile.last || ''}`.trim();
      layer.querySelector('[data-profile-email]').textContent = savedProfile.email || '';
      layer.querySelector('[data-profile-initials]').textContent = `${savedProfile.first?.[0] || ''}${savedProfile.last?.[0] || ''}`.toUpperCase();
    }
    const paymentCard = JSON.parse(localStorage.getItem('pdfmintPaymentCard') || 'null');
    if (paymentCard?.lastFour) {
      const topCard = layer.querySelector('.payment-card');
      topCard.querySelector('b').textContent = `Visa ending in ${paymentCard.lastFour}`;
      topCard.querySelector('span').textContent = `Expires ${paymentCard.expiry || '08/31'} · Last used`;
      const savedCard = savedCards.querySelector('.saved-card');
      savedCard.querySelector('input').value = paymentCard.lastFour;
      savedCard.querySelector('b').textContent = `Visa ending in ${paymentCard.lastFour}`;
      savedCard.querySelector('small').textContent = `Expires ${paymentCard.expiry || '08/31'} · Default`;
    }
  } catch (_) {}

  const params = new URLSearchParams(location.search);
  if (params.get('menu')) openDrawer(params.get('menu'));
  if (params.get('account') === 'open') openAccount(params.get('tab') || 'account');
  if (params.get('setting')) window.setTimeout(() => setExpander(`${params.get('setting')}-editor`, true), 120);
})();
