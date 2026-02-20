const API_BASE = '';

function getToken() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
}

let csrfToken = null;
let csrfTokenPromise = null;

export async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  if (csrfTokenPromise) return csrfTokenPromise;
  csrfTokenPromise = (async () => {
    const r = await fetch(`${API_BASE}/api/csrf-token`, { credentials: 'include' });
    if (!r.ok) throw new Error('Failed to get CSRF token');
    const data = await r.json();
    csrfToken = data.csrfToken;
    csrfTokenPromise = null;
    return csrfToken;
  })();
  return csrfTokenPromise;
}

export async function refreshCsrfToken() {
  csrfToken = null;
  csrfTokenPromise = null;
  return getCsrfToken();
}

export async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.method && options.method !== 'GET' && options.method !== 'HEAD') {
    try {
      headers['X-CSRF-Token'] = await getCsrfToken();
    } catch (err) {
      console.warn('CSRF token fetch failed:', err);
      throw new Error('Failed to get CSRF token. Please refresh the page.');
    }
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, credentials: 'include', headers });
  const contentType = res.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  if (!res.ok) {
    if (res.status === 403 && data?.error?.includes('CSRF')) {
      csrfToken = null;
      csrfTokenPromise = null;
      throw new Error('CSRF token expired. Please try again.');
    }
    throw new Error(data?.error || data || `HTTP ${res.status}`);
  }
  return data;
}

export async function executeQuery(sql) {
  return api('/api/query/execute', { method: 'POST', body: JSON.stringify({ sql }) });
}

export async function exportXlsx(columns, rows, filename) {
  const token = getToken();
  const csrf = await getCsrfToken();
  const res = await fetch(`${API_BASE}/api/export/xlsx`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      'X-CSRF-Token': csrf,
    },
    body: JSON.stringify({ columns, rows, filename }),
  });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (filename || 'export') + '.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportReportHtml(payload) {
  const token = getToken();
  const csrf = await getCsrfToken();
  const res = await fetch(`${API_BASE}/api/report/html`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      'X-CSRF-Token': csrf,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  const html = await res.text();
  const w = window.open('', '_blank');
  w.document.write(html);
  w.document.close();
}

export function isAuthenticated() {
  return !!getToken();
}

export function clearAuth() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem('auth_token');
  csrfToken = null;
}
