import { useEffect, useState } from 'react';
import { api, posterUrl } from './api.js';

function Poster({ path, title, className = 'poster' }) {
  const url = posterUrl(path);
  return url ? <img className={className} src={url} alt={`${title} poster`} loading="lazy" /> : <div className={`${className} poster-placeholder`}>No image</div>;
}

export function MoviePoster(props) {
  return <Poster {...props} />;
}

export default function Discover({ inList, onAdd }) {
  const [tab, setTab] = useState('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (tab !== 'upcoming' || upcoming.length) return;
    setLoading(true);
    setError('');
    api
      .upcoming()
      .then((data) => setUpcoming(data.results))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [tab, upcoming.length]);

  async function search(event) {
    event.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.searchCatalog(query);
      setResults(data.results);
      setSearched(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const shown = tab === 'search' ? results : upcoming;

  return (
    <section className="card discover">
      <div className="filters">
        <button type="button" className={tab === 'search' ? 'chip active' : 'chip'} onClick={() => setTab('search')}>
          Search movies
        </button>
        <button type="button" className={tab === 'upcoming' ? 'chip active' : 'chip'} onClick={() => setTab('upcoming')}>
          Coming soon
        </button>
      </div>

      {tab === 'search' ? (
        <form className="search-form" onSubmit={search}>
          <input placeholder="Search the movie database…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="submit" disabled={loading}>
            {loading ? 'Searching…' : 'Search'}
          </button>
        </form>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
      {loading && tab === 'upcoming' ? <p className="muted">Loading…</p> : null}
      {tab === 'search' && searched && !loading && shown.length === 0 ? <p className="muted">No matches.</p> : null}

      <ul className="results">
        {shown.map((movie) => (
          <li key={movie.tmdb_id} className="result">
            <Poster path={movie.poster_path} title={movie.title} />
            <div className="result-body">
              <strong>{movie.title}</strong>
              <div className="muted">{movie.release_date ?? 'Release date TBA'}</div>
              {movie.overview ? <p className="muted overview">{movie.overview}</p> : null}
            </div>
            <button type="button" disabled={inList(movie.tmdb_id)} onClick={() => onAdd(movie)}>
              {inList(movie.tmdb_id) ? 'In list' : 'Add'}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
