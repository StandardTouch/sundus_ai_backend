/**
 * Webhook Handler Service
 * Processes incoming webhooks from AI Sensy and sends responses
 */

import { logger } from "../utils/logger.js";
import { AISensyService } from "./aisensy.service.js";

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

/**
 * Timing event for tracking processing steps
 */
interface TimingEvent {
  event: string;
  timestamp: number;
  elapsed: number; // milliseconds since start
}

/**
 * Processing result with timing information
 */
interface ProcessingResult {
  totalTime: number;
  events: TimingEvent[];
  breakdown: string;
}

export class WebhookHandlerService {
  private aisensyService: AISensyService;
  private processedMessageIds: Set<string>;
  private readonly DEDUPE_TTL = 60000; // 60 seconds - prevent duplicate processing

  constructor() {
    this.aisensyService = new AISensyService();
    this.processedMessageIds = new Set();
    
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
    const startTime = Date.now();
    const events: TimingEvent[] = [];
    
    const addEvent = (eventName: string) => {
      const now = Date.now();
      events.push({
        event: eventName,
        timestamp: now,
        elapsed: now - startTime
      });
    };

    try {
      addEvent("Webhook received");
      
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
      addEvent("Duplicate check passed");

      const phoneNumber = message.phone_number;
      const messageType = message.message_type;

      if (!phoneNumber) {
        logger.warn("Webhook received without phone number", { payload });
        return;
      }

      addEvent("Message validated");
      logger.info("Processing webhook", {
        phoneNumber,
        messageType,
        messageId: message.id
      });

      // Handle different message types
      let result: ProcessingResult | null = null;
      
      switch (messageType) {
        case "TEXT":
          result = await this.handleTextMessage(phoneNumber, message, addEvent);
          break;
        
        case "IMAGE":
          result = await this.handleImageMessage(phoneNumber, message, addEvent);
          break;
        
        case "AUDIO":
          result = await this.handleAudioMessage(phoneNumber, message, addEvent);
          break;
        
        case "QUICK_REPLY":
          result = await this.handleQuickReplyMessage(phoneNumber, message, addEvent);
          break;
        
        default:
          logger.info("Unhandled message type", { messageType, phoneNumber });
          result = await this.sendDefaultResponse(phoneNumber, messageType, addEvent);
      }

      if (result) {
        const totalTime = Date.now() - startTime;
        addEvent("Processing complete");
        
        logger.info("Webhook processing completed", {
          messageId,
          phoneNumber,
          totalTime: `${totalTime}ms`,
          events: result.events.length
        });
      }
    } catch (error) {
      addEvent("Error occurred");
      logger.error("Error processing webhook", { error, payload });
      throw error;
    }
  }

  /**
   * Handle TEXT message
   */
  private async handleTextMessage(
    phoneNumber: string, 
    message: any,
    addEvent: (event: string) => void
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const events: TimingEvent[] = [];
    
    const localAddEvent = (eventName: string) => {
      const now = Date.now();
      const elapsed = now - startTime;
      events.push({
        event: eventName,
        timestamp: now,
        elapsed
      });
      addEvent(eventName);
    };

    localAddEvent("TEXT message handler started");
    
    const text = message.message_content?.text;
    
    if (!text) {
      logger.warn("TEXT message received without text content", { phoneNumber, message });
      return {
        totalTime: Date.now() - startTime,
        events,
        breakdown: "No text content found"
      };
    }

    localAddEvent("Text content extracted");
    logger.info("Received TEXT message", { phoneNumber, text });

    // TODO: Add AI processing logic here
    // For now, send an echo response
    localAddEvent("Preparing response");
    const baseResponseText = `You said: ${text}`;
    
    localAddEvent("Sending message via AI Sensy");
    const sendStartTime = Date.now();
    
    // Calculate timing before sending (approximate, will be updated)
    let totalTime = Date.now() - startTime;
    let breakdown = this.formatTimingBreakdown(events, totalTime);
    
    // Include timing in the response message
    const responseWithTiming = `${baseResponseText}\n\n⏱️ Processing Time: ${totalTime}ms\n${breakdown}`;
    
    const result = await this.aisensyService.sendTextMessage(phoneNumber, responseWithTiming);
    const sendTime = Date.now() - sendStartTime;
    localAddEvent(`Message sent (took ${sendTime}ms)`);
    
    // Calculate final total time
    totalTime = Date.now() - startTime;
    breakdown = this.formatTimingBreakdown(events, totalTime);
    
    if (result.success) {
      logger.info("Response sent successfully", {
        phoneNumber,
        messageId: result.message_id,
        sendTime: `${sendTime}ms`,
        totalTime: `${totalTime}ms`
      });
    } else {
      logger.error("Failed to send response", {
        phoneNumber,
        error: result.error
      });
    }

    return {
      totalTime,
      events,
      breakdown
    };
  }

