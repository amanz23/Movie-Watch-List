---
name: testing-movie-watchlist
description: Run local browser end-to-end checks for Movie-Watch-List authentication, movie persistence, and account isolation.
---

# Local browser testing

- From repository root, load Node with `source ~/.nvm/nvm.sh`; workspace dependencies must already be installed (`npm ci` on a fresh checkout).
- Run `npm run dev` to start Vite on localhost:5173 and Express on localhost:3001. Wait for both ready messages. Vite proxies `/api` to Express.
- Register disposable, uniquely named accounts through the UI; password minimum is eight characters. No email verification is required.
- The default SQLite database is relative to the server process working directory (`server/data/watchlist.db` with workspace scripts). Retain it for reload persistence checks; avoid deleting existing data.
- Test a full-metadata movie and a title-only movie with opposite watched states to make filter checks discriminating.
- Use a second new account to check empty initial state, add a distinct movie, then sign back into the first account. This establishes UI list isolation, not comprehensive API authorization.
- Weak passwords and blank titles use native browser validation; whitespace-only titles reach API validation. Capture native validation immediately after submitting.

## Devin Secrets Needed

None for local testing. The server has a development JWT secret fallback; do not use that fallback for deployment.
