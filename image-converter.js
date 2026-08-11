(function () {
  const route = location.pathname.split('/').pop().replace(/\.html$/i, '');
  const rules = {
    'image-to-jpg': ['image/*'], 'image-to-png': ['image/*'], 'image-to-svg': ['image/*'],
    'image-to-gif': ['image/*'], 'image-to-word': ['image/*'], 'image-to-excel': ['image/*'],
    'heic-to-jpg': ['.heic', '.heif'], 'heic-to-png': ['.heic', '.heif'],
    'png-to-jpg': ['.png'], 'jpg-to-png': ['.jpg', '.jpeg'], 'png-to-eps': ['.png'],
    'png-to-ico': ['.png'], 'jpeg-to-eps': ['.jpg', '.jpeg'], 'webp-to-jpg': ['.webp'],
    'jpeg-to-png': ['.jpg', '.jpeg'], 'svg-to-png': ['.svg'], 'svg-to-dxf': ['.svg'],
    'eps-to-svg': ['.eps'], 'jfif-to-jpg': ['.jfif', '.jpg', '.jpeg'], 'avif-to-jpg': ['.avif'],
    'docx-to-jpg': ['.docx'], 'doc-to-jpg': ['.doc'], 'word-to-jpg': ['.doc', '.docx'],
    'html-to-jpg': ['.html', '.htm']
  };
  if (!rules[route]) return;

  const card = document.querySelector('.upload-card');
  const button = card.querySelector('.upload-button');
  const status = card.querySelector('.file-status');
  const hint = card.querySelector('small');
  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = rules[route].join(',');
  picker.hidden = true;
  card.appendChild(picker);
  button.removeAttribute('data-coming-soon');
  hint.textContent = 'Files up to 100 MB';

  let preparedBlob = null;
  let preparedName = '';
  let progressTimer = null;

  const progress = document.createElement('div');
  progress.className = 'converter-progress';
  progress.hidden = true;
  progress.innerHTML = '<div class="converter-progress-row"><strong>Converting your file</strong><span>0%</span></div><div class="converter-progress-track"><i></i></div><small>Please keep this page open.</small>';
  card.appendChild(progress);
  const progressBar = progress.querySelector('i');
  const progressValue = progress.querySelector('span');

  function setProgress(value, label) {
    progress.hidden = false;
    progressBar.style.width = value + '%';
    progressValue.textContent = value + '%';
    progress.querySelector('strong').textContent = label || 'Converting your file';
  }
  function beginProgress() {
    let value = 8;
    setProgress(value);
    progressTimer = setInterval(() => {
      value = Math.min(88, value + Math.max(1, Math.round((90 - value) / 8)));
      setProgress(value);
    }, 280);
  }
  function stopProgress() { clearInterval(progressTimer); progressTimer = null; }

  function accepted(file) {
    if (rules[route][0] === 'image/*') return file.type.startsWith('image/') || /\.(avif|bmp|gif|heic|heif|jfif|jpe?g|png|svg|tiff?|webp)$/i.test(file.name);
    return rules[route].some(ext => file.name.toLowerCase().endsWith(ext));
  }

  function modal() {
    let layer = document.getElementById('image-email-modal');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = 'image-email-modal';
    layer.className = 'export-modal-layer';
    layer.hidden = true;
    layer.innerHTML = '<div class="export-modal-backdrop"></div><section class="export-modal email-modal" role="dialog" aria-modal="true" aria-labelledby="image-email-title"><button class="export-modal-close" type="button" aria-label="Close">×</button><div class="email-modal-content"><h2 id="image-email-title">Use your email to continue</h2><button class="social-login-button" type="button"><span class="google-mark">G</span> Continue with Google</button><div class="email-divider"><span>OR</span></div><label class="email-field"><span>Email</span><input type="email" placeholder="email@example.com" autocomplete="email"></label><p class="email-error" hidden>Please enter a valid email address.</p><button class="final-download-button" type="button">Download</button><p class="login-copy">Already have an account? <button type="button" class="text-link-button">Log in</button></p><p class="terms-copy">By clicking <strong>Download</strong>, you agree to the <a href="terms-of-use.html" target="_blank">Terms of Service</a>, <a href="subscription-policy.html" target="_blank">Subscription Terms</a>, <a href="privacy-policy.html" target="_blank">Privacy Policy</a>, and <a href="cookie-policy.html" target="_blank">Cookie Policy</a>.</p></div></section>';
    document.body.appendChild(layer);
    layer.querySelector('.export-modal-close').addEventListener('click', () => { layer.hidden = true; });
    layer.querySelector('.export-modal-backdrop').addEventListener('click', () => { layer.hidden = true; });
    layer.querySelector('.final-download-button').addEventListener('click', download);
    return layer;
  }

  function download() {
    const layer = modal();
    const input = layer.querySelector('input[type=email]');
    const error = layer.querySelector('.email-error');
    if (!/^\S+@\S+\.\S+$/.test(input.value.trim())) { error.hidden = false; input.focus(); return; }
    error.hidden = true;
    const url = URL.createObjectURL(preparedBlob);
    const link = document.createElement('a');
    link.href = url; link.download = preparedName || 'converted-file';
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    layer.hidden = true;
    status.textContent = 'Download started.';
  }

  async function convert(file) {
    if (!accepted(file)) { status.textContent = 'Please choose a supported file for this converter.'; return; }
    const engine = (window.PDFMINT_CONFIG && window.PDFMINT_CONFIG.engineBaseUrl || '').replace(/\/$/, '');
    if (!engine) { status.textContent = 'The PDFMint Engine URL has not been configured.'; return; }
    preparedBlob = null; preparedName = '';
    button.disabled = true; status.textContent = file.name;
    beginProgress();
    try {
      const body = new FormData(); body.append('file', file); body.append('operation', route);
      const response = await fetch(engine + '/v1/jobs', { method: 'POST', body });
      if (!response.ok) {
        let message = 'Conversion could not be completed.';
        try { const payload = await response.json(); message = payload.detail || message; } catch (_) {}
        throw new Error(message);
      }
      preparedBlob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const plain = disposition.match(/filename="?([^";]+)"?/i);
      preparedName = encoded ? decodeURIComponent(encoded[1]) : plain ? plain[1] : file.name.replace(/\.[^.]+$/, '') + '-converted';
      stopProgress(); setProgress(100, 'Your file is ready');
      status.textContent = 'Conversion complete.';
      setTimeout(() => { modal().hidden = false; modal().querySelector('input').focus(); }, 250);
    } catch (error) {
      stopProgress(); progress.hidden = true;
      status.textContent = error.message || 'Conversion could not be completed. Please try again.';
    } finally { button.disabled = false; picker.value = ''; }
  }

  button.addEventListener('click', () => picker.click());
  picker.addEventListener('change', () => picker.files[0] && convert(picker.files[0]));
  ['dragenter', 'dragover'].forEach(type => card.addEventListener(type, event => { event.preventDefault(); card.classList.add('dragging'); }));
  ['dragleave', 'drop'].forEach(type => card.addEventListener(type, event => { event.preventDefault(); card.classList.remove('dragging'); }));
  card.addEventListener('drop', event => event.dataTransfer.files[0] && convert(event.dataTransfer.files[0]));
})();
