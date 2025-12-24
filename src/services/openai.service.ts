/**
 * OpenAI Service
 * Handles OpenAI API interactions for chat completion
 */

import { getOpenAIClient, openaiConfig } from "../config/openai.config.js";
import { logger } from "../utils/logger.js";
import { openaiCreditService } from "./openai-credit.service.js";
import type OpenAI from "openai";

/**
 * Chat message format for OpenAI
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  name?: string;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

/**
 * OpenAI chat completion options
 */
export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[];
  tool_choice?: "none" | "auto" | OpenAI.Chat.Completions.ChatCompletionToolChoiceOption;
}

/**
 * OpenAI chat completion result
 */
export interface ChatCompletionResult {
  success: boolean;
  message?: string;
  model?: string;
  tool_calls?: OpenAI.Chat.Completions.ChatCompletionMessageToolCall[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: string;
}

/**
 * OpenAI Service
 * Provides methods for interacting with OpenAI API
 */
export class OpenAIService {
  private client: OpenAI;

  constructor() {
    this.client = getOpenAIClient();
  }

  /**
   * Generate chat completion using OpenAI
   */
  async chatCompletion(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResult> {
    try {
      const model = options?.model || openaiConfig.defaultModel;
      
      logger.info("Calling OpenAI chat completion", {
        model,
        messageCount: messages.length,
        options
      });

      const requestParams: any = {
        model,
        messages: messages.map(msg => {
          const baseMessage: any = {
            role: msg.role,
            content: msg.content ?? null
          };
          
          // Include tool_call_id for tool messages
          if (msg.role === "tool" && msg.tool_call_id) {
            baseMessage.tool_call_id = msg.tool_call_id;
            if (msg.name) {
              baseMessage.name = msg.name;
            }
          }
          
          // Include tool_calls for assistant messages (required for tool message flow)
          if (msg.role === "assistant" && msg.tool_calls) {
            baseMessage.tool_calls = msg.tool_calls.map(tc => ({
              id: tc.id,
              type: tc.type,
              function: {
                name: tc.function.name,
                arguments: tc.function.arguments
              }
            }));
          }
          
          return baseMessage;
        }),
        temperature: options?.temperature ?? 0.7,
      };

      // Conditionally include optional parameters only if defined
      if (options?.max_tokens !== undefined) {
        requestParams.max_tokens = options.max_tokens;
      }
      if (options?.top_p !== undefined) {
        requestParams.top_p = options.top_p;
      }
      if (options?.frequency_penalty !== undefined) {
        requestParams.frequency_penalty = options.frequency_penalty;
      }
      if (options?.presence_penalty !== undefined) {
        requestParams.presence_penalty = options.presence_penalty;
      }
      if (options?.tools !== undefined) {
        requestParams.tools = options.tools;
      }
      if (options?.tool_choice !== undefined) {
        requestParams.tool_choice = options.tool_choice;
      }

      const response = await this.client.chat.completions.create(requestParams);

      const assistantMessage = response.choices[0]?.message;
      const content = assistantMessage?.content;
      const toolCalls = assistantMessage?.tool_calls;

      // If there are tool calls, return them instead of content
      if (toolCalls && toolCalls.length > 0) {
        logger.info("OpenAI returned tool calls", {
          model: response.model,
          toolCallCount: toolCalls.length,
          toolNames: toolCalls.map(tc => tc.function.name)
        });

        const result: ChatCompletionResult = {
          success: true,
          model: response.model,
          tool_calls: toolCalls
        };

        if (response.usage) {
          result.usage = {
            prompt_tokens: response.usage.prompt_tokens,
            completion_tokens: response.usage.completion_tokens,
            total_tokens: response.usage.total_tokens
          };
        }

        return result;
      }

      // If no tool calls, return content
      if (!content) {
        logger.warn("OpenAI returned empty response", { response });
        return {
          success: false,
          error: "Empty response from OpenAI"
        };
      }

      logger.info("OpenAI chat completion successful", {
        model: response.model,
        usage: response.usage,
        messageLength: content.length
      });

      const result: ChatCompletionResult = {
        success: true,
        message: content,
        model: response.model
      };

      if (response.usage) {
        result.usage = {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens
        };
      }

      // Mark credits as available if call succeeds (in case they were previously marked unavailable)
      await openaiCreditService.markCreditsAvailable().catch(() => {
        // Silently fail - don't block the response
      });

      return result;
    } catch (error: any) {
      logger.error("OpenAI chat completion error", { error, messages, options });
      
      // Check if this is a credit/quota error
      const isCreditError = this.isCreditError(error);
      
      if (isCreditError) {
        // Mark credits as unavailable in background
        openaiCreditService.markCreditsUnavailable({
          code: error.code,
          type: error.type,
          message: error.message
        }).catch(() => {
          // Silently fail - don't block error response
        });
        
        logger.error("⚠️ OpenAI credits exhausted or billing issue detected", {
          errorCode: error.code,
          errorType: error.type,
          errorMessage: error.message
        });
      }
      
      return {
        success: false,
        error: error.message || "OpenAI API error"
      };
    }
  }

  /**
   * Generate a simple text response
   * Convenience method for basic chat interactions
   */
  async generateResponse(
    userMessage: string,
    systemPrompt?: string,
    conversationHistory?: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResult> {
    const messages: ChatMessage[] = [];

    // Add system prompt if provided
    if (systemPrompt) {
      messages.push({
        role: "system",
        content: systemPrompt
      });
    }

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current user message
    messages.push({
      role: "user",
      content: userMessage
    });

    return this.chatCompletion(messages, options);
  }

  /**
   * Check if an OpenAI error indicates credit/quota issues
   */
  private isCreditError(error: any): boolean {
    if (!error) return false;

    const errorCode = error.code || error.status || "";
    const errorType = error.type || "";
    const errorMessage = (error.message || "").toLowerCase();
    const errorBody = (error.body || {});

    // Check for insufficient quota error
    if (
      errorCode === "insufficient_quota" ||
      errorType === "insufficient_quota" ||
      errorMessage.includes("insufficient_quota") ||
      errorBody?.error?.code === "insufficient_quota"
    ) {
      return true;
    }

    // Check for billing errors
    if (
      errorCode === "billing_not_active" ||
      errorType === "billing_not_active" ||
      errorMessage.includes("billing_not_active") ||
      errorMessage.includes("billing") && errorMessage.includes("active") ||
      errorBody?.error?.code === "billing_not_active"
    ) {
      return true;
    }

    // Check for account-related errors that might indicate credit issues
    if (
      errorMessage.includes("account") && errorMessage.includes("disabled") ||
      errorMessage.includes("account") && errorMessage.includes("suspended") ||
      errorMessage.includes("payment") && errorMessage.includes("required") ||
      errorMessage.includes("credit") && errorMessage.includes("limit") ||
      errorMessage.includes("quota") && errorMessage.includes("exceeded")
    ) {
      return true;
    }

    // Check for 429 rate limit errors that might be due to quota
    if (errorCode === 429 || error.status === 429) {
      // Only treat as credit error if message suggests quota issue
      if (
        errorMessage.includes("quota") ||
        errorMessage.includes("billing") ||
        errorMessage.includes("credit")
      ) {
        return true;
      }
    }

    return false;
  }
}

export const openaiService = new OpenAIService();

