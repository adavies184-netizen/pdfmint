(function () {
  'use strict';

  const config = window.PDFMINT_CONFIG || {};
  const configured = Boolean(
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    !config.supabaseUrl.includes('YOUR_PROJECT') &&
    !config.supabaseAnonKey.includes('YOUR_SUPABASE')
  );
  const createClient = window.supabase?.createClient;
  const client = configured && createClient ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    }
  }) : null;

  const pathUrl = (path) => new URL(path || '/', window.location.origin).toString();
  const messageFor = (error) => {
    const raw = String(error?.message || error || 'Something went wrong. Please try again.');
    if (/invalid login credentials/i.test(raw)) return 'That email and password combination is not recognised.';
    if (/email not confirmed/i.test(raw)) return 'Please confirm your email before signing in.';
    if (/user already registered/i.test(raw)) return 'An account already exists for that email. Try signing in instead.';
    return raw;
  };
  const ensureClient = () => {
    if (!client) throw new Error('PDFBreeze account services have not been configured yet.');
    return client;
  };

  let currentSession = null;
  let currentUser = null;
  const ready = (async () => {
    if (!client) return { session: null, user: null, configured: false };
    const { data: sessionData, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    currentSession = sessionData.session;
    if (currentSession) {
      const { data: userData, error: userError } = await client.auth.getUser();
      if (!userError) currentUser = userData.user;
    }
    return { session: currentSession, user: currentUser, configured: true };
  })().catch(error => ({ session: null, user: null, configured, error }));

  if (client) {
    client.auth.onAuthStateChange((event, session) => {
      currentSession = session;
      currentUser = session?.user || null;
      window.dispatchEvent(new CustomEvent('pdfmint-auth-change', { detail: { event, session, user: currentUser } }));
    });
  }

  async function getUser() {
    await ready;
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    currentUser = data.user;
    return data.user;
  }

  async function requireUser(options = {}) {
    const user = await getUser();
    if (user) return user;
    const returnTo = options.returnTo || `${location.pathname}${location.search}`;
    sessionStorage.setItem('pdfmintAuthReturnTo', returnTo);
    location.replace(`${config.loginPath || '/login.html'}?returnTo=${encodeURIComponent(returnTo)}`);
    return null;
  }

  async function signUp({ email, password, firstName, lastName }) {
    const auth = ensureClient().auth;
    const redirectTo = pathUrl(config.authCallbackPath || '/auth-callback.html');
    const { data, error } = await auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectTo, data: { first_name: firstName || '', last_name: lastName || '' } }
    });
    if (error) throw new Error(messageFor(error));
    return data;
  }

  async function signIn({ email, password }) {
    const { data, error } = await ensureClient().auth.signInWithPassword({ email, password });
    if (error) throw new Error(messageFor(error));
    return data;
  }

  async function signInWithOAuth(provider) {
    const returnTo = new URLSearchParams(location.search).get('returnTo') || sessionStorage.getItem('pdfmintAuthReturnTo') || config.dashboardPath || '/dashboard.html';
    sessionStorage.setItem('pdfmintAuthReturnTo', returnTo);
    const { data, error } = await ensureClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: pathUrl(config.authCallbackPath || '/auth-callback.html') }
    });
    if (error) throw new Error(messageFor(error));
    return data;
  }

  async function sendPasswordReset(email) {
    const redirectTo = pathUrl('/reset-password.html');
    const { data, error } = await ensureClient().auth.resetPasswordForEmail(email, { redirectTo });
    if (error) throw new Error(messageFor(error));
    return data;
  }

  async function updatePassword(password) {
    const { data, error } = await ensureClient().auth.updateUser({ password });
    if (error) throw new Error(messageFor(error));
    return data;
  }

  async function changePassword(currentPassword, nextPassword) {
    const api = ensureClient();
    const user = await getUser();
    if (!user?.email) throw new Error('Your session has expired. Please sign in again.');
    const { error: verifyError } = await api.auth.signInWithPassword({ email: user.email, password: currentPassword });
    if (verifyError) throw new Error('Your current password is incorrect.');
    return updatePassword(nextPassword);
  }

  async function updateProfile({ firstName, lastName, email }) {
    const api = ensureClient();
    const user = await getUser();
    if (!user) throw new Error('Your session has expired. Please sign in again.');
    const authChanges = { data: { ...user.user_metadata, first_name: firstName, last_name: lastName } };
    if (email && email !== user.email) authChanges.email = email;
    const { data: authData, error: authError } = await api.auth.updateUser(authChanges);
    if (authError) throw new Error(messageFor(authError));
    const { error: profileError } = await api.from('profiles').upsert({
      id: user.id, email: email || user.email, first_name: firstName, last_name: lastName
    }, { onConflict: 'id' });
    if (profileError) throw new Error(messageFor(profileError));
    return authData.user;
  }

  async function loadProfile() {
    const api = ensureClient();
    const user = await getUser();
    if (!user) return null;
    const { data, error } = await api.from('profiles').select('*').eq('id', user.id).maybeSingle();
    if (error) throw new Error(messageFor(error));
    return data || {
      id: user.id,
      email: user.email,
      first_name: user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || '',
      last_name: user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || ''
    };
  }

  async function updatePreferences(values) {
    const api = ensureClient();
    const user = await getUser();
    if (!user) throw new Error('Your session has expired. Please sign in again.');
    const { data, error } = await api.from('profiles').update({
      language: values.language,
      currency: values.currency,
      timezone: values.timezone
    }).eq('id', user.id).select().single();
    if (error) throw new Error(messageFor(error));
    return data;
  }

  const safeFileName = (name) => String(name || 'PDFBreeze-file')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'PDFBreeze-file';

  async function saveDocument(file, name, sourceTool = '') {
    const api = ensureClient();
    const user = await getUser();
    if (!user) throw new Error('Your session has expired. Please sign in again.');
    const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const filename = name || file?.name || 'PDFBreeze-file';
    const storagePath = `${user.id}/${id}/${safeFileName(filename)}`;
    const { error: uploadError } = await api.storage.from('user-documents').upload(storagePath, file, {
      contentType: file?.type || 'application/octet-stream',
      upsert: false
    });
    if (uploadError) throw new Error(messageFor(uploadError));
    const { data, error } = await api.from('documents').insert({
      id,
      user_id: user.id,
      name: filename,
      storage_path: storagePath,
      mime_type: file?.type || 'application/octet-stream',
      byte_size: Number(file?.size || 0),
      source_tool: sourceTool || null
    }).select().single();
    if (error) {
      await api.storage.from('user-documents').remove([storagePath]);
      throw new Error(messageFor(error));
    }
    return data;
  }

  async function listDocuments() {
    const api = ensureClient();
    const user = await getUser();
    if (!user) return [];
    const { data, error } = await api.from('documents').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
    if (error) throw new Error(messageFor(error));
    return data || [];
  }

  async function downloadDocument(record) {
    const api = ensureClient();
    const { data, error } = await api.storage.from('user-documents').download(record.storage_path);
    if (error) throw new Error(messageFor(error));
    return new File([data], record.name, {
      type: record.mime_type || data.type || 'application/octet-stream',
      lastModified: new Date(record.updated_at || record.created_at || Date.now()).getTime()
    });
  }

  async function signOut() {
    if (client) await client.auth.signOut({ scope: 'local' });
    currentSession = null;
    currentUser = null;
    location.replace(config.loginPath || '/login.html');
  }

  window.PDFMintAuth = {
    client,
    configured,
    ready,
    isSignedIn: () => Boolean(currentUser || currentSession),
    getSession: async () => {
      await ready;
      return currentSession;
    },
    getUser,
    requireUser,
    signUp,
    signIn,
    signInWithOAuth,
    sendPasswordReset,
    updatePassword,
    changePassword,
    updateProfile,
    loadProfile,
    updatePreferences,
    saveDocument,
    listDocuments,
    downloadDocument,
    signOut,
    messageFor
  };
})();
