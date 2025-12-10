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

export class WebhookHandlerService {
  private aisensyService: AISensyService;

  constructor() {
    this.aisensyService = new AISensyService();
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(payload: WebhookPayload): Promise<void> {
    try {
      const message = payload.data?.message;
      
      if (!message) {
        logger.warn("Webhook received without message data", { payload });
        return;
      }

      const phoneNumber = message.phone_number;
      const messageType = message.message_type;

      if (!phoneNumber) {
        logger.warn("Webhook received without phone number", { payload });
        return;
      }

      logger.info("Processing webhook", {
        phoneNumber,
        messageType,
        messageId: message.id
      });

      // Handle different message types
      switch (messageType) {
        case "TEXT":
          await this.handleTextMessage(phoneNumber, message);
          break;
        
        case "IMAGE":
          await this.handleImageMessage(phoneNumber, message);
          break;
        
        case "AUDIO":
          await this.handleAudioMessage(phoneNumber, message);
          break;
        
        case "QUICK_REPLY":
          await this.handleQuickReplyMessage(phoneNumber, message);
          break;
        
        default:
          logger.info("Unhandled message type", { messageType, phoneNumber });
          // Send a default response for unhandled types
          await this.sendDefaultResponse(phoneNumber, messageType);
      }
    } catch (error) {
      logger.error("Error processing webhook", { error, payload });
      throw error;
    }
  }

  /**
   * Handle TEXT message
   */
  private async handleTextMessage(phoneNumber: string, message: any): Promise<void> {
    const text = message.message_content?.text;
    
    if (!text) {
      logger.warn("TEXT message received without text content", { phoneNumber, message });
      return;
    }

    logger.info("Received TEXT message", { phoneNumber, text });

    // TODO: Add AI processing logic here
    // For now, send an echo response
    const responseText = `You said: ${text}`;
    
    const result = await this.aisensyService.sendTextMessage(phoneNumber, responseText);
    
    if (result.success) {
      logger.info("Response sent successfully", {
        phoneNumber,
        messageId: result.message_id
      });
    } else {
      logger.error("Failed to send response", {
        phoneNumber,
        error: result.error
      });
    }
  }

  /**
   * Handle IMAGE message
   */
  private async handleImageMessage(phoneNumber: string, message: any): Promise<void> {
    logger.info("Received IMAGE message", { phoneNumber });
    
    // TODO: Add image processing logic
    const responseText = "Thank you for sharing the image!";
    
    const result = await this.aisensyService.sendTextMessage(phoneNumber, responseText);
    
    if (result.success) {
      logger.info("Image response sent successfully", { phoneNumber });
    } else {
      logger.error("Failed to send image response", { phoneNumber, error: result.error });
    }
  }

  /**
   * Handle AUDIO message
   */
  private async handleAudioMessage(phoneNumber: string, message: any): Promise<void> {
    logger.info("Received AUDIO message", { phoneNumber });
    
    // TODO: Add audio processing logic
    const responseText = "Thank you for the audio message!";
    
    const result = await this.aisensyService.sendTextMessage(phoneNumber, responseText);
    
    if (result.success) {
      logger.info("Audio response sent successfully", { phoneNumber });
    } else {
      logger.error("Failed to send audio response", { phoneNumber, error: result.error });
    }
  }

  /**
   * Handle QUICK_REPLY message
   */
  private async handleQuickReplyMessage(phoneNumber: string, message: any): Promise<void> {
    const callbackPayload = message.message_content?.callbackPayload;
    
    logger.info("Received QUICK_REPLY message", { phoneNumber, callbackPayload });
    
    // TODO: Add quick reply processing logic
    const responseText = "Thank you for your response!";
    
    const result = await this.aisensyService.sendTextMessage(phoneNumber, responseText);
    
    if (result.success) {
      logger.info("Quick reply response sent successfully", { phoneNumber });
    } else {
      logger.error("Failed to send quick reply response", { phoneNumber, error: result.error });
    }
  }

  /**
   * Send default response for unhandled message types
   */
  private async sendDefaultResponse(phoneNumber: string, messageType: string): Promise<void> {
    const responseText = `Thank you for your ${messageType} message. We're processing it!`;
    
    const result = await this.aisensyService.sendTextMessage(phoneNumber, responseText);
    
    if (result.success) {
      logger.info("Default response sent", { phoneNumber, messageType });
    } else {
      logger.error("Failed to send default response", { phoneNumber, error: result.error });
    }
  }
}

export const webhookHandlerService = new WebhookHandlerService();

