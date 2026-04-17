// ──────────────────────────────────────────
// Global Fetch Interceptor
// Automatically attaches JWT token to all API fetch requests.
// Call initFetchInterceptor() once at app startup (client-side only).
// ──────────────────────────────────────────

const TOKEN_KEY = 'nekkewifi_token';

let _originalFetch: typeof window.fetch | null = null;
let _patched = false;

export function initFetchInterceptor(): void {
  if (typeof window === 'undefined') return;
  if (_patched) return;

  _originalFetch = window.fetch.bind(window);
  _patched = true;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const token = localStorage.getItem(TOKEN_KEY);

    if (token) {
      const headers = new Headers(init?.headers);

      // Only set Authorization if not already set
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      return _originalFetch!(input, { ...init, headers });
    }

    return _originalFetch!(input, init);
  };
}

// Also re-export authFetch for explicit usage if needed
export function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (typeof window === 'undefined') {
    return fetch(input, init);
  }

  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(init?.headers);

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return _originalFetch!(input, { ...init, headers });
}
