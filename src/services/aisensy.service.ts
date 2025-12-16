/**
 * AI Sensy Service
 * High-level service for sending WhatsApp messages
 * Handles business logic and message formatting
 */

import type { PhoneNumber, QuickReplyButton, MessageDetailsResponse } from "../types/aisensy.types.js";
import { AISensyMessageAPI } from "../api/aisensy/message.api.js";
import type { AISensyResponse } from "../types/aisensy.types.js";

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
    return this.a5N7ZI3Dh2HIKgqMPBr0mFvfF7fqReFpi.sendAudio(phoneNumber, audioUrl);
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
}

