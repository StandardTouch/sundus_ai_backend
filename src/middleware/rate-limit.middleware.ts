/**
 * Simple in-memory rate limiting middleware.
 *
 * Notes:
 * - Works per-process (not shared across instances).
 * - Good baseline protection for expensive endpoints.
 */

import type { NextFunction, Request, Response } from "express";

export type RateLimitKeyGenerator = (req: Request) => string;

export interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyGenerator?: RateLimitKeyGenerator;
  message?: string;
}

function defaultKeyGenerator(req: Request): string {
  const ip = req.ip || req.socket.remoteAddress || "unknown";
  return ip;
}

export function createRateLimiter(options: RateLimitOptions) {
  const windowMs = options.windowMs;
  const max = options.max;
  const keyGenerator = options.keyGenerator || defaultKeyGenerator;
  const message = options.message || "Rate limit exceeded. Please try again later.";

  // key -> request timestamps within window
  const hits = new Map<string, number[]>();

  return function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
    const now = Date.now();
    const key = keyGenerator(req);

    const arr = hits.get(key) || [];
    const windowStart = now - windowMs;
    const recent = arr.filter((t) => t > windowStart);
    recent.push(now);
    hits.set(key, recent);

    // Best-effort cleanup to prevent unbounded growth
    if (recent.length === 1) {
      // If it was previously empty, set a timer to delete later.
      setTimeout(() => {
        const current = hits.get(key);
        if (!current) return;
        const stillRecent = current.filter((t) => t > Date.now() - windowMs);
        if (stillRecent.length === 0) hits.delete(key);
        else hits.set(key, stillRecent);
      }, windowMs + 1000).unref?.();
    }

    if (recent.length > max) {
      const oldestAllowed = recent[0];
      const retryAfterMs =
        oldestAllowed !== undefined ? Math.max(0, windowMs - (now - oldestAllowed)) : windowMs;
      const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);

      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        success: false,
        error: message,
        retry_after_seconds: retryAfterSeconds,
      });
      return;
    }

    next();
  };
}

