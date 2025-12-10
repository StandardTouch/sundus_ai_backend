/**
 * Default Message Handler
 * Handles unhandled message types
 */

import { BaseMessageHandler } from "./base-message.handler.js";
import { TimingTracker } from "../../../utils/timing.util.js";
import type { ProcessingResult } from "../../../utils/timing.util.js";
import { logger } from "../../../utils/logger.js";

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
    
    tracker.addEvent("Default handler started");
    logger.info("Unhandled message type", { messageType, phoneNumber });
    
    const responseText = `Thank you for your ${messageType} message. We're processing it!`;
    
    const result = await this.sendMessage(phoneNumber, responseText, tracker);
    
    if (result.success) {
      logger.info("Default response sent", { phoneNumber, messageType });
    } else {
      logger.error("Failed to send default response", { phoneNumber, error: result.error });
    }

    return tracker.getResult();
  }
}

