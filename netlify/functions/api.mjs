import { createFunctionHandler } from '../../server/src/netlify-handler.js';
import { createSupabaseStore } from '../../server/src/stores/supabase.js';

let api;
export async function handler(event, context) {
  const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'JWT_SECRET'];
  const missing = required.filter((name) => !process.env[name]?.trim());
  const invalidDriver = Boolean(process.env.DB_DRIVER && process.env.DB_DRIVER !== 'supabase');
  if (missing.length || invalidDriver) {
    const issues = [
      ...(missing.length ? [`Missing or empty: ${missing.join(', ')}.`] : []),
      ...(invalidDriver ? ['DB_DRIVER must be exactly supabase (no quotes or spaces).'] : []),
    ];
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: `Netlify configuration: ${issues.join(' ')} Set Production values with Functions scope, then redeploy.` }),
    };
  }
  if (!api) api = createFunctionHandler({ store: createSupabaseStore() });
  return api(event, context);
}
