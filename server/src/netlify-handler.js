import serverless from 'serverless-http';
import { createApp } from './app.js';

export function createFunctionHandler(options) {
  const handle = serverless(createApp(options));
  return (event, context) => {
    // Support both Netlify's public rewrite and direct function URLs.
    const path = event.path.replace(/^\/\.netlify\/functions\/api(?=\/|$)/, '/api');
    return handle({ ...event, path }, context);
  };
}
