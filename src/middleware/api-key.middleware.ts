/**
 * Static API key authentication (server-to-server).
 *
 * Client must send:
 *   Authorization: Bearer <API_KEY>
 */

import type { NextFunction, Request, Response } from "express";
import crypto from "crypto";

export function requireStaticApiKey(envVarName: string, options?: { headerName?: string }): any {
  const headerName = (options?.headerName || "authorization").toLowerCase();

  return function staticApiKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
    const expected = process.env[envVarName] || "";
    if (!expected) {
      // Fail closed: do not expose a server-to-server endpoint without a configured key.
      res.status(500).json({
        success: false,
        error: `Server misconfiguration: ${envVarName} is not set`,
      });
      return;
    }

    const rawHeader = String((req.headers as any)?.[headerName] || "");
    const token = rawHeader.startsWith("Bearer ") ? rawHeader.slice(7).trim() : "";

    if (!token) {
      res.status(401).json({ success: false, error: "Missing API key" });
      return;
    }

    // Constant-time compare to reduce timing leaks.
    const a = Buffer.from(token);
    const b = Buffer.from(expected);
    const ok = a.length === b.length && crypto.timingSafeEqual(a, b);

    if (!ok) {
      res.status(401).json({ success: false, error: "Invalid API key" });
      return;
    }

    next();
  };
}

