import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const EMPTY_FORM = { title: '', year: '', notes: '' };

export default function Watchlist() {
  const [movies, setMovies] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .listMovies()
      .then((data) => setMovies(data.movies))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    if (filter === 'watched') return movies.filter((movie) => movie.watched);
    if (filter === 'unwatched') return movies.filter((movie) => !movie.watched);
    return movies;
  }, [movies, filter]);

  async function addMovie(event) {
    event.preventDefault();
    setError('');
    try {
      const { movie } = await api.addMovie({
        title: form.title,
        year: form.year === '' ? null : Number(form.year),
        notes: form.notes || null,
      });
      setMovies((current) => [movie, ...current]);
      setForm(EMPTY_FORM);
    } catch (err) {
      setError(err.message);
    }
  }

  async function patch(id, changes) {
    setError('');
    try {
      const { movie } = await api.updateMovie(id, changes);
      setMovies((current) => current.map((item) => (item.id === id ? movie : item)));
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    setError('');
    try {
      await api.deleteMovie(id);
      setMovies((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack">
      <form className="card row-form" onSubmit={addMovie}>
        <input
          placeholder="Movie title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          required
        />
        <input
          type="number"
          placeholder="Year"
          value={form.year}
          onChange={(e) => setForm({ ...form, year: e.target.value })}
        />
        <input
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <button type="submit">Add movie</button>
      </form>

      {error ? <p className="error">{error}</p> : null}

      <div className="filters">
        {['all', 'unwatched', 'watched'].map((value) => (
          <button
            key={value}
            type="button"
            className={filter === value ? 'chip active' : 'chip'}
            onClick={() => setFilter(value)}
          >
            {value}
          </button>
        ))}
      </div>

      {loading ? <p className="muted">Loading…</p> : null}
      {!loading && visible.length === 0 ? <p className="muted">Nothing here yet — add your first movie.</p> : null}

      <ul className="movies">
        {visible.map((movie) => (
          <li key={movie.id} className={movie.watched ? 'card movie watched' : 'card movie'}>
            <label className="check">
              <input type="checkbox" checked={movie.watched} onChange={() => patch(movie.id, { watched: !movie.watched })} />
              <span>
                <strong>{movie.title}</strong>
                {movie.year ? <span className="muted"> ({movie.year})</span> : null}
                {movie.notes ? <div className="muted">{movie.notes}</div> : null}
              </span>
            </label>
            <div className="actions">
              <select
                value={movie.rating ?? ''}
                onChange={(e) => patch(movie.id, { rating: e.target.value === '' ? null : Number(e.target.value) })}
                aria-label={`Rating for ${movie.title}`}
              >
                <option value="">Rate</option>
                {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
              <button type="button" className="danger" onClick={() => remove(movie.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
