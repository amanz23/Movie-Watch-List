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
