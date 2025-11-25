import type {
  BaseWebhookPayload,
  Message,
  MessageType,
  WebhookConfig,
  MessageContent,
  TextMessageContent,
  QuickReplyMessageContent,
  MediaMessageContent,
  LocationMessageContent,
  ContactMessageContent,
} from "./types.js";

/**
 * Smart webhook generator that analyzes message type and generates appropriate payloads
 */
export class WebhookGenerator {
  private defaultProjectId = "655b383d2c1f7c51b62a7338";
  private defaultPhoneNumber = "917676079163";
  private defaultContactId = "65a7adb1aea3c70bc8b7a0d7";
  private defaultUserName = "Yaseen";
  private defaultCountryCode = "91";

  /**
   * Generates a webhook payload based on the configuration
   */
  generateWebhook(config: WebhookConfig): BaseWebhookPayload {
    const messageType = config.message_type;
    const messageContent = this.generateMessageContent(config, messageType);
    const message = this.generateMessage(config, messageType, messageContent);

    return {
      id: this.generateId(),
      created_at: new Date().toISOString(),
      topic: "message.sender.user",
      project_id: config.project_id || this.defaultProjectId,
      delivery_attempt: "1",
      data: {
        message,
      },
    };
  }

  /**
   * Generates message content based on message type
   */
  private generateMessageContent(
    config: WebhookConfig,
    messageType: MessageType
  ): MessageContent {
    switch (messageType) {
      case "TEXT":
        return {
          text: config.text || "Hello, this is a test message",
        } as TextMessageContent;

      case "QUICK_REPLY":
        return {
          text: config.text || "Excellent",
          callbackPayload: config.callbackPayload || config.text || "Excellent",
        } as QuickReplyMessageContent;

      case "IMAGE":
        return {
          url:
            config.url ||
            `https://d2npdtryso7wvr.cloudfront.net/image/${config.project_id || this.defaultProjectId}/test_image.jpg`,
          urlExpiry: "",
          mimeType: config.mimeType || "image/jpeg",
        } as MediaMessageContent;

      case "FILE":
        return {
          url:
            config.url ||
            `https://d2npdtryso7wvr.cloudfront.net/document/${config.project_id || this.defaultProjectId}/test_file.pdf`,
          urlExpiry: "",
          mimeType: config.mimeType || "application/pdf",
        } as MediaMessageContent;

      case "AUDIO":
        return {
          url:
            config.url ||
            `https://d2npdtryso7wvr.cloudfront.net/audio/${config.project_id || this.defaultProjectId}/test_audio.mp3`,
          urlExpiry: "",
          mimeType: config.mimeType || "audio/mpeg",
        } as MediaMessageContent;

      case "STICKER":
        return {
          url:
            config.url ||
            `https://d2npdtryso7wvr.cloudfront.net/sticker/${config.project_id || this.defaultProjectId}/test_sticker.webp`,
          urlExpiry: "",
          mimeType: config.mimeType || "image/webp",
        } as MediaMessageContent;

      case "LOCATION":
        return {
          longitude: config.longitude || 76.829864501953,
          latitude: config.latitude || 17.317714691162,
          address: config.address || "",
          name: config.locationName || "",
          url: config.url || "",
        } as LocationMessageContent;

      case "CONTACT":
        return {
          contacts: [
            {
              name: {
                first_name: config.contactName?.first_name || "John",
                last_name: config.contactName?.last_name || "Doe",
                formatted_name:
                  config.contactName?.formatted_name ||
                  `${config.contactName?.first_name || "John"} ${config.contactName?.last_name || "Doe"}`,
              },
              phones: [
                {
                  phone: config.contactPhone?.phone || "+91 98765 43210",
                  wa_id: config.contactPhone?.wa_id || "919876543210",
                  type: config.contactPhone?.type || "CELL",
                },
              ],
            },
          ],
        } as ContactMessageContent;

      default:
        return { text: "Unknown message type" } as TextMessageContent;
    }
  }

