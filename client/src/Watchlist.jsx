import { useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const EMPTY_FORM = { title: '', notes: '', poster: null };

function SearchPoster({ src }) {
  const [failed, setFailed] = useState(false);
  return src && !failed ? (
    <img className="search-poster" src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />
  ) : <span className="search-poster poster-placeholder" aria-hidden="true">No poster</span>;
}

export default function Watchlist() {
  const [movies, setMovies] = useState([]);
  const [search, setSearch] = useState({ query: '', movies: [], message: '' });
  const [selectedTitle, setSelectedTitle] = useState('');
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

  useEffect(() => {
    const query = form.title.trim();
    if (query.length < 2 || form.title === selectedTitle) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearch({ query, movies: [], message: 'Searching movies…' });
      try {
        const { movies } = await api.searchMovies(query, controller.signal);
        if (!controller.signal.aborted) {
          setSearch({ query, movies, message: movies.length ? '' : 'No matches. You can add this title manually.' });
        }
      } catch (err) {
        if (!controller.signal.aborted) setSearch({ query, movies: [], message: err.message });
      }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [form.title, selectedTitle]);

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
        poster: form.poster,
        notes: form.notes || null,
      });
      setMovies((current) => [movie, ...current]);
      setForm(EMPTY_FORM);
      setSelectedTitle('');
      setSearch({ query: '', movies: [], message: '' });
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
        <div className="movie-search">
          <input
            aria-label="Movie title"
            aria-describedby="movie-search-status"
            placeholder="Movie title"
            value={form.title}
            maxLength={200}
            autoComplete="off"
            onChange={(e) => {
              setForm({ ...form, title: e.target.value, poster: null });
              setSelectedTitle('');
              setSearch({ query: '', movies: [], message: '' });
            }}
            required
          />
          <div id="movie-search-status" className="muted" role="status">
            {search.query === form.title.trim() ? search.message : ''}
          </div>
          {search.query === form.title.trim() && search.movies.length > 0 ? (
            <ul className="search-results" aria-label="Movie suggestions">
              {search.movies.map((movie, index) => (
                <li key={`${movie.title}-${movie.poster}-${index}`}>
                  <button type="button" onClick={() => {
                    setForm({ ...form, title: movie.title, poster: movie.poster });
                    setSelectedTitle(movie.title);
                    setSearch({ query: '', movies: [], message: '' });
                  }}>
                    <SearchPoster key={movie.poster} src={movie.poster} />
                    <span className="search-copy">
                      <strong>{movie.title}</strong>
                      <span className="muted search-description">{movie.description || 'Description unavailable.'}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
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
            <div className="movie-identity">
              <SearchPoster key={movie.poster} src={movie.poster} />
              <span>
                <strong>{movie.title}</strong>
                {movie.notes ? <div className="muted">{movie.notes}</div> : null}
              </span>
            </div>
            <div className="actions">
              <label className="check">
                <input type="checkbox" checked={movie.watched} onChange={() => patch(movie.id, { watched: !movie.watched })} aria-label={`Mark ${movie.title} watched`} />
                Watched
              </label>
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
