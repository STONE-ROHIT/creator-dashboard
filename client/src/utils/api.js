const BASE = '/api';

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  let data;
  try {
    data = await res.json();
  } catch {
    data = {};
  }

  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data; // IMPORTANT: carry full response (403 includes locked content)
    throw err;
  }
  return data;
}

// ── Formatters ───────────────────────────────────────────
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0,
  }).format(parseFloat(amount) || 0);
}

export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export function formatNumber(n) {
  const num = parseInt(n) || 0;
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
  return String(num);
}

// ── API calls ────────────────────────────────────────────
export const api = {
  // Auth
  login:    (email, password) =>
    request('POST', '/auth/login', { email, password }),
  register: (email, username, password, passwordConfirm) =>
    request('POST', '/auth/register', { email, username, password, passwordConfirm }),

  // Content (public)
  browseContent: (page = 1) =>
    request('GET', `/content/browse?page=${page}`),
  getContent: (id, token) =>
    request('GET', `/content/${id}`, undefined, token),
  recordView: (id) =>
    request('POST', `/content/${id}/view`),

  // Content (creator)
  uploadContent:  (data, token)    => request('POST', '/content', data, token),
  getMyContent:   (token)          => request('GET', '/content/my', undefined, token),
  updateContent:  (id, data, token)=> request('PUT', `/content/${id}`, data, token),
  deleteContent:  (id, token)      => request('DELETE', `/content/${id}`, undefined, token),

  // Creators
  becomeCreator:  (displayName, token) =>
    request('POST', '/creators/become-creator', { displayName }, token),
  getMyCreator:   (token)            => request('GET', '/creators/me', undefined, token),
  updateCreator:  (id, data, token)  => request('PUT', `/creators/${id}`, data, token),

  // Subscriptions
  subscribe:           (contentId, token) =>
    request('POST', '/subscriptions', { contentId }, token),
  getSubscriptions:    (token) => request('GET', '/subscriptions', undefined, token),
  cancelSubscription:  (id, token) => request('DELETE', `/subscriptions/${id}`, undefined, token),

  // Payments
  createOrder:   (subscriptionId, token) =>
    request('POST', '/payments/create-order', { subscriptionId }, token),
  verifyPayment: (subscriptionId, token) =>
    request('POST', '/payments/verify', { subscriptionId }, token),
};
