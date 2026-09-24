# Movie-Watch-List

A personal movie watchlist app with accounts: register/sign in, add movies, mark them watched, rate them, and filter the list.

- `server/` — Express API, pluggable storage (SQLite or Supabase Postgres), JWT auth with bcrypt-hashed passwords
- `client/` — React (Vite) single-page UI

## Getting started

```bash
npm install
cp .env.example .env   # set JWT_SECRET for anything beyond local dev
npm run dev            # API on :3001, UI on :5173 (proxied /api -> :3001)
```

### Movie search

Set `OMDB_API_KEY` in the root `.env` to your key from [OMDb](https://www.omdbapi.com/apikey.aspx), then restart the API. The server reads this file regardless of the working directory. Keep `.env` ignored; never put the key in client code or a `VITE_` variable.

Type at least two characters in Movie title to search OMDb, then choose a suggestion or enter a title manually. Suggestions include a poster, title, and short description, with fallbacks when details are unavailable. Descriptions require up to ten additional OMDb requests per search and count toward your API quota. Selecting a result saves its poster with the watchlist entry; editing the title clears that selection. The watchlist displays the poster before the title. Manual entries and older movies without posters show a placeholder. Search waits briefly after typing and cancels outdated requests. Missing keys, no results, and service failures do not prevent manual entry. The UI no longer asks for or displays years; existing database columns and stored years remain unchanged. SQLite adds the poster column automatically. For an existing Supabase database, run `supabase/migrations/20260924_movie_posters.sql` in the SQL editor before starting this version.

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
| GET | `/api/omdb/search?q=title` | Bearer | Search movies; returns `{ movies: [{ title, poster, description }] }` |
| GET | `/api/movies` | Bearer | List the user's movies |
| POST | `/api/movies` | Bearer | Add `{ title, poster?, year?, notes?, watched?, rating? }` |
| PATCH | `/api/movies/:id` | Bearer | Update any of the above fields |
| DELETE | `/api/movies/:id` | Bearer | Remove a movie |

Movies are scoped per user; requests for another user's movie return 404.
