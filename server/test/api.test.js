import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createSqliteStore } from '../src/stores/sqlite.js';

function app() {
  return createApp({ store: createSqliteStore(':memory:') });
}

async function registered(server, email = 'user@example.com') {
  const res = await request(server).post('/api/auth/register').send({ email, password: 'password123' });
  assert.equal(res.status, 201);
  return res.body.token;
}

test('registers a user and returns a token', async () => {
  const server = app();
  const res = await request(server).post('/api/auth/register').send({ email: 'a@b.com', password: 'password123' });
  assert.equal(res.status, 201);
  assert.ok(res.body.token);
  assert.equal(res.body.user.email, 'a@b.com');
});

test('rejects weak passwords and duplicate emails', async () => {
  const server = app();
  const weak = await request(server).post('/api/auth/register').send({ email: 'a@b.com', password: 'short' });
  assert.equal(weak.status, 400);

  await registered(server, 'a@b.com');
  const dup = await request(server).post('/api/auth/register').send({ email: 'a@b.com', password: 'password123' });
  assert.equal(dup.status, 409);
});

test('logs in with valid credentials only', async () => {
  const server = app();
  await registered(server);
  const ok = await request(server).post('/api/auth/login').send({ email: 'user@example.com', password: 'password123' });
  assert.equal(ok.status, 200);
  const bad = await request(server).post('/api/auth/login').send({ email: 'user@example.com', password: 'nope12345' });
  assert.equal(bad.status, 401);
});

test('requires a token for watchlist routes', async () => {
  const res = await request(app()).get('/api/movies');
  assert.equal(res.status, 401);
});

test('creates, updates and deletes movies', async () => {
  const server = app();
  const token = await registered(server);
  const auth = { Authorization: `Bearer ${token}` };

  const created = await request(server)
    .post('/api/movies')
    .set(auth)
    .send({ title: 'Arrival', year: 2016, notes: 'sci-fi' });
  assert.equal(created.status, 201);
  assert.equal(created.body.movie.watched, false);

  const id = created.body.movie.id;
  const updated = await request(server).patch(`/api/movies/${id}`).set(auth).send({ watched: true, rating: 9 });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.movie.watched, true);
  assert.equal(updated.body.movie.rating, 9);

  const list = await request(server).get('/api/movies').set(auth);
  assert.equal(list.body.movies.length, 1);

  const removed = await request(server).delete(`/api/movies/${id}`).set(auth);
  assert.equal(removed.status, 204);
  const empty = await request(server).get('/api/movies').set(auth);
  assert.equal(empty.body.movies.length, 0);
});

test('validates movie input', async () => {
  const server = app();
  const auth = { Authorization: `Bearer ${await registered(server)}` };
  const noTitle = await request(server).post('/api/movies').set(auth).send({ year: 2016 });
  assert.equal(noTitle.status, 400);
  const badRating = await request(server).post('/api/movies').set(auth).send({ title: 'Dune', rating: 99 });
  assert.equal(badRating.status, 400);
});

test('does not leak movies between users', async () => {
  const server = app();
  const tokenA = await registered(server, 'a@example.com');
  const tokenB = await registered(server, 'b@example.com');
  const created = await request(server)
    .post('/api/movies')
    .set({ Authorization: `Bearer ${tokenA}` })
    .send({ title: 'Heat' });

  const listB = await request(server).get('/api/movies').set({ Authorization: `Bearer ${tokenB}` });
  assert.equal(listB.body.movies.length, 0);
  const patchB = await request(server)
    .patch(`/api/movies/${created.body.movie.id}`)
    .set({ Authorization: `Bearer ${tokenB}` })
    .send({ watched: true });
  assert.equal(patchB.status, 404);
});

test('adds a manual title without a year', async () => {
  const server = app();
  const token = await registered(server);
  const res = await request(server).post('/api/movies').auth(token, { type: 'bearer' }).send({ title: 'Arrival' });
  assert.equal(res.status, 201);
  assert.equal(res.body.movie.year, null);
});

