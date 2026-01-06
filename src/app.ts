import express from "express";
import type { Application, Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { logger } from "./utils/logger.js";
import { loggingMiddleware } from "./middleware/logging.middleware.js";
import { connectDatabase, closeDatabase } from "./config/database.js";
import { cleanupService } from "./services/cleanup.service.js";
import { settingsService } from "./settings/services/settings.service.js";
import { webhookHandlerService } from "./services/webhook.handler.service.js";

// Routes
import authRoutes from "./auth/routes/auth.routes.js";
import userRoutes from "./users/routes/user.routes.js";
import settingsRoutes from "./settings/routes/settings.routes.js";
import { dashboardRoutes } from "./dashboard/index.js";
import { conversationsRoutes } from "./conversations/index.js";
import { faqRoutes } from "./faqs/index.js";
import analyticsRoutes from "./analytics/routes/analytics.routes.js";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - Allow all origins
const corsOptions = {
  origin: true, // Allow all origins
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// Apply logging middleware
app.use(loggingMiddleware);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/analytics", analyticsRoutes);

// Webhook endpoint (from AI Sensy)
app.post("/", async (req: Request, res: Response) => {
  try {
    // Check if webhook processing is enabled
    const webhookActive = await settingsService.getWebhookActiveStatus();
    
    if (!webhookActive) {
      // Webhook is disabled, just return 200 without processing
      logger.info("Webhook received but processing is disabled", { body: req.body });
      res.status(200).json({ 
        status: "ok", 
        message: "Webhook received but processing is disabled" 
      });
      return;
    }

    // Webhook is enabled, process it
    logger.info("Received webhook payload", { body: req.body });
    
    // Process webhook asynchronously (don't wait for response)
    webhookHandlerService.processWebhook(req.body).catch((error) => {
      logger.error("Error in webhook processing", { error });
    });
    
    // Acknowledge receipt immediately (webhook processing happens in background)
    res.status(200).json({ 
      status: "ok", 
      message: "Webhook received and processing" 
    });
  } catch (error) {
    logger.error("Webhook handler error", { error });
    res.status(200).json({ 
      status: "ok", 
      message: "Webhook received" 
    });
  }
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "healthy healthy server is running", timestamp: new Date().toISOString() });
});

// Store cleanup interval for graceful shutdown
let cleanupInterval: NodeJS.Timeout | null = null;
let server: any = null;
let isShuttingDown = false;

// Initialize database and start server
async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Run initial cleanup of expired OTPs and tokens
    logger.info("Running initial cleanup of expired OTPs and tokens...");
    await cleanupService.cleanupExpired();

    // Start periodic cleanup (runs every hour)
    cleanupInterval = cleanupService.startPeriodicCleanup();

    // Start server
    server = app.listen(PORT, () => {
      logger.info(`Server started on port ${PORT}`, { 
        port: PORT,
        env: process.env.NODE_ENV || "development",
      });
    });
  } catch (error) {
    logger.error("Failed to start server", { error });
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  if (isShuttingDown) {
    logger.warn("Shutdown already in progress, forcing exit");
    process.exit(1);
  }

  isShuttingDown = true;
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    // Stop accepting new connections
    if (server) {
      server.close(() => {
        logger.info("HTTP server closed");
      });
    }

    // Stop periodic cleanup
    if (cleanupInterval) {
      cleanupService.stopPeriodicCleanup(cleanupInterval);
    }

    // Wait for in-flight requests (give up to 30 seconds)
    logger.info("Waiting for in-flight requests to complete...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    // Close database connection
    await closeDatabase();

    logger.info("Graceful shutdown completed");
    process.exit(0);
  } catch (error) {
    logger.error("Error during graceful shutdown", { error });
    process.exit(1);
  }
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// Start the server
startServer();
