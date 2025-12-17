/**
 * AI Sensy Message API Client
 * Low-level HTTP client for sending messages via AI Sensy
 */

import axios from "axios";
import type { AxiosInstance } from "axios";
import type {
  MessageRequest,
  TemplateMessageRequest,
  AISensyResponse,
  AISensyAPIResponse,
  MessageDetails,
  MessageDetailsResponse,
} from "../../types/aisensy.types.js";
import { aisensyConfig, validateAISensyConfig } from "../../config/aisensy.config.js";
import { logger } from "../../utils/logger.js";

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
        "X-AiSensy-Project-API-Pwd": aisensyConfig.apiKey,
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
      
      // For template messages, don't include recipient_type (not in API docs)
      // For other messages, include recipient_type
      let requestPayload: any;
      if (message.type === "template") {
        // Template messages don't have recipient_type
        requestPayload = { ...message };
      } else {
        requestPayload = {
          ...message,
          recipient_type: (message as any).recipient_type || "individual",
        };
      }
      
      // Log request for debugging (especially for templates)
      if (message.type === "template") {
        logger.info("Sending template message", { payload: requestPayload });
      }
      
      const response = await this.client.post<AISensyAPIResponse>(
        endpoint,
        requestPayload
      );

      const apiResponse = response.data;

      // Log full API response for debugging
      if (message.type === "template") {
        logger.info("Template message API response", { response: apiResponse });
        
        // Check for errors in response (WhatsApp might return errors even with 200 status)
        const responseData = apiResponse as any;
        if (responseData.errors && Array.isArray(responseData.errors) && responseData.errors.length > 0) {
          logger.error("WhatsApp returned errors in template response", { errors: responseData.errors });
          return {
            success: false,
            error: responseData.errors.map((e: any) => e.message || e.title || JSON.stringify(e)).join(", "),
            status: response.status,
          };
        }
      }

      return {
        success: true,
        ...(apiResponse.messages?.[0]?.id && { message_id: apiResponse.messages[0].id }),
        ...(apiResponse.contacts?.[0]?.wa_id && { wa_id: apiResponse.contacts[0].wa_id }),
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
        ...(caption && { caption }),
      },
    });
  }

  /**
   * Send audio message
   */
  async sendAudio(
    phoneNumber: string,
    audioUrl: string
  ): Promise<AISensyResponse> {
    return this.sendMessage({
      to: phoneNumber,
      type: "audio",
      recipient_type: "individual",
      audio: {
        link: audioUrl,
      },
    });
  }

  /**
   * Send document message
   */
  async sendDocument(
    phoneNumber: string,
    documentUrl: string,
    filename?: string,
    caption?: string
  ): Promise<AISensyResponse> {
    return this.sendMessage({
      to: phoneNumber,
      type: "document",
      recipient_type: "individual",
      document: {
        link: documentUrl,
        ...(filename && { filename }),
        ...(caption && { caption }),
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
   * Send template message (HSM - Highly Structured Messages)
   * Used for pre-approved WhatsApp Business templates
   * 
   * @param phoneNumber - Recipient phone number
   * @param templateName - Template name (must be approved in WhatsApp Business)
   * @param languageCode - Language code (e.g., "en_us", "ar", "en")
   * @param components - Template components (header, body, button parameters)
   * @returns AI Sensy API response
   */
  async sendTemplate(
    phoneNumber: string,
    templateName: string,
    languageCode: string = "en_us",
    components?: Array<{
      type: "header" | "body" | "button";
      parameters?: Array<{
        type: "text" | "currency" | "date_time" | "image" | "document" | "video";
        text?: string;
        currency?: {
          fallback_value: string;
          code: string;
          amount_1000: number;
        };
        date_time?: {
          fallback_value: string;
        };
        image?: {
          link?: string;
          id?: string;
        };
        document?: {
          link?: string;
          id?: string;
          filename?: string;
        };
        video?: {
          link?: string;
          id?: string;
        };
      }>;
      sub_type?: "url" | "quick_reply" | "text";
      index?: number;
    }>
  ): Promise<AISensyResponse> {
    const templateMessage: TemplateMessageRequest = {
      to: phoneNumber,
      type: "template",
      template: {
        language: {
          policy: "deterministic",
          code: languageCode,
        },
        name: templateName,
        components: components || [],
      },
    };
    return this.sendMessage(templateMessage);
  }

  /**
   * Send mixed template message for products
   * Template with header image, body parameters (product name, SKU, price) and URL button with slug
   * 
   * @param phoneNumber - Recipient phone number
   * @param templateName - Template name (English or Arabic template name)
   * @param languageCode - Language code ("en" for English, "ar" for Arabic)
   * @param productImageUrl - Product image URL for header
   * @param productName - Product name (first body parameter)
   * @param sku - Product SKU (second body parameter)
   * @param price - Product price (third body parameter, e.g., "450 SAR")
   * @param productSlug - Product slug for URL button
   * @returns AI Sensy API response
   */
  async sendProductTemplate(
    phoneNumber: string,
    templateName: string,
    languageCode: string, // Accept any string to allow "en_us", "en_US", "en", "ar", etc.
    productImageUrl: string,
    productName: string,
    sku: string,
    price: string,
    productSlug: string
  ): Promise<AISensyResponse> {
    // Match exact structure from AISensy API documentation
    // Note: recipient_type is NOT included for template messages
    const messagePayload: TemplateMessageRequest = {
      to: phoneNumber,
      type: "template",
      template: {
        language: {
          policy: "deterministic",
          code: languageCode,
        },
        name: templateName,
        components: [
          {
            type: "header",
            parameters: [
              {
                type: "image",
                image: {
                  link: productImageUrl,
                },
              },
            ],
          },
          {
            type: "body",
            parameters: [
              {
                type: "text",
                text: productName,
              },
              {
                type: "text",
                text: sku,
              },
              {
                type: "text",
                text: price,
              },
            ],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [
              {
                type: "text",
                text: productSlug,
              },
            ],
          },
        ],
      },
    };

    // Log payload for debugging
    logger.info("Sending product template", {
      phoneNumber,
      templateName,
      languageCode,
      payload: messagePayload
    });

    return this.sendMessage(messagePayload);
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

