import assert from 'node:assert/strict';
import test from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { createDb } from '../src/db.js';

function app() {
  return createApp({ db: createDb(':memory:') });
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
