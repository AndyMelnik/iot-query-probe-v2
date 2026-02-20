const API_BASE = '';

// Debug logging helper
function debugLog(level, ...args) {
  if (typeof window !== 'undefined' && window.__DEBUG_ENABLED) {
    console[level](`[API]`, ...args);
  }
}

function getToken() {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  debugLog('info', 'getToken:', token ? 'Token found' : 'No token');
  return token;
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
  debugLog('info', 'getCsrfToken called', { forceRefresh });
  // Try reading from cookie first (double-submit pattern)
  let token = getCsrfTokenFromCookie();
  debugLog('info', 'CSRF token from cookie:', token ? 'Found' : 'Not found');
  
  if (!token || forceRefresh) {
    debugLog('info', 'Fetching CSRF token from server');
    // Fetch from server to get/refresh cookie
    const r = await fetch(`${API_BASE}/api/csrf-token`, { 
      credentials: 'include',
      method: 'GET',
    });
    debugLog('info', 'CSRF token response:', { status: r.status, ok: r.ok });
    if (!r.ok) {
      debugLog('error', 'CSRF token fetch failed:', r.status);
      throw new Error(`Failed to get CSRF token: ${r.status}`);
    }
    const data = await r.json();
    token = data.csrfToken || getCsrfTokenFromCookie();
    debugLog('info', 'CSRF token received:', token ? 'Token set' : 'Still missing');
  }
  
  return token;
}

export async function refreshCsrfToken() {
  return getCsrfToken(true);
}

export async function api(path, options = {}, retryOnCsrf = true) {
  const requestId = Math.random().toString(36).substr(2, 9);
  debugLog('info', `[${requestId}] API request:`, { method: options.method || 'GET', path });
  
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    debugLog('info', `[${requestId}] Auth header set`);
  }
  
  // Add CSRF token for state-changing requests (double-submit cookie pattern)
  if (options.method && options.method !== 'GET' && options.method !== 'HEAD') {
    try {
      const csrfToken = await getCsrfToken();
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
        debugLog('info', `[${requestId}] CSRF token added to headers`);
      } else {
        debugLog('warn', `[${requestId}] No CSRF token available`);
      }
    } catch (err) {
      debugLog('warn', `[${requestId}] CSRF token read failed:`, err.message);
      // Try fetching from server
      try {
        await refreshCsrfToken();
        const csrfToken = getCsrfTokenFromCookie();
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
          debugLog('info', `[${requestId}] CSRF token refreshed and added`);
        }
      } catch (refreshErr) {
        debugLog('error', `[${requestId}] CSRF token refresh failed:`, refreshErr.message);
      }
    }
  }
  
  debugLog('info', `[${requestId}] Sending request with headers:`, Object.keys(headers));
  
  const startTime = Date.now();
  const res = await fetch(`${API_BASE}${path}`, { ...options, credentials: 'include', headers });
  const duration = Date.now() - startTime;
  
  debugLog('info', `[${requestId}] Response:`, { 
    status: res.status, 
    ok: res.ok, 
    duration: `${duration}ms`,
    headers: Object.fromEntries(res.headers.entries())
  });
  
  const contentType = res.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  
  if (!res.ok) {
    debugLog('error', `[${requestId}] Request failed:`, { status: res.status, error: data });
    // Retry once on CSRF errors (cookie might have been refreshed)
    if (res.status === 403 && retryOnCsrf && (data?.error?.includes('CSRF') || data?.code === 'CSRF_TOKEN_MISSING' || data?.code === 'CSRF_TOKEN_MISMATCH')) {
      debugLog('info', `[${requestId}] CSRF error detected, retrying...`);
      try {
        await refreshCsrfToken();
        const csrfToken = getCsrfTokenFromCookie();
        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
          debugLog('info', `[${requestId}] Retrying with new CSRF token`);
          return api(path, options, false); // Retry once
        }
      } catch (refreshErr) {
        debugLog('error', `[${requestId}] CSRF retry failed:`, refreshErr.message);
      }
    }
    throw new Error(data?.error || data || `HTTP ${res.status}`);
  }
  
  debugLog('info', `[${requestId}] Request successful`);
  return data;
}

export async function executeQuery(sql) {
  console.log('executeQuery called:', { sqlLength: sql.length, sqlPreview: sql.substring(0, 100) });
  try {
    const result = await api('/api/query', {
      method: 'POST',
      body: JSON.stringify({ sql }),
    });
    console.log('executeQuery result:', { 
      rowCount: result?.rowCount, 
      columns: result?.columns?.length,
      truncated: result?.truncated 
    });
    return result;
  } catch (err) {
    console.error('executeQuery error:', err);
    throw err;
  }
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
  const authenticated = !!getToken();
  debugLog('info', 'isAuthenticated:', authenticated);
  return authenticated;
}

export function clearAuth() {
  if (typeof localStorage !== 'undefined') localStorage.removeItem('auth_token');
  csrfToken = null;
}
