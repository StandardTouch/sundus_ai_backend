import express, { type Request, type Response } from "express";
import dotenv from "dotenv";
import { WebhookGenerator } from "./webhookGenerator.js";
import { WebhookSender } from "./webhookSender.js";
import type { WebhookConfig } from "./types.js";

dotenv.config();

const app = express();
const PORT = process.env.MOCK_SERVER_PORT || 3001;

app.use(express.json());

const webhookGenerator = new WebhookGenerator();
const webhookSender = new WebhookSender(
  process.env.TARGET_WEBHOOK_URL || "http://localhost:8080"
);

/**
 * Health check endpoint
 */
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "🤖 AI Sensy Mock Webhook Server",
    version: "1.0.0",
    endpoints: {
      health: "GET /health",
      send: "POST /webhook/send",
      preview: "POST /webhook/preview",
      analyze: "GET /webhook/analyze/:messageType",
      target: {
        get: "GET /webhook/target",
        set: "POST /webhook/target",
      },
    },
  });
});

/**
 * Health check
 */
app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "healthy healthy server is running",
    timestamp: new Date().toISOString(),
    targetUrl: webhookSender.getTargetUrl(),
  });
});

/**
 * Send webhook - Main endpoint
 * POST /webhook/send
 * Body: WebhookConfig
 */
app.post("/webhook/send", async (req: Request, res: Response) => {
  try {
    const config: WebhookConfig = req.body;

    if (!config.message_type) {
      return res.status(400).json({
        error: "message_type is required",
        expectedTypes: [
          "TEXT",
          "QUICK_REPLY",
          "IMAGE",
          "FILE",
          "AUDIO",
          "STICKER",
          "LOCATION",
          "CONTACT",
        ],
      });
    }

    // Generate webhook payload
    const payload = webhookGenerator.generateWebhook(config);

    // Send to target server
    const result = await webhookSender.sendWebhook(payload);

    if (result.success) {
      res.json({
        success: true,
        message: "Webhook sent successfully",
        targetUrl: webhookSender.getTargetUrl(),
        payload: payload,
        response: result,
      });
    } else {
      res.status(result.status || 500).json({
        success: false,
        message: "Failed to send webhook",
        targetUrl: webhookSender.getTargetUrl(),
        payload: payload,
        error: result.error,
      });
    }
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

/**
 * Preview webhook - Generate payload without sending
 * POST /webhook/preview
 * Body: WebhookConfig
 */
app.post("/webhook/preview", (req: Request, res: Response) => {
  try {
    const config: WebhookConfig = req.body;

    if (!config.message_type) {
      return res.status(400).json({
        error: "message_type is required",
        expectedTypes: [
          "TEXT",
          "QUICK_REPLY",
          "IMAGE",
          "FILE",
          "AUDIO",
          "STICKER",
          "LOCATION",
          "CONTACT",
        ],
      });
    }

    const payload = webhookGenerator.generateWebhook(config);
    const analysis = webhookGenerator.analyzeExpectedFields(config.message_type);

    res.json({
      payload,
      analysis,
      message: "Preview generated successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

/**
 * Analyze expected fields for a message type
 * GET /webhook/analyze/:messageType
 */
app.get("/webhook/analyze/:messageType", (req: Request, res: Response) => {
  try {
    const messageType = req.params.messageType.toUpperCase() as any;

    const analysis = webhookGenerator.analyzeExpectedFields(messageType);

    if (analysis.description === "Unknown message type") {
      return res.status(400).json({
        error: "Invalid message type",
        provided: messageType,
        validTypes: [
          "TEXT",
          "QUICK_REPLY",
          "IMAGE",
          "FILE",
          "AUDIO",
          "STICKER",
          "LOCATION",
          "CONTACT",
        ],
      });
    }

    res.json({
      messageType,
      ...analysis,
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

/**
 * Get current target URL
 * GET /webhook/target
 */
app.get("/webhook/target", (req: Request, res: Response) => {
  res.json({
    targetUrl: webhookSender.getTargetUrl(),
  });
});

/**
 * Set target URL
 * POST /webhook/target
 * Body: { url: string }
 */
app.post("/webhook/target", (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== "string") {
      return res.status(400).json({
        error: "url is required and must be a string",
      });
    }

    webhookSender.setTargetUrl(url);

    res.json({
      success: true,
      message: "Target URL updated",
      targetUrl: webhookSender.getTargetUrl(),
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

/**
 * Quick send endpoints for each message type
 */
const messageTypes = [
  "TEXT",
  "QUICK_REPLY",
  "IMAGE",
  "FILE",
  "AUDIO",
  "STICKER",
  "LOCATION",
  "CONTACT",
];

messageTypes.forEach((type) => {
  app.post(`/webhook/send/${type.toLowerCase()}`, async (req: Request, res: Response) => {
    try {
      const config: WebhookConfig = {
        message_type: type as any,
        ...req.body, // Allow overriding any fields
      };

      const payload = webhookGenerator.generateWebhook(config);
      const result = await webhookSender.sendWebhook(payload);

      if (result.success) {
        res.json({
          success: true,
          message: `${type} webhook sent successfully`,
          targetUrl: webhookSender.getTargetUrl(),
          payload: payload,
          response: result,
        });
      } else {
        res.status(result.status || 500).json({
          success: false,
          message: `Failed to send ${type} webhook`,
          targetUrl: webhookSender.getTargetUrl(),
          payload: payload,
          error: result.error,
        });
      }
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || "Internal server error",
      });
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Mock Webhook Server running on port ${PORT}`);
  console.log(`📡 Target webhook URL: ${webhookSender.getTargetUrl()}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  / - Server info`);
  console.log(`   GET  /health - Health check`);
  console.log(`   POST /webhook/send - Send webhook (requires message_type in body)`);
  console.log(`   POST /webhook/preview - Preview webhook without sending`);
  console.log(`   GET  /webhook/analyze/:messageType - Analyze expected fields`);
  console.log(`   GET  /webhook/target - Get target URL`);
  console.log(`   POST /webhook/target - Set target URL`);
  console.log(`   POST /webhook/send/:type - Quick send (text, image, audio, etc.)`);
  console.log(`\n💡 Example: POST /webhook/send with body: { "message_type": "TEXT", "text": "Hello!" }`);
});

