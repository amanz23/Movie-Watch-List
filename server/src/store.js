import { createSqliteStore } from './stores/sqlite.js';
import { createSupabaseStore } from './stores/supabase.js';

export function createStore() {
  const driver = process.env.DB_DRIVER ?? (process.env.SUPABASE_URL ? 'supabase' : 'sqlite');
  return driver === 'supabase' ? createSupabaseStore() : createSqliteStore();
}
