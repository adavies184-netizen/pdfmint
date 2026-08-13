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
  const showView = name => {
    document.querySelectorAll('[data-view-panel]').forEach(panel => panel.hidden = panel.dataset.viewPanel !== name);
    document.querySelectorAll('[data-admin-view]').forEach(button => button.classList.toggle('active', button.dataset.adminView === name));
  };
  document.addEventListener('click', event => { const target = event.target.closest('[data-admin-view]'); if (target) showView(target.dataset.adminView); });

  async function requireAdminMfa() {
    const assurance = await api.auth.mfa.getAuthenticatorAssuranceLevel();
    if (assurance.data?.currentLevel === 'aal2') return;
    const factorsResult = await api.auth.mfa.listFactors();
    let factor = factorsResult.data?.totp?.find(item => item.status === 'verified');
    const modal = document.getElementById('admin-mfa');
    const qr = document.getElementById('admin-mfa-qr');
    if (!factor) {
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

  function renderMemberDetail(member, data) {
    const evidence = data.consents.find(item => item.user_id === member.id);
    const payments = data.payments.filter(item => item.user_id === member.id);
    const docs = data.documents.filter(item => item.user_id === member.id);
    const evidenceHtml = evidence ? `<div class="evidence-snapshot"><div class="evidence-check">✓ Terms accepted</div><p>${safe(evidence.disclosure_text)}</p><dl><div><dt>Accepted</dt><dd>${date(evidence.accepted_at)}</dd></div><div><dt>Payment confirmed</dt><dd>${evidence.payment_confirmed ? 'Yes' : 'Pending'}</dd></div><div><dt>Amount paid</dt><dd>${money(evidence.amount_today)}</dd></div><div><dt>Renewal</dt><dd>${money(evidence.renewal_amount)} every ${safe(evidence.renewal_interval)}</dd></div><div><dt>Evidence version</dt><dd>${safe(evidence.disclosure_version)}</dd></div><div><dt>IP address</dt><dd>${safe(evidence.ip_address || 'Not recorded')}</dd></div><div><dt>Browser</dt><dd>${safe(evidence.user_agent || 'Not recorded')}</dd></div><div><dt>Subscription ID</dt><dd>${safe(evidence.provider_subscription_id)}</dd></div><div><dt>Integrity hash</dt><dd>${safe(evidence.evidence_hash || '—')}</dd></div></dl></div>` : '<p>No checkout evidence has been recorded for this customer yet.</p>';
    document.getElementById('member-detail').innerHTML = `<h1>${safe(member.name || member.email)}</h1><p>${safe(member.email)}</p><div class="detail-block"><h3>Membership</h3><dl><div><dt>Plan</dt><dd>${safe(planName(member.plan))}</dd></div><div><dt>Status</dt><dd>${status(member.status)}</dd></div><div><dt>Provider</dt><dd>${safe(member.provider || '—')}</dd></div><div><dt>Next payment</dt><dd>${date(member.next_payment)}</dd></div><div><dt>Payments</dt><dd>${payments.length}</dd></div><div><dt>Documents</dt><dd>${docs.length}</dd></div></dl></div><div class="detail-block"><h3>Checkout consent evidence</h3>${evidenceHtml}</div>`;
    document.getElementById('member-drawer').hidden = false;
  }

  try {
    await auth.ready;
    const user = await auth.requireUser({returnTo:'/admin.html'});
    if (!user) return;
    await requireAdminMfa();
    const session = await auth.getSession();
    const response = await fetch(`${window.PDFMINT_CONFIG.engineBaseUrl.replace(/\/$/,'')}/v1/admin/overview`, {headers:{Authorization:`Bearer ${session.access_token}`}});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail || 'The admin dashboard could not be loaded.');
    document.querySelectorAll('[data-metric]').forEach(element => {
      const key = element.dataset.metric;
      element.textContent = ['successful_value','upcoming_revenue'].includes(key) ? money(data.metrics[key]) : Number(data.metrics[key] || 0).toLocaleString('en-GB');
    });
    const memberHeader = '<div class="admin-row header"><span>Member</span><span>Plan</span><span>Provider</span><span>Status</span><span>Next payment</span></div>';
    const memberRow = member => row([`<b>${safe(member.name || member.email)}</b><br><small>${member.name ? safe(member.email) : ''}</small>`,planName(member.plan),safe(member.provider || '—'),status(member.status),date(member.next_payment)], `data-member-id="${safe(member.id)}"`);
    document.querySelector('[data-recent-members]').innerHTML = memberHeader + data.members.slice(0,5).map(memberRow).join('');
    document.querySelector('[data-members-table]').innerHTML = memberHeader + data.members.map(memberRow).join('');
    document.querySelector('[data-payments-table]').innerHTML = '<div class="admin-row header"><span>Payment ID</span><span>Type</span><span>Provider</span><span>Status</span><span>Amount</span></div>' + data.payments.map(payment => row([`<b>${safe(payment.provider_payment_id)}</b>`,safe(payment.payment_type),safe(payment.provider),status(payment.status),money(payment.amount)])).join('');
    document.querySelector('[data-documents-table]').innerHTML = '<div class="admin-row header"><span>Document</span><span>Tool</span><span>Size</span><span>Owner</span><span>Updated</span></div>' + data.documents.map(doc => row([`<b>${safe(doc.name)}</b>`,safe(doc.source_tool || 'Editor'),`${Math.max(1,Math.round(Number(doc.byte_size||0)/1024))} KB`,safe(doc.user_id.slice(0,8)),date(doc.updated_at)])).join('');
    const providersHtml = data.providers.map(provider => `<div class="provider-choice ${provider.is_default ? 'active-provider':''}"><b><span class="stripe-logo">${safe(provider.display_name.slice(0,1))}</span>${safe(provider.display_name)}</b><mark>${provider.configured ? 'Configured ✓' : 'Not connected'}</mark><span>${provider.is_default ? 'Default for new subscriptions' : provider.configured ? `<button data-select-provider="${safe(provider.provider)}">Make default</button>` : 'Available after connection'}</span></div>`).join('');
    document.querySelector('[data-provider-summary]').innerHTML = providersHtml;
    document.querySelector('[data-providers-list]').innerHTML = `<h2>Provider routing</h2>${providersHtml}<p>Stripe remains the only enabled provider. Future providers use the same internal subscription structure.</p>`;
    document.addEventListener('click', event => {
      const memberRowElement = event.target.closest('[data-member-id]');
      if (memberRowElement) renderMemberDetail(data.members.find(item => item.id === memberRowElement.dataset.memberId), data);
      const providerButton = event.target.closest('[data-select-provider]');
      if (providerButton) fetch(`${window.PDFMINT_CONFIG.engineBaseUrl.replace(/\/$/,'')}/v1/admin/payment-provider`, {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({provider:providerButton.dataset.selectProvider})}).then(response => { if (!response.ok) throw new Error('Provider could not be changed.'); location.reload(); }).catch(error => alert(error.message));
    });
    document.querySelector('.drawer-close').onclick = () => { document.getElementById('member-drawer').hidden = true; };
    document.getElementById('admin-search').addEventListener('input', event => document.querySelectorAll('.admin-row:not(.header)').forEach(item => item.hidden = Boolean(event.target.value.trim()) && !item.textContent.toLowerCase().includes(event.target.value.trim().toLowerCase())));
    document.body.classList.remove('admin-loading');
  } catch (error) {
    errorBox.hidden = false;
    errorBox.textContent = error.message || 'The admin dashboard could not be loaded.';
    document.body.classList.remove('admin-loading');
  }
})();
