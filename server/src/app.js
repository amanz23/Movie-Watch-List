import express from 'express';
import cors from 'cors';
import { createDb } from './db.js';
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

export function createApp({ db = createDb() } = {}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  const statements = {
    userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    insertUser: db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)'),
    listMovies: db.prepare('SELECT * FROM movies WHERE user_id = ? ORDER BY watched, created_at DESC'),
    movieById: db.prepare('SELECT * FROM movies WHERE id = ? AND user_id = ?'),
    insertMovie: db.prepare(
      'INSERT INTO movies (user_id, title, year, notes, watched, rating) VALUES (@user_id, @title, @year, @notes, @watched, @rating)',
    ),
    deleteMovie: db.prepare('DELETE FROM movies WHERE id = ? AND user_id = ?'),
  };

  app.get('/api/health', (req, res) => res.json({ ok: true }));

  app.post('/api/auth/register', (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'A valid email is required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
    if (statements.userByEmail.get(email)) return res.status(409).json({ error: 'Email is already registered' });

    const info = statements.insertUser.run(email, hashPassword(password));
    const user = { id: info.lastInsertRowid, email };
    return res.status(201).json({ token: signToken(user), user });
  });

  app.post('/api/auth/login', (req, res) => {
    const email = String(req.body?.email ?? '').trim().toLowerCase();
    const password = String(req.body?.password ?? '');
    const row = statements.userByEmail.get(email);
    if (!row || !verifyPassword(password, row.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    const user = { id: row.id, email: row.email };
    return res.json({ token: signToken(user), user });
  });

  app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));

  app.get('/api/movies', requireAuth, (req, res) => {
    res.json({ movies: statements.listMovies.all(req.user.id).map(toApiMovie) });
  });

  app.post('/api/movies', requireAuth, (req, res) => {
    const { movie, errors } = parseMovieInput(req.body ?? {});
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    const info = statements.insertMovie.run({
      user_id: req.user.id,
      title: movie.title,
      year: movie.year ?? null,
      notes: movie.notes ?? null,
      watched: movie.watched ?? 0,
      rating: movie.rating ?? null,
    });
    return res.status(201).json({ movie: toApiMovie(statements.movieById.get(info.lastInsertRowid, req.user.id)) });
  });

  app.patch('/api/movies/:id', requireAuth, (req, res) => {
    const existing = statements.movieById.get(Number(req.params.id), req.user.id);
    if (!existing) return res.status(404).json({ error: 'Movie not found' });

    const { movie, errors } = parseMovieInput(req.body ?? {}, { partial: true });
    if (errors.length) return res.status(400).json({ error: errors.join(', ') });

    const fields = Object.keys(movie);
    if (fields.length) {
      const assignments = fields.map((field) => `${field} = @${field}`).join(', ');
      db.prepare(`UPDATE movies SET ${assignments} WHERE id = @id AND user_id = @user_id`).run({
        ...movie,
        id: existing.id,
        user_id: req.user.id,
      });
    }
    return res.json({ movie: toApiMovie(statements.movieById.get(existing.id, req.user.id)) });
  });

  app.delete('/api/movies/:id', requireAuth, (req, res) => {
    const info = statements.deleteMovie.run(Number(req.params.id), req.user.id);
    if (info.changes === 0) return res.status(404).json({ error: 'Movie not found' });
    return res.status(204).end();
  });

  return app;
}
