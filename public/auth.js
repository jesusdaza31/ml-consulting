const SUPABASE_URL = 'https://sehrdaqcbickcqyreads.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_LbWDb1aTyzSEV71D1wpnYA_83ZJqIqW';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function authFetch(url, options) {
  options = options || {};
  const token = localStorage.getItem('sb_access_token');
  if (!token) {
    window.location.href = '/login.html';
    return;
  }

  const headers = Object.assign({}, options.headers || {}, {
    'Authorization': 'Bearer ' + token
  });
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const fetchOptions = Object.assign({}, options, { headers: headers });
  delete fetchOptions._retried;

  const response = await fetch(url, fetchOptions);

  if (response.status === 401 && !options._retried) {
    const refreshToken = localStorage.getItem('sb_refresh_token');
    if (!refreshToken) {
      localStorage.removeItem('sb_access_token');
      localStorage.removeItem('sb_refresh_token');
      window.location.href = '/login.html';
      return;
    }

    const { data } = await supabaseClient.auth.refreshSession({
      refresh_token: refreshToken
    });

    if (data.session) {
      localStorage.setItem('sb_access_token', data.session.access_token);
      localStorage.setItem('sb_refresh_token', data.session.refresh_token);
      return authFetch(url, Object.assign({}, options, { _retried: true }));
    }

    localStorage.removeItem('sb_access_token');
    localStorage.removeItem('sb_refresh_token');
    window.location.href = '/login.html';
    return;
  }

  return response;
}

async function checkAuth() {
  const token = localStorage.getItem('sb_access_token');
  if (!token) {
    window.location.href = '/login.html';
    return null;
  }

  const { data: { user }, error } = await supabaseClient.auth.getUser(token);
  if (error || !user) {
    localStorage.removeItem('sb_access_token');
    localStorage.removeItem('sb_refresh_token');
    window.location.href = '/login.html';
    return null;
  }

  return user;
}

async function doLogout() {
  try {
    await supabaseClient.auth.signOut();
  } catch (e) { /* ignore */ }
  localStorage.removeItem('sb_access_token');
  localStorage.removeItem('sb_refresh_token');
}
