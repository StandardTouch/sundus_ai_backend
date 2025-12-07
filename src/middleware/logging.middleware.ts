/**
 * Logging Middleware
 * Express middleware for request/response logging
 */

import type { Request, Response, NextFunction } from "express";
import { logRequest, logResponse, isRequestLoggingEnabled, isResponseLoggingEnabled } from "../utils/logger.js";

/**
 * Request/Response logging middleware
 * Logs incoming requests and outgoing responses based on env configuration
 */
export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  // Log request if enabled
  if (isRequestLoggingEnabled()) {
    logRequest({
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.body,
      ip: req.ip || req.socket.remoteAddress || "unknown",
    });
  }

  // Override res.json to capture response body
  const originalJson = res.json.bind(res);
  res.json = function (body: any) {
    const responseTime = Date.now() - startTime;
    
    // Log response if enabled
    if (isResponseLoggingEnabled()) {
      logResponse({
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime,
        body: body,
      });
    }
    
    return originalJson(body);
  };

  // Override res.send to capture response body
  const originalSend = res.send.bind(res);
  res.send = function (body: any) {
    const responseTime = Date.now() - startTime;
    
    // Log response if enabled
    if (isResponseLoggingEnabled()) {
      logResponse({
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        responseTime,
        body: typeof body === "string" ? body : body,
      });
    }
    
    return originalSend(body);
  };

  next();
};

