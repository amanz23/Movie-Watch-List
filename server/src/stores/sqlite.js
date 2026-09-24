import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';

export function createSqliteStore(file = process.env.DATABASE_FILE ?? 'data/watchlist.db') {
  if (file !== ':memory:') {
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  }
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS movies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      year INTEGER,
      notes TEXT,
      watched INTEGER NOT NULL DEFAULT 0,
      rating INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS movies_user_id_idx ON movies(user_id);
  `);

  // Upgrade existing local databases without changing their saved movies.
  if (!db.prepare('PRAGMA table_info(movies)').all().some((column) => column.name === 'poster')) {
    db.exec('ALTER TABLE movies ADD COLUMN poster TEXT');
  }

  const statements = {
    userByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),
    insertUser: db.prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)'),
    listMovies: db.prepare('SELECT * FROM movies WHERE user_id = ? ORDER BY watched, created_at DESC'),
    movieById: db.prepare('SELECT * FROM movies WHERE id = ? AND user_id = ?'),
    insertMovie: db.prepare(
      'INSERT INTO movies (user_id, title, year, notes, watched, rating, poster) VALUES (@user_id, @title, @year, @notes, @watched, @rating, @poster)',
    ),
    deleteMovie: db.prepare('DELETE FROM movies WHERE id = ? AND user_id = ?'),
  };

  const toMovie = (row) => (row ? { ...row, watched: Boolean(row.watched) } : null);

  return {
    name: 'sqlite',
    async findUserByEmail(email) {
      return statements.userByEmail.get(email) ?? null;
    },
    async createUser(email, passwordHash) {
      const info = statements.insertUser.run(email, passwordHash);
      return { id: Number(info.lastInsertRowid), email };
    },
    async listMovies(userId) {
      return statements.listMovies.all(userId).map(toMovie);
    },
    async getMovie(id, userId) {
      return toMovie(statements.movieById.get(id, userId));
    },
    async createMovie(userId, movie) {
      const info = statements.insertMovie.run({
        user_id: userId,
        title: movie.title,
        poster: movie.poster ?? null,
        year: movie.year ?? null,
        notes: movie.notes ?? null,
        watched: movie.watched ?? 0,
        rating: movie.rating ?? null,
      });
      return toMovie(statements.movieById.get(Number(info.lastInsertRowid), userId));
    },
    async updateMovie(id, userId, patch) {
      const fields = Object.keys(patch);
      if (fields.length) {
        const assignments = fields.map((field) => `${field} = @${field}`).join(', ');
        db.prepare(`UPDATE movies SET ${assignments} WHERE id = @id AND user_id = @user_id`).run({
          ...patch,
          id,
          user_id: userId,
        });
      }
      return toMovie(statements.movieById.get(id, userId));
    },
    async deleteMovie(id, userId) {
      return statements.deleteMovie.run(id, userId).changes > 0;
    },
  };
}
