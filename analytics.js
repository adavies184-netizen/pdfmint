(() => {
  if (window.PDFBreezeAnalytics) return;

  const SESSION_KEY = 'pdfbreezeAnalyticsSessionId';
  const LANDING_KEY = 'pdfbreezeAnalyticsLandingPage';
  const TRACKED_PAGE_KEY = 'pdfbreezeAnalyticsPageTracked';
  const GOOGLE_ADS_EDITOR_OPENED_SEND_TO = 'AW-16506274922/tmQbCK7t14QdEOqI5749';
  const GOOGLE_ADS_EDITOR_OPENED_KEY = 'pdfbreeze-google-editor-opened';
  const GOOGLE_ADS_TEST_MODE_KEY = 'pdfbreezeGoogleAdsTestMode';
  const LIVE_HOSTS = new Set(['pdfbreeze.net', 'www.pdfbreeze.net']);
  const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
  const ignoredPages = new Set([
    'admin', 'auth-callback', 'dashboard', 'editor', 'editor-pdfium',
    'login', 'reset-password', 'cancel-subscription'
  ]);

  function randomId() {
    if (crypto.randomUUID) return crypto.randomUUID().replaceAll('-', '');
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  }

  function isLiveSite() {
    return location.protocol === 'https:' && LIVE_HOSTS.has(location.hostname.toLowerCase());
  }

  function isLiveTrackingContext() {
    return isLiveSite() && localStorage.getItem('pdfbreezeAdminStripeSandbox') !== 'true';
  }

  function pageName() {
    const filename = location.pathname.split('/').filter(Boolean).pop() || 'home';
    return filename.replace(/\.html$/i, '').toLowerCase() || 'home';
  }

  function sessionId() {
    const now = Date.now();
    const prefix = isLiveTrackingContext() ? 'live_' : 'preview_';
    let saved;
    try {
      saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch (_) {
      saved = null;
    }
    if (!saved?.id?.startsWith(prefix) || now - Number(saved.lastActivity || 0) > SESSION_TIMEOUT_MS) {
      saved = {id: `${prefix}${randomId()}`, lastActivity: now};
    } else {
      saved.lastActivity = now;
    }
    localStorage.setItem(SESSION_KEY, JSON.stringify(saved));
    return saved.id;
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

  function googleAdsTestMode() {
    const requestedMode = new URLSearchParams(location.search).get('gtag_test');
    if (requestedMode === '1' && sessionStorage.getItem(GOOGLE_ADS_TEST_MODE_KEY) !== 'enabled') {
      sessionStorage.setItem(GOOGLE_ADS_TEST_MODE_KEY, 'enabled');
      sessionStorage.removeItem(GOOGLE_ADS_EDITOR_OPENED_KEY);
    }
    if (requestedMode === '0') sessionStorage.removeItem(GOOGLE_ADS_TEST_MODE_KEY);
    return sessionStorage.getItem(GOOGLE_ADS_TEST_MODE_KEY) === 'enabled';
  }

  function showGoogleAdsTestMessage(message) {
    if (!googleAdsTestMode()) return;
    let region = document.getElementById('pdfbreeze-google-ads-test-messages');
    if (!region) {
      region = document.createElement('div');
      region.id = 'pdfbreeze-google-ads-test-messages';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      Object.assign(region.style, {
        position: 'fixed', top: '18px', right: '18px', zIndex: '2147483647',
        display: 'grid', gap: '8px', width: 'min(360px, calc(100vw - 36px))',
        pointerEvents: 'none'
      });
      document.body.appendChild(region);
    }
    const toast = document.createElement('div');
    toast.textContent = `✓ ${message}`;
    Object.assign(toast.style, {
      background: '#0f513f', color: '#fff', border: '1px solid #27c499',
      borderRadius: '12px', boxShadow: '0 12px 30px rgba(15,81,63,.24)',
      font: '600 14px/1.4 Inter, Poppins, Arial, sans-serif', padding: '13px 16px',
      opacity: '1', transition: 'opacity .25s ease, transform .25s ease'
    });
    region.appendChild(toast);
    window.setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
      window.setTimeout(() => toast.remove(), 300);
    }, 6000);
  }

  function reportGoogleAdsEditorOpened() {
    if (!isLiveTrackingContext()) return;
    if (typeof window.gtag !== 'function') return;
    if (sessionStorage.getItem(GOOGLE_ADS_EDITOR_OPENED_KEY) === 'sent') return;
    sessionStorage.setItem(GOOGLE_ADS_EDITOR_OPENED_KEY, 'sent');
    window.gtag('event', 'conversion', {
      send_to: GOOGLE_ADS_EDITOR_OPENED_SEND_TO
    });
    showGoogleAdsTestMessage('Editor opened conversion fired');
  }

  async function track(eventName, eventValue = '') {
    if (eventName === 'editor_opened') reportGoogleAdsEditorOpened();
    // Preview, localhost and staging activity must never enter live reporting.
    if (!isLiveTrackingContext()) return false;
    const baseUrl = window.PDFMINT_CONFIG?.engineBaseUrl;
    if (!baseUrl) return false;
    const headers = {'Content-Type': 'application/json'};
    try {
      const session = await window.PDFMintAuth?.getSession?.();
      if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    } catch (_) {}
    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, '')}/v1/analytics/events`, {
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
      return response.ok;
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
    isLiveSite,
    isLiveTrackingContext,
    googleAdsTestMode,
    showGoogleAdsTestMessage,
    resetJourney() {
      localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(LANDING_KEY);
      sessionStorage.removeItem(TRACKED_PAGE_KEY);
    }
  };

  if (googleAdsTestMode()) {
    window.setTimeout(() => {
      showGoogleAdsTestMessage(
        typeof window.gtag === 'function'
          ? 'Google tag initialised: AW-16506274922'
          : 'Google tag was not found'
      );
    }, 250);
  }

  const currentPage = pageName();
  if (!ignoredPages.has(currentPage) && sessionStorage.getItem(TRACKED_PAGE_KEY) !== currentPage) {
    sessionStorage.setItem(LANDING_KEY, currentPage);
    const recordLandingView = async () => {
      for (const delay of [0, 1200, 3500]) {
        if (delay) await new Promise(resolve => window.setTimeout(resolve, delay));
        if (await track('landing_view', currentPage)) {
          sessionStorage.setItem(TRACKED_PAGE_KEY, currentPage);
          return;
        }
      }
    };
    void recordLandingView();
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
