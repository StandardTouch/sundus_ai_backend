/**
 * Image Message Handler
 * Handles IMAGE type messages
 */

import { BaseMessageHandler } from "./base-message.handler.js";
import { TimingTracker } from "../../../utils/timing.util.js";
import type { ProcessingResult } from "../../../utils/timing.util.js";
import { logger } from "../../../utils/logger.js";

/**
 * Image Message Handler
 */
export class ImageMessageHandler extends BaseMessageHandler {
  /**
   * Handle IMAGE message
   */
  async handle(
    phoneNumber: string,
    message: any,
    tracker: TimingTracker
  ): Promise<ProcessingResult> {
    tracker.addEvent("IMAGE message handler started");
    logger.info("Received IMAGE message", { phoneNumber });
    
    // TODO: Add image processing logic
    tracker.addEvent("Preparing response");
    const responseText = "Thank you for sharing the image!";
    
    const result = await this.sendMessage(phoneNumber, responseText, tracker);
    
    if (result.success) {
      logger.info("Image response sent successfully", { phoneNumber });
    } else {
      logger.error("Failed to send image response", { phoneNumber, error: result.error });
    }

    return tracker.getResult();
  }
}

