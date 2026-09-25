import { createFunctionHandler } from '../../server/src/netlify-handler.js';
import { createSupabaseStore } from '../../server/src/stores/supabase.js';

let api;
export async function handler(event, context) {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];
  if (required.some((name) => !process.env[name]?.trim()) ||
      (process.env.DB_DRIVER && process.env.DB_DRIVER !== 'supabase')) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Configure Supabase and JWT_SECRET in Netlify Functions environment variables; DB_DRIVER must be supabase.' }),
    };
  }
  if (!api) api = createFunctionHandler({ store: createSupabaseStore() });
  return api(event, context);
}
