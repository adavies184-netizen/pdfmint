(async () => {
  const accountAuth = window.PDFMintAuth;
  if (!accountAuth) {
    location.replace('/login.html');
    return;
  }
  await accountAuth.ready;
  const signedInUser = await accountAuth.getUser();
  let checkoutAccess = null;
  try {
    const storedAccess = JSON.parse(sessionStorage.getItem('pdfmintCheckoutAccess') || 'null');
    const isRecentCheckout =
      storedAccess?.completedAt &&
      Date.now() - Number(storedAccess.completedAt) < 12 * 60 * 60 * 1000;
    if (isRecentCheckout) checkoutAccess = storedAccess;
    else sessionStorage.removeItem('pdfmintCheckoutAccess');
  } catch (_) {
    sessionStorage.removeItem('pdfmintCheckoutAccess');
  }
  if (!signedInUser && !checkoutAccess) {
    await accountAuth.requireUser();
    return;
  }
  const authenticatedUser = signedInUser || {
    email: checkoutAccess.email || '',
    user_metadata: {}
  };
  if (!authenticatedUser) return;

  async function loadLiveMembership() {
    if (!signedInUser || !accountAuth.client) return;
    const {data, error} = await accountAuth.client
      .from('subscriptions')
      .select('plan_code,status,trial_ends_at,current_period_ends_at,cancel_at_period_end,updated_at')
      .eq('user_id', signedInUser.id)
      .order('updated_at', {ascending:false})
      .limit(1);
    if (error) throw error;
    const membership = data?.[0];
    const statusElement = document.querySelector('[data-membership-status]');
    const planElement = document.querySelector('[data-membership-plan]');
    const renewalElement = document.querySelector('[data-membership-renewal]');
    if (!membership) {
      if (statusElement) statusElement.textContent = 'No active plan';
      if (planElement) planElement.textContent = 'Your current plan: none';
      if (renewalElement) renewalElement.textContent = 'Choose a plan when you next download a document.';
      return;
    }
    const names = {
      document_trial: '7-day single-document access',
      unlimited_trial: '7-day unlimited access',
      annual: 'Annual unlimited membership'
    };
    const displayStatus = membership.status === 'trialing' ? 'Trial active' :
      membership.status === 'active' ? 'Active' :
      membership.status === 'paused' ? 'Paused' : membership.status.replaceAll('_', ' ');
    const dateValue = membership.trial_ends_at || membership.current_period_ends_at;
    const formattedDate = dateValue ? new Intl.DateTimeFormat('en-GB', {
      day:'numeric', month:'long', year:'numeric'
    }).format(new Date(dateValue)) : null;
    if (statusElement) statusElement.textContent = displayStatus;
    if (planElement) planElement.textContent = `Your current plan: ${names[membership.plan_code] || membership.plan_code}`;
    if (renewalElement) renewalElement.textContent = membership.status === 'paused'
      ? `Billing resumes: ${formattedDate || 'one month from the pause date'}`
      : membership.cancel_at_period_end
      ? `Access ends: ${formattedDate || 'at the end of the billing period'}`
      : membership.status === 'trialing'
        ? `Trial ends: ${formattedDate || 'after seven days'}; then £49.99 every four weeks`
        : `Next billing date: ${formattedDate || 'shown by your payment provider'}`;
  }
  const tools = [
    ['Edit PDF','Update text and content','edit-pdf.html','i-edit'],
    ['Convert files','Convert documents, images, audio and more','dashboard.html?tool=convert','i-convert'],
    ['Compress PDF','Reduce PDF file size','dashboard.html?tool=compress','i-compress'],
    ['Merge PDF','Combine documents','merge-pdf.html','i-convert'],
    ['Sign PDF','Add an electronic signature','dashboard.html?tool=sign','i-sign'],
    ['OCR & Scan','Recognise scanned text','dashboard.html?menu=ocr','i-scan'],
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
    },
    ocr: {
      title: 'OCR & Scan', copy: 'Extract text from images and scanned documents.', icon: 'i-scan',
      tools: [
        ['OCR','Recognise text in a scanned PDF','i-scan','ocr-flow','ocr'],
        ['Text from image','Extract editable text from images','i-text','ocr-flow','image']
      ]
    }
  };
  const drawer = document.querySelector('[data-tool-drawer]');
  const drawerTools = drawer?.querySelector('[data-drawer-tools]');
  const pickerLayer = document.querySelector('[data-document-picker]');
  const pickerInput = pickerLayer?.querySelector('[data-picker-input]');
  const progressLayer = document.querySelector('[data-dashboard-progress]');
  const compressLayer = document.querySelector('[data-compress-options]');
  const ocrLayer = document.querySelector('[data-ocr-options]');
  const convertLayer = document.querySelector('[data-convert-options]');
  let selectedDashboardTool = null;
  let selectedDashboardFile = null;

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

  const directTools = {
    sign: ['Sign PDF','Add an electronic signature','i-sign','sign',''],
    compress: ['Compress PDF','Reduce your PDF file size','i-compress','compress-flow',''],
    convert: ['Convert Files','Convert documents, images, audio and more','i-convert','convert-flow','']
  };
  document.querySelectorAll('[data-direct-tool]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    const tool = directTools[link.dataset.directTool];
    if (tool) openDocumentPicker(tool);
  }));

  const openDocumentPicker = (tool) => {
    selectedDashboardTool = tool;
    if (!pickerLayer) return;
    const imageOcr = tool[3] === 'ocr-flow' && tool[4] === 'image';
    const convertFlow = tool[3] === 'convert-flow';
    pickerLayer.querySelector('[data-picker-title]').textContent = tool[0];
    pickerLayer.querySelector('[data-picker-copy]').textContent = convertFlow ? 'Upload a new file or choose one already saved in My Files.' : tool[1] + (imageOcr ? '. Upload a new image or continue with a scanned PDF from My Files.' : '. Upload a new PDF or continue with a file from My Files.');
    pickerLayer.querySelector('[data-picker-icon] use').setAttribute('href', `#${tool[2]}`);
    pickerLayer.querySelector('.picker-upload b').textContent = convertFlow ? 'Upload a file to convert' : imageOcr ? 'Upload a new image' : 'Upload a new PDF';
    pickerLayer.querySelector('.picker-upload small').textContent = convertFlow ? 'PDF, Office, image, audio, video and archive files' : imageOcr ? 'Choose a JPG, PNG, WEBP, TIFF or BMP image' : 'Choose a PDF from your device';
    pickerInput.accept = convertFlow ? '.pdf,.doc,.docx,.csv,.xlsx,.xls,.ppt,.pptx,.jpg,.jpeg,.png,.webp,.heic,.avif,.tif,.tiff,.gif,.svg,.eps,.mp3,.wav,.m4a,.mp4,.mov,.zip,.rar,.7z,.dwg,.dxf' : imageOcr ? 'image/jpeg,image/png,image/webp,image/tiff,image/bmp,.jpg,.jpeg,.png,.webp,.tif,.tiff,.bmp' : 'application/pdf,.pdf';
    pickerLayer.hidden = false;
    document.body.style.overflow = 'hidden';
  };
  const closePicker = () => { if (pickerLayer) pickerLayer.hidden = true; document.body.style.overflow = ''; };
  pickerLayer?.querySelectorAll('[data-close-picker]').forEach(button => button.addEventListener('click', closePicker));

  function simplePdfFile(name) {
    const safeName = String(name || 'PDFBreeze document.pdf').replace(/[^\x20-\x7e]/g,'');
    const text = `PDFBreeze file: ${safeName}`.replace(/[()\\]/g, value => `\\${value}`);
    const pagePaint = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`;
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

  function joinBinaryParts(parts) {
    const length = parts.reduce((total, part) => total + part.length, 0);
    const output = new Uint8Array(length);
    let offset = 0;
    parts.forEach(part => { output.set(part, offset); offset += part.length; });
    return output;
  }

  async function imageFileToSinglePagePdf(file) {
    const bitmap = await createImageBitmap(file);
    const maxSide = 2200;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha:false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const jpeg = await new Promise((resolve,reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Unable to prepare this image.')), 'image/jpeg', .92));
    const imageBytes = new Uint8Array(await jpeg.arrayBuffer());
    const encode = value => new TextEncoder().encode(value);
    const pagePaint = `q ${width} 0 0 ${height} 0 0 cm /Im0 Do Q`;
    const objects = [
      encode('<< /Type /Catalog /Pages 2 0 R >>'),
      encode('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
      encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`),
      joinBinaryParts([encode(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`), imageBytes, encode('\nendstream')]),
      encode(`<< /Length ${encode(pagePaint).length} >>\nstream\n${pagePaint}\nendstream`)
    ];
    const parts = [encode('%PDF-1.4\n%PDFBreeze\n')];
    const offsets = [0];
    let byteOffset = parts[0].length;
    objects.forEach((object,index) => {
      const prefix = encode(`${index + 1} 0 obj\n`);
      const suffix = encode('\nendobj\n');
      offsets.push(byteOffset);
      parts.push(prefix, object, suffix);
      byteOffset += prefix.length + object.length + suffix.length;
    });
    const xrefOffset = byteOffset;
    let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach(offset => { xref += `${String(offset).padStart(10,'0')} 00000 n \n`; });
    xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    parts.push(encode(xref));
    const pdfName = `${String(file.name || 'image').replace(/\.[^.]+$/, '')}.pdf`;
    return new File([joinBinaryParts(parts)], pdfName, { type:'application/pdf', lastModified:Date.now() });
  }

  async function ensureEditorCompatibleFile(file) {
    if (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || '')) return file;
    if ((file.type || '').startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name || '')) {
      return imageFileToSinglePagePdf(file);
    }
    throw new Error('This editor tool currently supports saved PDF and image files.');
  }
  async function continueToDashboardTool(file, options = {}) {
    if (!file || !selectedDashboardTool) return;
    selectedDashboardFile = file;
    if (!options.skipSave) {
      await saveDashboardFile(file, file.name);
      await refreshDashboardFiles();
    }
    closePicker(); closeDrawer();
    if (selectedDashboardTool[3] === 'compress-flow') {
      openCompressOptions(file);
      return;
    }
    if (selectedDashboardTool[3] === 'ocr-flow') {
      openOcrOptions(file);
      return;
    }
    if (selectedDashboardTool[3] === 'convert-flow') {
      openConvertOptions(file);
      return;
    }
    progressLayer.hidden = false;
    progressLayer.querySelector('[data-progress-title]').textContent = `Opening ${selectedDashboardTool[0]}`;
    progressLayer.querySelector('[data-progress-copy]').textContent = 'Securely preparing your document. No email confirmation is needed.';
    const bar = progressLayer.querySelector('[data-progress-bar]');
    const percent = progressLayer.querySelector('[data-progress-percent]');
    let value = 8; bar.style.width = `${value}%`; percent.textContent = `${value}%`;
    const timer = window.setInterval(() => { value = Math.min(92,value + Math.ceil(Math.random() * 12)); bar.style.width = `${value}%`; percent.textContent = `${value}%`; },150);
    try {
      const editorFile = await ensureEditorCompatibleFile(file);
      await storeDashboardPdf(editorFile);
      await new Promise(resolve => window.setTimeout(resolve,650));
      window.clearInterval(timer); bar.style.width = '100%'; percent.textContent = '100%';
      await new Promise(resolve => window.setTimeout(resolve,250));
      const params = new URLSearchParams({tool:selectedDashboardTool[3]});
      if (selectedDashboardTool[4]) params.set('action',selectedDashboardTool[4]);
      if (options.entitlementKey) params.set('documentKey', options.entitlementKey);
      window.location.href = `editor.html?${params}`;
    } catch (error) {
      window.clearInterval(timer); console.error(error); progressLayer.hidden = true; document.body.style.overflow = '';
    }
  }
  pickerInput?.addEventListener('change', () => { const file = pickerInput.files?.[0]; if (file) continueToDashboardTool(file); pickerInput.value = ''; });
  pickerLayer?.querySelectorAll('[data-library-file]').forEach(button => button.addEventListener('click', () => continueToDashboardTool(simplePdfFile(button.dataset.libraryFile))));

  const formatBytes = bytes => {
    if (!Number.isFinite(bytes) || bytes <= 0) return 'Ready to process';
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  const cleanBaseName = name => String(name || 'PDFBreeze document').replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]+/g, '-').trim() || 'PDFBreeze document';

  function openDashboardFilesDb() {
    return new Promise((resolve,reject) => {
      const request = indexedDB.open('pdfmint-dashboard-files',1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains('files')) request.result.createObjectStore('files',{keyPath:'id'});
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
  async function saveDashboardFile(blob, filename) {
    if (!blob) return;
    if (window.PDFMintAuth?.isSignedIn?.()) {
      await window.PDFMintAuth.saveDocument(blob, filename || blob.name, 'dashboard');
      return;
    }
    if (!window.indexedDB) return;
    const db = await openDashboardFilesDb();
    const bytes = await blob.arrayBuffer();
    const record = {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      name: filename || blob.name || 'PDFBreeze file',
      type: blob.type || 'application/octet-stream',
      size: blob.size,
      lastModified: Date.now(),
      bytes
    };
    await new Promise((resolve,reject) => {
      const transaction = db.transaction('files','readwrite');
      transaction.objectStore('files').put(record);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }
  async function getDashboardFiles() {
    if (window.PDFMintAuth?.isSignedIn?.()) {
      const records = await window.PDFMintAuth.listDocuments();
      return records.map(record => ({
        ...record,
        remote: true,
        type: record.mime_type,
        size: Number(record.byte_size || 0),
        lastModified: new Date(record.updated_at || record.created_at).getTime()
      }));
    }
    if (!window.indexedDB) return [];
    const db = await openDashboardFilesDb();
    const records = await new Promise((resolve,reject) => {
      const request = db.transaction('files','readonly').objectStore('files').getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return records.sort((a,b) => b.lastModified - a.lastModified);
  }
  const recordToFile = async record => record.remote
    ? window.PDFMintAuth.downloadDocument(record)
    : new File([record.bytes], record.name, {type:record.type,lastModified:record.lastModified});

  async function openStoredRecord(record, tool) {
    const entitlementKey = String(record.source_tool || '').startsWith('document-trial:')
      ? String(record.source_tool).slice('document-trial:'.length)
      : '';
    selectedDashboardTool = tool;
    await continueToDashboardTool(await recordToFile(record), {skipSave:true, entitlementKey});
  }

  async function downloadStoredRecord(record) {
    const file = await recordToFile(record);
    downloadBlob(file, record.name);
  }

  function closeFileMenus(except = null) {
    document.querySelectorAll('.file-action-menu.open').forEach(menu => {
      if (menu !== except) menu.classList.remove('open');
    });
  }

  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('.file-actions')) closeFileMenus();
  });
  async function refreshDashboardFiles() {
    const records = await getDashboardFiles();
    const recent = document.querySelector('[data-recent-files]');
    recent?.querySelectorAll('.dynamic-file-row').forEach(row => row.remove());
    const head = recent?.querySelector('.file-head');
    records.slice(0,12).reverse().forEach(record => {
      const extension = String(record.name).split('.').pop().slice(0,4).toUpperCase();
      const row = document.createElement('div');
      row.className = 'file-row dynamic-file-row';
      row.setAttribute('role','row');
      row.innerHTML = `<span class="file-name"><i>${extension}</i><b></b></span><span>${formatBytes(record.size)}</span><span>${new Date(record.lastModified).toLocaleString([], {dateStyle:'medium',timeStyle:'short'})}</span><span class="file-actions"><button class="file-quick-action" type="button" data-file-edit aria-label="Edit document"><svg><use href="#i-edit"></use></svg></button><button class="file-quick-action" type="button" data-file-download aria-label="Download document"><svg><use href="#i-upload"></use></svg></button><button class="file-more-action" type="button" data-file-more aria-label="More document actions">•••</button><span class="file-action-menu" role="menu"><button type="button" data-file-tool="sign"><svg><use href="#i-sign"></use></svg>Sign document</button><button type="button" data-file-tool="edit"><svg><use href="#i-edit"></use></svg>Edit document</button><button type="button" data-file-tool="convert"><svg><use href="#i-convert"></use></svg>Convert to…</button><button type="button" data-file-tool="compress"><svg><use href="#i-compress"></use></svg>Compress</button><button type="button" data-file-tool="ocr"><svg><use href="#i-scan"></use></svg>OCR &amp; scan</button><i></i><button type="button" data-file-tool="download"><svg><use href="#i-upload"></use></svg>Download</button><button type="button" data-file-tool="organize"><svg><use href="#i-grid"></use></svg>Organise pages</button></span></span>`;
      row.querySelector('b').textContent = record.name;
      row.querySelector('[data-file-edit]').addEventListener('click', () => openStoredRecord(record, ['Edit PDF','Update text and content','i-edit','edit','']));
      row.querySelector('[data-file-download]').addEventListener('click', () => downloadStoredRecord(record));
      const menu = row.querySelector('.file-action-menu');
      row.querySelector('[data-file-more]').addEventListener('click', event => {
        event.stopPropagation();
        const opening = !menu.classList.contains('open');
        closeFileMenus(menu);
        menu.classList.toggle('open', opening);
      });
      const fileTools = {
        sign: ['Sign PDF','Add an electronic signature','i-sign','sign',''],
        edit: ['Edit PDF','Update text and content','i-edit','edit',''],
        convert: ['Convert Files','Convert documents, images, audio and more','i-convert','convert-flow',''],
        compress: ['Compress PDF','Reduce your PDF file size','i-compress','compress-flow',''],
        ocr: ['OCR & Scan','Recognise text in a scanned PDF','i-scan','ocr-flow','ocr'],
        organize: ['Organize Pages','Arrange and restructure your PDF pages','i-grid','manage','reorder']
      };
      menu.querySelectorAll('[data-file-tool]').forEach(button => button.addEventListener('click', async () => {
        menu.classList.remove('open');
        if (button.dataset.fileTool === 'download') await downloadStoredRecord(record);
        else await openStoredRecord(record, fileTools[button.dataset.fileTool]);
      }));
      head?.insertAdjacentElement('afterend',row);
    });
    const pickerFiles = document.querySelector('[data-picker-files]');
    pickerFiles?.querySelectorAll('[data-stored-file]').forEach(button => button.remove());
    records.slice(0,8).reverse().forEach(record => {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.storedFile = record.id;
      button.innerHTML = `<i>${String(record.name).split('.').pop().slice(0,4).toUpperCase()}</i><span><b></b><small>${formatBytes(record.size)} · Saved in My Files</small></span><svg><use href="#i-chevron"></use></svg>`;
      button.querySelector('b').textContent = record.name;
      button.addEventListener('click', async () => continueToDashboardTool(await recordToFile(record)));
      pickerFiles?.prepend(button);
    });
  }

  document.querySelectorAll('.primary-upload input,.secondary-upload input,.drop-zone input').forEach(input => {
    input.addEventListener('change', async () => {
      const files = [...(input.files || [])];
      input.value = '';
      if (!files.length) return;
      try {
        for (const file of files) await saveDashboardFile(file, file.name);
        await refreshDashboardFiles();
      } catch (error) {
        console.warn('PDFBreeze could not add the uploaded file to My Files.', error);
      }
    });
  });

  const converterTargetsByExtension = {
    pdf: [['Word','docx','pdf-to-docx'],['PowerPoint','pptx','pdf-to-pptx'],['Excel','xlsx','pdf-to-xlsx'],['JPG','jpg','pdf-to-jpg'],['PNG','png','pdf-to-png'],['WEBP','webp','pdf-to-webp'],['TIFF','tiff','pdf-to-tiff'],['Text','txt','pdf-to-txt'],['HTML','html','pdf-to-html'],['EPUB','epub','pdf-to-epub'],['SVG','svg','pdf-to-svg']],
    jpg: [['PNG','png','jpg-to-png'],['PDF','pdf','image-to-pdf'],['GIF','gif','image-to-gif'],['SVG','svg','image-to-svg'],['Word','docx','image-to-word'],['Excel','xlsx','image-to-excel']],
    jpeg: [['PNG','png','jpeg-to-png'],['EPS','eps','jpeg-to-eps'],['PDF','pdf','image-to-pdf'],['GIF','gif','image-to-gif']],
    png: [['JPG','jpg','png-to-jpg'],['PDF','pdf','image-to-pdf'],['GIF','gif','image-to-gif'],['SVG','svg','image-to-svg'],['ICO','ico','png-to-ico'],['EPS','eps','png-to-eps']],
    webp: [['JPG','jpg','webp-to-jpg'],['PDF','pdf','image-to-pdf'],['PNG','png','image-to-png']],
    heic: [['JPG','jpg','heic-to-jpg'],['PNG','png','heic-to-png'],['PDF','pdf','heic-to-pdf']],
    avif: [['JPG','jpg','avif-to-jpg']],
    svg: [['PNG','png','svg-to-png'],['PDF','pdf','svg-to-pdf'],['DXF','dxf','svg-to-dxf']],
    eps: [['SVG','svg','eps-to-svg']],
    csv: [['Excel','xlsx','csv-to-excel'],['PDF','pdf','csv-to-pdf']],
    xlsx: [['CSV','csv','xlsx-to-csv']],
    docx: [['DOC','doc','docx-to-doc'],['JPG','jpg','docx-to-jpg']],
    doc: [['JPG','jpg','doc-to-jpg']],
    pptx: [['PPT','ppt','pptx-to-ppt'],['PDF','pdf','powerpoint-to-pdf']],
    ppt: [['PDF','pdf','ppt-to-pdf']],
    mp4: [['MP3','mp3','mp4-to-mp3'],['GIF','gif','mp4-to-gif']],
    mov: [['MP4','mp4','mov-to-mp4'],['MP3','mp3','mov-to-mp3']],
    mp3: [['WAV','wav','mp3-to-wav']], wav: [['MP3','mp3','wav-to-mp3']], m4a: [['MP3','mp3','m4a-to-mp3']],
    rar: [['ZIP','zip','rar-to-zip']], '7z': [['ZIP','zip','7z-to-zip']], zip: [['RAR','rar','zip-to-rar']],
    dwg: [['DXF','dxf','dwg-to-dxf'],['PDF','pdf','dwg-to-pdf']], dxf: [['DWG','dwg','dxf-to-dwg'],['PDF','pdf','dxf-to-pdf']]
  };
  let selectedConversionTarget = null;
  const renderConvertTargets = query => {
    const extension = String(selectedDashboardFile?.name || '').split('.').pop().toLowerCase();
    const targets = (converterTargetsByExtension[extension] || []).filter(target => !query || target.join(' ').toLowerCase().includes(query.toLowerCase()));
    const grid = convertLayer?.querySelector('[data-converter-targets]');
    if (!grid) return;
    grid.innerHTML = targets.length ? targets.map((target,index) => `<button type="button" data-converter-target="${index}"><i>${target[1].toUpperCase()}</i><span><b>${target[0]}</b><small>Convert to .${target[1]}</small></span><em>Choose</em></button>`).join('') : '<p class="converter-empty">No compatible output formats were found for this file.</p>';
    grid.querySelectorAll('[data-converter-target]').forEach((button,index) => button.addEventListener('click', () => {
      selectedConversionTarget = targets[index];
      grid.querySelectorAll('button').forEach(item => item.classList.toggle('selected',item === button));
      convertLayer.querySelector('[data-apply-convert]').disabled = false;
    }));
  };
  const openConvertOptions = file => {
    if (!convertLayer) return;
    selectedConversionTarget = null;
    convertLayer.querySelector('[data-convert-file-name]').textContent = file.name;
    convertLayer.querySelector('[data-convert-file-size]').textContent = `${formatBytes(file.size)} · Ready to convert`;
    convertLayer.querySelector('[data-apply-convert]').disabled = true;
    convertLayer.querySelector('[data-convert-search]').value = '';
    renderConvertTargets('');
    convertLayer.hidden = false;
    document.body.style.overflow = 'hidden';
  };
  const setChoiceSelection = (layerElement, selector) => {
    layerElement?.querySelectorAll(selector).forEach(input => input.closest('label')?.classList.toggle('selected', input.checked));
  };
  const closeChoice = layerElement => {
    if (layerElement) layerElement.hidden = true;
    if (pickerLayer?.hidden && compressLayer?.hidden && ocrLayer?.hidden && convertLayer?.hidden) document.body.style.overflow = '';
  };
  const openCompressOptions = file => {
    if (!compressLayer) return;
    compressLayer.querySelector('[data-compress-file-name]').textContent = file.name;
    compressLayer.querySelector('[data-compress-file-size]').textContent = `${formatBytes(file.size)} PDF document`;
    compressLayer.hidden = false;
    document.body.style.overflow = 'hidden';
  };
  const openOcrOptions = file => {
    if (!ocrLayer) return;
    ocrLayer.querySelector('[data-ocr-file-name]').textContent = file.name;
    ocrLayer.querySelector('[data-ocr-file-size]').textContent = `${formatBytes(file.size)} · Ready for text recognition`;
    ocrLayer.querySelector('[data-ocr-options-title]').textContent = selectedDashboardTool?.[4] === 'image' ? 'Text from image' : 'OCR PDF';
    ocrLayer.hidden = false;
    document.body.style.overflow = 'hidden';
  };
  compressLayer?.querySelectorAll('input[name="dashboardCompression"]').forEach(input => input.addEventListener('change', () => setChoiceSelection(compressLayer, 'input[name="dashboardCompression"]')));
  ocrLayer?.querySelectorAll('input[name="dashboardOcrFormat"]').forEach(input => input.addEventListener('change', () => setChoiceSelection(ocrLayer, 'input[name="dashboardOcrFormat"]')));
  compressLayer?.querySelectorAll('[data-close-compress]').forEach(button => button.addEventListener('click', () => closeChoice(compressLayer)));
  ocrLayer?.querySelectorAll('[data-close-ocr]').forEach(button => button.addEventListener('click', () => closeChoice(ocrLayer)));
  convertLayer?.querySelectorAll('[data-close-convert]').forEach(button => button.addEventListener('click', () => closeChoice(convertLayer)));
  convertLayer?.querySelector('[data-convert-search]')?.addEventListener('input', event => renderConvertTargets(event.target.value.trim()));

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = filename;
    document.body.appendChild(link); link.click(); link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1500);
  };
  const runDashboardEngineJob = async ({file, operation, filename, title, copy}) => {
    if (!file) return;
    closeChoice(compressLayer); closeChoice(ocrLayer); closeChoice(convertLayer);
    progressLayer.hidden = false;
    document.body.style.overflow = 'hidden';
    const titleElement = progressLayer.querySelector('[data-progress-title]');
    const copyElement = progressLayer.querySelector('[data-progress-copy]');
    const bar = progressLayer.querySelector('[data-progress-bar]');
    const percent = progressLayer.querySelector('[data-progress-percent]');
    titleElement.textContent = title;
    copyElement.textContent = copy;
    let value = 6; bar.style.width = `${value}%`; percent.textContent = `${value}%`;
    const timer = window.setInterval(() => { value = Math.min(91, value + Math.max(1, Math.round((92 - value) / 8))); bar.style.width = `${value}%`; percent.textContent = `${value}%`; }, 320);
    try {
      const engineBaseUrl = String(window.PDFMINT_CONFIG?.engineBaseUrl || window.PDFMINT_CONFIG?.conversionApiBaseUrl || 'https://pdfmint-engine-5dfdx.sevalla.app').replace(/\/+$/, '');
      const form = new FormData();
      form.append('file', file, file.name);
      form.append('operation', operation);
      const response = await fetch(`${engineBaseUrl}/v1/jobs`, { method:'POST', body:form });
      if (!response.ok) {
        let message = `The conversion service returned ${response.status}.`;
        try { const payload = await response.json(); message = payload.error || payload.message || message; } catch (_) {}
        throw new Error(message);
      }
      const blob = await response.blob();
      await saveDashboardFile(blob, filename);
      await refreshDashboardFiles();
      window.clearInterval(timer); bar.style.width = '100%'; percent.textContent = '100%';
      titleElement.textContent = 'Your download is ready';
      copyElement.textContent = 'The finished file has been downloaded. Returning to My Files…';
      downloadBlob(blob, filename);
      await new Promise(resolve => window.setTimeout(resolve, 850));
      progressLayer.hidden = true; document.body.style.overflow = '';
    } catch (error) {
      window.clearInterval(timer);
      titleElement.textContent = 'We could not finish that file';
      copyElement.textContent = error?.message || 'Please try again in a moment.';
      bar.style.width = '0'; percent.textContent = 'Try again';
      window.setTimeout(() => { progressLayer.hidden = true; document.body.style.overflow = ''; }, 2800);
    }
  };
  compressLayer?.querySelector('[data-apply-compress]')?.addEventListener('click', () => {
    const level = compressLayer.querySelector('input[name="dashboardCompression"]:checked')?.value || 'standard';
    runDashboardEngineJob({
      file:selectedDashboardFile,
      operation:`compress-pdf-${level}`,
      filename:`${cleanBaseName(selectedDashboardFile?.name)}-compressed.pdf`,
      title:'Compressing your PDF',
      copy:'Optimising the document while preserving the best possible quality.'
    });
  });
  ocrLayer?.querySelector('[data-apply-ocr]')?.addEventListener('click', () => {
    const format = ocrLayer.querySelector('input[name="dashboardOcrFormat"]:checked')?.value || 'docx';
    runDashboardEngineJob({
      file:selectedDashboardFile,
      operation:`ocr-${format}`,
      filename:`${cleanBaseName(selectedDashboardFile?.name)}-ocr.${format}`,
      title:'Recognising your text',
      copy:'PDFBreeze is reading the document and preparing your editable download.'
    });
  });
  convertLayer?.querySelector('[data-apply-convert]')?.addEventListener('click', () => {
    if (!selectedConversionTarget) return;
    const [label, extension, operation] = selectedConversionTarget;
    runDashboardEngineJob({
      file:selectedDashboardFile,
      operation,
      filename:`${cleanBaseName(selectedDashboardFile?.name)}.${extension}`,
      title:`Converting to ${label}`,
      copy:'PDFBreeze is securely preparing the new file.'
    });
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
  profileForm?.addEventListener('submit', async event => {
    event.preventDefault();
    if (!profileForm.reportValidity()) return;
    const data = new FormData(profileForm);
    const first = String(data.get('firstName')).trim();
    const last = String(data.get('lastName')).trim();
    const email = String(data.get('email')).trim();
    const fullName = `${first} ${last}`.trim();
    const profileMessage = profileForm.querySelector('.form-message');
    const submit = profileForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    profileMessage.classList.remove('error');
    profileMessage.textContent = 'Saving your profile…';
    try {
      await accountAuth.updateProfile({ firstName:first, lastName:last, email });
      layer.querySelector('[data-profile-name]').textContent = fullName;
      layer.querySelector('[data-profile-email]').textContent = email;
      layer.querySelector('[data-profile-initials]').textContent = `${first[0] || ''}${last[0] || ''}`.toUpperCase();
      profileMessage.textContent = email !== authenticatedUser.email ? 'Profile saved. Confirm the email sent to your new address.' : 'Profile updated.';
      updateDashboardGreeting(first, null);
      window.setTimeout(() => setExpander('profile-editor', false), 850);
    } catch (error) {
      profileMessage.classList.add('error');
      profileMessage.textContent = accountAuth.messageFor(error);
    } finally { submit.disabled = false; }
  });

  const securityForm = layer.querySelector('[data-security-form]');
  securityForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const message = securityForm.querySelector('.form-message');
    const next = securityForm.elements.newPassword.value;
    const confirm = securityForm.elements.confirmPassword.value;
    if (!securityForm.reportValidity()) return;
    if (!/\d/.test(next)) { message.textContent = 'Add at least one number to your new password.'; message.classList.add('error'); return; }
    if (next !== confirm) { message.textContent = 'The new passwords do not match.'; message.classList.add('error'); return; }
    const submit = securityForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    message.classList.remove('error'); message.textContent = 'Updating your password…';
    try {
      await accountAuth.changePassword(securityForm.elements.currentPassword.value, next);
      message.textContent = 'Password updated securely.';
      securityForm.reset(); securityForm.elements.loginAlerts.checked = true;
      window.setTimeout(() => setExpander('security-editor', false), 800);
    } catch (error) {
      message.classList.add('error'); message.textContent = accountAuth.messageFor(error);
    } finally { submit.disabled = false; }
  });

  const regionForm = layer.querySelector('[data-region-form]');
  const timezoneSelect = layer.querySelector('[data-timezone-select]');
  const detectedTimezone = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (_) { return 'Europe/London'; } })();
  let savedTimezone = detectedTimezone;
  if (timezoneSelect && [...timezoneSelect.options].some(option => option.value === savedTimezone)) timezoneSelect.value = savedTimezone;
  regionForm?.addEventListener('submit', async event => {
    event.preventDefault();
    const data = new FormData(regionForm);
    const language = String(data.get('language'));
    const currency = String(data.get('currency'));
    const timezone = String(data.get('timezone'));
    const regionMessage = regionForm.querySelector('.form-message');
    const submit = regionForm.querySelector('button[type="submit"]');
    submit.disabled = true;
    regionMessage.classList.remove('error'); regionMessage.textContent = 'Saving preferences…';
    try {
      await accountAuth.updatePreferences({ language, currency, timezone });
      layer.querySelector('[data-region-summary]').textContent = `${language}, ${currency} · ${timezone}`;
      regionMessage.textContent = 'Language and regional preferences saved.';
      updateDashboardGreeting(null, timezone);
      window.setTimeout(() => setExpander('region-editor', false), 750);
    } catch (error) {
      regionMessage.classList.add('error'); regionMessage.textContent = accountAuth.messageFor(error);
    } finally { submit.disabled = false; }
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

  let accountFirstName = authenticatedUser.user_metadata?.first_name || authenticatedUser.user_metadata?.full_name?.split(' ')[0] || 'there';
  let accountTimezone = detectedTimezone;
  if (checkoutAccess?.email) {
    profileForm.elements.email.value = checkoutAccess.email;
    layer.querySelector('[data-profile-name]').textContent = checkoutAccess.email;
    layer.querySelector('[data-profile-email]').textContent = checkoutAccess.email;
    layer.querySelector('[data-profile-initials]').textContent = checkoutAccess.email.slice(0, 2).toUpperCase();
  }
  const updateDashboardGreeting = (firstNameOverride, timezoneOverride) => {
    if (firstNameOverride) accountFirstName = firstNameOverride;
    if (timezoneOverride) accountTimezone = timezoneOverride;
    let hour = new Date().getHours();
    try { hour = Number(new Intl.DateTimeFormat('en-GB',{hour:'2-digit',hourCycle:'h23',timeZone:accountTimezone}).format(new Date())); } catch (_) {}
    const period = hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
    const greeting = document.querySelector('[data-dashboard-greeting]');
    if (greeting) greeting.textContent = `Good ${period}, ${accountFirstName}`;
  };
  try {
    const profile = await accountAuth.loadProfile();
    if (profile) {
      const first = profile.first_name || accountFirstName;
      const last = profile.last_name || '';
      const email = profile.email || authenticatedUser.email || '';
      accountFirstName = first;
      accountTimezone = profile.timezone || detectedTimezone;
      profileForm.elements.firstName.value = first;
      profileForm.elements.lastName.value = last;
      profileForm.elements.email.value = email;
      layer.querySelector('[data-profile-name]').textContent = `${first} ${last}`.trim() || email;
      layer.querySelector('[data-profile-email]').textContent = email;
      layer.querySelector('[data-profile-initials]').textContent = `${first[0] || ''}${last[0] || ''}`.toUpperCase() || email.slice(0,2).toUpperCase();
      if (profile.language) regionForm.elements.language.value = profile.language;
      if (profile.currency) regionForm.elements.currency.value = profile.currency;
      if (timezoneSelect && [...timezoneSelect.options].some(option => option.value === accountTimezone)) timezoneSelect.value = accountTimezone;
      layer.querySelector('[data-region-summary]').textContent = `${profile.language || 'English'}, ${profile.currency || 'GBP - British Pound (£)'} · ${accountTimezone}`;
    }
  } catch (error) { console.warn('PDFBreeze could not load the account profile.', error); }
  updateDashboardGreeting();
  loadLiveMembership().catch(error => console.warn('PDFBreeze could not load membership details.', error));
  document.querySelectorAll('.logout-button,.mobile-account-logout').forEach(button => button.addEventListener('click', () => {
    sessionStorage.removeItem('pdfmintCheckoutAccess');
    accountAuth.signOut();
  }));
  refreshDashboardFiles().catch(error => console.warn('PDFBreeze could not load My Files.', error));

  const params = new URLSearchParams(location.search);
  if (params.get('menu')) openDrawer(params.get('menu'));
  if (params.get('tool') && directTools[params.get('tool')]) openDocumentPicker(directTools[params.get('tool')]);
  if (params.get('account') === 'open') openAccount(params.get('tab') || 'account');
  if (params.get('setting')) window.setTimeout(() => setExpander(`${params.get('setting')}-editor`, true), 120);
})();
