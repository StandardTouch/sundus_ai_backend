import express from "express";
import type { Application, Request, Response } from "express";
import dotenv from "dotenv";
import { logger } from "./utils/logger.js";
import { loggingMiddleware } from "./middleware/logging.middleware.js";

// import webhookRouter from "./routes/webhook";

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// Apply logging middleware
app.use(loggingMiddleware);

app.post("/", (req: Request, res: Response) => {
  logger.info("Received webhook payload", { body: req.body });
  res.send("🚀 WhatsApp Chatbot (TypeScript) is running!");
});

app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, { 
    port: PORT,
    env: process.env.NODE_ENV || "development",
  });
});