  /**
   * Handle IMAGE message
   */
  private async handleImageMessage(
    phoneNumber: string, 
    message: any,
    addEvent: (event: string) => void
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const events: TimingEvent[] = [];
    
    const localAddEvent = (eventName: string) => {
      events.push({
        event: eventName,
        timestamp: Date.now(),
        elapsed: Date.now() - startTime
      });
      addEvent(eventName);
    };

    localAddEvent("IMAGE message handler started");
    logger.info("Received IMAGE message", { phoneNumber });
    
    // TODO: Add image processing logic
    localAddEvent("Preparing response");
    const responseText = "Thank you for sharing the image!";
    
    localAddEvent("Sending message");
    const result = await this.aisensyService.sendTextMessage(phoneNumber, responseText);
    localAddEvent("Message sent");
    
    if (result.success) {
      logger.info("Image response sent successfully", { phoneNumber });
    } else {
      logger.error("Failed to send image response", { phoneNumber, error: result.error });
    }

    const totalTime = Date.now() - startTime;
    return {
      totalTime,
      events,
      breakdown: this.formatTimingBreakdown(events, totalTime)
    };
  }

  /**
   * Handle AUDIO message
   */
  private async handleAudioMessage(
    phoneNumber: string, 
    message: any,
    addEvent: (event: string) => void
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const events: TimingEvent[] = [];
    
    const localAddEvent = (eventName: string) => {
      events.push({
        event: eventName,
        timestamp: Date.now(),
        elapsed: Date.now() - startTime
      });
      addEvent(eventName);
    };

    localAddEvent("AUDIO message handler started");
    logger.info("Received AUDIO message", { phoneNumber });
    
    // TODO: Add audio processing logic
    localAddEvent("Preparing response");
    const responseText = "Thank you for the audio message!";
    
    localAddEvent("Sending message");
    const result = await this.aisensyService.sendTextMessage(phoneNumber, responseText);
    localAddEvent("Message sent");
    
    if (result.success) {
      logger.info("Audio response sent successfully", { phoneNumber });
    } else {
      logger.error("Failed to send audio response", { phoneNumber, error: result.error });
    }

    const totalTime = Date.now() - startTime;
    return {
      totalTime,
      events,
      breakdown: this.formatTimingBreakdown(events, totalTime)
    };
  }

  /**
   * Handle QUICK_REPLY message
   */
  private async handleQuickReplyMessage(
    phoneNumber: string, 
    message: any,
    addEvent: (event: string) => void
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const events: TimingEvent[] = [];
    
    const localAddEvent = (eventName: string) => {
      events.push({
        event: eventName,
        timestamp: Date.now(),
        elapsed: Date.now() - startTime
      });
      addEvent(eventName);
    };

    localAddEvent("QUICK_REPLY message handler started");
    const callbackPayload = message.message_content?.callbackPayload;
    
    logger.info("Received QUICK_REPLY message", { phoneNumber, callbackPayload });
    
    // TODO: Add quick reply processing logic
    localAddEvent("Preparing response");
    const responseText = "Thank you for your response!";
    
    localAddEvent("Sending message");
    const result = await this.aisensyService.sendTextMessage(phoneNumber, responseText);
    localAddEvent("Message sent");
    
    if (result.success) {
      logger.info("Quick reply response sent successfully", { phoneNumber });
    } else {
      logger.error("Failed to send quick reply response", { phoneNumber, error: result.error });
    }

    const totalTime = Date.now() - startTime;
    return {
      totalTime,
      events,
      breakdown: this.formatTimingBreakdown(events, totalTime)
    };
  }

  /**
   * Send default response for unhandled message types
   */
  private async sendDefaultResponse(
    phoneNumber: string, 
    messageType: string,
    addEvent: (event: string) => void
  ): Promise<ProcessingResult> {
    const startTime = Date.now();
    const events: TimingEvent[] = [];
    
    const localAddEvent = (eventName: string) => {
      events.push({
        event: eventName,
        timestamp: Date.now(),
        elapsed: Date.now() - startTime
      });
      addEvent(eventName);
    };

    localAddEvent("Default handler started");
    const responseText = `Thank you for your ${messageType} message. We're processing it!`;
    
    localAddEvent("Sending message");
    const result = await this.aisensyService.sendTextMessage(phoneNumber, responseText);
    localAddEvent("Message sent");
    
    if (result.success) {
      logger.info("Default response sent", { phoneNumber, messageType });
    } else {
      logger.error("Failed to send default response", { phoneNumber, error: result.error });
    }

    const totalTime = Date.now() - startTime;
    return {
      totalTime,
      events,
      breakdown: this.formatTimingBreakdown(events, totalTime)
    };
  }

  /**
   * Format timing breakdown for display
   */
  private formatTimingBreakdown(events: TimingEvent[], totalTime: number): string {
    if (events.length === 0) {
      return "No timing data available";
    }

    let breakdown = "📊 Breakdown:\n";
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (!event) continue;
      
      const prevEvent = i > 0 ? events[i - 1] : null;
      const timeSincePrev = prevEvent ? event.elapsed - prevEvent.elapsed : event.elapsed;
      
      breakdown += `  • ${event.event}: +${timeSincePrev}ms (${event.elapsed}ms total)\n`;
    }
    
    breakdown += `\n⏱️ Total: ${totalTime}ms`;
    
    return breakdown;
  }
}

export const webhookHandlerService = new WebhookHandlerService();

