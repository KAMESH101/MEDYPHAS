// Tiny shared store for "is the backend reachable?" so any page can show the banner.
// 'waking' = a request has been pending for > 3 s (Render free tier cold start).
export type BackendState = 'unknown' | 'ok' | 'waking' | 'offline';

let state: BackendState = 'unknown';
const listeners = new Set<(s: BackendState) => void>();

export const backendStatus = {
  get: () => state,
  set(next: BackendState) {
    if (next === state) return;
    state = next;
    listeners.forEach((fn) => fn(state));
  },
  subscribe(fn: (s: BackendState) => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
};
