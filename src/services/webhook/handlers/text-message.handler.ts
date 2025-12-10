/**
 * Text Message Handler
 * Handles TEXT type messages with OpenAI processing
 */

import { BaseMessageHandler } from "./base-message.handler.js";
import { openaiService } from "../../openai.service.js";
import { conversationService } from "../../conversation.service.js";
import { TimingTracker } from "../../../utils/timing.util.js";
import type { ProcessingResult } from "../../../utils/timing.util.js";
import type { ConversationMessage } from "../../../models/conversation-message.model.js";
import { logger } from "../../../utils/logger.js";

/**
 * System prompt for the AI assistant
 */
const SYSTEM_PROMPT = `You are a helpful customer support assistant for Alhomaidhi Group. 
You help customers with product inquiries, order tracking, and general questions.
Be friendly, professional, and concise in your responses.
If you don't know something, politely say so and offer to help in another way.`;

/**
 * Text Message Handler
 */
export class TextMessageHandler extends BaseMessageHandler {
  /**
   * Handle TEXT message
   */
  async handle(
    phoneNumber: string,
    message: any,
    tracker: TimingTracker
  ): Promise<ProcessingResult> {
    tracker.addEvent("TEXT message handler started");
    
    const text = message.message_content?.text;
    
    if (!text) {
      logger.warn("TEXT message received without text content", { phoneNumber, message });
      return tracker.getResult();
    }

    tracker.addEvent("Text content extracted");
    logger.info("Received TEXT message", { phoneNumber, text });

    // Extract message ID and reply context
    const messageId = message.id || message.messageId;
    const repliedToMessageId = message.context?.id || message.replied_to_message_id;

    // Store user message
    tracker.addEvent("Storing user message");
    await conversationService.storeUserMessage(
      phoneNumber,
      messageId,
      text,
      repliedToMessageId
    );

    // Get conversation history
    tracker.addEvent("Building conversation history");
    const conversationHistory = await conversationService.getConversationHistory(
      phoneNumber,
      text,
      repliedToMessageId
    );

    // Process with OpenAI
    tracker.addEvent("Processing with OpenAI");
    const openaiResult = await openaiService.generateResponse(
      text,
      SYSTEM_PROMPT,
      conversationHistory,
      {
        temperature: 0.7,
        max_tokens: 500
      }
    );
    tracker.addEvent(`OpenAI processing completed`);

    if (!openaiResult.success || !openaiResult.message) {
      logger.error("OpenAI processing failed", {
        phoneNumber,
        error: openaiResult.error
      });
      
      // Fallback response
      const fallbackResponse = "I apologize, but I'm having trouble processing your message right now. Please try again in a moment.";
      await this.sendMessage(phoneNumber, fallbackResponse, tracker);
      
      return tracker.getResult();
    }

    const aiResponse = openaiResult.message;
    tracker.addEvent("AI response generated");

    // Store assistant message
    tracker.addEvent("Storing assistant message");
    const assistantMessageId = `assistant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metadata: ConversationMessage['metadata'] = {};
    if (openaiResult.model) {
      metadata.model = openaiResult.model;
    }
    if (openaiResult.usage?.total_tokens) {
      metadata.tokens_used = openaiResult.usage.total_tokens;
    }
    await conversationService.storeAssistantMessage(
      phoneNumber,
      assistantMessageId,
      aiResponse,
      Object.keys(metadata).length > 0 ? metadata : undefined
    );

    // Send response via WhatsApp
    const result = await this.sendMessage(phoneNumber, aiResponse, tracker);
    
    if (result.success) {
      logger.info("AI response sent successfully", {
        phoneNumber,
        messageId: result.message_id,
        tokensUsed: openaiResult.usage?.total_tokens
      });
    } else {
      logger.error("Failed to send AI response", {
        phoneNumber,
        error: result.error,
        messageId: result.message_id
      });
    }

    return tracker.getResult();
  }
}

