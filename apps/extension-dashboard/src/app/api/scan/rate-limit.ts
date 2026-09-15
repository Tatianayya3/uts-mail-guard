import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type RateLimitResult = { success: boolean; limit: number; remaining: number };

export async function consumeScanQuota(
  key: string,
  authenticated: boolean,
): Promise<RateLimitResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("Scan rate limiter is not configured");
  }

  const limit = Number(
    authenticated
      ? (process.env.SCAN_AUTHENTICATED_LIMIT ?? 100)
      : (process.env.SCAN_ANONYMOUS_LIMIT ?? 5),
  );
  const ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(limit, "1 d"),
    prefix: authenticated
      ? "mail-guard:scan:user"
      : "mail-guard:scan:anonymous",
  });

  const result = await ratelimit.limit(key);
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
  };
}
