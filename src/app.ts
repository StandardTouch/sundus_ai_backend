import express from "express";
import type { Application, Request, Response } from "express";
import dotenv from "dotenv";
import { logger } from "./utils/logger.js";
import { loggingMiddleware } from "./middleware/logging.middleware.js";
import { connectDatabase, closeDatabase } from "./config/database.js";
import { cleanupService } from "./services/cleanup.service.js";

// Routes
import authRoutes from "./auth/auth.routes.js";
import userRoutes from "./users/user.routes.js";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// Apply logging middleware
app.use(loggingMiddleware);

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// Health check
app.post("/", (req: Request, res: Response) => {
  logger.info("Received webhook payload", { body: req.body });
  res.send("🚀 WhatsApp Chatbot (TypeScript) is running!");
});

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Store cleanup interval for graceful shutdown
let cleanupInterval: NodeJS.Timeout | null = null;

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
app.listen(PORT, () => {
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
process.on("SIGINT", async () => {
  logger.info("Shutting down gracefully...");
  if (cleanupInterval) {
    cleanupService.stopPeriodicCleanup(cleanupInterval);
  }
  await closeDatabase();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  logger.info("Shutting down gracefully...");
  if (cleanupInterval) {
    cleanupService.stopPeriodicCleanup(cleanupInterval);
  }
  await closeDatabase();
  process.exit(0);
});

// Start the server
startServer();
