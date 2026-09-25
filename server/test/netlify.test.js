import assert from 'node:assert/strict';
import test from 'node:test';
import { createFunctionHandler } from '../src/netlify-handler.js';
import { createSqliteStore } from '../src/stores/sqlite.js';
import { handler } from '../../netlify/functions/api.mjs';

function invoke(handle, path, { method = 'GET', body, token, query = {} } = {}) {
  return handle({
    path, httpMethod: method, headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    }, queryStringParameters: query, requestContext: {},
    body: body ? JSON.stringify(body) : null, isBase64Encoded: false,
  }, {});
}

test('Netlify adapter handles public and direct URLs and authenticated movie operations', async () => {
  const handle = createFunctionHandler({ store: createSqliteStore(':memory:') });
  for (const path of ['/api/health', '/.netlify/functions/api/health']) {
    const res = await invoke(handle, path);
    assert.equal(res.statusCode, 200);
    assert.equal(JSON.parse(res.body).ok, true);
  }
  assert.equal((await invoke(handle, '/api/movies')).statusCode, 401);
  const registered = await invoke(handle, '/api/auth/register', { method: 'POST', body: { email: 'function@example.com', password: 'password123' } });
  assert.equal(registered.statusCode, 201);
  const { token } = JSON.parse(registered.body);
  const login = await invoke(handle, '/.netlify/functions/api/auth/login', { method: 'POST', body: { email: 'function@example.com', password: 'password123' } });
  assert.equal(login.statusCode, 200);
  const created = await invoke(handle, '/api/movies', { method: 'POST', token, body: { title: 'Heat', poster: 'https://example.com/heat.jpg' } });
  assert.equal(created.statusCode, 201);
  const { movie } = JSON.parse(created.body);
  const updated = await invoke(handle, `/api/movies/${movie.id}`, { method: 'PATCH', token, body: { watched: true, rating: 7 } });
  assert.equal(updated.statusCode, 200);
  assert.equal(JSON.parse(updated.body).movie.rating, 7);
  const list = await invoke(handle, '/api/movies', { token });
  assert.equal(JSON.parse(list.body).movies[0].poster, movie.poster);
  assert.equal((await invoke(handle, `/api/movies/${movie.id}`, { method: 'DELETE', token })).statusCode, 204);
});

test('Netlify adapter passes search query strings through to Express', async () => {
  const handle = createFunctionHandler({ store: createSqliteStore(':memory:'), omdbApiKey: 'test', fetchImpl: async (url) => {
    assert.equal(url.searchParams.get('s'), 'Heat & Light');
    return { ok: true, json: async () => ({ Response: 'False', Error: 'Movie not found!' }) };
  } });
  const registered = await invoke(handle, '/api/auth/register', { method: 'POST', body: { email: 'search@example.com', password: 'password123' } });
  const { token } = JSON.parse(registered.body);
  const result = await invoke(handle, '/api/omdb/search', { token, query: { q: 'Heat & Light' } });
  assert.equal(result.statusCode, 200);
  assert.deepEqual(JSON.parse(result.body), { movies: [] });
});

test('deployed function fails safely without a JWT secret', async () => {
  const saved = process.env.JWT_SECRET;
  delete process.env.JWT_SECRET;
  try {
    const result = await invoke(handler, '/api/health');
    assert.equal(result.statusCode, 503);
    assert.match(JSON.parse(result.body).error, /Configure Supabase/);
  } finally {
    if (saved === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = saved;
  }
});
