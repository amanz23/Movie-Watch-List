import { createClient } from '@supabase/supabase-js';

const MOVIE_COLUMNS = 'id, user_id, title, year, notes, watched, rating, tmdb_id, poster_path, created_at';

function fail(error) {
  throw new Error(`Supabase: ${error.message}`);
}

export function createSupabaseStore({
  url = process.env.SUPABASE_URL,
  key = process.env.SUPABASE_SERVICE_ROLE_KEY,
} = {}) {
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required to use the Supabase store');
  }
  const client = createClient(url, key, { auth: { persistSession: false } });

  return {
    name: 'supabase',
    async findUserByEmail(email) {
      const { data, error } = await client.from('users').select('*').eq('email', email).maybeSingle();
      if (error) fail(error);
      return data;
    },
    async createUser(email, passwordHash) {
      const { data, error } = await client
        .from('users')
        .insert({ email, password_hash: passwordHash })
        .select('id, email')
        .single();
      if (error) fail(error);
      return data;
    },
    async listMovies(userId) {
      const { data, error } = await client
        .from('movies')
        .select(MOVIE_COLUMNS)
        .eq('user_id', userId)
        .order('watched', { ascending: true })
        .order('created_at', { ascending: false });
      if (error) fail(error);
      return data;
    },
    async getMovie(id, userId) {
      const { data, error } = await client
        .from('movies')
        .select(MOVIE_COLUMNS)
        .eq('id', id)
        .eq('user_id', userId)
        .maybeSingle();
      if (error) fail(error);
      return data;
    },
    async createMovie(userId, movie) {
      const { data, error } = await client
        .from('movies')
        .insert({
          user_id: userId,
          title: movie.title,
          year: movie.year ?? null,
          notes: movie.notes ?? null,
          watched: Boolean(movie.watched),
          rating: movie.rating ?? null,
          tmdb_id: movie.tmdb_id ?? null,
          poster_path: movie.poster_path ?? null,
        })
        .select(MOVIE_COLUMNS)
        .single();
      if (error) fail(error);
      return data;
    },
    async updateMovie(id, userId, patch) {
      if (Object.keys(patch).length === 0) return this.getMovie(id, userId);
      const { watched, ...rest } = patch;
      const changes = watched === undefined ? rest : { ...rest, watched: Boolean(watched) };
      const { data, error } = await client
        .from('movies')
        .update(changes)
        .eq('id', id)
        .eq('user_id', userId)
        .select(MOVIE_COLUMNS)
        .maybeSingle();
      if (error) fail(error);
      return data;
    },
    async deleteMovie(id, userId) {
      const { data, error } = await client.from('movies').delete().eq('id', id).eq('user_id', userId).select('id');
      if (error) fail(error);
      return data.length > 0;
    },
  };
}
