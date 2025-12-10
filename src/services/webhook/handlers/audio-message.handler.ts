/**
 * Audio Message Handler
 * Handles AUDIO type messages
 */

import { BaseMessageHandler } from "./base-message.handler.js";
import { TimingTracker } from "../../../utils/timing.util.js";
import type { ProcessingResult } from "../../../utils/timing.util.js";
import { logger } from "../../../utils/logger.js";

/**
 * Audio Message Handler
 */
export class AudioMessageHandler extends BaseMessageHandler {
  /**
   * Handle AUDIO message
   */
  async handle(
    phoneNumber: string,
    message: any,
    tracker: TimingTracker
  ): Promise<ProcessingResult> {
    tracker.addEvent("AUDIO message handler started");
    logger.info("Received AUDIO message", { phoneNumber });
    
    // TODO: Add audio processing logic
    tracker.addEvent("Preparing response");
    const responseText = "Thank you for the audio message!";
    
    const result = await this.sendMessage(phoneNumber, responseText, tracker);
    
    if (result.success) {
      logger.info("Audio response sent successfully", { phoneNumber });
    } else {
      logger.error("Failed to send audio response", { phoneNumber, error: result.error });
    }

    return tracker.getResult();
  }
}

