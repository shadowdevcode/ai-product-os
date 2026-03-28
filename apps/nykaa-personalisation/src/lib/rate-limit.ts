/**
 * In-memory sliding window rate limiter.
 * Note: does NOT persist across Vercel serverless instances.
 * Acceptable for MVP; upgrade to Upstash Redis post-MVP for production.
 */
const requestLog = new Map<string, number[]>();

// Periodically clean up stale IPs from memory to prevent memory leak
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of requestLog.entries()) {
      const recent = timestamps.filter((t) => now - t < 60_000);
      if (recent.length === 0) {
        requestLog.delete(ip);
      } else {
        requestLog.set(ip, recent);
      }
    }
  }, 60_000).unref?.();
}

export function isRateLimited(ip: string, maxRequests = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(ip) ?? [];

  const recent = timestamps.filter((t) => now - t < windowMs);
  recent.push(now);
  requestLog.set(ip, recent);

  return recent.length > maxRequests;
}
