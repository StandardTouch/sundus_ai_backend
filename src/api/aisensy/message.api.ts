/**
 * AI Sensy Message API Client
 * Low-level HTTP client for sending messages via AI Sensy
 */

import axios, { AxiosInstance } from "axios";
import type {
  MessageRequest,
  AISensyResponse,
  AISensyAPIResponse,
  MessageDetails,
  MessageDetailsResponse,
} from "../../types/aisensy.types.js";
import { aisensyConfig, validateAISensyConfig } from "../../config/aisensy.config.js";

/**
 * AI Sensy Message API Client
 */
export class AISensyMessageAPI {
  private client: AxiosInstance;
  private projectId: string;

  constructor() {
    validateAISensyConfig();
    this.projectId = aisensyConfig.projectId;
    
    this.client = axios.create({
      baseURL: aisensyConfig.apiBaseUrl,
      timeout: aisensyConfig.timeout,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-AiSensy-Partner-API-Key": aisensyConfig.apiKey,
      },
    });
  }

  /**
   * Get API endpoint URL
   */
  private getEndpoint(): string {
    return `/project-apis/v1/project/${this.projectId}/messages`;
  }

  /**
   * Send a message via AI Sensy API
   * 
   * @param message - Message request object (AI Sensy API format)
   * @returns Normalized AI Sensy API response
   */
  async sendMessage(message: MessageRequest): Promise<AISensyResponse> {
    try {
      const endpoint = this.getEndpoint();
      
      const response = await this.client.post<AISensyAPIResponse>(
        endpoint,
        {
          ...message,
          recipient_type: message.recipient_type || "individual",
        }
      );

      const apiResponse = response.data;

      return {
        success: true,
        message_id: apiResponse.messages?.[0]?.id,
        wa_id: apiResponse.contacts?.[0]?.wa_id,
        status: response.status,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.error || error.message || "Unknown error",
        status: error.response?.status,
      };
    }
  }

  /**
   * Send text message
   */
  async sendText(
    phoneNumber: string,
    text: string
  ): Promise<AISensyResponse> {
    return this.sendMessage({
      to: phoneNumber,
      type: "text",
      recipient_type: "individual",
      text: {
        body: text,
      },
    });
  }

  /**
   * Send image message
   */
  async sendImage(
    phoneNumber: string,
    imageUrl: string,
    caption?: string
  ): Promise<AISensyResponse> {
    return this.sendMessage({
      to: phoneNumber,
      type: "image",
      recipient_type: "individual",
      image: {
        link: imageUrl,
        caption,
      },
    });
  }

  /**
   * Send interactive message (quick reply buttons)
   */
  async sendInteractive(
    phoneNumber: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>
  ): Promise<AISensyResponse> {
    return this.sendMessage({
      to: phoneNumber,
      type: "interactive",
      recipient_type: "individual",
      interactive: {
        type: "button",
        body: {
          text: bodyText,
        },
        action: {
          buttons: buttons.map(button => ({
            type: "reply" as const,
            reply: {
              id: button.id,
              title: button.title,
            },
          })),
        },
      },
    });
  }

  /**
   * Get message details by message ID
   * 
   * @param messageId - Message ID (from sendMessage response)
   * @returns Message details response
   */
  async getMessageDetails(messageId: string): Promise<MessageDetailsResponse> {
    try {
      const endpoint = `/project-apis/v1/project/${this.projectId}/messages/${messageId}`;
      
      const response = await this.client.get<MessageDetails>(endpoint);

      return {
        success: true,
        message: response.data,
        status: response.status,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.response?.data?.error || error.message || "Unknown error",
        status: error.response?.status,
      };
    }
  }
}

