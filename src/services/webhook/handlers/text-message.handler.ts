/**
 * Text Message Handler
 * Handles TEXT type messages with OpenAI processing
 */

import { BaseMessageHandler } from "./base-message.handler.js";
import { openaiService } from "../../openai.service.js";
import { conversationService } from "../../conversation.service.js";
import { conversationMessageRepository } from "../../../repositories/conversation-message.repository.js";
import { TimingTracker } from "../../../utils/timing.util.js";
import type { ProcessingResult } from "../../../utils/timing.util.js";
import type { ConversationMessage } from "../../../models/conversation-message.model.js";
import { logger } from "../../../utils/logger.js";
import { processGuardrails } from "../../../guardrails/index.js";

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

    // Apply guardrails
    tracker.addEvent("Applying guardrails");
    const guardrailResult = await processGuardrails(text);
    
    if (!guardrailResult.passed) {
      logger.warn("Guardrails blocked message", {
        phoneNumber,
        reason: guardrailResult.error,
        injectionDetected: guardrailResult.injectionDetected,
        contentFlagged: guardrailResult.contentFlagged
      });
      
      // Send safe response
      const safeResponse = guardrailResult.error || "I can't process that request. How else can I help you?";
      await this.sendMessage(phoneNumber, safeResponse, tracker);
      
      return tracker.getResult();
    }

    // Use sanitized input if available
    const sanitizedText = guardrailResult.sanitizedInput || text;
    
    if (guardrailResult.warnings && guardrailResult.warnings.length > 0) {
      logger.info("Guardrail warnings", {
        phoneNumber,
        warnings: guardrailResult.warnings
      });
    }

    tracker.addEvent("Guardrails passed");

    // Extract message ID and reply context
    const messageId = message.id || message.messageId;
    const repliedToMessageId = message.context?.id || message.replied_to_message_id;

    // Store user message (store original, but process sanitized)
    tracker.addEvent("Storing user message");
    const storedUserMessage = await conversationService.storeUserMessage(
      phoneNumber,
      messageId,
      sanitizedText,
      repliedToMessageId
    );

    // Get conversation history
    tracker.addEvent("Building conversation history");
    const conversationHistory = await conversationService.getConversationHistory(
      phoneNumber,
      sanitizedText,
      repliedToMessageId
    );

    // Process with OpenAI (use sanitized input)
    tracker.addEvent("Processing with OpenAI");
    const openaiResult = await openaiService.generateResponse(
      sanitizedText,
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

    // Calculate response time
    const totalResponseTime = tracker.getTotalTime();
    const openaiTime = tracker.getEvents().find(e => e.event.includes("OpenAI"))?.elapsed || 0;
    const processingTime = totalResponseTime - openaiTime;

    // Store assistant message with response time and accuracy data
    tracker.addEvent("Storing assistant message");
    const assistantMessageId = `assistant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metadata: ConversationMessage['metadata'] = {
      response_time_ms: Math.round(totalResponseTime),
      openai_time_ms: Math.round(openaiTime),
      processing_time_ms: Math.round(processingTime)
    };
    if (openaiResult.model) {
      metadata.model = openaiResult.model;
    }
    if (openaiResult.usage?.total_tokens) {
      metadata.tokens_used = openaiResult.usage.total_tokens;
    }
    
    // Get conversation ID from stored user message
    const conversationId = storedUserMessage?.conversation_id;
    
    await conversationService.storeAssistantMessage(
      phoneNumber,
      assistantMessageId,
      aiResponse,
      metadata,
      conversationId
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

