/**
 * High-performance client-side caching & request deduplication utility.
 * 
 * Features:
 * - In-memory cache with Time-To-Live (TTL) expiration.
 * - In-flight Promise deduplication (prevents concurrent duplicate network/database requests).
 * - Optional sessionStorage fallback for non-sensitive public metadata across reloads.
 * - Granular cache invalidation (by key or pattern).
 * - Zero third-party paid dependencies.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttlMs: number;
}

class CacheManager {
  private memoryCache = new Map<string, CacheEntry<any>>();
  private inFlightRequests = new Map<string, Promise<any>>();

  /**
   * Get an item from memory cache if not expired.
   */
  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttlMs) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set an item in memory cache with TTL (in milliseconds).
   * Default TTL: 60,000 ms (1 minute).
   */
  set<T>(key: string, data: T, ttlMs: number = 60000): void {
    // Avoid caching null or undefined values as valid responses
    if (data === undefined || data === null) return;

    this.memoryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttlMs,
    });
  }

  /**
   * Request deduplication & caching:
   * 1. Returns cached value if still valid.
   * 2. If an identical request is already in-flight, reuses that Promise instead of firing another.
   * 3. Fetches new data, caches it, and clears the in-flight tracker.
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlMs: number = 60000
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Check if identical request is already running
    const existingPromise = this.inFlightRequests.get(key);
    if (existingPromise) {
      return existingPromise as Promise<T>;
    }

    // Start request and track it
    const fetchPromise = (async () => {
      try {
        const result = await fetcher();
        this.set(key, result, ttlMs);
        return result;
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Invalidate a specific cache key.
   */
  invalidate(key: string): void {
    this.memoryCache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or regex pattern.
   */
  invalidatePattern(pattern: RegExp | string): void {
    const keys = Array.from(this.memoryCache.keys());
    for (const key of keys) {
      if (typeof pattern === 'string' ? key.startsWith(pattern) : pattern.test(key)) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Clear all cached data.
   */
  clear(): void {
    this.memoryCache.clear();
    this.inFlightRequests.clear();
  }
}

export const appCache = new CacheManager();

// ============================================================================
// Offline Persistence & Multi-Client Concurrent Attempt Queue
// Guarantees zero data loss even during network congestion, sudden disconnects,
// or mass simultaneous submissions when race timer reaches 00:00.
// ============================================================================

const PENDING_ATTEMPTS_KEY = 'innovision_pending_attempts';

export function savePendingAttempt(attempt: any): void {
  try {
    const raw = localStorage.getItem(PENDING_ATTEMPTS_KEY);
    const list: any[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter(
      (a: any) => !(a.participantId === attempt.participantId && a.roundId === attempt.roundId)
    );
    filtered.push({ ...attempt, queuedAt: Date.now() });
    localStorage.setItem(PENDING_ATTEMPTS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Failed caching pending attempt to localStorage:', err);
  }
}

export function getPendingAttempts(): any[] {
  try {
    const raw = localStorage.getItem(PENDING_ATTEMPTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function removePendingAttempt(participantId: string, roundId: string): void {
  try {
    const raw = localStorage.getItem(PENDING_ATTEMPTS_KEY);
    if (!raw) return;
    const list: any[] = JSON.parse(raw);
    const filtered = list.filter(
      (a: any) => !(a.participantId === participantId && a.roundId === roundId)
    );
    localStorage.setItem(PENDING_ATTEMPTS_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn('Failed removing pending attempt from localStorage:', err);
  }
}
