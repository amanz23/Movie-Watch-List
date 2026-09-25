# Movie-Watch-List

A personal movie watchlist app with accounts: register/sign in, add movies, mark them watched, rate them, and filter the list.


# Deployed Application
 [URL HERE]


# Demo Video: 
[URL Here]

# Features

This Application is a place where you can create your own simple movie watchlist. 
Users can can:
-create a login
-Sign in/ Sign out
-Search a movie and and add comments to add to Watch List
-Mark movie as watched, watched movie will be added into "Watched" Section
-Add Stars to movie (1-5)
-Delete Movies from Users Watch List 

# Technoligies Used
- React: UI and interactive components
- Vite: Frontend Development server
- Javascript + CSS: Application Behavior and styling
- Node.js + Express: Backend API
- Supabase PostgresSQL: Database
- SQLite: locally stored Database
- OMDb API: movie search, posters and descriptions

## Project Structure

```text
Movie-Watch-List/
├── client/
│   └── src/
│       ├── App.jsx          # Page layout and account state
│       ├── AuthForm.jsx     # Registration and login
│       ├── Watchlist.jsx    # Movie search and watchlist management
│       ├── StarRating.jsx   # Half-star rating picker
│       ├── api.js           # Requests to the backend
│       └── styles.css       # Application styling
├── server/
│   ├── src/
│   │   ├── index.js         # Environment loading and server startup
│   │   ├── app.js           # API routes and input validation
│   │   ├── auth.js          # Password and token handling
│   │   └── stores/          # SQLite and Supabase storage
│   └── test/               # API tests
├── supabase/
│   ├── schema.sql          # Database setup
│   └── migrations/         # Updates for existing databases
├── .env.example            # Environment variable template
└── package.json            # Project scripts and dependencies
```

## Setup Instructions

### 1. Clone the repository

Install Node.js with npm, then clone the project:

```bash
git clone https://github.com/amanz23/Movie-Watch-List.git
cd Movie-Watch-List
```

Repository access is required if the repository is private.

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a root environment file if you do not already have one:

```bash
cp .env.example .env
```

For Supabase storage, configure the following values in `.env`:

```env
PORT=3001
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
OMDB_API_KEY=REPLACE_WITH_YOUR_OMDB_KEY

DB_DRIVER=supabase
SUPABASE_URL=REPLACE_WITH_YOUR_SUPABASE_PROJECT_URL
SUPABASE_SERVICE_ROLE_KEY=REPLACE_WITH_YOUR_SERVICE_ROLE_KEY
```

Keep `.env` private and out of Git. OMDb and Supabase credentials are used by the backend and should never be added to frontend code.

### 4. Set up the database

For a new Supabase database, run the contents of `supabase/schema.sql` in the Supabase SQL editor.

If upgrading an existing database that does not have the movie poster column, run `supabase/migrations/20260924_movie_posters.sql`, or execute:

```sql
alter table public.movies add column if not exists poster text;
```

The application uses custom `public.users` and `public.movies` tables. Account authentication is handled by the Express backend rather than Supabase Auth.

For local SQLite storage instead, set:

```env
DB_DRIVER=sqlite
DATABASE_FILE=data/watchlist.db
```

The local database is created automatically.

### 5. Start the application

```bash
npm run dev
```

By default:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

If the frontend port is occupied, open the URL printed in the terminal. If the backend reports that port 3001 is already in use, stop the earlier server before restarting the app.

### 6. Use the application

1. Register an account or sign in.
2. Enter a movie title and select a search result with a poster and description.
3. Add optional notes and click **Add movie**. Manual title entry is also supported.
4. Mark the movie as watched when finished.
5. Click the yellow star beside **Watched** to choose a rating from 0.5 to 5 stars. Select the left half of a star for a half-star rating or the right half for a full star.
6. Filter the list by watched or unwatched movies, or delete movies as needed.

Selected posters are saved with the watchlist entry. Older entries without posters are looked up when the list loads; unavailable images use a placeholder. Search and poster lookup require a configured OMDb key and count toward its request quota.

## Testing and Build

Run the API tests:

```bash
npm test
```

Check code quality:

```bash
npm run lint
```

Build the frontend:

```bash
npm run build
```

The production frontend also requires a running backend API with its environment variables and database connection configured. `npm start` starts the backend only.

## Deploying on Netlify

Netlify hosts both the React website and the Express API through Netlify Functions. Supabase stores the data. Render and `BACKEND_URL` are no longer required.

### 1. Prepare Supabase

Run `supabase/schema.sql` for a new database, or apply `supabase/migrations/20260924_movie_posters.sql` if upgrading an existing database without the poster column.

### 2. Configure the Netlify project

Merge the Netlify Functions PR into `main`, then deploy that branch. Keep the base directory at the repository root. The included `netlify.toml` configures:

| Setting | Value |
| --- | --- |
| Build command | `npm run build:netlify` |
| Publish directory | `client/dist` |
| Functions directory | `netlify/functions` |
| Node.js version | 22 |

The build command remains compatible with the earlier dashboard setup, but no longer requires a backend URL. API requests are routed to the `api` function before the React page fallback.

### 3. Add environment variables

In Netlify, open **Project configuration → Environment variables** and add the following values. Include **Functions** scope (or all scopes if scope selection is unavailable), and apply them to the Production deploy context. Set them for Deploy Previews too if you want to test previews, preferably with a separate test database.

```env
DB_DRIVER=supabase
SUPABASE_URL=YOUR_SUPABASE_PROJECT_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
JWT_SECRET=YOUR_LONG_RANDOM_SECRET
OMDB_API_KEY=YOUR_OMDB_KEY
```

Enter actual values in the Netlify dashboard, never in Git or frontend code. The function requires Supabase credentials and a JWT secret; missing configuration returns a setup error rather than falling back to local SQLite or the development secret. Missing OMDb configuration disables search but still allows manual movie entry.

Remove the old `BACKEND_URL` setting if present. There is no need to set `PORT` on Netlify. Local `.env` files are not uploaded. Save the settings and trigger a new deployment.

### 4. Verify the deployment

Visit your Netlify URL followed by `/api/health` and confirm `{"ok":true,"store":"supabase"}`. Then check registration, login, search, posters, adding movies, watched status, star ratings, and deletion. Refresh or sign back in to verify persistence.

The build can succeed before runtime secrets are set; API requests will return a configuration error until the Functions environment is configured and redeployed. Use Netlify's function logs when troubleshooting runtime failures.

Local development still uses `npm run dev` and supports either SQLite or Supabase. No additional database migration is needed for Netlify Functions. Update the deployed application link near the top of this README after deployment.
