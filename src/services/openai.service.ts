/**
 * OpenAI Service
 * Handles OpenAI API interactions for chat completion
 */

import { getOpenAIClient, openaiConfig } from "../config/openai.config.js";
import { logger } from "../utils/logger.js";
import type OpenAI from "openai";

/**
 * Chat message format for OpenAI
 */
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
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
}

/**
 * OpenAI chat completion result
 */
export interface ChatCompletionResult {
  success: boolean;
  message?: string;
  model?: string;
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

      const response = await this.client.chat.completions.create({
        model,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens,
        top_p: options?.top_p,
        frequency_penalty: options?.frequency_penalty,
        presence_penalty: options?.presence_penalty,
      });

      const assistantMessage = response.choices[0]?.message?.content;

      if (!assistantMessage) {
        logger.warn("OpenAI returned empty response", { response });
        return {
          success: false,
          error: "Empty response from OpenAI"
        };
      }

      logger.info("OpenAI chat completion successful", {
        model: response.model,
        usage: response.usage,
        messageLength: assistantMessage.length
      });

      return {
        success: true,
        message: assistantMessage,
        model: response.model,
        usage: response.usage ? {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: response.usage.completion_tokens,
          total_tokens: response.usage.total_tokens
        } : undefined
      };
    } catch (error: any) {
      logger.error("OpenAI chat completion error", { error, messages, options });
      
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
}

export const openaiService = new OpenAIService();

