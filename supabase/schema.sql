-- Run once in the Supabase SQL editor (or via psql) before starting the API with DB_DRIVER=supabase.

create table if not exists public.users (
  id bigint generated always as identity primary key,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.movies (
  id bigint generated always as identity primary key,
  user_id bigint not null references public.users(id) on delete cascade,
  title text not null,
  year integer,
  notes text,
  watched boolean not null default false,
  rating integer check (rating between 1 and 10),
  tmdb_id bigint,
  poster_path text,
  created_at timestamptz not null default now()
);

-- For databases created before TMDB support.
alter table public.movies add column if not exists tmdb_id bigint;
alter table public.movies add column if not exists poster_path text;

create index if not exists movies_user_id_idx on public.movies(user_id);

-- The API authenticates users itself and talks to Supabase with the service_role
-- key, so no anon/authenticated policies are granted: RLS denies all other access.
alter table public.users enable row level security;
alter table public.movies enable row level security;
