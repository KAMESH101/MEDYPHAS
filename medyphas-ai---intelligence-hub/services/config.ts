// Backend location. Set VITE_API_URL in .env (local) or in the Vercel project settings.
export const API_URL: string = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

// ws:// for http, wss:// for https
export const WS_URL: string = `${API_URL.replace(/^http/, 'ws')}/ws`;
