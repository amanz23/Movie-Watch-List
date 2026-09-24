-- Add saved poster URLs without modifying existing movie data.
alter table public.movies add column if not exists poster text;
