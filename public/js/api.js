// Cliente HTTP da API; erros do servidor viram exceções com a mensagem em português.
export async function api(method, url, body) {
  const response = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  // 401 fora do login/checagem inicial = sessão expirada: a interface volta para a tela de login.
  if (response.status === 401 && !url.startsWith('/api/login') && url !== '/api/me') window.dispatchEvent(new CustomEvent('ccp:session-expired'));
  if (!response.ok) throw new Error(data.error || `Erro ${response.status}`);
  return data;
}

/** Monta uma query string ignorando valores vazios. */
export const queryString = (params) => new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
