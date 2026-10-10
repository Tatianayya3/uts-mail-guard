import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import type { Quota } from "@mail-guard/contracts";
import type { QuotaPolicy } from "../application/ports";

type Limits = { anonymous: number; authenticated: number };
const DAY_MS = 24 * 60 * 60 * 1000;

/** Ventana deslizante de 24 h en memoria (desarrollo / una instancia). */
export function createMemoryQuota(
  limits: Limits,
  now = () => Date.now(),
): QuotaPolicy {
  const hits = new Map<string, number[]>();
  const limitFor = (auth: boolean) =>
    auth ? limits.authenticated : limits.anonymous;
  const recent = (key: string) => {
    const cutoff = now() - DAY_MS;
    const list = (hits.get(key) ?? []).filter((t) => t > cutoff);
    hits.set(key, list);
    return list;
  };
  const quota = (key: string, auth: boolean): Quota => {
    const limit = limitFor(auth);
    return { limit, remaining: Math.max(0, limit - recent(key).length) };
  };
  return {
    peek: async (key, auth) => quota(`${auth ? "u" : "a"}:${key}`, auth),
    consume: async (key, auth) => {
      const scoped = `${auth ? "u" : "a"}:${key}`;
      recent(scoped).push(now());
      return quota(scoped, auth);
    },
  };
}

/** Cuota distribuida en Upstash: correcta con varias instancias del gateway. */
export function createUpstashQuota(redis: Redis, limits: Limits): QuotaPolicy {
  const make = (limit: number, prefix: string) =>
    new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, "1 d"),
      prefix,
    });
  const anonymous = make(limits.anonymous, "mail-guard:quota:anonymous");
  const authenticated = make(limits.authenticated, "mail-guard:quota:user");
  const pick = (auth: boolean) => (auth ? authenticated : anonymous);
  const limitFor = (auth: boolean) =>
    auth ? limits.authenticated : limits.anonymous;

  return {
    async peek(key, auth) {
      const { remaining } = await pick(auth).getRemaining(key);
      return { limit: limitFor(auth), remaining: Math.max(0, remaining) };
    },
    async consume(key, auth) {
      const result = await pick(auth).limit(key);
      return { limit: result.limit, remaining: Math.max(0, result.remaining) };
    },
  };
}
