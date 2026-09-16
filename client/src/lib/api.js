async function req(path, opts = {}) {
  const hasBody = opts.body !== undefined;
  const res = await fetch(path, {
    method: opts.method || 'GET',
    headers: hasBody ? { 'Content-Type': 'application/json', ...(opts.headers || {}) } : opts.headers || {},
    body: hasBody ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (p) => req(p),
  post: (p, body) => req(p, { method: 'POST', body: body ?? {} }),
  put: (p, body) => req(p, { method: 'PUT', body: body ?? {} }),
  patch: (p, body) => req(p, { method: 'PATCH', body: body ?? {} }),
  del: (p) => req(p, { method: 'DELETE' }),
};
