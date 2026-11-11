/**
 * Webhook Handler Service
 * Processes incoming webhooks from AI Sensy and sends responses
 */

import { logger } from "../utils/logger.js";
import { AISensyService } from "./aisensy.service.js";
import { TimingTracker } from "../utils/timing.util.js";
import { conversationService } from "./conversation.service.js";
import { detectLanguage } from "../utils/language.util.js";
import { isGreeting } from "../utils/greeting-detector.util.js";
import {
  TextMessageHandler,
  ImageMessageHandler,
  AudioMessageHandler,
  QuickReplyMessageHandler,
  LocationMessageHandler,
  DefaultMessageHandler
} from "./webhook/handlers/index.js";
import type { ProcessingResult } from "../utils/timing.util.js";
import { flowRouter, flowSessionService } from "../flows/index.js";

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
  private locationHandler: LocationMessageHandler;
  private defaultHandler: DefaultMessageHandler;

  constructor() {
    this.aisensyService = new AISensyService();
    this.processedMessageIds = new Set();

    // Initialize handlers
    this.textHandler = new TextMessageHandler();
    this.imageHandler = new ImageMessageHandler();
    this.audioHandler = new AudioMessageHandler();
    this.quickReplyHandler = new QuickReplyMessageHandler();
    this.locationHandler = new LocationMessageHandler();
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
  async processWebhook(payload: WebhookPayload): Promise<ProcessingResult> {
    const tracker = new TimingTracker();

    try {
      tracker.addEvent("Webhook received");

      const message = payload.data?.message;

      if (!message) {
        logger.warn("Webhook received without message data", { payload });
        return tracker.getResult();
      }

      const messageId = message.id || payload.id;

      // Check for duplicate processing
      if (this.processedMessageIds.has(messageId)) {
        logger.warn("Duplicate webhook detected, skipping", { messageId });
        return tracker.getResult();
      }

      // Mark as processed
      this.processedMessageIds.add(messageId);
      tracker.addEvent("Duplicate check passed");

      const phoneNumber = message.phone_number;
      const messageType = message.message_type;

      if (!phoneNumber) {
        logger.warn("Webhook received without phone number", { payload });
        return tracker.getResult();
      }

      tracker.addEvent("Message validated");
      logger.info("Processing webhook", {
        phoneNumber,
        messageType,
        messageId: message.id
      });

      const incomingText = message.message_content?.text || message.text || message.message_content?.caption || "";
      const normalizedIncoming = incomingText.trim().toLowerCase();
      const isSimpleGreeting = isGreeting(incomingText);
      const isQuickReply = messageType === "QUICK_REPLY";
      const isTestMessage = normalizedIncoming === "test" || normalizedIncoming === "testing" || normalizedIncoming.startsWith("test ") || normalizedIncoming.startsWith("testing ");

      // Guided Flow Engine (Amazon-style options flow)
      const ENABLE_GUIDED_FLOW = process.env.ENABLE_GUIDED_FLOW !== "false";
      if (ENABLE_GUIDED_FLOW) {
        tracker.addEvent("Guided flow routing started");
        const flowResult = await flowRouter.handleIncoming(phoneNumber, message);
        if (flowResult.handled) {
          tracker.addEvent("Guided flow completed");
          return tracker.getResult();
        }
      }

      // Instant acknowledgment (enabled by default)
      const ENABLE_INSTANT_ACKNOWLEDGMENT = process.env.ENABLE_INSTANT_ACKNOWLEDGMENT !== "false";
      if (ENABLE_INSTANT_ACKNOWLEDGMENT) {
        if (!isSimpleGreeting && !isQuickReply && !isTestMessage) {
          const userLanguage = detectLanguage(incomingText);
          const processingMsg = userLanguage === 'ar'
            ? "جاري معالجة طلبك..."
            : "Your request is being processed...";

          this.aisensyService.sendTextMessage(phoneNumber, processingMsg).catch(err => {
            logger.error("Failed to send instant acknowledgment", {
              error: err.message,
              phoneNumber
            });
          });
        }
      }

      // Route to appropriate handler
      let result;
      const normalizedType = (messageType || "").toUpperCase().trim();
      const hasTextContent = !!(message.message_content?.text || message.text || message.message_content?.caption);

      switch (normalizedType) {
        case "TEXT":
        case "BUTTON":
        case "BUTTON_REPLY":
        case "INTERACTIVE":
        case "LIST_REPLY":
          result = await this.textHandler.handle(phoneNumber, message, tracker);
          break;

        case "IMAGE":
          result = await this.imageHandler.handle(phoneNumber, message, tracker);
          break;

        case "AUDIO":
        case "VOICE":
          result = await this.audioHandler.handle(phoneNumber, message, tracker);
          break;

        case "QUICK_REPLY":
          result = await this.quickReplyHandler.handle(phoneNumber, message, tracker);
          break;

        case "LOCATION":
          result = await this.locationHandler.handle(phoneNumber, message, tracker);
          break;

        default:
          if (hasTextContent) {
            logger.info("Routing unhandled message type with text content to TextMessageHandler", { normalizedType, phoneNumber });
            result = await this.textHandler.handle(phoneNumber, message, tracker);
          } else {
            logger.info("Unhandled message type", { normalizedType, phoneNumber });
            result = await this.defaultHandler.handle(phoneNumber, message, tracker);
          }
      }

      tracker.addEvent("Processing complete");

      // Send timing breakdown (if enabled or if it's a test message)
      const ENABLE_TIMING_BREAKDOWN = process.env.ENABLE_TIMING_BREAKDOWN === "true" || isTestMessage;
      if (ENABLE_TIMING_BREAKDOWN) {
        const totalSeconds = (result.totalTime / 1000).toFixed(2);
        const timingMessage = `⏱️ Processing Time: ${totalSeconds}s\n${result.breakdown}`;
        const timingResult = await this.aisensyService.sendTextMessage(phoneNumber, timingMessage);

        if (timingResult.success) {
          logger.info("Timing message sent successfully", {
            phoneNumber,
            messageId: timingResult.message_id
          });
        } else {
          logger.error("Failed to send timing message", {
            phoneNumber,
            error: timingResult.error
          });
        }
      } else {
        logger.debug("Timing breakdown message disabled", { phoneNumber });
      }

      // Option 1: Send Main Menu navigation button after AI response
      try {
        const session = await flowSessionService.getSession(phoneNumber);
        const userLanguage = session?.language || (detectLanguage(incomingText) === 'ar' ? 'ar' : 'en');
        const isAr = userLanguage === 'ar';

        const menuPrompt = isAr
          ? "هل تحتاج إلى أي مساعدة أخرى؟ يمكنك العودة إلى القائمة الرئيسية في أي وقت:"
          : "Need anything else? You can return to the main menu at any time:";

        const menuButtons = [
          {
            text: isAr ? "🏠 القائمة الرئيسية" : "🏠 Main Menu",
            payload: "menu_main",
          },
        ];

        // Brief delay (500ms) to ensure AI response text message renders first
        await new Promise((resolve) => setTimeout(resolve, 500));
        await this.aisensyService.sendQuickReplyMessage(phoneNumber, menuPrompt, menuButtons);
        logger.info("Sent post-AI Main Menu navigation button", { phoneNumber, language: userLanguage });
      } catch (err: any) {
        logger.error("Failed to send post-AI Main Menu navigation button", {
          phoneNumber,
          error: err.message,
        });
      }

      logger.info("Webhook processing completed", {
        messageId,
        phoneNumber,
        totalTime: `${result.totalTime}ms`,
        events: result.events.length
      });

      return result;
    } catch (error) {
      tracker.addEvent("Error occurred");
      logger.error("Error processing webhook", { error, payload });
      throw error;
    }
  }
}

export const webhookHandlerService = new WebhookHandlerService();
