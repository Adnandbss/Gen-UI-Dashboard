import { and, eq, gte, lt, sql } from "drizzle-orm";
import { createHash } from "node:crypto";

import { rateLimitEvents } from "@/db/schema";
import { getDb, hasDatabase } from "@/lib/db";

const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS = 20;

const memoryHits = new Map<string, number[]>();

function hashIp(ip: string) {
  return createHash("sha256").update(ip).digest("hex");
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfter: number };

function memoryLimit(ipHash: string): RateLimitResult {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  const recent = (memoryHits.get(ipHash) ?? []).filter((ts) => ts > cutoff);
  if (recent.length >= MAX_REQUESTS) {
    const retryAfter = Math.max(
      1,
      Math.ceil((recent[0]! + WINDOW_MS - now) / 1000),
    );
    return { ok: false, retryAfter };
  }
  recent.push(now);
  memoryHits.set(ipHash, recent);
  return { ok: true };
}

export async function enforceRateLimit(ip: string): Promise<RateLimitResult> {
  const ipHash = hashIp(ip);

  if (!hasDatabase()) {
    return memoryLimit(ipHash);
  }

  const db = getDb();
  const cutoff = new Date(Date.now() - WINDOW_MS);

  await db
    .delete(rateLimitEvents)
    .where(lt(rateLimitEvents.createdAt, cutoff));

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(rateLimitEvents)
    .where(
      and(
        eq(rateLimitEvents.ipHash, ipHash),
        gte(rateLimitEvents.createdAt, cutoff),
      ),
    );

  if (Number(count) >= MAX_REQUESTS) {
    const oldest = await db
      .select({ createdAt: rateLimitEvents.createdAt })
      .from(rateLimitEvents)
      .where(
        and(
          eq(rateLimitEvents.ipHash, ipHash),
          gte(rateLimitEvents.createdAt, cutoff),
        ),
      )
      .orderBy(rateLimitEvents.createdAt)
      .limit(1);

    const retryAfter = Math.max(
      1,
      Math.ceil(
        (oldest[0]!.createdAt.getTime() + WINDOW_MS - Date.now()) / 1000,
      ),
    );
    return { ok: false, retryAfter };
  }

  await db.insert(rateLimitEvents).values({ ipHash });
  return { ok: true };
}
