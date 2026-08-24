/**
 * Webhook Handler Service
 * Processes incoming webhooks from AI Sensy and sends responses
 */

import { logger } from "../utils/logger.js";
import { AISensyService } from "./aisensy.service.js";
import { TimingTracker } from "../utils/timing.util.js";
import { conversationService } from "./conversation.service.js";
import { detectLanguage } from "../utils/language.util.js";
import {
  TextMessageHandler,
  ImageMessageHandler,
  AudioMessageHandler,
  QuickReplyMessageHandler,
  LocationMessageHandler,
  DefaultMessageHandler
} from "./webhook/handlers/index.js";
import type { ProcessingResult } from "../utils/timing.util.js";

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

      // Send instant acknowledgement
      // Don't wait for this to finish to avoid delaying AI processing
      const incomingText = message.message_content?.text || "";
      
      // SKIP acknowledgement for simple greetings or button clicks (QUICK_REPLY)
      const { isGreeting } = await import("../utils/greeting-detector.util.js");
      const isSimpleGreeting = isGreeting(incomingText);
      const isQuickReply = messageType === "QUICK_REPLY";
      
      if (!isSimpleGreeting && !isQuickReply) {
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
      } else {
        logger.info("Skipping instant acknowledgment", { 
          phoneNumber, 
          messageType,
          isSimpleGreeting
        });
      }

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

        case "LOCATION":
          result = await this.locationHandler.handle(phoneNumber, message, tracker);
          break;
        
        default:
          logger.info("Unhandled message type", { messageType, phoneNumber });
          result = await this.defaultHandler.handle(phoneNumber, message, tracker);
      }

      tracker.addEvent("Processing complete");
      
      // Send timing breakdown (if enabled)
      const ENABLE_TIMING_BREAKDOWN = process.env.ENABLE_TIMING_BREAKDOWN === "true";
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

      // Check if feedback template should be sent
      // Only send when task is completed or cannot help (not after every message)
      tracker.addEvent("Checking if feedback template should be sent");
      const recentMessages = await conversationService.getRecentMessages(phoneNumber, 5);
      const lastAssistantMessage = recentMessages
        .filter(msg => msg.role === 'assistant' && !msg.metadata?.is_feedback_template)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      
      // Check if last message was a "Talk to Human" response - skip feedback template
      if (lastAssistantMessage?.metadata?.is_talk_to_human_response === true) {
        logger.info("Skipping feedback template - last message was 'Talk to Human' response", {
          phoneNumber,
          lastMessageId: lastAssistantMessage.message_id
        });
        return tracker.getResult();
      }
      
      // Check if last message was a feedback acknowledgment - skip feedback template
      if (lastAssistantMessage?.metadata?.is_feedback_acknowledgment === true) {
        logger.info("Skipping feedback template - last message was feedback acknowledgment", {
          phoneNumber,
          lastMessageId: lastAssistantMessage.message_id
        });
        return tracker.getResult();
      }

      // Check if feedback was sent recently (within last 3 minutes) - prevent spam
      const { wasFeedbackSentRecently } = await import("../utils/feedback-detection.util.js");
      const lastFeedbackMessage = recentMessages
        .filter(msg => msg.metadata?.is_feedback_template === true)
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
      
      if (lastFeedbackMessage && wasFeedbackSentRecently(lastFeedbackMessage.timestamp, 3)) {
        logger.info("Skipping feedback template - feedback sent recently", {
          phoneNumber,
          lastFeedbackTimestamp: lastFeedbackMessage.timestamp,
          minutesAgo: (Date.now() - lastFeedbackMessage.timestamp.getTime()) / (1000 * 60)
        });
        return tracker.getResult();
      }

      // Check if last assistant message has should_send_feedback flag
      // This flag is set by tool results or AI response analysis
      if (lastAssistantMessage?.metadata?.should_send_feedback !== true) {
        logger.info("Skipping feedback template - no feedback flag set (conversation still active)", {
          phoneNumber,
          lastMessageId: lastAssistantMessage?.message_id,
          hasFlag: !!lastAssistantMessage?.metadata?.should_send_feedback
        });
        return tracker.getResult();
      }
      
      // All checks passed - send feedback template
      tracker.addEvent("Detecting language for feedback template");
      
      const language = lastAssistantMessage 
        ? detectLanguage(lastAssistantMessage.content)
        : 'en'; // Default to English
      
      const templateName = language === 'ar' 
        ? "message_feedback_arabic"
        : "message_feedback_english";
      const languageCode = language === 'ar' ? "ar" : "en_us";
      
      tracker.addEvent(`Sending campaign feedback template (${language})`);
      logger.info("Sending feedback template ONLY (no text message before template)", {
        phoneNumber,
        templateName,
        languageCode,
        language
      });
      
      // IMPORTANT: Send ONLY the template message - NO text message before it
      // The template itself contains the body text and buttons
      const campaignResult = await this.aisensyService.sendTemplateMessage(
        phoneNumber,
        templateName,
        languageCode
        // No components needed - template body and buttons are configured in AISensy
      );

      if (campaignResult.success && campaignResult.message_id) {
        // Store the template message in conversation_messages with metadata
        // so we can identify it when user replies
        await conversationService.storeAssistantMessage(
          phoneNumber,
          campaignResult.message_id,
          "Feedback request template",
          {
            template_name: templateName,
            is_feedback_template: true,
            language: language
          }
        );
        
        logger.info("Campaign feedback template sent and stored", {
          phoneNumber,
          messageId: campaignResult.message_id,
          template: templateName,
          language
        });
      } else {
        logger.error("Failed to send campaign feedback template", {
          phoneNumber,
          error: campaignResult.error,
          template: templateName
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
