import Redis from "ioredis";
import logger from "@/lib/logger";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

/**
 * Singleton Redis client instance.
 * Menggunakan retryStrategy yang aman agar tidak melempar uncaught exception jika Redis down.
 */
export const redis = new Redis(redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) {
      return null; // Berhenti mencoba koneksi berulang jika Redis server down
    }
    return Math.min(times * 100, 2000);
  },
});

redis.on("error", (err) => {
  logger.warn({ err: err.message }, "Redis connection warning — falling back to DB");
});

async function ensureConnected(): Promise<boolean> {
  if (redis.status === "ready") return true;
  if (redis.status === "connecting") return true;
  try {
    await redis.connect();
    return true;
  } catch (err) {
    logger.warn({ err }, "Failed to connect to Redis — bypassing cache");
    return false;
  }
}

/**
 * Ambil data dari Redis cache berdasarkan key.
 * Mengembalikan null jika key tidak ditemukan atau terjadi gangguan Redis.
 */
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const ready = await ensureConnected();
    if (!ready) return null;
    const raw = await redis.get(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch (error) {
    logger.warn({ key, error }, "Redis getCache error — falling back to DB");
    return null;
  }
}

/**
 * Simpan data ke Redis cache dengan Time-To-Live (TTL) dalam detik.
 */
export async function setCache(
  key: string,
  data: unknown,
  ttlSeconds: number = 300
): Promise<void> {
  try {
    const ready = await ensureConnected();
    if (!ready) return;
    const value = JSON.stringify(data);
    if (ttlSeconds > 0) {
      await redis.setex(key, ttlSeconds, value);
    } else {
      await redis.set(key, value);
    }
  } catch (error) {
    logger.warn({ key, error }, "Redis setCache error");
  }
}

/**
 * Hapus single key dari Redis cache.
 */
export async function delCache(key: string): Promise<void> {
  try {
    const ready = await ensureConnected();
    if (!ready) return;
    await redis.del(key);
  } catch (error) {
    logger.warn({ key, error }, "Redis delCache error");
  }
}

/**
 * Hapus seluruh key yang cocok dengan pattern tertentu (misal: "products:list:*").
 * Menggunakan non-blocking SCAN stream (bukan KEYS) agar aman untuk production berskala besar.
 */
export async function delCachePattern(pattern: string): Promise<void> {
  try {
    const ready = await ensureConnected();
    if (!ready) return;

    const stream = redis.scanStream({
      match: pattern,
      count: 100,
    });

    const keysToDelete: string[] = [];

    stream.on("data", (resultKeys: string[]) => {
      keysToDelete.push(...resultKeys);
    });

    await new Promise<void>((resolve, reject) => {
      stream.on("end", async () => {
        try {
          if (keysToDelete.length > 0) {
            await redis.del(...keysToDelete);
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      stream.on("error", (err) => reject(err));
    });
  } catch (error) {
    logger.warn({ pattern, error }, "Redis delCachePattern error");
  }
}
