(function () {
  const auth = window.PDFMintAuth;
  const form = document.querySelector('[data-auth-form]');
  const resetForm = document.querySelector('[data-reset-form]');
  const message = document.querySelector('[data-auth-message]');
  const title = document.getElementById('auth-title');
  const subtitle = document.getElementById('auth-subtitle');
  const params = new URLSearchParams(location.search);
  let mode = params.get('mode') === 'signup' ? 'signup' : 'signin';
  const returnTo = params.get('returnTo') || sessionStorage.getItem('pdfmintAuthReturnTo') || '/dashboard.html';
  sessionStorage.setItem('pdfmintAuthReturnTo', returnTo);

  const setMessage = (target, text, error = false) => { target.textContent = text; target.classList.toggle('error', error); };
  const setMode = (next) => {
    mode = next;
    document.querySelectorAll('[data-auth-mode]').forEach(button => button.classList.toggle('active', button.dataset.authMode === mode));
    document.querySelector('[data-signup-only]').hidden = mode !== 'signup';
    form.elements.firstName.required = mode === 'signup';
    form.elements.lastName.required = mode === 'signup';
    form.elements.password.autocomplete = mode === 'signup' ? 'new-password' : 'current-password';
    document.querySelector('[data-password-help]').hidden = mode !== 'signup';
    document.querySelector('[data-show-reset]').hidden = mode !== 'signin';
    document.querySelector('[data-submit-label]').textContent = mode === 'signup' ? 'Create my account' : 'Sign in securely';
    title.textContent = mode === 'signup' ? 'Create your account' : 'Welcome back';
    subtitle.textContent = mode === 'signup' ? 'Save files and continue your work on any device.' : 'Sign in to access your files and tools.';
    setMessage(message, '');
  };
  document.querySelectorAll('[data-auth-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.authMode)));
  document.querySelector('[data-show-reset]').addEventListener('click', () => { form.hidden = true; resetForm.hidden = false; document.querySelector('.auth-tabs').hidden = true; document.querySelector('.oauth-grid').hidden = true; document.querySelector('.auth-divider').hidden = true; });
  document.querySelector('[data-hide-reset]').addEventListener('click', () => { resetForm.hidden = true; form.hidden = false; document.querySelector('.auth-tabs').hidden = false; document.querySelector('.oauth-grid').hidden = false; document.querySelector('.auth-divider').hidden = false; });

  const prefill = params.get('email') || sessionStorage.getItem('pdfmintPendingEmail');
  if (prefill) { form.elements.email.value = prefill; resetForm.elements.email.value = prefill; }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const button = form.querySelector('button[type="submit"]');
    button.disabled = true;
    setMessage(message, mode === 'signup' ? 'Creating your secure workspace…' : 'Signing you in…');
    try {
      if (!auth.configured) throw new Error('PDFMint account services have not been configured yet.');
      if (mode === 'signup') {
        const result = await auth.signUp({ email: form.elements.email.value.trim(), password: form.elements.password.value, firstName: form.elements.firstName.value.trim(), lastName: form.elements.lastName.value.trim() });
        if (!result.session) { setMessage(message, 'Check your inbox to confirm your email, then return here to sign in.'); return; }
      } else {
        await auth.signIn({ email: form.elements.email.value.trim(), password: form.elements.password.value });
      }
      location.replace(returnTo);
    } catch (error) { setMessage(message, auth.messageFor(error), true); }
    finally { button.disabled = false; }
  });

  resetForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!resetForm.reportValidity()) return;
    const button = resetForm.querySelector('button[type="submit"]');
    button.disabled = true;
    try { await auth.sendPasswordReset(resetForm.elements.email.value.trim()); setMessage(document.querySelector('[data-reset-message]'), 'Reset link sent. Please check your inbox.'); }
    catch (error) { setMessage(document.querySelector('[data-reset-message]'), auth.messageFor(error), true); }
    finally { button.disabled = false; }
  });

  document.querySelectorAll('[data-oauth]').forEach(button => button.addEventListener('click', async () => {
    try { button.disabled = true; await auth.signInWithOAuth(button.dataset.oauth); }
    catch (error) { setMessage(message, auth.messageFor(error), true); button.disabled = false; }
  }));

  auth.ready.then(({ user }) => { if (user) location.replace(returnTo); });
  setMode(mode);
})();
