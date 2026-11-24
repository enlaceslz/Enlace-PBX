/**
 * Enlace-PBX Enterprise - Utilitário de Requisições HTTP Autenticadas
 * Injeta automaticamente cabeçalhos JWT e isolamento multi-tenant
 */

export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('enlace_jwt') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchWithAuth<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('enlace_jwt') : null;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.error) errMessage = errJson.error;
    } catch {
      // Ignora erro de JSON
    }
    throw new Error(errMessage);
  }

  return response.json();
}

let fetchInterceptorInstalled = false;

/**
 * Interceptor global same-origin para chamadas /api/v1/*:
 * Injeta automaticamente Authorization: Bearer <token> sem vazar credenciais para origens externas.
 */
export function installAuthFetchInterceptor(): void {
  if (fetchInterceptorInstalled || typeof window === 'undefined' || typeof window.fetch !== 'function') {
    return;
  }
  fetchInterceptorInstalled = true;
  const nativeFetch = window.fetch.bind(window);

  const wrappedFetch: typeof window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.href
        : input.url;

    const isSameOriginApi =
      rawUrl.startsWith('/api/v1/') ||
      (window.location?.origin && rawUrl.startsWith(`${window.location.origin}/api/v1/`));

    if (!isSameOriginApi) {
      return nativeFetch(input, init);
    }

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('enlace_jwt') : null;
    if (!token) {
      return nativeFetch(input, init);
    }

    const existingHeaders = new Headers(
      init?.headers ?? (input instanceof Request ? input.headers : undefined)
    );
    if (!existingHeaders.has('Authorization')) {
      existingHeaders.set('Authorization', `Bearer ${token}`);
    }

    return nativeFetch(input, {
      ...init,
      headers: existingHeaders,
    });
  };

  try {
    const desc = Object.getOwnPropertyDescriptor(window, 'fetch');
    if (desc && desc.configurable === false && !desc.writable && !desc.set) {
      return;
    }
    Object.defineProperty(window, 'fetch', {
      value: wrappedFetch,
      configurable: true,
      writable: true,
    });
  } catch {
    // Ambiente com window.fetch somente leitura/não configurável: segue usando nativeFetch com getAuthHeaders/fetchWithAuth
  }
}
