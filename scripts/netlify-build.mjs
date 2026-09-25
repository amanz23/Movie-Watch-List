import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

let backend;
try {
  backend = new URL(process.env.BACKEND_URL ?? '');
  if (backend.protocol !== 'https:' || backend.username || backend.password ||
      backend.pathname !== '/' || backend.search || backend.hash) throw new Error();
} catch {
  console.error('Set BACKEND_URL in Netlify to your Render HTTPS origin, for example https://your-api.onrender.com (no /api path).');
  process.exit(1);
}

execFileSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build'], { stdio: 'inherit' });
writeFileSync(new URL('../client/dist/_redirects', import.meta.url),
  `/api/* ${backend.origin}/api/:splat 200!\n/* /index.html 200\n`);
console.log('Netlify API proxy and page fallback configured.');
