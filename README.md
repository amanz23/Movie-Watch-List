# Movie-Watch-List

A personal movie watchlist app with accounts: search the TMDB movie catalog (including upcoming releases) with posters, add titles to your list, mark them watched, rate them, and filter the list.

- `server/` — Express API, pluggable storage (SQLite or Supabase Postgres), JWT auth with bcrypt-hashed passwords
- `client/` — React (Vite) single-page UI

## Getting started

```bash
npm install
cp .env.example .env   # set JWT_SECRET, and TMDB_API_KEY for catalog search
npm run dev            # API on :3001, UI on :5173 (proxied /api -> :3001)
```

### Movie catalog (TMDB)

Catalog search and upcoming releases use [TMDB](https://www.themoviedb.org/settings/api). Set `TMDB_API_KEY` (a v3 API key or a v4 read access token) in `.env`; without it the catalog endpoints return 503 and manual add still works. Posters are served from `image.tmdb.org` using the stored `poster_path`.

### Using Supabase instead of SQLite

1. Run `supabase/schema.sql` in the Supabase SQL editor.
2. Set in `.env`:

```bash
DB_DRIVER=supabase
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

The API is the only client of the database and uses the `service_role` key, so RLS is enabled with no policies — nothing can read the tables with the anon/publishable key. Never ship the service_role key to the browser. `GET /api/health` reports the active store.

Other scripts: `npm test` (API tests), `npm run lint`, `npm run build` (client production build), `npm start` (API only).

## API

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | – | Create an account, returns `{ token, user }` |
| POST | `/api/auth/login` | – | Sign in, returns `{ token, user }` |
| GET | `/api/auth/me` | Bearer | Current user |
| GET | `/api/movies` | Bearer | List the user's movies |
| GET | `/api/catalog/search?q=` | Bearer | TMDB search results with posters |
| GET | `/api/catalog/upcoming` | Bearer | Movies releasing in the future |
| POST | `/api/movies` | Bearer | Add `{ title, year?, notes?, watched?, rating?, tmdb_id?, poster_path? }` |
| PATCH | `/api/movies/:id` | Bearer | Update any of the above fields |
| DELETE | `/api/movies/:id` | Bearer | Remove a movie |

Movies are scoped per user; requests for another user's movie return 404.
