const API_BASE = '';

function getToken() {
  return typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
}

/**
 * Double-Submit Cookie CSRF: Read token from cookie set by server
 * No need to fetch from API - cookie is set automatically
 */
export function getCsrfTokenFromCookie() {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';').map(c => c.trim());
  const csrfCookie = cookies.find(c => c.startsWith('iqp_csrf='));
  if (!csrfCookie) return null;
  return csrfCookie.split('=')[1];
}

export async function getCsrfToken(forceRefresh = false) {
  // Try reading from cookie first (double-submit pattern)
  let token = getCsrfTokenFromCookie();
  
  if (!token || forceRefresh) {
    // Fetch from server to get/refresh cookie
    const r = await fetch(`${API_BASE}/api/csrf-token`, { 
      credentials: 'include',
      method: 'GET',
    });
    if (!r.ok) {
      throw new Error(`Failed to get CSRF token: ${r.status}`);
    }
    const data = await r.json();
    token = data.csrfToken || getCsrfTokenFromCookie();
  }
  
  return token;
}

export async function refreshCsrfToken() {
  return getCsrfToken(true);
}

export async function api(path, options = {}, retryOnCsrf = true) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  
  // Add CSRF token for state-changing requests (double-submit cookie pattern)
  if (options.method && options.method !== 'GET' && options.method !== 'HEAD') {
    try {
      const csrfToken = await getCsrfToken();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }
    } catch (err) {
      console.warn('CSRF token read failed:', err);
      // Try fetching from server
      try {
        await refreshCsrfToken();
        const csrfToken = getCsrfTokenFromCookie();
        if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
      } catch (refreshErr) {
        console.error('CSRF token refresh failed:', refreshErr);
      }
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
    // Retry once on CSRF errors (cookie might have been refreshed)
    if (res.status === 403 && retryOnCsrf && (data?.error?.includes('CSRF') || data?.code === 'CSRF_TOKEN_MISSING' || data?.code === 'CSRF_TOKEN_MISMATCH')) {
      try {
        await refreshCsrfToken();
        const csrfToken = getCsrfTokenFromCookie();
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
          return api(path, options, false); // Retry once
        }
      } catch (refreshErr) {
        console.error('CSRF retry failed:', refreshErr);
      }
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
  const csrf = getCsrfTokenFromCookie() || await getCsrfToken();
  
  const res = await fetch(`${API_BASE}/api/export/xlsx`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      'X-CSRF-Token': csrf || '',
    },
    body: JSON.stringify({ columns, rows, filename }),
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }
  
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
  const csrf = getCsrfTokenFromCookie() || await getCsrfToken();
  
  const res = await fetch(`${API_BASE}/api/report/html`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
      'X-CSRF-Token': csrf || '',
    },
    body: JSON.stringify(payload),
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }
  
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
