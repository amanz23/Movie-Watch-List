const TOKEN_KEY = 'watchlist.token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request(path, { method = 'GET', body, signal } = {}) {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    method,
    signal,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export const api = {
  register: (email, password) => request('/auth/register', { method: 'POST', body: { email, password } }),
  login: (email, password) => request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),
  searchMovies: (query, signal) => request(`/omdb/search?q=${encodeURIComponent(query)}`, { signal }),
  listMovies: () => request('/movies'),
  findPoster: (id) => request(`/movies/${id}/poster`, { method: 'POST' }),
  addMovie: (movie) => request('/movies', { method: 'POST', body: movie }),
  updateMovie: (id, patch) => request(`/movies/${id}`, { method: 'PATCH', body: patch }),
  deleteMovie: (id) => request(`/movies/${id}`, { method: 'DELETE' }),
};
