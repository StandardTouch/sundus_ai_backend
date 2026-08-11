/**
 * Audio Message Handler
 * Handles AUDIO type messages
 */

import { BaseMessageHandler } from "./base-message.handler.js";
import { TimingTracker } from "../../../utils/timing.util.js";
import type { ProcessingResult } from "../../../utils/timing.util.js";
import { logger } from "../../../utils/logger.js";

import { detectLanguage } from "../../../utils/language.util.js";
import { conversationService } from "../../conversation.service.js";

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
    
    // Check recent user messages to infer language preference
    const recent = await conversationService.getRecentMessages(phoneNumber, 1).catch(() => []);
    const lastUserText = recent.find((m: any) => m.role === "user")?.content || "";
    const isAr = lastUserText ? detectLanguage(lastUserText) === "ar" : false;

    // TODO: Add audio processing logic
    tracker.addEvent("Preparing response");
    const responseText = isAr
      ? "شكراً لك على الرسالة الصوتية!"
      : "Thank you for the audio message!";
    
    const result = await this.sendMessage(phoneNumber, responseText, tracker);
    
    if (result.success) {
      logger.info("Audio response sent successfully", { phoneNumber });
    } else {
      logger.error("Failed to send audio response", { phoneNumber, error: result.error });
    }

    return tracker.getResult();
  }
}

