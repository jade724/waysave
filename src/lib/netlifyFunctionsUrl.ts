/**
 * Netlify Functions base path (same-origin in production and `netlify dev`).
 * With raw Vite (`npm run dev`), `vite.config.ts` proxies this to `localhost:8888`
 * so you can run `netlify dev` or another process serving functions on 8888.
 */
export const NETLIFY_FUNCTIONS_BASE = "/.netlify/functions";
