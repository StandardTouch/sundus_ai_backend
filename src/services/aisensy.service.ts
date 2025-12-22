/**
 * AI Sensy Service
 * High-level service for sending WhatsApp messages
 * Handles business logic and message formatting
 */

import type { PhoneNumber, QuickReplyButton, MessageDetailsResponse } from "../types/aisensy.types.js";
import { AISensyMessageAPI } from "../api/aisensy/message.api.js";
import type { AISensyResponse } from "../types/aisensy.types.js";
import { logger } from "../utils/logger.js";

/**
 * AI Sensy Service
 * Provides high-level methods for sending WhatsApp messages
 */
export class AISensyService {
  private api: AISensyMessageAPI;

  constructor() {
    this.api = new AISensyMessageAPI();
  }

  /**
   * Send a text message
   */
  async sendTextMessage(
    phoneNumber: PhoneNumber,
    message: string
  ): Promise<AISensyResponse> {
    return this.api.sendText(phoneNumber, message);
  }

  /**
   * Send a message with feedback prompt
   * Automatically adds "Was this helpful? Yes/No" quick reply buttons
   */
  async sendMessageWithFeedback(
    phoneNumber: PhoneNumber,
    message: string
  ): Promise<AISensyResponse> {
    // Send main message
    const mainMessageResult = await this.sendTextMessage(phoneNumber, message);
    
    if (!mainMessageResult.success) {
      return mainMessageResult;
    }

    // Send feedback prompt
    const feedbackButtons: QuickReplyButton[] = [
      { text: "Yes", payload: "feedback_yes" },
      { text: "No", payload: "feedback_no" },
    ];

    const feedbackResult = await this.api.sendInteractive(
      phoneNumber,
      "Was this helpful?",
      feedbackButtons.map(btn => ({ id: btn.payload, title: btn.text }))
    );

    return feedbackResult;
  }

  /**
   * Send an image message
   */
  async sendImageMessage(
    phoneNumber: PhoneNumber,
    imageUrl: string,
    caption?: string
  ): Promise<AISensyResponse> {
    return this.api.sendImage(phoneNumber, imageUrl, caption);
  }

  /**
   * Send an audio message
   */
  async sendAudioMessage(
    phoneNumber: PhoneNumber,
    audioUrl: string
  ): Promise<AISensyResponse> {
    return this.api.sendAudio(phoneNumber, audioUrl);
  }

  /**
   * Send a document message
   */
  async sendDocumentMessage(
    phoneNumber: PhoneNumber,
    documentUrl: string,
    filename?: string,
    caption?: string
  ): Promise<AISensyResponse> {
    return this.api.sendDocument(phoneNumber, documentUrl, filename, caption);
  }

  /**
   * Send multiple images (for product galleries)
   */
  async sendImageGallery(
    phoneNumber: PhoneNumber,
    images: Array<{ url: string; caption?: string }>
  ): Promise<AISensyResponse[]> {
    const results: AISensyResponse[] = [];
    
    for (const image of images) {
      const result = await this.sendImageMessage(
        phoneNumber,
        image.url,
        image.caption
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Send quick reply message (interactive buttons)
   */
  async sendQuickReplyMessage(
    phoneNumber: PhoneNumber,
    text: string,
    buttons: QuickReplyButton[]
  ): Promise<AISensyResponse> {
    return this.api.sendInteractive(
      phoneNumber,
      text,
      buttons.map(btn => ({ id: btn.payload, title: btn.text }))
    );
  }

  /**
   * Send OTP message
   * Used during order tracking authentication
   */
  async sendOTPMessage(
    phoneNumber: PhoneNumber,
    otpCode: string
  ): Promise<AISensyResponse> {
    const message = `Your OTP for order tracking is: ${otpCode}\n\nThis code will expire in 5 minutes.`;
    return this.sendTextMessage(phoneNumber, message);
  }

  /**
   * Send product template message (mixed template)
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
    phoneNumber: PhoneNumber,
    templateName: string,
    languageCode: "en" | "ar",
    productImageUrl: string,
    productName: string,
    sku: string,
    price: string,
    productSlug: string
  ): Promise<AISensyResponse> {
    return this.api.sendProductTemplate(
      phoneNumber,
      templateName,
      languageCode,
      productImageUrl,
      productName,
      sku,
      price,
      productSlug
    );
  }

  /**
   * Get message details by message ID
   * Useful for checking message status (sent, delivered, read)
   */
  async getMessageDetails(messageId: string): Promise<MessageDetailsResponse> {
    return this.api.getMessageDetails(messageId);
  }

  /**
   * Check if message was read
   */
  async isMessageRead(messageId: string): Promise<boolean> {
    const details = await this.getMessageDetails(messageId);
    return details.success && details.message?.status === "READ";
  }

  /**
   * Get message status
   */
  async getMessageStatus(messageId: string): Promise<"SENT" | "DELIVERED" | "READ" | "FAILED" | null> {
    const details = await this.getMessageDetails(messageId);
    if (!details.success || !details.message) {
      return null;
    }
    return details.message.status;
  }

  /**
   * Send template message (HSM - Highly Structured Messages)
   * Used for pre-approved WhatsApp Business templates
   * 
   * @param phoneNumber - Recipient phone number
   * @param templateName - Template name (must be approved in WhatsApp Business)
   * @param languageCode - Language code (e.g., "en_us", "ar", "en")
   * @param components - Template components with parameters
   * @returns AI Sensy API response
   * 
   * @example
   * // Send template with body parameters
   * await sendTemplateMessage(
   *   "917089379345",
   *   "sample_shipping_confirmation",
   *   "en_us",
   *   [
   *     {
   *       type: "body",
   *       parameters: [
   *         { type: "text", text: "6-7" }
   *       ]
   *     }
   *   ]
   * );
   */
  async sendTemplateMessage(
    phoneNumber: PhoneNumber,
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
    return this.api.sendTemplate(phoneNumber, templateName, languageCode, components);
  }

  /**
   * Send order tracking template
   * 
   * @param phoneNumber - Recipient phone number
   * @param templateName - Template name ("order_en_new" or "order_ar_new")
   * @param languageCode - Language code ("en" or "ar")
   * @param customerName - Customer name ({{1}})
   * @param orderDescription - Order description ({{2}})
   * @param orderId - Order ID ({{3}})
   * @param orderStatus - Order status ({{4}})
   * @param imageUrl - Header image URL
   */
  async sendOrderTemplate(
    phoneNumber: PhoneNumber,
    templateName: string,
    languageCode: string,
    customerName: string,
    orderDescription: string,
    orderId: string,
    orderStatus: string,
    imageUrl: string
  ): Promise<AISensyResponse> {
    // Match exact structure from test script (test-order-template.ts)
    const components = [
      {
        type: "header",
        parameters: [
          {
            type: "image",
            image: {
              link: imageUrl,
            },
          },
        ],
      },
      {
        type: "body",
        parameters: [
          {
            type: "text",
            text: customerName, // {{1}}
          },
          {
            type: "text",
            text: orderDescription, // {{2}}
          },
          {
            type: "text",
            text: orderId, // {{3}}
          },
          {
            type: "text",
            text: orderStatus, // {{4}}
          },
        ],
      },
    ];

    // Log payload for debugging (similar to product template)
    logger.info("Sending order template", {
      phoneNumber,
      templateName,
      languageCode,
      imageUrl,
      customerName,
      orderDescription,
      orderId,
      orderStatus,
      components: JSON.stringify(components, null, 2)
    });

    return this.sendTemplateMessage(
      phoneNumber,
      templateName,
      languageCode,
      components
    );
  }
}

