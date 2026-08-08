
(() => {
  'use strict';

  let selectedFile = null;
  let progressTimer = null;

  const $ = selector => document.querySelector(selector);

  function fmt(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '0 KB';
    const u = ['B','KB','MB','GB'];
    const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), u.length - 1);
    const v = bytes / Math.pow(1024, i);
    return `${v.toFixed(i === 0 ? 0 : v >= 100 ? 0 : v >= 10 ? 1 : 2)} ${u[i]}`;
  }

  function estimate(size, level) {
    const r = { light:.10, standard:.20, high:.40 }[level] || .20;
    return Math.max(1, Math.round(size * (1-r)));
  }

  function syncCards() {
    document.querySelectorAll('.compression-option').forEach(card => {
      const radio = card.querySelector('input[name="compression-level"]');
      card.classList.toggle('selected', !!radio?.checked);
    });
  }

  function showOptions(file) {
    if (!file || file.type !== 'application/pdf') {
      alert('Please choose a PDF file.');
      return;
    }

    selectedFile = file;
    $('#compression-file-name').textContent = file.name;
    $('#compression-original-size').textContent = fmt(file.size);

    ['light','standard','high'].forEach(level => {
      const el = document.querySelector(`[data-estimated-size="${level}"]`);
      if (el) el.textContent = fmt(estimate(file.size, level));
    });

    const standard = $('input[name="compression-level"][value="standard"]');
    if (standard) standard.checked = true;
    syncCards();

    $('#compression-options-modal').hidden = false;
  }

  function setProgress(percent, stage, message) {
    $('#compression-progress-fill').style.width = `${percent}%`;
    $('#compression-progress-percent').textContent = `${Math.round(percent)}%`;
    $('#compression-progress-stage').textContent = stage;
    if (message) $('#compression-progress-message').textContent = message;
  }

  function animateProgress() {
    let p = 7;
    clearInterval(progressTimer);
    setProgress(p, 'Starting…', 'Preparing your PDF…');
    progressTimer = setInterval(() => {
      if (p < 90) {
        p += p < 45 ? 4 : p < 75 ? 2 : 1;
        setProgress(
          p,
          p < 30 ? 'Reading PDF' : p < 65 ? 'Compressing' : p < 85 ? 'Optimising' : 'Finalising',
          p < 30 ? 'Analysing your document…' : p < 65 ? 'Reducing file size…' : 'Finishing your compressed PDF…'
        );
      }
    }, 180);
  }

  async function run() {
    if (!selectedFile) return;

    const btn = $('#compression-start');
    const level = $('input[name="compression-level"]:checked')?.value || 'standard';

    btn.disabled = true;
    btn.textContent = 'Starting…';
    $('#compression-options-modal').hidden = true;
    $('#compression-progress-modal').hidden = false;
    $('#compression-result').hidden = true;
    animateProgress();

    try {
      const blob = await window.PDFMintShared.compressPdfThroughEngine(selectedFile, level);
      clearInterval(progressTimer);
      setProgress(100, 'Complete', 'Your compressed PDF is ready.');

      const reduction = selectedFile.size
        ? Math.max(0, Math.round((1 - blob.size / selectedFile.size) * 100))
        : 0;

      $('#compression-result-summary').textContent = reduction ? `${reduction}% smaller` : 'PDF optimised';
      $('#compression-result-detail').textContent = `${fmt(selectedFile.size)} → ${fmt(blob.size)}`;
      $('#compression-result').hidden = false;

      const output = new File(
        [blob],
        selectedFile.name.replace(/\.pdf$/i, '-compressed.pdf'),
        { type:'application/pdf', lastModified:Date.now() }
      );

      await new Promise(resolve => setTimeout(resolve, 550));
      await window.PDFMintShared.openEditorWithExport(output, 'pdf');
    } catch (error) {
      clearInterval(progressTimer);
      $('#compression-progress-modal').hidden = true;
      $('#compression-options-modal').hidden = false;
      alert(error?.message || 'PDFMint could not compress this PDF.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Compress PDF';
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const input = $('#file-input');
    input?.addEventListener('change', event => {
      const file = event.target.files?.[0];
      if (file) showOptions(file);
      event.target.value = '';
    });

    window.addEventListener('pdfmint:compression-drop', event => {
      if (event.detail?.file) showOptions(event.detail.file);
    });

    document.addEventListener('change', event => {
      if (event.target.matches('input[name="compression-level"]')) syncCards();
    });

    $('#compression-start')?.addEventListener('click', event => {
      event.preventDefault();
      run();
    });

    $('#compression-options-close')?.addEventListener('click', () => {
      $('#compression-options-modal').hidden = true;
      selectedFile = null;
    });
  });
})();
