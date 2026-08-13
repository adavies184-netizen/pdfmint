(async () => {
  const auth = window.PDFMintAuth;
  if (!auth) return location.replace('/login.html');
  await auth.ready;
  const user = await auth.requireUser({returnTo:'/cancel-subscription.html'});
  if (!user) return;

  const layer = document.getElementById('confirm-layer');
  const title = document.getElementById('confirm-title');
  const copy = document.getElementById('confirm-copy');
  const actions = document.getElementById('confirm-actions');
  const status = document.getElementById('status-message');
  const cancelButton = document.getElementById('continue-cancel');
  const pauseButton = document.getElementById('pause-subscription');
  const endpoint = `${window.PDFMINT_CONFIG.engineBaseUrl.replace(/\/$/, '')}/v1/billing/manage-subscription`;
  const formatDate = value => value ? new Intl.DateTimeFormat('en-GB', {day:'numeric', month:'long', year:'numeric'}).format(new Date(value)) : 'the end of your current billing period';

  const showResult = (heading, message) => {
    title.textContent = heading;
    copy.textContent = message;
    actions.innerHTML = '<a href="dashboard.html?account=open&tab=membership">Return to membership</a>';
    layer.hidden = false;
  };

  const update = async action => {
    cancelButton.disabled = pauseButton.disabled = true;
    status.textContent = action === 'pause' ? 'Pausing your subscription…' : 'Cancelling your subscription…';
    try {
      const session = await auth.getSession();
      if (!session?.access_token) throw new Error('Your sign-in session has expired. Please sign in again.');
      const response = await fetch(endpoint, {
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},
        body:JSON.stringify({action})
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.detail || 'PDFBreeze could not update your subscription.');
      status.textContent = '';
      if (action === 'pause') showResult('Subscription paused', `Billing is paused until ${formatDate(result.effective_at)}. It will resume automatically after one month.`);
      else showResult('Subscription cancelled', `No further renewals will be taken. Your access continues until ${formatDate(result.effective_at)}.`);
    } catch (error) {
      status.textContent = error.message || 'PDFBreeze could not update your subscription.';
      cancelButton.disabled = pauseButton.disabled = false;
    }
  };

  pauseButton.addEventListener('click', () => update('pause'));
  cancelButton.addEventListener('click', () => {
    title.textContent = 'Cancel your subscription?';
    copy.textContent = 'You will not be charged again. Your access will continue until the end of your current trial or billing period.';
    actions.innerHTML = '<button type="button" data-keep>Keep subscription</button> <button type="button" data-confirm>Confirm cancellation</button>';
    layer.hidden = false;
    actions.querySelector('[data-keep]').onclick = () => { layer.hidden = true; };
    actions.querySelector('[data-confirm]').onclick = () => { layer.hidden = true; update('cancel'); };
  });
})();
