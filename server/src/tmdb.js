const BASE_URL = 'https://api.themoviedb.org/3';
const CACHE_TTL_MS = 5 * 60 * 1000;

function normalize(result) {
  return {
    tmdb_id: result.id,
    title: result.title,
    year: result.release_date ? Number(result.release_date.slice(0, 4)) : null,
    release_date: result.release_date || null,
    poster_path: result.poster_path ?? null,
    overview: result.overview ?? '',
  };
}

export function createTmdbClient({ apiKey = process.env.TMDB_API_KEY, fetchImpl = fetch } = {}) {
  const cache = new Map();

  // v4 read access tokens are JWTs and go in the Authorization header; v3 keys go in the query string.
  const isBearerToken = Boolean(apiKey) && apiKey.startsWith('eyJ');

  async function get(path, params = {}) {
    if (!apiKey) throw Object.assign(new Error('TMDB_API_KEY is not configured'), { status: 503 });

    const url = new URL(`${BASE_URL}${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    if (!isBearerToken) url.searchParams.set('api_key', apiKey);

    const cached = cache.get(url.toString());
    if (cached && cached.expires > Date.now()) return cached.body;

    const res = await fetchImpl(url, {
      headers: isBearerToken ? { Authorization: `Bearer ${apiKey}` } : {},
    });
    if (!res.ok) {
      throw Object.assign(new Error(`TMDB request failed (${res.status})`), { status: res.status === 401 ? 503 : 502 });
    }
    const body = await res.json();
    cache.set(url.toString(), { body, expires: Date.now() + CACHE_TTL_MS });
    return body;
  }

  return {
    configured: Boolean(apiKey),
    async search(query, page = 1) {
      const body = await get('/search/movie', { query, page, include_adult: 'false' });
      return { page: body.page, total_pages: body.total_pages, results: body.results.map(normalize) };
    },
    async upcoming(page = 1) {
      const body = await get('/movie/upcoming', { page });
      const today = new Date().toISOString().slice(0, 10);
      return {
        page: body.page,
        total_pages: body.total_pages,
        results: body.results.map(normalize).filter((movie) => !movie.release_date || movie.release_date >= today),
      };
    },
  };
}
