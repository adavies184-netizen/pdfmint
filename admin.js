(async () => {
  const auth = window.PDFMintAuth;
  const errorBox = document.getElementById('admin-error');
  const money = value => new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format((Number(value)||0)/100);
  const date = value => value ? new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric'}).format(new Date(value)) : '—';
  const safe = value => String(value ?? '').replace(/[&<>"]/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[character]));
  const planName = value => ({document_trial:'Single document',unlimited_trial:'7-day unlimited',annual:'Annual'}[value] || 'No plan');
  const row = cells => `<div class="admin-row">${cells.map(cell => `<span>${cell}</span>`).join('')}</div>`;
  const status = value => `<i class="status ${safe(value)}">${safe(String(value || '').replaceAll('_',' '))}</i>`;
  const showView = name => {
    document.querySelectorAll('[data-view-panel]').forEach(panel => panel.hidden = panel.dataset.viewPanel !== name);
    document.querySelectorAll('[data-admin-view]').forEach(button => button.classList.toggle('active', button.dataset.adminView === name));
  };
  document.addEventListener('click', event => { const target = event.target.closest('[data-admin-view]'); if (target) showView(target.dataset.adminView); });
  try {
    await auth.ready;
    const user = await auth.requireUser({returnTo:'/admin.html'});
    if (!user) return;
    const session = await auth.getSession();
    const response = await fetch(`${window.PDFMINT_CONFIG.engineBaseUrl.replace(/\/$/,'')}/v1/admin/overview`, {headers:{Authorization:`Bearer ${session.access_token}`}});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'The admin dashboard could not be loaded.');
    document.querySelectorAll('[data-metric]').forEach(element => {
      const key = element.dataset.metric;
      element.textContent = key === 'successful_value' ? money(data.metrics[key]) : Number(data.metrics[key] || 0).toLocaleString('en-GB');
    });
    const memberHeader = '<div class="admin-row header"><span>Member</span><span>Plan</span><span>Provider</span><span>Status</span><span>Next payment</span></div>';
    const memberRows = data.members.map(member => row([`<b>${safe(member.name || member.email)}</b><br><small>${member.name ? safe(member.email) : ''}</small>`,planName(member.plan),safe(member.provider || '—'),status(member.status),date(member.next_payment)])).join('');
    document.querySelector('[data-recent-members]').innerHTML = memberHeader + data.members.slice(0,5).map(member => row([`<b>${safe(member.name || member.email)}</b>`,planName(member.plan),safe(member.provider || '—'),status(member.status),date(member.next_payment)])).join('');
    document.querySelector('[data-members-table]').innerHTML = memberHeader + memberRows;
    document.querySelector('[data-payments-table]').innerHTML = '<div class="admin-row header"><span>Payment ID</span><span>Type</span><span>Provider</span><span>Status</span><span>Amount</span></div>' + data.payments.map(payment => row([`<b>${safe(payment.provider_payment_id)}</b>`,safe(payment.payment_type),safe(payment.provider),status(payment.status),money(payment.amount)])).join('');
    document.querySelector('[data-documents-table]').innerHTML = '<div class="admin-row header"><span>Document</span><span>Tool</span><span>Size</span><span>Owner</span><span>Updated</span></div>' + data.documents.map(documentRecord => row([`<b>${safe(documentRecord.name)}</b>`,safe(documentRecord.source_tool || 'Editor'),`${Math.max(1,Math.round(Number(documentRecord.byte_size||0)/1024))} KB`,safe(documentRecord.user_id.slice(0,8)),date(documentRecord.updated_at)])).join('');
    const filter = () => {
      const query = document.getElementById('admin-search').value.trim().toLowerCase();
      document.querySelectorAll('.admin-row:not(.header)').forEach(item => item.hidden = Boolean(query) && !item.textContent.toLowerCase().includes(query));
    };
    document.getElementById('admin-search').addEventListener('input', filter);
    document.body.classList.remove('admin-loading');
  } catch (error) {
    errorBox.hidden = false;
    errorBox.textContent = error.message || 'The admin dashboard could not be loaded.';
    document.body.classList.remove('admin-loading');
  }
})();