  /**
   * Generates the complete message object
   */
  private generateMessage(
    config: WebhookConfig,
    messageType: MessageType,
    messageContent: MessageContent
  ): Message {
    const now = Date.now();
    const messageId = this.generateWhatsAppMessageId();

    // Determine if this should have context (for QUICK_REPLY or if context is provided)
    const shouldHaveContext =
      messageType === "QUICK_REPLY" ||
      (messageType === "TEXT" && config.context) ||
      config.context;

    // Determine if this should have campaign (for replied messages)
    const shouldHaveCampaign =
      (messageType === "TEXT" && config.campaign) || config.campaign;

    return {
      type: "message",
      id: this.generateId(),
      meta_data: [],
      project_id: config.project_id || this.defaultProjectId,
      phone_number: config.phone_number || this.defaultPhoneNumber,
      contact_id: config.contact_id || this.defaultContactId,
      campaign: shouldHaveCampaign ? config.campaign || null : null,
      sender: "USER",
      message_content: messageContent,
      message_type: messageType,
      status: "DELIVERED",
      is_HSM: false,
      chatbot_response: null,
      agent_id: null,
      sent_at: now,
      delivered_at: now,
      read_at: null,
      failureResponse: {},
      userName: config.userName || this.defaultUserName,
      countryCode: config.countryCode || this.defaultCountryCode,
      submitted_message_id: "",
      message_price: 0,
      deductionType: null,
      mau_details: null,
      whatsapp_conversation_details: null,
      context: shouldHaveContext
        ? config.context || {
            from: "966920009339",
            id: this.generateWhatsAppMessageId(),
          }
        : null,
      messageId: messageId,
    };
  }

  /**
   * Generates a random ID (similar to MongoDB ObjectId format)
   */
  private generateId(): string {
    const chars = "0123456789abcdef";
    let id = "";
    for (let i = 0; i < 24; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  /**
   * Generates a WhatsApp message ID (wamid format)
   */
  private generateWhatsAppMessageId(): string {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let id = "wamid.HBgMOTE3Njc2MDc5MTYzFQIAEhgW";
    for (let i = 0; i < 32; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id + "=";
  }

  /**
   * Analyzes the request and determines what fields are expected based on message type
   */
  analyzeExpectedFields(messageType: MessageType): {
    required: string[];
    optional: string[];
    description: string;
  } {
    const fieldMap: Record<
      MessageType,
      { required: string[]; optional: string[]; description: string }
    > = {
      TEXT: {
        required: ["text"],
        optional: ["phone_number", "userName", "context", "campaign"],
        description: "Simple text message. Can include context/campaign for replies.",
      },
      QUICK_REPLY: {
        required: ["text", "callbackPayload"],
        optional: ["phone_number", "userName", "context"],
        description:
          "Quick reply button response. Requires text and callbackPayload. Context links to original message.",
      },
      IMAGE: {
        required: [],
        optional: ["url", "mimeType", "phone_number", "userName"],
        description:
          "Image message. URL and mimeType are auto-generated if not provided.",
      },
      FILE: {
        required: [],
        optional: ["url", "mimeType", "phone_number", "userName"],
        description:
          "File/document message. URL and mimeType are auto-generated if not provided.",
      },
      AUDIO: {
        required: [],
        optional: ["url", "mimeType", "phone_number", "userName"],
        description:
          "Audio message. URL and mimeType are auto-generated if not provided.",
      },
      STICKER: {
        required: [],
        optional: ["url", "mimeType", "phone_number", "userName"],
        description:
          "Sticker message. URL and mimeType are auto-generated if not provided.",
      },
      LOCATION: {
        required: [],
        optional: [
          "longitude",
          "latitude",
          "address",
          "locationName",
          "url",
          "phone_number",
          "userName",
        ],
        description:
          "Location message. Longitude and latitude are auto-generated if not provided.",
      },
      CONTACT: {
        required: [],
        optional: [
          "contactName",
          "contactPhone",
          "phone_number",
          "userName",
        ],
        description:
          "Contact sharing message. Contact details are auto-generated if not provided.",
      },
    };

    return fieldMap[messageType] || {
      required: [],
      optional: [],
      description: "Unknown message type",
    };
  }
}

