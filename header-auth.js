(() => {
  const updateHeader = () => {
    let signedIn = false;
    try {
      const key = Object.keys(localStorage).find(name => /^sb-.*-auth-token$/.test(name));
      const stored = key ? JSON.parse(localStorage.getItem(key) || 'null') : null;
      signedIn = Boolean(stored?.access_token && stored?.user);
    } catch (_) {}
    if (!signedIn) return;
    document.querySelectorAll('.site-header a[href="login.html"],.site-header a[href="/login.html"],.mobile-menu a[href="login.html"]').forEach(link => {
      link.href = 'dashboard.html';
      link.textContent = 'My account';
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', updateHeader);
  else updateHeader();
})();
