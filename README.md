# Movie-Watch-List

A personal movie watchlist app with accounts: register/sign in, add movies, mark them watched, rate them, and filter the list.

- `server/` — Express API, SQLite storage (better-sqlite3), JWT auth with bcrypt-hashed passwords
- `client/` — React (Vite) single-page UI

## Getting started

```bash
npm install
cp .env.example .env   # set JWT_SECRET for anything beyond local dev
npm run dev            # API on :3001, UI on :5173 (proxied /api -> :3001)
```

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
