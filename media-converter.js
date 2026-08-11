(function () {
  const route = location.pathname.split('/').pop().replace(/\.html$/i, '');
  const definitions = {
    'video-to-gif': { accept: ['video/*'], extension: '.gif' },
    'mp4-to-gif': { accept: ['.mp4'], extension: '.gif' },
    'mp4-to-mp3': { accept: ['.mp4'], extension: '.mp3' },
    'm4a-to-mp3': { accept: ['.m4a'], extension: '.mp3' },
    'mov-to-mp4': { accept: ['.mov'], extension: '.mp4' },
    'mov-to-mp3': { accept: ['.mov'], extension: '.mp3' },
    'mp3-to-wav': { accept: ['.mp3'], extension: '.wav' },
    'wav-to-mp3': { accept: ['.wav'], extension: '.mp3' }
  };
  const definition = definitions[route];
  if (!definition) return;
  const card = document.querySelector('.upload-card');
  const button = card && card.querySelector('.upload-button');
  const status = card && card.querySelector('.file-status');
  const hint = card && card.querySelector('small');
  if (!card || !button || !status || !hint) return;

  const picker = document.createElement('input');
  picker.type = 'file';
  picker.accept = definition.accept.join(',');
  picker.hidden = true;
  card.appendChild(picker);
  button.removeAttribute('data-coming-soon');
  hint.textContent = 'Media files up to 100 MB';

  let preparedBlob = null;
  let preparedName = '';
  let timer = null;
  const progress = document.createElement('div');
  progress.className = 'converter-progress';
  progress.hidden = true;
  progress.innerHTML = '<div class="converter-progress-row"><strong>Uploading your file</strong><span>0%</span></div><div class="converter-progress-track"><i></i></div><small>Larger media files can take a little longer. Please keep this page open.</small>';
  card.appendChild(progress);
  const bar = progress.querySelector('i');
  const percentage = progress.querySelector('span');

  function stageLabel(value) {
    if (value < 25) return 'Uploading your file';
    if (value < 82) return 'Converting audio/video';
    if (value < 100) return 'Preparing download';
    return 'Ready to download';
  }
  function setProgress(value) {
    progress.hidden = false;
    bar.style.width = value + '%';
    percentage.textContent = value + '%';
    progress.querySelector('strong').textContent = stageLabel(value);
  }
  function startProgress() {
    let value = 6;
    setProgress(value);
    timer = setInterval(function () {
      value = Math.min(91, value + Math.max(1, Math.round((93 - value) / 10)));
      setProgress(value);
    }, 420);
  }
  function stopProgress() { clearInterval(timer); timer = null; }
  function accepted(file) {
    if (definition.accept[0] === 'video/*') return file.type.startsWith('video/') || /\.(avi|m4v|mkv|mov|mp4|mpeg|mpg|webm|wmv)$/i.test(file.name);
    return definition.accept.some(function (extension) { return file.name.toLowerCase().endsWith(extension); });
  }

  function emailModal() {
    let layer = document.getElementById('media-email-modal');
    if (layer) return layer;
    layer = document.createElement('div');
    layer.id = 'media-email-modal';
    layer.className = 'export-modal-layer';
    layer.hidden = true;
    layer.innerHTML = '<div class="export-modal-backdrop"></div><section class="export-modal email-modal" role="dialog" aria-modal="true" aria-labelledby="media-email-title"><button class="export-modal-close" type="button" aria-label="Close">×</button><div class="email-modal-content"><h2 id="media-email-title">Use your email to continue</h2><button class="social-login-button" type="button"><span class="google-mark">G</span> Continue with Google</button><div class="email-divider"><span>OR</span></div><label class="email-field"><span>Email</span><input type="email" placeholder="email@example.com" autocomplete="email"></label><p class="email-error" hidden>Please enter a valid email address.</p><button class="final-download-button" type="button">Download</button><p class="login-copy">Already have an account? <button type="button" class="text-link-button">Log in</button></p><p class="terms-copy">By clicking <strong>Download</strong>, you agree to the <a href="terms-of-use.html" target="_blank">Terms of Service</a>, <a href="subscription-policy.html" target="_blank">Subscription Terms</a>, <a href="privacy-policy.html" target="_blank">Privacy Policy</a>, and <a href="cookie-policy.html" target="_blank">Cookie Policy</a>.</p></div></section>';
    document.body.appendChild(layer);
    layer.querySelector('.export-modal-close').addEventListener('click', function () { layer.hidden = true; });
    layer.querySelector('.export-modal-backdrop').addEventListener('click', function () { layer.hidden = true; });
    layer.querySelector('.final-download-button').addEventListener('click', download);
    return layer;
  }
  function download() {
    const layer = emailModal();
    const input = layer.querySelector('input[type=email]');
    const error = layer.querySelector('.email-error');
    if (!/^\S+@\S+\.\S+$/.test(input.value.trim())) { error.hidden = false; input.focus(); return; }
    error.hidden = true;
    const url = URL.createObjectURL(preparedBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = preparedName || ('converted' + definition.extension);
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
    layer.hidden = true;
    status.textContent = 'Download started.';
  }
  async function convert(file) {
    if (!accepted(file)) { status.textContent = 'Please choose a supported media file for this converter.'; return; }
    const engine = ((window.PDFMINT_CONFIG && window.PDFMINT_CONFIG.engineBaseUrl) || '').replace(/\/$/, '');
    if (!engine) { status.textContent = 'The PDFBreeze Engine URL has not been configured.'; return; }
    preparedBlob = null; preparedName = ''; button.disabled = true; status.textContent = file.name; startProgress();
    try {
      const body = new FormData(); body.append('file', file); body.append('operation', route);
      const response = await fetch(engine + '/v1/jobs', { method: 'POST', body: body });
      if (!response.ok) {
        let message = 'Conversion could not be completed.';
        try { const payload = await response.json(); message = payload.detail || message; } catch (_) {}
        throw new Error(message);
      }
      preparedBlob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const plain = disposition.match(/filename="?([^";]+)"?/i);
      preparedName = encoded ? decodeURIComponent(encoded[1]) : plain ? plain[1] : file.name.replace(/\.[^.]+$/, '') + definition.extension;
      stopProgress(); setProgress(100); status.textContent = 'Conversion complete.';
      setTimeout(function () { const layer = emailModal(); layer.hidden = false; layer.querySelector('input').focus(); }, 250);
    } catch (error) {
      stopProgress(); progress.hidden = true; status.textContent = error.message || 'Conversion could not be completed. Please try again.';
    } finally { button.disabled = false; picker.value = ''; }
  }
  button.addEventListener('click', function () { picker.click(); });
  picker.addEventListener('change', function () { if (picker.files[0]) convert(picker.files[0]); });
  ['dragenter', 'dragover'].forEach(function (type) { card.addEventListener(type, function (event) { event.preventDefault(); card.classList.add('dragging'); }); });
  ['dragleave', 'drop'].forEach(function (type) { card.addEventListener(type, function (event) { event.preventDefault(); card.classList.remove('dragging'); }); });
  card.addEventListener('drop', function (event) { if (event.dataTransfer.files[0]) convert(event.dataTransfer.files[0]); });
})();
