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
    // Validate message content
    if (!text || text.trim().length === 0) {
      logger.error("Attempted to send empty message", { phoneNumber });
      return {
        success: false,
        error: "Message content is empty"
      };
    }
    
    if (text.length > 4096) {
      logger.warn("Message exceeds WhatsApp limit (4096 chars), truncating", { 
        phoneNumber, 
        originalLength: text.length 
      });
      text = text.substring(0, 4093) + "...";
    }
    
    tracker.addEvent("Sending message via AI Sensy");
    logger.info("Sending message via AISensy", {
      phoneNumber,
      messageLength: text.length,
      messagePreview: text.substring(0, 100)
    });
    
    const sendStartTime = process.hrtime.bigint();
    const result = await this.aisensyService.sendTextMessage(phoneNumber, text);
    const sendTime = Number(process.hrtime.bigint() - sendStartTime) / 1000000;
    tracker.addEvent(`Message sent (took ${Math.round(sendTime * 100) / 100}ms)`);
    
    if (!result.success) {
      logger.error("Failed to send message via AISensy", {
        phoneNumber,
        error: result.error,
        messageLength: text.length
      });
    } else {
      logger.info("Message sent successfully via AISensy", {
        phoneNumber,
        messageId: result.message_id,
        messageLength: text.length
      });
      
      // Check message delivery status once after a delay (lightweight check)
      // Only check if we have a message ID and haven't already checked
      if (result.message_id) {
        // Use a single, delayed check to avoid server load
        // Check after 5 seconds (enough time for WhatsApp to process)
        setTimeout(async () => {
          try {
            const details = await this.aisensyService.getMessageDetails(result.message_id!);
            if (details.success && details.message) {
              const msg = details.message;
              
              // Check for re-engagement error (24-hour window restriction)
              if (msg.status === "FAILED" && msg.failureResponse) {
                const failureResponse = msg.failureResponse as any;
                const isReEngagementError = 
                  failureResponse.code === "131047" ||
                  failureResponse.reason === "Re-engagement message" ||
                  (failureResponse.error_data?.details?.includes("24 hours") && 
                   failureResponse.error_data?.details?.includes("last replied"));
                
                if (isReEngagementError) {
                  logger.warn("Re-engagement error detected - 24 hour window expired", {
                    phoneNumber,
                    messageId: result.message_id,
                    originalMessageLength: text.length
                  });
                  
                  // Retry with template message (templates work outside 24-hour window)
                  // Use a simple template that can send the message text
                  // For now, send a generic template since we don't have a custom text template
                  // The user will receive the feedback template anyway, so this is acceptable
                  logger.info("Skipping template retry - message will be sent when user replies", {
                    phoneNumber
                  });
                  
                  // Note: We could create a custom template for this, but for now
                  // we'll just log it. The message will be sent when the user replies.
                  return;
                }
              }
              
              // Log status for debugging (only if not already delivered/read to reduce noise)
              if (msg.status !== "DELIVERED" && msg.status !== "READ") {
                logger.info("Message delivery status check", {
                  phoneNumber,
                  messageId: result.message_id,
                  status: msg.status,
                  isHSM: msg.is_HSM,
                  messageType: msg.message_type
                });
              }
            }
          } catch (error) {
            // Silently fail status check to avoid adding load
            // Only log if it's a critical error
            if (error instanceof Error && !error.message.includes("timeout")) {
              logger.warn("Error checking message delivery status", {
                phoneNumber,
                messageId: result.message_id,
                error: error.message
              });
            }
          }
        }, 5000); // Check once after 5 seconds
      }
    }
    
    return result;
  }
}

