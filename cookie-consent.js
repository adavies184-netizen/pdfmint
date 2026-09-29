(() => {
  if (window.PDFBreezeConsent) return;

  // Microsoft Clarity is currently installed independently of cookie consent.
  (function(c, l, a, r, i, t, y) {
    c[a] = c[a] || function() {(c[a].q = c[a].q || []).push(arguments);};
    t = l.createElement(r);
    t.async = 1;
    t.src = 'https://www.clarity.ms/tag/' + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, 'clarity', 'script', 'ypud36bmlu');

  const STORAGE_KEY = 'pdfbreeze_cookie_consent_v1';
  const FEATURE_KEY = 'pdfbreeze_cookie_feature_v1';
  const METRICS_KEY = 'pdfbreeze_cookie_metrics_id_v1';
  const FEATURE_CACHE_MS = 60 * 1000;
  const ENGINE_BASE_URL = 'https://pdfmint-engine-5dfdx.sevalla.app';
  const POLICY_VERSION = 1;
  const DEFAULTS = {necessary: true, statistics: false, marketing: false};
  let choice = readChoice();
  let featureEnabled = false;
  let bannerRecorded = false;

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function gtag(){window.dataLayer.push(arguments)};

  // Consent is denied before any Google tag is allowed to load.
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    analytics_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    personalization_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500
  });

  function readChoice() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      if (!saved || saved.version !== POLICY_VERSION) return null;
      return {...DEFAULTS, statistics: saved.statistics === true, marketing: saved.marketing === true};
    } catch (_) {
      return null;
    }
  }

  function has(category) {
    if (category === 'necessary') return true;
    if (!featureEnabled) return true;
    return choice?.[category] === true;
  }

  function updateGoogleConsent(next) {
    const allowed = featureEnabled ? next : {necessary: true, statistics: true, marketing: true};
    window.gtag('consent', 'update', {
      analytics_storage: allowed.statistics ? 'granted' : 'denied',
      ad_storage: allowed.marketing ? 'granted' : 'denied',
      ad_user_data: allowed.marketing ? 'granted' : 'denied',
      ad_personalization: allowed.marketing ? 'granted' : 'denied',
      personalization_storage: 'denied',
      functionality_storage: 'granted',
      security_storage: 'granted'
    });
  }

  function activateScripts(category) {
    if (!has(category)) return;
    document.querySelectorAll(`script[type="text/plain"][data-cookie-category="${category}"]:not([data-cookie-activated])`).forEach(source => {
      source.dataset.cookieActivated = 'true';
      const script = document.createElement('script');
      for (const attribute of source.attributes) {
        if (['type', 'data-cookie-category', 'data-cookie-activated', 'data-src'].includes(attribute.name)) continue;
        script.setAttribute(attribute.name, attribute.value);
      }
      if (source.dataset.src) script.src = source.dataset.src;
      script.textContent = source.textContent;
      source.after(script);
    });
  }

  function activateAllowedScripts() {
    activateScripts('statistics');
    activateScripts('marketing');
  }

  function emitChange() {
    document.dispatchEvent(new CustomEvent('pdfbreeze:consentchange', {detail: {...choice}}));
  }

  function save(next) {
    choice = {...DEFAULTS, statistics: next.statistics === true, marketing: next.marketing === true};
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({...choice, version: POLICY_VERSION, updatedAt: new Date().toISOString()}));
    } catch (_) {
      // Keep the visitor's choice active for this page even when storage is unavailable.
    }
    updateGoogleConsent(choice);
    activateAllowedScripts();
    syncUi();
    emitChange();
    return {...choice};
  }

  function metricsVisitorId() {
    try {
      let id = localStorage.getItem(METRICS_KEY);
      if (id && /^consent_[A-Za-z0-9_-]{16,64}$/.test(id)) return id;
      const bytes = new Uint8Array(18);
      crypto.getRandomValues(bytes);
      id = `consent_${Array.from(bytes, byte => byte.toString(36).padStart(2, '0')).join('')}`;
      localStorage.setItem(METRICS_KEY, id);
      return id;
    } catch (_) {
      return '';
    }
  }

  function recordConsentEvent(eventName, next) {
    if (!['pdfbreeze.net', 'www.pdfbreeze.net'].includes(location.hostname)) return;
    const visitorId = metricsVisitorId();
    if (!visitorId) return;
    const body = {visitor_id: visitorId, event_name: eventName};
    if (next) {
      body.statistics = next.statistics === true;
      body.marketing = next.marketing === true;
    }
    fetch(`${ENGINE_BASE_URL}/v1/site/cookie-consent/event`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(body),
      keepalive: true
    }).catch(() => {});
  }

  function acceptAll() {
    const saved = save({statistics: true, marketing: true});
    recordConsentEvent('accept_all', saved);
    return saved;
  }
  function rejectAll() {
    const saved = save({statistics: false, marketing: false});
    recordConsentEvent('reject_all', saved);
    return saved;
  }

  function cachedFeatureSetting() {
    try {
      const cached = JSON.parse(localStorage.getItem(FEATURE_KEY) || 'null');
      if (!cached || Date.now() - Number(cached.cachedAt || 0) > FEATURE_CACHE_MS) return null;
      return cached.enabled !== false;
    } catch (_) {
      return null;
    }
  }

  async function loadFeatureSetting() {
    const cached = cachedFeatureSetting();
    if (cached !== null) return cached;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(`${ENGINE_BASE_URL}/v1/site/cookie-consent`, {cache: 'no-store', signal: controller.signal});
      if (!response.ok) throw new Error('Consent setting unavailable');
      const result = await response.json();
      const enabled = result.enabled !== false;
      localStorage.setItem(FEATURE_KEY, JSON.stringify({enabled, cachedAt: Date.now()}));
      return enabled;
    } catch (_) {
      return true;
    } finally {
      clearTimeout(timeout);
    }
  }

  function setFeatureEnabled(enabled) {
    featureEnabled = enabled !== false;
    updateGoogleConsent(choice || DEFAULTS);
    if (!featureEnabled || choice) activateAllowedScripts();
    syncUi();
    emitChange();
  }

  function buildUi() {
    if (document.getElementById('pdfbreeze-cookie-banner')) return;
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `
      <section id="pdfbreeze-cookie-banner" class="pdfbreeze-cookie-banner" role="dialog" aria-modal="true" aria-describedby="pdfbreeze-cookie-description" hidden>
        <div class="pdfbreeze-cookie-copy">
          <p id="pdfbreeze-cookie-description">Cookies allow us to personalize content and ads, to provide social media features and to analyze our traffic. We also share information about your use of our site with our social media, advertising and analytics partners.</p>
          <a href="privacy-policy.html">View our privacy policy</a>
        </div>
        <div class="pdfbreeze-cookie-actions">
          <button type="button" class="pdfbreeze-cookie-button primary" data-cookie-action="accept">Accept</button>
          <button type="button" class="pdfbreeze-cookie-link" data-cookie-action="settings">Change your consent</button>
        </div>
      </section>
      <div id="pdfbreeze-cookie-modal" class="pdfbreeze-cookie-modal" hidden>
        <div class="pdfbreeze-cookie-backdrop" data-cookie-action="close"></div>
        <section class="pdfbreeze-cookie-dialog" role="dialog" aria-modal="true" aria-labelledby="pdfbreeze-cookie-settings-title">
          <header><h2 id="pdfbreeze-cookie-settings-title">Cookie settings</h2><button type="button" class="pdfbreeze-cookie-close" data-cookie-action="close" aria-label="Close cookie settings">×</button></header>
          <div class="pdfbreeze-cookie-options">
            <div class="pdfbreeze-cookie-option">
              <div><h3>Necessary</h3><p>Necessary cookies help make a website usable by enabling basic functions like page navigation and access to secure areas of the website. The website cannot function properly without these cookies.</p></div>
              <label class="pdfbreeze-cookie-switch locked"><input type="checkbox" checked disabled aria-label="Necessary cookies always enabled"><span></span></label>
            </div>
            <div class="pdfbreeze-cookie-option">
              <div><h3>Statistics</h3><p>Statistic cookies help website owners to understand how visitors interact with websites by collecting and reporting information anonymously.</p></div>
              <label class="pdfbreeze-cookie-switch"><input id="pdfbreeze-consent-statistics" type="checkbox"><span></span></label>
            </div>
            <div class="pdfbreeze-cookie-option">
              <div><h3>Marketing</h3><p>Marketing cookies are used to track visitors across websites. The intention is to display ads that are relevant and engaging for the individual user and thereby more valuable for publishers and third party advertisers.</p></div>
              <label class="pdfbreeze-cookie-switch"><input id="pdfbreeze-consent-marketing" type="checkbox"><span></span></label>
            </div>
          </div>
          <footer>
            <button type="button" class="pdfbreeze-cookie-button secondary" data-cookie-action="reject">Reject all</button>
            <button type="button" class="pdfbreeze-cookie-button primary" data-cookie-action="save">Save my preferences</button>
          </footer>
        </section>
      </div>`;
    document.body.append(...wrapper.children);

    const handleAction = action => {
      if (action === 'accept') acceptAll();
      if (action === 'reject') rejectAll();
      if (action === 'settings') showSettings();
      if (action === 'save') {
        const preferences = {
          statistics: document.getElementById('pdfbreeze-consent-statistics').checked,
          marketing: document.getElementById('pdfbreeze-consent-marketing').checked
        };
        save(preferences);
        recordConsentEvent('preferences_saved', preferences);
      }
      if (action === 'close') closeSettings();
    };
    document.querySelectorAll('[data-cookie-action]').forEach(control => {
      control.addEventListener('click', () => handleAction(control.dataset.cookieAction));
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !document.getElementById('pdfbreeze-cookie-modal').hidden) closeSettings();
    });
    syncUi();
  }

  function showSettings() {
    if (!featureEnabled) return;
    const modal = document.getElementById('pdfbreeze-cookie-modal');
    if (!modal) return;
    document.getElementById('pdfbreeze-consent-statistics').checked = choice ? has('statistics') : true;
    document.getElementById('pdfbreeze-consent-marketing').checked = choice ? has('marketing') : true;
    modal.hidden = false;
    document.body.classList.add('pdfbreeze-cookie-modal-open');
    modal.querySelector('.pdfbreeze-cookie-close').focus();
    recordConsentEvent('settings_opened');
  }

  function closeSettings() {
    const modal = document.getElementById('pdfbreeze-cookie-modal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('pdfbreeze-cookie-modal-open');
  }

  function syncUi() {
    const banner = document.getElementById('pdfbreeze-cookie-banner');
    const modal = document.getElementById('pdfbreeze-cookie-modal');
    if (!banner) return;
    banner.hidden = !featureEnabled || !!choice;
    if (!banner.hidden && !bannerRecorded) {
      bannerRecorded = true;
      recordConsentEvent('banner_shown');
    }
    if (choice && modal) closeSettings();
  }

  window.PDFBreezeConsent = {
    has,
    get: () => ({...DEFAULTS, ...(choice || {})}),
    decided: () => !!choice,
    save,
    acceptAll,
    rejectAll,
    showSettings,
    enabled: () => featureEnabled,
    setFeatureEnabled
  };

  const initialise = async () => {
    featureEnabled = await loadFeatureSetting();
    updateGoogleConsent(choice || DEFAULTS);
    if (document.readyState === 'loading') await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, {once: true}));
    buildUi();
    if (!featureEnabled || choice) activateAllowedScripts();
  };
  void initialise();

  window.addEventListener('storage', event => {
    if (event.key !== STORAGE_KEY) return;
    choice = readChoice();
    if (choice) {
      updateGoogleConsent(choice);
      activateAllowedScripts();
      emitChange();
    }
    syncUi();
  });
  window.addEventListener('storage', event => {
    if (event.key !== FEATURE_KEY) return;
    const cached = cachedFeatureSetting();
    if (cached !== null) setFeatureEnabled(cached);
  });
})();
