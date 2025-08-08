import type { Middleware } from './types';
import type { RateLimitOptions } from './types';

interface StoreItem {
  points: number;
  expires: number;
}

const store = new Map<string, StoreItem>();

export function createRateLimitMiddleware(opts: RateLimitOptions): Middleware {
  return async ({ path, next }) => {
    const key = `${opts.key ?? 'global'}:${path}`;
    const now = Date.now();
    const item = store.get(key);
    if (item && item.expires > now) {
      if (item.points >= opts.points) {
        throw new Error('Rate limit exceeded');
      }
      item.points++;
    } else {
      store.set(key, { points: 1, expires: now + opts.durationSec * 1000 });
    }
    return next();
  };
}
