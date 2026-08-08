
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

  function validImage(file) {
    return /^image\/(png|jpeg|webp)$/i.test(file?.type || '');
  }

  function showOptions(file) {
    if (!validImage(file)) {
      alert('Please choose a PNG, JPG or WEBP image.');
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
    let p = 8;
    clearInterval(progressTimer);
    setProgress(p, 'Starting…', 'Preparing your image…');
    progressTimer = setInterval(() => {
      if (p < 92) {
        p += p < 55 ? 7 : 3;
        setProgress(
          Math.min(p,92),
          p < 40 ? 'Reading image' : p < 78 ? 'Compressing' : 'Finalising',
          p < 40 ? 'Reading image data…' : p < 78 ? 'Reducing file size…' : 'Finishing your compressed image…'
        );
      }
    }, 120);
  }

  async function decodeImage(file) {
    if ('createImageBitmap' in window) return createImageBitmap(file);

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('The image could not be opened.'));
      };
      img.src = url;
    });
  }

  async function compressImage(file, level) {
    const img = await decodeImage(file);
    const width = img.width || img.naturalWidth;
    const height = img.height || img.naturalHeight;

    const scale = { light:1, standard:.94, high:.82 }[level] || .94;
    const quality = { light:.92, standard:.82, high:.68 }[level] || .82;

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const ctx = canvas.getContext('2d', { alpha:false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img, 0,0,canvas.width,canvas.height);

    if (typeof img.close === 'function') img.close();

    const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        out => out ? resolve(out) : reject(new Error('Image compression failed.')),
        mime,
        mime === 'image/jpeg' ? quality : undefined
      );
    });

    return { blob, width:canvas.width, height:canvas.height };
  }

  async function makePdfFromImage(blob, sourceName) {
    const bytes = await blob.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.create();

    let embedded;
    if (blob.type === 'image/png') {
      embedded = await pdf.embedPng(bytes);
    } else {
      embedded = await pdf.embedJpg(bytes);
    }

    const page = pdf.addPage([embedded.width, embedded.height]);
    page.drawImage(embedded, { x:0, y:0, width:embedded.width, height:embedded.height });

    const pdfBytes = await pdf.save({ useObjectStreams:true });
    const base = sourceName.replace(/\.[^.]+$/, '') || 'image';

    return new File(
      [pdfBytes],
      `${base}-compressed.pdf`,
      { type:'application/pdf', lastModified:Date.now() }
    );
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
      const { blob } = await compressImage(selectedFile, level);
      clearInterval(progressTimer);
      setProgress(100, 'Complete', 'Your compressed image is ready.');

      const reduction = selectedFile.size
        ? Math.max(0, Math.round((1 - blob.size / selectedFile.size) * 100))
        : 0;

      $('#compression-result-summary').textContent = reduction ? `${reduction}% smaller` : 'Image optimised';
      $('#compression-result-detail').textContent = `${fmt(selectedFile.size)} → ${fmt(blob.size)}`;
      $('#compression-result').hidden = false;

      const pdfFile = await makePdfFromImage(blob, selectedFile.name);
      await new Promise(resolve => setTimeout(resolve, 450));
      await window.PDFMintShared.openEditorWithExport(pdfFile, 'png');
    } catch (error) {
      clearInterval(progressTimer);
      $('#compression-progress-modal').hidden = true;
      $('#compression-options-modal').hidden = false;
      alert(error?.message || 'PDFMint could not compress this image.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Compress Image';
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
