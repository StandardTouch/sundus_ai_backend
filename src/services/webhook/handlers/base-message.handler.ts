/**
 * Base Message Handler
 * Base class for all message type handlers
 */

import { AISensyService } from "../../aisensy.service.js";
import { TimingTracker } from "../../../utils/timing.util.js";
import type { ProcessingResult } from "../../../utils/timing.util.js";
import { logger } from "../../../utils/logger.js";

/**
 * Base message handler
 */
export abstract class BaseMessageHandler {
  protected aisensyService: AISensyService;

  constructor() {
    this.aisensyService = new AISensyService();
  }

  /**
   * Handle the message
   */
  abstract handle(
    phoneNumber: string,
    message: any,
    tracker: TimingTracker
  ): Promise<ProcessingResult>;

  /**
   * Send a text message and track timing
   */
  protected async sendMessage(
    phoneNumber: string,
    text: string,
    tracker: TimingTracker
  ): Promise<{ success: boolean; message_id?: string; error?: string }> {
    tracker.addEvent("Sending message via AI Sensy");
    const sendStartTime = process.hrtime.bigint();
    const result = await this.aisensyService.sendTextMessage(phoneNumber, text);
    const sendTime = Number(process.hrtime.bigint() - sendStartTime) / 1000000;
    tracker.addEvent(`Message sent (took ${Math.round(sendTime * 100) / 100}ms)`);
    return result;
  }
}

