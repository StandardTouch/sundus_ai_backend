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
import { allTools } from "../../../agent/tools/index.js";
import { executeTool } from "../../../agent/executor/index.js";
import type { ChatMessage } from "../../openai.service.js";

/**
 * System prompt for the AI assistant
 */
const SYSTEM_PROMPT = `You are Sundus AI, a professional and courteous AI assistant providing customer support for Alhomaidhi Group.

ROLE AND IDENTITY:
- Your name is Sundus AI. Always introduce yourself by name when greeting users for the first time or when appropriate.
- You are a knowledgeable customer support representative specializing in product inquiries, order tracking, and general customer assistance.

COMMUNICATION GUIDELINES:
- Maintain a professional, friendly, and respectful tone in all interactions.
- Communicate clearly and concisely, using grammatically correct language.
- Structure responses logically: provide a brief acknowledgment, deliver the main information, and offer additional assistance when relevant.
- Be empathetic and patient when addressing customer concerns.

CAPABILITIES:
- Assist with product searches, specifications, and availability inquiries.
- Help customers track their orders and provide order status updates.
- Answer general questions about Alhomaidhi Group's services and policies.
- Provide accurate and up-to-date information based on available data.

LIMITATIONS AND BOUNDARIES:
- If you are uncertain about an answer or lack specific information, acknowledge this honestly and suggest alternative ways to help.
- Do not speculate or provide information that may be inaccurate.
- If a request is outside your capabilities, politely explain the limitation and offer to connect the customer with appropriate resources.

RESPONSE FORMAT:
- Keep responses concise and focused on the customer's inquiry.
- Use clear, professional language appropriate for customer service.
- When appropriate, structure information in a readable format (e.g., bullet points for lists).

Remember: You represent Alhomaidhi Group, and your goal is to provide exceptional customer service while maintaining professionalism and accuracy.`;

/**
 * Text Message Handler
 */
export class TextMessageHandler extends BaseMessageHandler {
  /**
   * Process message with tools support
   * Handles tool calling flow: AI decides to call tools → execute tools → get final response
   */
  private async processWithTools(
    userMessage: string,
    conversationHistory: ChatMessage[],
    tracker: TimingTracker
  ): Promise<string | null> {
    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...conversationHistory,
      { role: "user", content: userMessage }
    ];

    // First call: AI decides if it needs to call tools
    tracker.addEvent("Initial OpenAI call with tools");
    const firstResult = await openaiService.chatCompletion(messages, {
      temperature: 0.7,
      max_tokens: 500,
      tools: allTools,
      tool_choice: "auto"
    });

    if (!firstResult.success) {
      logger.error("OpenAI call failed", { error: firstResult.error });
      return null;
    }

    // If AI wants to call tools
    if (firstResult.tool_calls && firstResult.tool_calls.length > 0) {
      tracker.addEvent(`Executing ${firstResult.tool_calls.length} tool call(s)`);
      
      // Execute all tool calls in parallel
      const toolResults = await Promise.all(
        firstResult.tool_calls.map(toolCall => executeTool(toolCall))
      );

      // Add assistant message with tool calls to conversation
      const assistantMessageWithTools: ChatMessage = {
        role: "assistant",
        content: firstResult.message || ""
      };

      // Add tool results to conversation
      const toolMessages: ChatMessage[] = toolResults.map(result => ({
        role: "tool",
        content: result.content,
        tool_call_id: result.tool_call_id,
        name: result.name
      }));

      // Second call: AI formats final response with tool results
      tracker.addEvent("Getting final response from OpenAI with tool results");
      const finalMessages: ChatMessage[] = [
        ...messages,
        assistantMessageWithTools,
        ...toolMessages
      ];

      const finalResult = await openaiService.chatCompletion(finalMessages, {
        temperature: 0.7,
        max_tokens: 500
      });

      if (!finalResult.success || !finalResult.message) {
        logger.error("OpenAI final response failed", { error: finalResult.error });
        return null;
      }

      return finalResult.message;
    }

    // No tool calls - return direct response
    return firstResult.message || null;
  }

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

    // Process with OpenAI (use sanitized input) - with tools support
    tracker.addEvent("Processing with OpenAI");
    const aiResponse = await this.processWithTools(
      sanitizedText,
      conversationHistory,
      tracker
    );
    tracker.addEvent(`OpenAI processing completed`);

    if (!aiResponse) {
      logger.error("OpenAI processing failed", { phoneNumber });
      
      // Fallback response
      const fallbackResponse = "I apologize, but I'm having trouble processing your message right now. Please try again in a moment.";
      await this.sendMessage(phoneNumber, fallbackResponse, tracker);
      
      return tracker.getResult();
    }
    tracker.addEvent("AI response generated");

    // Calculate response time
    const totalResponseTime = tracker.getTotalTime();
    const openaiEvents = tracker.getEvents().filter(e => e.event.includes("OpenAI"));
    const openaiTime = openaiEvents.reduce((sum, e) => sum + e.elapsed, 0);
    const processingTime = totalResponseTime - openaiTime;

    // Store assistant message with response time and accuracy data
    tracker.addEvent("Storing assistant message");
    const assistantMessageId = `assistant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const metadata: ConversationMessage['metadata'] = {
      response_time_ms: Math.round(totalResponseTime),
      openai_time_ms: Math.round(openaiTime),
      processing_time_ms: Math.round(processingTime)
    };
    
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
        messageId: result.message_id
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

