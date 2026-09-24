(() => {
  if (window.PDFBreezeAnalytics) return;

  const SESSION_KEY = 'pdfbreezeAnalyticsSessionId';
  const LANDING_KEY = 'pdfbreezeAnalyticsLandingPage';
  const TRACKED_PAGE_KEY = 'pdfbreezeAnalyticsPageTracked';
  const ignoredPages = new Set([
    'admin', 'auth-callback', 'dashboard', 'editor', 'editor-pdfium',
    'login', 'reset-password', 'cancel-subscription'
  ]);

  function randomId() {
    if (crypto.randomUUID) return crypto.randomUUID().replaceAll('-', '');
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  }

  function pageName() {
    const filename = location.pathname.split('/').filter(Boolean).pop() || 'home';
    return filename.replace(/\.html$/i, '').toLowerCase() || 'home';
  }

  function sessionId() {
    let value = sessionStorage.getItem(SESSION_KEY);
    if (!value) {
      value = randomId();
      sessionStorage.setItem(SESSION_KEY, value);
    }
    return value;
  }

  function landingPage() {
    let value = sessionStorage.getItem(LANDING_KEY);
    if (!value) {
      const current = pageName();
      value = ignoredPages.has(current) ? 'unknown' : current;
      sessionStorage.setItem(LANDING_KEY, value);
    }
    return value;
  }

  async function track(eventName, eventValue = '') {
    const baseUrl = window.PDFMINT_CONFIG?.engineBaseUrl;
    if (!baseUrl) return false;
    const headers = {'Content-Type': 'application/json'};
    try {
      const session = await window.PDFMintAuth?.getSession?.();
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    } catch (_) {}
    try {
      await fetch(`${baseUrl.replace(/\/$/, '')}/v1/analytics/events`, {
        method: 'POST',
        headers,
        keepalive: true,
        body: JSON.stringify({
          session_id: sessionId(),
          event_name: eventName,
          event_value: String(eventValue || '').slice(0, 80),
          landing_page: landingPage(),
          page_path: `${location.pathname}${location.search}`.slice(0, 220)
        })
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  function normaliseTool(element) {
    const raw = element?.dataset?.tool || element?.dataset?.editorTool || element?.id || element?.textContent || '';
    return String(raw)
      .replace(/-tool$/i, '')
      .replace(/^open-/, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .slice(0, 80);
  }

  window.PDFBreezeAnalytics = {
    track,
    sessionId,
    landingPage,
    resetJourney() {
      sessionStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(LANDING_KEY);
      sessionStorage.removeItem(TRACKED_PAGE_KEY);
    }
  };

  const currentPage = pageName();
  if (!ignoredPages.has(currentPage) && sessionStorage.getItem(TRACKED_PAGE_KEY) !== currentPage) {
    sessionStorage.setItem(TRACKED_PAGE_KEY, currentPage);
    sessionStorage.setItem(LANDING_KEY, currentPage);
    track('landing_view');
  }

  document.addEventListener('click', event => {
    const upload = event.target.closest('.upload-button, [data-upload-trigger], label[for="file-input"]');
    if (upload) track('upload_clicked');

    const download = event.target.closest('#download, #download-edited-pdf, [data-download-edited]');
    if (download) track('download_clicked');

    const tool = event.target.closest('[data-tool], [data-editor-tool], .ribbon-tool');
    if (tool && !download) {
      const name = normaliseTool(tool);
      if (name) track('editor_tool_used', name);
    }
  }, {capture: true});
})();
