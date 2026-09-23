import express from 'express';
import cors from 'cors';
import { createStore } from './store.js';
import { hashPassword, requireAuth, signToken, verifyPassword } from './auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseMovieInput(body, { partial = false } = {}) {
  const errors = [];
  const movie = {};

  if (body.title !== undefined || !partial) {
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!title) errors.push('title is required');
    movie.title = title;
  }
  if (body.year !== undefined) {
    const year = body.year === null || body.year === '' ? null : Number(body.year);
    if (year !== null && (!Number.isInteger(year) || year < 1870 || year > 2200)) {
      errors.push('year must be an integer between 1870 and 2200');
    }
    movie.year = year;
  }
  if (body.notes !== undefined) {
    movie.notes = body.notes === null ? null : String(body.notes);
  }
  if (body.watched !== undefined) {
    movie.watched = body.watched ? 1 : 0;
  }
  if (body.rating !== undefined) {
    const rating = body.rating === null || body.rating === '' ? null : Number(body.rating);
    if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 10)) {
      errors.push('rating must be an integer between 1 and 10');
    }
    movie.rating = rating;
  }
  return { movie, errors };
}

function toApiMovie(row) {
  return { ...row, watched: Boolean(row.watched) };
}

function route(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res)).catch(next);
}

export function createApp({ store = createStore() } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ ok: true, store: store.name }));

  app.post(
    '/api/auth/register',
    route(async (req, res) => {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
      if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
      if (await store.findUserByEmail(email)) return res.status(409).json({ error: 'Email is already registered' });

      const user = await store.createUser(email, hashPassword(password));
      return res.status(201).json({ token: signToken(user), user });
    }),
  );

  app.post(
    '/api/auth/login',
    route(async (req, res) => {
      const email = String(req.body?.email ?? '').trim().toLowerCase();
      const password = String(req.body?.password ?? '');
      const row = await store.findUserByEmail(email);
      if (!row || !verifyPassword(password, row.password_hash)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      const user = { id: row.id, email: row.email };
      return res.json({ token: signToken(user), user });
    }),
  );

  app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

  app.get(
    '/api/movies',
    requireAuth,
    route(async (req, res) => {
      const movies = await store.listMovies(req.user.id);
      return res.json({ movies: movies.map(toApiMovie) });
    }),
  );

  app.post(
    '/api/movies',
    requireAuth,
    route(async (req, res) => {
      const { movie, errors } = parseMovieInput(req.body ?? {});
      if (errors.length) return res.status(400).json({ error: errors.join(', ') });
      const created = await store.createMovie(req.user.id, movie);
      return res.status(201).json({ movie: toApiMovie(created) });
    }),
  );

  app.patch(
    '/api/movies/:id',
    requireAuth,
    route(async (req, res) => {
      const id = Number(req.params.id);
      if (!(await store.getMovie(id, req.user.id))) return res.status(404).json({ error: 'Movie not found' });

      const { movie, errors } = parseMovieInput(req.body ?? {}, { partial: true });
      if (errors.length) return res.status(400).json({ error: errors.join(', ') });

      const updated = await store.updateMovie(id, req.user.id, movie);
      return res.json({ movie: toApiMovie(updated) });
    }),
  );

  app.delete(
    '/api/movies/:id',
    requireAuth,
    route(async (req, res) => {
      const removed = await store.deleteMovie(Number(req.params.id), req.user.id);
      if (!removed) return res.status(404).json({ error: 'Movie not found' });
      return res.status(204).end();
    }),
  );

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
