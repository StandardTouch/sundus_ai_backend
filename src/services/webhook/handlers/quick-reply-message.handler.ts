/**
 * Quick Reply Message Handler
 * Handles QUICK_REPLY type messages
 */

import { BaseMessageHandler } from "./base-message.handler.js";
import { TimingTracker } from "../../../utils/timing.util.js";
import type { ProcessingResult } from "../../../utils/timing.util.js";
import { logger } from "../../../utils/logger.js";

/**
 * Quick Reply Message Handler
 */
export class QuickReplyMessageHandler extends BaseMessageHandler {
  /**
   * Handle QUICK_REPLY message
   */
  async handle(
    phoneNumber: string,
    message: any,
    tracker: TimingTracker
  ): Promise<ProcessingResult> {
    tracker.addEvent("QUICK_REPLY message handler started");
    const callbackPayload = message.message_content?.callbackPayload;
    
    logger.info("Received QUICK_REPLY message", { phoneNumber, callbackPayload });
    
    // TODO: Add quick reply processing logic
    tracker.addEvent("Preparing response");
    const responseText = "Thank you for your response!";
    
    const result = await this.sendMessage(phoneNumber, responseText, tracker);
    
    if (result.success) {
      logger.info("Quick reply response sent successfully", { phoneNumber });
    } else {
      logger.error("Failed to send quick reply response", { phoneNumber, error: result.error });
    }

    return tracker.getResult();
  }
}

