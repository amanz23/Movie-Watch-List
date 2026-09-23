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
| POST | `/api/movies` | Bearer | Add `{ title, year?, notes?, watched?, rating? }` |
| PATCH | `/api/movies/:id` | Bearer | Update any of the above fields |
| DELETE | `/api/movies/:id` | Bearer | Remove a movie |

Movies are scoped per user; requests for another user's movie return 404.
