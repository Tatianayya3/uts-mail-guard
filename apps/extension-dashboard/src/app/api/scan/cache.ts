import crypto from "node:crypto";
import { Redis } from "@upstash/redis";
import type { EmailSnapshot, ScanAnalysis } from "@mail-guard/scan-contract";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (!url || !token) return null;
  if (!redisClient) {
    redisClient = new Redis({ url, token });
  }
  return redisClient;
}

/**
 * Generates a deterministic SHA-256 hash from the normalized email components.
 */
export function computeEmailHash(email: EmailSnapshot): string {
  const normalizedSender = (email.sender || "").trim().toLowerCase();
  const normalizedSubject = (email.subject || "").trim();
  const normalizedBody = (email.bodyText || "").replace(/\s+/g, " ").trim();
  const normalizedLinks = [...(email.links || [])]
    .map((l) => l.trim().toLowerCase())
    .sort()
    .join("|");

  const fingerprint = `${normalizedSender}:::${normalizedSubject}:::${normalizedBody}:::${normalizedLinks}`;
  return crypto.createHash("sha256").update(fingerprint).digest("hex");
}

const CACHE_PREFIX = "mail-guard:scan:cache:";
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

/**
 * Retrieves a cached scan analysis by email hash from Upstash Redis.
 */
export async function getCachedScan(
  emailHash: string,
): Promise<ScanAnalysis | null> {
  const redis = getRedisClient();
  if (!redis) return null;

  try {
    const data = await redis.get<ScanAnalysis>(`${CACHE_PREFIX}${emailHash}`);
    return data ?? null;
  } catch (error) {
    console.error("redis_get_cache_failed", error);
    return null;
  }
}

/**
 * Stores a scan analysis in Upstash Redis with a TTL.
 */
export async function setCachedScan(
  emailHash: string,
  analysis: ScanAnalysis,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) return;

  try {
    await redis.set(`${CACHE_PREFIX}${emailHash}`, analysis, {
      ex: ttlSeconds,
    });
  } catch (error) {
    console.error("redis_set_cache_failed", error);
  }
}
