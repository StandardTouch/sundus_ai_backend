/**
 * Webhook Handler Service
 * Processes incoming webhooks from AI Sensy and sends responses
 */

import { logger } from "../utils/logger.js";
import { AISensyService } from "./aisensy.service.js";
import { TimingTracker } from "../utils/timing.util.js";
import {
  TextMessageHandler,
  ImageMessageHandler,
  AudioMessageHandler,
  QuickReplyMessageHandler,
  DefaultMessageHandler
} from "./webhook/handlers/index.js";

/**
 * Webhook payload structure from AI Sensy
 */
interface WebhookPayload {
  id: string;
  created_at: string;
  topic: string;
  project_id: string;
  delivery_attempt: string;
  data: {
    message: {
      type: string;
      id: string;
      phone_number: string;
      message_type: string;
      message_content: {
        text?: string;
        [key: string]: any;
      };
      [key: string]: any;
    };
  };
}

export class WebhookHandlerService {
  private aisensyService: AISensyService;
  private processedMessageIds: Set<string>;
  private readonly DEDUPE_TTL = 60000; // 60 seconds - prevent duplicate processing

  // Message handlers
  private textHandler: TextMessageHandler;
  private imageHandler: ImageMessageHandler;
  private audioHandler: AudioMessageHandler;
  private quickReplyHandler: QuickReplyMessageHandler;
  private defaultHandler: DefaultMessageHandler;

  constructor() {
    this.aisensyService = new AISensyService();
    this.processedMessageIds = new Set();
    
    // Initialize handlers
    this.textHandler = new TextMessageHandler();
    this.imageHandler = new ImageMessageHandler();
    this.audioHandler = new AudioMessageHandler();
    this.quickReplyHandler = new QuickReplyMessageHandler();
    this.defaultHandler = new DefaultMessageHandler();
    
    // Clean up old message IDs periodically
    setInterval(() => {
      // Clear the set every 5 minutes to prevent memory leak
      if (this.processedMessageIds.size > 1000) {
        this.processedMessageIds.clear();
        logger.info("Cleared processed message IDs cache");
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(payload: WebhookPayload): Promise<void> {
    const tracker = new TimingTracker();
    
    try {
      tracker.addEvent("Webhook received");
      
      const message = payload.data?.message;
      
      if (!message) {
        logger.warn("Webhook received without message data", { payload });
        return;
      }

      const messageId = message.id || payload.id;
      
      // Check for duplicate processing
      if (this.processedMessageIds.has(messageId)) {
        logger.warn("Duplicate webhook detected, skipping", { messageId });
        return;
      }
      
      // Mark as processed
      this.processedMessageIds.add(messageId);
      tracker.addEvent("Duplicate check passed");

      const phoneNumber = message.phone_number;
      const messageType = message.message_type;

      if (!phoneNumber) {
        logger.warn("Webhook received without phone number", { payload });
        return;
      }

      tracker.addEvent("Message validated");
      logger.info("Processing webhook", {
        phoneNumber,
        messageType,
        messageId: message.id
      });

      // Route to appropriate handler
      let result;
      
      switch (messageType) {
        case "TEXT":
          result = await this.textHandler.handle(phoneNumber, message, tracker);
          break;
        
        case "IMAGE":
          result = await this.imageHandler.handle(phoneNumber, message, tracker);
          break;
        
        case "AUDIO":
          result = await this.audioHandler.handle(phoneNumber, message, tracker);
          break;
        
        case "QUICK_REPLY":
          result = await this.quickReplyHandler.handle(phoneNumber, message, tracker);
          break;
        
        default:
          logger.info("Unhandled message type", { messageType, phoneNumber });
          result = await this.defaultHandler.handle(phoneNumber, message, tracker);
      }

      tracker.addEvent("Processing complete");
      
      // Send timing breakdown
      const timingMessage = `⏱️ Processing Time: ${result.totalTime}ms\n${result.breakdown}`;
      await this.aisensyService.sendTextMessage(phoneNumber, timingMessage);
      
      logger.info("Webhook processing completed", {
        messageId,
        phoneNumber,
        totalTime: `${result.totalTime}ms`,
        events: result.events.length
      });
    } catch (error) {
      tracker.addEvent("Error occurred");
      logger.error("Error processing webhook", { error, payload });
      throw error;
    }
  }
}

export const webhookHandlerService = new WebhookHandlerService();
