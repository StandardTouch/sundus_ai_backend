/**
 * Default Message Handler
 * Handles unhandled message types
 */

import { BaseMessageHandler } from "./base-message.handler.js";
import { TimingTracker } from "../../../utils/timing.util.js";
import type { ProcessingResult } from "../../../utils/timing.util.js";
import { logger } from "../../../utils/logger.js";

import { detectLanguage } from "../../../utils/language.util.js";

/**
 * Default Message Handler
 */
export class DefaultMessageHandler extends BaseMessageHandler {
  /**
   * Handle default/unhandled message
   */
  async handle(
    phoneNumber: string,
    message: any,
    tracker: TimingTracker
  ): Promise<ProcessingResult> {
    const messageType = message.message_type || "unknown";
    const text = message.message_content?.text || message.message_content?.caption || "";
    const isAr = text ? detectLanguage(text) === "ar" : false;

    tracker.addEvent("Default handler started");
    logger.info("Unhandled message type", { messageType, phoneNumber });

    // If instant acknowledgment is enabled in webhook handler, skip duplicate message here
    const ENABLE_INSTANT_ACKNOWLEDGMENT = process.env.ENABLE_INSTANT_ACKNOWLEDGMENT !== "false";
    if (ENABLE_INSTANT_ACKNOWLEDGMENT) {
      logger.info("Instant acknowledgment already sent by service, skipping duplicate default message", { phoneNumber });
      return tracker.getResult();
    }

    const responseText = isAr
      ? "أهلاً بك في مجموعة الحميضي! كيف يمكنني مساعدتك اليوم؟"
      : "Hello! Welcome to AlHomaidhi Group. How can I assist you today?";

    const result = await this.sendMessage(phoneNumber, responseText, tracker);

    if (result.success) {
      logger.info("Default response sent", { phoneNumber, messageType });
    } else {
      logger.error("Failed to send default response", { phoneNumber, error: result.error });
    }

    return tracker.getResult();
  }
}

