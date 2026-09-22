import API_URL from '../config/api';

// ==========================================
// Token-aware fetch helper
// ==========================================
// All API calls read the stored JWT so the
// platform's new authenticated routes work
// without changing any page's UX style.

const TOKEN_KEY = 'krishibandhu_token';

const getToken = () => localStorage.getItem(TOKEN_KEY) || '';

const apiFetch = async (path, options = {}) => {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${getToken()}`,
  };

  if (
    options.body &&
    typeof options.body === 'object' &&
    !(options.body instanceof FormData)
  ) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  return { response, data };
};

const get = async (path) => {
  const { response, data } = await apiFetch(path, { method: 'GET' });

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
};

const post = async (path, body) => {
  const { response, data } = await apiFetch(path, {
    method: 'POST',
    body,
  });

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
};

const patch = async (path, body) => {
  const { response, data } = await apiFetch(path, {
    method: 'PATCH',
    body,
  });

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
};

const del = async (path) => {
  const { response, data } = await apiFetch(path, { method: 'DELETE' });

  if (!response.ok || data.success === false) {
    throw new Error(data.message || 'Request failed.');
  }

  return data;
};

export default apiFetch;

export { get, post, patch, del, getToken };