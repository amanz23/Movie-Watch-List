import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { createApp } from './app.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

const port = Number(process.env.PORT ?? 3001);

createApp().listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