test('OMDb search requires auth and validates queries before calling upstream', async () => {
  let calls = 0;
  const server = createApp({ store: createSqliteStore(':memory:'), fetchImpl: async () => { calls++; } });
  assert.equal((await request(server).get('/api/omdb/search?q=Arrival')).status, 401);
  const token = await registered(server);
  for (const query of ['', 'a', 'x'.repeat(201)]) {
    const res = await request(server).get('/api/omdb/search').query({ q: query }).auth(token, { type: 'bearer' });
    assert.equal(res.status, 400);
  }
  assert.equal(calls, 0);
});

test('OMDb search returns titles and safe posters while keeping the key upstream', async () => {
  const server = createApp({ store: createSqliteStore(':memory:'), omdbApiKey: 'test-secret', fetchImpl: async (url, options) => {
    assert.equal(url.origin, 'https://www.omdbapi.com');
    assert.equal(url.searchParams.get('apikey'), 'test-secret');
    assert.equal(url.searchParams.get('s'), 'Heat & Light');
    assert.equal(url.searchParams.get('type'), 'movie');
    assert.ok(options.signal);
    return { ok: true, json: async () => ({ Response: 'True', Search: [
      { Title: 'Heat', Year: '1995', imdbID: 'tt0113277', Poster: 'https://example.com/heat.jpg' },
      { Title: 'Heat', Poster: 'N/A' }, { Title: 'Missing' },
      { Title: 'Unsafe', Poster: 'javascript:alert(1)' }, { Title: 'Insecure', Poster: 'http://example.com/poster.jpg' }, { invalid: true },
    ] }) };
  } });
  const token = await registered(server);
  const res = await request(server).get('/api/omdb/search').query({ q: ' Heat & Light ' }).auth(token, { type: 'bearer' });
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { movies: [
    { title: 'Heat', poster: 'https://example.com/heat.jpg' },
    { title: 'Heat', poster: null }, { title: 'Missing', poster: null },
    { title: 'Unsafe', poster: null }, { title: 'Insecure', poster: null },
  ] });
});

for (const [name, payload, status] of [
  ['no matches', { Response: 'False', Error: 'Movie not found!' }, 200],
  ['invalid key', { Response: 'False', Error: 'Invalid API key!' }, 502],
  ['quota exhausted', { Response: 'False', Error: 'Request limit reached!' }, 503],
  ['broad query', { Response: 'False', Error: 'Too many results.' }, 400],
  ['malformed response', {}, 502],
]) {
  test(`OMDb handles ${name}`, async () => {
    const server = createApp({ store: createSqliteStore(':memory:'), omdbApiKey: 'test-secret',
      fetchImpl: async () => ({ ok: true, json: async () => payload }) });
    const token = await registered(server);
    const res = await request(server).get('/api/omdb/search?q=Heat').auth(token, { type: 'bearer' });
    assert.equal(res.status, status);
    if (status === 200) assert.deepEqual(res.body.movies, []);
    assert.ok(!JSON.stringify(res.body).includes('test-secret'));
  });
}

for (const failure of ['network', 'http', 'json', 'timeout', 'missing key']) {
  test(`OMDb handles ${failure} without leaking upstream details`, async () => {
    const server = createApp({ store: createSqliteStore(':memory:'), omdbApiKey: failure === 'missing key' ? '' : 'test-secret',
      fetchImpl: async () => {
        if (failure === 'missing key') assert.fail('Must not call upstream without a key');
        if (failure === 'network' || failure === 'timeout') throw new Error('test-secret');
        return { ok: failure !== 'http', json: async () => { throw new Error('test-secret'); } };
      } });
    const token = await registered(server);
    const res = await request(server).get('/api/omdb/search?q=Heat').auth(token, { type: 'bearer' });
    assert.equal(res.status, failure === 'missing key' ? 503 : 502);
    assert.ok(!JSON.stringify(res.body).includes('test-secret'));
  });
}
