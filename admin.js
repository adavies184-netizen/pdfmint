(async () => {
  const auth = window.PDFMintAuth;
  const api = auth.client;
  const errorBox = document.getElementById('admin-error');
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = value => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format((Number(value)||0)/100);
  const date = value => value ? new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)) : '—';
  const planName = value => ({document_trial:'7-day single-document access',unlimited_trial:'7-day unlimited access',annual:'Annual unlimited membership'}[value] || 'No plan');
  const status = value => `<i class="status ${safe(value)}">${safe(String(value || '').replaceAll('_',' '))}</i>`;
  const row = (cells, attributes='') => `<div class="admin-row" ${attributes}>${cells.map(cell => `<span>${cell}</span>`).join('')}</div>`;
  const PAGE_SIZE = 20;
  const pagedTables = new Map();
  const selectedRows = {members:new Set(), documents:new Set()};
  let dashboardData = null;
  function paginationPages(current, total) {
    if (total <= 7) return Array.from({length:total}, (_,index) => index + 1);
    const visible = new Set([1, total, current - 1, current, current + 1]);
    if (current <= 3) [2,3,4].forEach(page => visible.add(page));
    if (current >= total - 2) [total - 3,total - 2,total - 1].forEach(page => visible.add(page));
    const ordered = [...visible].filter(page => page >= 1 && page <= total).sort((a,b) => a-b);
    const tokens = [];
    ordered.forEach((page,index) => {
      if (index && page - ordered[index - 1] > 1) tokens.push('ellipsis');
      tokens.push(page);
    });
    return tokens;
  }
  function renderPagedTable(key, container, items, header, renderItem) {
    const record = pagedTables.get(key) || {page:1};
    record.page = Math.max(1, Math.min(record.page, Math.max(1, Math.ceil(items.length / PAGE_SIZE))));
    record.render = () => renderPagedTable(key, container, items, header, renderItem);
    pagedTables.set(key, record);
    const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
    const start = (record.page - 1) * PAGE_SIZE;
    const visibleItems = items.slice(start, start + PAGE_SIZE);
    const pages = paginationPages(record.page, pageCount);
    container.innerHTML = header + visibleItems.map(renderItem).join('') + `<div class="admin-pagination"><span class="admin-pagination-count">${items.length ? start + 1 : 0}–${Math.min(start + PAGE_SIZE, items.length)} of ${items.length}</span><nav aria-label="${safe(key)} pages"><button class="admin-page-direction" type="button" data-page-table="${safe(key)}" data-page-number="${record.page - 1}" ${record.page === 1 ? 'disabled':''}><span aria-hidden="true">←</span> Previous</button><div class="admin-page-numbers">${pages.map(page => page === 'ellipsis' ? '<span class="admin-page-ellipsis" aria-hidden="true">…</span>' : `<button type="button" data-page-table="${safe(key)}" data-page-number="${page}" class="admin-page-number ${page === record.page ? 'active':''}" ${page === record.page ? 'aria-current="page"':''}>${page}</button>`).join('')}</div><button class="admin-page-direction" type="button" data-page-table="${safe(key)}" data-page-number="${record.page + 1}" ${record.page === pageCount ? 'disabled':''}>Next <span aria-hidden="true">→</span></button></nav></div>`;
    syncBulkControls(key);
  }
  function syncBulkControls(key) {
    const selected = selectedRows[key];
    if (!selected) return;
    const itemBoxes = [...document.querySelectorAll(`[data-select-item="${key}"]`)];
    itemBoxes.forEach(box => { box.checked = selected.has(box.value); });
    const pageToggle = document.querySelector(`[data-select-page="${key}"]`);
    if (pageToggle) {
      pageToggle.checked = Boolean(itemBoxes.length) && itemBoxes.every(box => selected.has(box.value));
      pageToggle.indeterminate = itemBoxes.some(box => selected.has(box.value)) && !pageToggle.checked;
    }
    const count = document.querySelector(`[data-selected-count="${key}"]`);
    if (count) count.textContent = `${selected.size} selected`;
    const deleteButton = document.querySelector(`[data-delete-selected="${key}"]`);
    if (deleteButton) deleteButton.disabled = selected.size === 0;
  }
  let adminSession = null;
  let stripeModeStatus = {live:null, sandbox:null};
  let funnelLoaded = false;
  let selectedFunnelStage = 0;
  const showView = name => {
    document.querySelectorAll('[data-view-panel]').forEach(panel => panel.hidden = panel.dataset.viewPanel !== name);
    document.querySelectorAll('[data-admin-view]').forEach(button => button.classList.toggle('active', button.dataset.adminView === name));
    if (name === 'funnel' && adminSession && !funnelLoaded) loadFunnel().catch(showFunnelError);
  };
  document.addEventListener('click', event => { const target = event.target.closest('[data-admin-view]'); if (target) showView(target.dataset.adminView); });
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-page-table]');
    if (!button || button.disabled) return;
    const pager = pagedTables.get(button.dataset.pageTable);
    if (!pager) return;
    pager.page = Number(button.dataset.pageNumber) || 1;
    pager.render();
    button.closest('.admin-card')?.scrollIntoView({behavior:'smooth', block:'start'});
  });
  const adminSidebar = document.querySelector('.admin-sidebar');
  const adminMenuTrigger = document.getElementById('admin-menu-trigger');
  const adminMenuBackdrop = document.getElementById('admin-menu-backdrop');
  const closeAdminMenu = () => { adminSidebar.classList.remove('mobile-open'); adminMenuBackdrop.hidden = true; };
  adminMenuTrigger.onclick = () => { adminSidebar.classList.add('mobile-open'); adminMenuBackdrop.hidden = false; };
  adminMenuBackdrop.onclick = closeAdminMenu;
  adminSidebar.addEventListener('click', event => { if (event.target.closest('button,a')) closeAdminMenu(); });

  async function requireAdminMfa() {
    const assurance = await api.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.error) throw assurance.error;
    if (assurance.data?.currentLevel === 'aal2') return;
    const factorsResult = await api.auth.mfa.listFactors();
    if (factorsResult.error) throw factorsResult.error;
    let factor = factorsResult.data?.totp?.find(item => item.status === 'verified');
    const modal = document.getElementById('admin-mfa');
    const qr = document.getElementById('admin-mfa-qr');
    qr.replaceChildren();
    if (!factor) {
      const staleFactors = (factorsResult.data?.totp || []).filter(item => item.status !== 'verified');
      await Promise.all(staleFactors.map(item => api.auth.mfa.unenroll({factorId:item.id}).catch(() => null)));
      const enrolled = await api.auth.mfa.enroll({factorType:'totp', friendlyName:'PDFBreeze Admin'});
      if (enrolled.error) throw enrolled.error;
      factor = enrolled.data;
      document.getElementById('admin-mfa-copy').textContent = 'Scan this code with your authenticator app, then enter the six-digit code.';
      const qrImage = document.createElement('img');
      qrImage.src = enrolled.data.totp.qr_code;
      qrImage.alt = 'PDFBreeze Admin authenticator QR code';
      qr.replaceChildren(qrImage);
    }
    modal.hidden = false;
    await new Promise((resolve, reject) => {
      document.getElementById('admin-mfa-submit').onclick = async () => {
        const code = document.getElementById('admin-mfa-code').value.trim();
        const result = await api.auth.mfa.challengeAndVerify({factorId:factor.id, code});
        if (result.error) {
          document.getElementById('admin-mfa-error').textContent = 'That code was not accepted. Please try again.';
          return;
        }
        modal.hidden = true;
        resolve();
      };
    });
  }

  const funnelNumber = value => Number(value || 0).toLocaleString('en-GB');
  const funnelPercent = (value, total) => total ? `${Math.round(value / total * 1000) / 10}%` : '0%';
  const funnelLabel = value => String(value || 'unknown').replace(/\.html$/i,'').replaceAll('-',' ').replace(/\b\w/g, letter => letter.toUpperCase());

  function showFunnelError(error) {
    const chart = document.querySelector('[data-funnel-chart]');
    if (chart) chart.innerHTML = `<div class="funnel-empty">${safe(error?.message || 'Conversion analytics could not be loaded.')}</div>`;
    document.querySelector('[data-view-panel="funnel"]')?.classList.remove('funnel-loading');
  }

  function renderFunnel(data) {
    const stages = data.stages || [];
    const original = Number(stages[0]?.count || 0);
    const colours = ['#0d4939','#125641','#17634b','#207157','#2a7e62','#378d70','#49a080','#64af94'];
    const chart = document.querySelector('[data-funnel-chart]');
    const details = document.querySelector('[data-funnel-stage-data]');
    const visitors = stages.find(item => item.event === 'landing_view')?.count || 0;
    const editors = stages.find(item => item.event === 'editor_opened')?.count || 0;
    const payment = stages.find(item => item.event === 'payment_card_viewed')?.count || 0;
    const purchases = stages.find(item => item.event === 'purchase_complete')?.count || 0;
    const metricValues = {visitors, editors, payment, purchases};
    Object.entries(metricValues).forEach(([key,value]) => {
      const target = document.querySelector(`[data-funnel-metric="${key}"]`);
      if (target) target.textContent = funnelNumber(value);
      const rate = document.querySelector(`[data-funnel-rate="${key}"]`);
      if (rate) rate.textContent = `${funnelPercent(value, visitors)} of visitors`;
    });

    const greatestDrop = stages.slice(1).reduce((best,item) => Number(item.dropped || 0) > Number(best?.dropped || -1) ? item : best, null);
    document.querySelector('[data-funnel-bottleneck]').textContent = greatestDrop ? `Biggest drop: ${greatestDrop.label}` : 'Waiting for data';
    document.querySelector('[data-funnel-title]').textContent = document.getElementById('funnel-landing-page').selectedOptions[0]?.textContent || 'All landing pages';

    if (!stages.length || !original) {
      chart.innerHTML = '<div class="funnel-empty">No journey events have been recorded for this selection yet.</div>';
      details.replaceChildren();
    } else {
      chart.innerHTML = stages.map((stage,index) => `<button type="button" class="funnel-stage${index === selectedFunnelStage ? ' active':''}" data-funnel-stage="${index}" style="width:${100-index*7}%;--funnel-colour:${colours[index]}"><i>${index+1}</i><b>${safe(stage.label)}</b><span>${safe(stage.original_rate)}%</span></button>`).join('');
      details.innerHTML = stages.map((stage,index) => `<div class="funnel-stage-row${index === selectedFunnelStage ? ' active':''}"><strong>${funnelNumber(stage.count)}</strong><div><b>${safe(stage.original_rate)}% of original visitors</b><small>${index ? `${safe(stage.previous_rate)}% continued · ${funnelNumber(stage.dropped)} dropped here` : 'Starting audience · 100%'}</small></div></div>`).join('');
      chart.querySelectorAll('[data-funnel-stage]').forEach(button => button.addEventListener('click', () => {
        selectedFunnelStage = Number(button.dataset.funnelStage);
        renderFunnel(data);
      }));
      const selected = stages[selectedFunnelStage] || stages[0];
      document.querySelector('[data-funnel-selected]').innerHTML = `<strong>${safe(selected.label)}</strong> · ${funnelNumber(selected.count)} sessions · ${safe(selected.original_rate)}% of initial visitors${selectedFunnelStage ? ` · ${safe(selected.previous_rate)}% from previous stage` : ''}`;
    }

    const tools = data.tools || [];
    const maximumToolCount = Math.max(1, ...tools.map(item => Number(item.sessions || 0)));
    const toolsHtml = tools.length ? tools.map(tool => `<div class="funnel-tool"><span>${safe(funnelLabel(tool.name))}</span><div class="funnel-tool-track"><div class="funnel-tool-bar" style="width:${Math.round(Number(tool.sessions || 0)/maximumToolCount*100)}%"></div></div><strong>${funnelNumber(tool.sessions)}</strong></div>`).join('') : '<div class="funnel-empty">No editor-tool activity yet.</div>';
    document.querySelectorAll('[data-funnel-tools], [data-funnel-tools-overview]').forEach(target => { target.innerHTML = toolsHtml; });

    const journeys = data.journeys || [];
    const journeyHeader = '<div class="admin-row header"><span>Visitor</span><span>Landing page</span><span>Tools used</span><span>Last stage</span><span>Time</span></div>';
    document.querySelector('[data-funnel-journeys]').innerHTML = journeyHeader + (journeys.length ? journeys.slice(0,20).map(item => row([
      `<b>${safe(item.visitor)}</b>`,
      safe(funnelLabel(item.landing_page)),
      safe((item.tools || []).map(funnelLabel).join(', ') || '—'),
      safe(item.last_stage),
      date(item.last_event_at)
    ])).join('') : '<div class="funnel-empty">No visitor journeys yet.</div>');

    const pageSelect = document.getElementById('funnel-landing-page');
    if (pageSelect.value === 'all') {
      const current = pageSelect.value;
      pageSelect.innerHTML = '<option value="all">All landing pages</option>' + (data.landing_pages || []).map(item => `<option value="${safe(item.name)}">${safe(funnelLabel(item.name))} (${funnelNumber(item.sessions)})</option>`).join('');
      pageSelect.value = current;
    }
  }

  async function loadFunnel() {
    const panel = document.querySelector('[data-view-panel="funnel"]');
    panel.classList.add('funnel-loading');
    const days = document.getElementById('funnel-days').value;
    const landing = document.getElementById('funnel-landing-page').value;
    const params = new URLSearchParams({days});
    if (landing !== 'all') params.set('landing_page', landing);
    const response = await fetch(`${window.PDFMINT_CONFIG.engineBaseUrl.replace(/\/$/,'')}/v1/admin/funnel?${params}`, {headers:{Authorization:`Bearer ${adminSession.access_token}`}});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'Conversion analytics could not be loaded.');
    selectedFunnelStage = Math.min(selectedFunnelStage, Math.max(0,(data.stages || []).length-1));
    renderFunnel(data);
    funnelLoaded = true;
    panel.classList.remove('funnel-loading');
  }

  async function enrollBackupAuthenticator() {
    const enrolled = await api.auth.mfa.enroll({factorType:'totp', friendlyName:`PDFBreeze Admin backup ${Date.now()}`});
    if (enrolled.error) throw enrolled.error;
    const factor = enrolled.data;
    document.getElementById('admin-mfa-copy').textContent = 'Scan this backup code on a separate device or authenticator, then enter its six-digit code.';
    const image = document.createElement('img'); image.src = enrolled.data.totp.qr_code; image.alt = 'Backup authenticator QR code';
    document.getElementById('admin-mfa-qr').replaceChildren(image);
    document.getElementById('admin-mfa-code').value = '';
    document.getElementById('admin-mfa-error').textContent = '';
    document.getElementById('admin-mfa').hidden = false;
    document.getElementById('admin-mfa-submit').onclick = async () => {
      const result = await api.auth.mfa.challengeAndVerify({factorId:factor.id, code:document.getElementById('admin-mfa-code').value.trim()});
      if (result.error) { document.getElementById('admin-mfa-error').textContent = 'That code was not accepted. Please try again.'; return; }
      document.getElementById('admin-mfa').hidden = true; alert('Backup authenticator added successfully.');
    };
  }

  function renderMemberDetail(member, data) {
    const evidence = data.consents.find(item => item.user_id === member.id);
    const payments = data.payments.filter(item => item.user_id === member.id);
    const docs = data.documents.filter(item => item.user_id === member.id);
    const evidenceHtml = evidence ? `<div class="evidence-snapshot"><div class="evidence-check">✓ Terms accepted</div><p>${safe(evidence.disclosure_text)}</p><dl><div><dt>Accepted</dt><dd>${date(evidence.accepted_at)}</dd></div><div><dt>Payment confirmed</dt><dd>${evidence.payment_confirmed ? 'Yes' : 'Pending'}</dd></div><div><dt>Amount paid</dt><dd>${money(evidence.amount_today)}</dd></div><div><dt>Renewal</dt><dd>${money(evidence.renewal_amount)} every ${safe(evidence.renewal_interval)}</dd></div><div><dt>Evidence version</dt><dd>${safe(evidence.disclosure_version)}</dd></div><div><dt>IP address</dt><dd>${safe(evidence.ip_address || 'Not recorded')}</dd></div><div><dt>Browser</dt><dd>${safe(evidence.user_agent || 'Not recorded')}</dd></div><div><dt>Subscription ID</dt><dd>${safe(evidence.provider_subscription_id)}</dd></div><div><dt>Integrity hash</dt><dd>${safe(evidence.evidence_hash || '—')}</dd></div></dl></div>` : '<p>No checkout evidence has been recorded for this customer yet.</p>';
    document.getElementById('member-detail').innerHTML = `<h1>${safe(member.name || member.email)}</h1><p>${safe(member.email)}</p><div class="detail-block"><h3>Membership</h3><dl><div><dt>Plan</dt><dd>${safe(planName(member.plan))}</dd></div><div><dt>Status</dt><dd>${status(member.status)}</dd></div><div><dt>Provider</dt><dd>${safe(member.provider || '—')}</dd></div><div><dt>Next payment</dt><dd>${date(member.next_payment)}</dd></div><div><dt>Payments</dt><dd>${payments.length}</dd></div><div><dt>Documents</dt><dd>${docs.length}</dd></div></dl></div><div class="detail-block"><h3>Checkout consent evidence</h3>${evidenceHtml}</div>`;
    document.getElementById('member-drawer').hidden = false;
  }

  function renderDashboard(data) {
    dashboardData = data;
    const availableSelections = {
      members:new Set(data.members.map(item => item.id)),
      documents:new Set(data.documents.map(item => item.id))
    };
    Object.entries(selectedRows).forEach(([key,selected]) => {
      [...selected].forEach(id => { if (!availableSelections[key].has(id)) selected.delete(id); });
    });
    document.querySelectorAll('[data-metric]').forEach(element => {
      const key = element.dataset.metric;
      element.textContent = ['successful_value','upcoming_revenue'].includes(key) ? money(data.metrics[key]) : Number(data.metrics[key] || 0).toLocaleString('en-GB');
    });
    const memberHeader = '<div class="admin-row header"><span>Member</span><span>Plan</span><span>Provider</span><span>Status</span><span>Next payment</span></div>';
    const recentMemberRow = member => row([`<b>${safe(member.name || member.email)}</b><br><small>${member.name ? safe(member.email) : ''}</small>`,planName(member.plan),safe(member.provider || '—'),status(member.status),date(member.next_payment)], `data-member-id="${safe(member.id)}"`);
    const memberRow = member => row([`<label class="admin-select-cell"><input type="checkbox" data-select-item="members" value="${safe(member.id)}"><span><b>${safe(member.name || member.email)}</b><br><small>${member.name ? safe(member.email) : ''}</small></span></label>`,planName(member.plan),safe(member.provider || '—'),status(member.status),date(member.next_payment)], `data-member-id="${safe(member.id)}"`);
    document.querySelector('[data-recent-members]').innerHTML = memberHeader + data.members.slice(0,5).map(recentMemberRow).join('');
    renderPagedTable('members', document.querySelector('[data-members-table]'), data.members, memberHeader, memberRow);
    renderPagedTable('payments', document.querySelector('[data-payments-table]'), data.payments, '<div class="admin-row header"><span>Payment ID</span><span>Type</span><span>Provider</span><span>Status</span><span>Amount</span></div>', payment => row([`<b>${safe(payment.provider_payment_id)}</b>`,safe(payment.payment_type),safe(payment.provider),status(payment.status),money(payment.amount)]));
    renderPagedTable('documents', document.querySelector('[data-documents-table]'), data.documents, '<div class="admin-row header"><span>Document</span><span>Tool</span><span>Size</span><span>Owner</span><span>Updated</span></div>', doc => row([`<label class="admin-select-cell"><input type="checkbox" data-select-item="documents" value="${safe(doc.id)}"><span><b>${safe(doc.name)}</b></span></label>`,safe(doc.source_tool || 'Editor'),`${Math.max(1,Math.round(Number(doc.byte_size||0)/1024))} KB`,safe(doc.user_id.slice(0,8)),date(doc.updated_at)]));
    const providersHtml = data.providers.map(provider => `<div class="provider-choice ${provider.is_default ? 'active-provider':''}"><b><span class="stripe-logo">${safe(provider.display_name.slice(0,1))}</span>${safe(provider.display_name)}</b><mark>${provider.configured ? 'Configured ✓' : 'Not connected'}</mark><span>${provider.is_default ? 'Default for new subscriptions' : provider.configured ? `<button data-select-provider="${safe(provider.provider)}">Make default</button>` : 'Available after connection'}</span></div>`).join('');
    document.querySelector('[data-provider-summary]').innerHTML = providersHtml;
    const sandboxActive = localStorage.getItem('pdfbreezeAdminStripeSandbox') === 'true';
    const modeStatus = mode => stripeModeStatus[mode] === null ? 'Checking…' : stripeModeStatus[mode] ? 'Ready' : 'Needs setup';
    document.querySelector('[data-providers-list]').innerHTML = `<h2>Provider routing</h2>${providersHtml}<p>Stripe remains the only enabled provider. Future providers use the same internal subscription structure.</p><section class="payment-mode-card"><div><strong>Checkout mode on this browser</strong><small>Public visitors always use live Stripe. Sandbox applies only to your MFA-verified admin session in this browser.</small></div><div class="payment-mode-options" role="group" aria-label="Checkout mode"><button type="button" data-payment-mode="live" class="${sandboxActive ? '' : 'active'}"><b>Live payments</b><span>${modeStatus('live')}</span></button><button type="button" data-payment-mode="sandbox" class="${sandboxActive ? 'active' : ''}"><b>Sandbox testing</b><span>${modeStatus('sandbox')}</span></button></div><em>${sandboxActive ? 'Sandbox is ON for your admin testing. No real charge will be made.' : 'Live mode is active. Your own checkout tests will create real charges.'}</em></section>`;
  }

  async function loadStripeModeStatus() {
    const base = window.PDFMINT_CONFIG.engineBaseUrl.replace(/\/$/,'');
    const headers = {Authorization:`Bearer ${adminSession.access_token}`};
    const [liveResponse, sandboxResponse] = await Promise.all([
      fetch(`${base}/v1/billing/config`, {cache:'no-store', headers}),
      fetch(`${base}/v1/billing/config?mode=sandbox`, {cache:'no-store', headers})
    ]);
    const live = await liveResponse.json().catch(() => ({}));
    const sandbox = await sandboxResponse.json().catch(() => ({}));
    stripeModeStatus = {
      live: Boolean(liveResponse.ok && live.configured && live.mode === 'live'),
      sandbox: Boolean(sandboxResponse.ok && sandbox.configured && sandbox.mode === 'sandbox')
    };
    if (dashboardData) renderDashboard(dashboardData);
  }

  async function loadOverview(day='') {
    document.body.classList.add('admin-loading');
    const params = new URLSearchParams();
    if (day) params.set('day', day);
    const query = params.size ? `?${params}` : '';
    const response = await fetch(`${window.PDFMINT_CONFIG.engineBaseUrl.replace(/\/$/,'')}/v1/admin/overview${query}`, {headers:{Authorization:`Bearer ${adminSession.access_token}`}});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'The admin dashboard could not be loaded.');
    renderDashboard(data);
    document.querySelector('[data-overview-scope]').textContent = day ? new Intl.DateTimeFormat('en-GB',{dateStyle:'long'}).format(new Date(`${day}T12:00:00`)) : 'All-time data';
    document.body.classList.remove('admin-loading');
  }

  async function deleteSelected(key) {
    const ids = [...selectedRows[key]];
    if (!ids.length) return;
    const noun = key === 'members' ? 'member accounts' : 'documents';
    const warning = key === 'members' ? 'This permanently removes the selected test accounts and their saved files. Active or trial subscriptions are protected and will not be deleted.' : 'This permanently removes the selected files from storage.';
    if (!confirm(`Delete ${ids.length} selected ${noun}?\n\n${warning}`)) return;
    const button = document.querySelector(`[data-delete-selected="${key}"]`);
    button.disabled = true;
    button.textContent = 'Deleting…';
    try {
      const response = await fetch(`${window.PDFMINT_CONFIG.engineBaseUrl.replace(/\/$/,'')}/v1/admin/${key}`, {method:'DELETE',headers:{'Content-Type':'application/json',Authorization:`Bearer ${adminSession.access_token}`},body:JSON.stringify({ids})});
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || `The selected ${key} could not be deleted.`);
      selectedRows[key].clear();
      const activeDay = document.getElementById('overview-period').value === 'day' ? document.getElementById('overview-day').value : '';
      await loadOverview(activeDay);
    } finally {
      button.textContent = 'Delete selected';
      syncBulkControls(key);
    }
  }

  try {
    await auth.ready;
    const user = await auth.requireUser({returnTo:'/admin.html'});
    if (!user) return;
    await requireAdminMfa();
    document.getElementById('admin-add-factor').onclick = () => enrollBackupAuthenticator().catch(error => alert(error.message || 'The backup authenticator could not be added.'));
    const session = await auth.getSession();
    adminSession = session;
    await loadOverview();
    loadStripeModeStatus().catch(() => { stripeModeStatus = {live:false, sandbox:false}; if (dashboardData) renderDashboard(dashboardData); });
    document.addEventListener('click', event => {
      const memberRowElement = event.target.closest('[data-member-id]');
      if (memberRowElement && !event.target.closest('input,label')) {
        const member = dashboardData.members.find(item => item.id === memberRowElement.dataset.memberId);
        if (member) renderMemberDetail(member, dashboardData);
      }
      const providerButton = event.target.closest('[data-select-provider]');
      if (providerButton) fetch(`${window.PDFMINT_CONFIG.engineBaseUrl.replace(/\/$/,'')}/v1/admin/payment-provider`, {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({provider:providerButton.dataset.selectProvider})}).then(response => { if (!response.ok) throw new Error('Provider could not be changed.'); location.reload(); }).catch(error => alert(error.message));
      const modeButton = event.target.closest('[data-payment-mode]');
      if (modeButton) {
        const mode = modeButton.dataset.paymentMode;
        if (!stripeModeStatus[mode]) {
          alert(`${mode === 'live' ? 'Live' : 'Sandbox'} Stripe is not fully configured on the payment server yet.`);
          return;
        }
        if (mode === 'sandbox') localStorage.setItem('pdfbreezeAdminStripeSandbox', 'true');
        else localStorage.removeItem('pdfbreezeAdminStripeSandbox');
        renderDashboard(dashboardData);
      }
      const deleteButton = event.target.closest('[data-delete-selected]');
      if (deleteButton) deleteSelected(deleteButton.dataset.deleteSelected).catch(error => alert(error.message));
    });
    document.querySelector('.drawer-close').onclick = () => { document.getElementById('member-drawer').hidden = true; };
    document.getElementById('admin-search').addEventListener('input', event => document.querySelectorAll('.admin-row:not(.header)').forEach(item => item.hidden = Boolean(event.target.value.trim()) && !item.textContent.toLowerCase().includes(event.target.value.trim().toLowerCase())));
    document.addEventListener('change', event => {
      const item = event.target.closest('[data-select-item]');
      if (item) {
        item.checked ? selectedRows[item.dataset.selectItem].add(item.value) : selectedRows[item.dataset.selectItem].delete(item.value);
        syncBulkControls(item.dataset.selectItem);
      }
      const page = event.target.closest('[data-select-page]');
      if (page) {
        document.querySelectorAll(`[data-select-item="${page.dataset.selectPage}"]`).forEach(box => {
          box.checked = page.checked;
          page.checked ? selectedRows[page.dataset.selectPage].add(box.value) : selectedRows[page.dataset.selectPage].delete(box.value);
        });
        syncBulkControls(page.dataset.selectPage);
      }
    });
    const overviewPeriod = document.getElementById('overview-period');
    const overviewDay = document.getElementById('overview-day');
    overviewDay.max = new Date().toISOString().slice(0,10);
    overviewPeriod.addEventListener('change', () => {
      const selectDay = overviewPeriod.value === 'day';
      overviewDay.hidden = !selectDay;
      if (!selectDay) loadOverview().catch(error => alert(error.message));
      else {
        overviewDay.value ||= new Date().toISOString().slice(0,10);
        loadOverview(overviewDay.value).catch(error => alert(error.message));
      }
    });
    overviewDay.addEventListener('change', () => { if (overviewDay.value) loadOverview(overviewDay.value).catch(error => alert(error.message)); });
    document.getElementById('funnel-landing-page').addEventListener('change', () => { selectedFunnelStage = 0; loadFunnel().catch(showFunnelError); });
    document.getElementById('funnel-days').addEventListener('change', () => { selectedFunnelStage = 0; funnelLoaded = false; loadFunnel().catch(showFunnelError); });
    document.querySelectorAll('[data-funnel-tab]').forEach(button => button.addEventListener('click', () => {
      document.querySelectorAll('[data-funnel-tab]').forEach(item => item.classList.toggle('active', item === button));
      document.querySelectorAll('[data-funnel-tab-panel]').forEach(panel => { panel.hidden = panel.dataset.funnelTabPanel !== button.dataset.funnelTab; });
    }));
    document.body.classList.remove('admin-loading');
  } catch (error) {
    errorBox.hidden = false;
    errorBox.textContent = error.message || 'The admin dashboard could not be loaded.';
    document.body.classList.remove('admin-loading');
  }
})();
