/**
 * Quick Reply Message Handler
 * Handles QUICK_REPLY type messages
 */

import { BaseMessageHandler } from "./base-message.handler.js";
import { TimingTracker } from "../../../utils/timing.util.js";
import type { ProcessingResult } from "../../../utils/timing.util.js";
import { logger } from "../../../utils/logger.js";
import { conversationMessageRepository } from "../../../repositories/conversation-message.repository.js";
import { feedbackRepository } from "../../../repositories/feedback.repository.js";

/**
 * Feedback template name
 */
const FEEDBACK_TEMPLATE_NAME = "message_feedback_english";

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
    const messageId = message.id || message.messageId;
    const repliedToMessageId = message.context?.id; // This is the message ID being replied to
    
    logger.info("Received QUICK_REPLY message", { 
      phoneNumber, 
      callbackPayload,
      messageId,
      repliedToMessageId
    });

    // Check if this is a reply to the feedback template
    tracker.addEvent("Checking if feedback template reply");
    let isFeedbackReply = false;

    if (repliedToMessageId) {
      // Check if the replied-to message is the feedback template
      const repliedToMessage = await conversationMessageRepository.findByMessageId(repliedToMessageId);
      
      if (repliedToMessage && 
          repliedToMessage.metadata?.template_name === FEEDBACK_TEMPLATE_NAME) {
        isFeedbackReply = true;
        tracker.addEvent("Confirmed feedback template reply");
        
        // Determine feedback value from callback payload
        // Common patterns: "Yes", "No", "Excellent", "Good", etc.
        const feedbackValue = this.parseFeedbackValue(callbackPayload);
        
        // Store feedback
        tracker.addEvent("Storing feedback");
        try {
          await feedbackRepository.create({
            phone_number: phoneNumber,
            message_id: messageId,
            feedback: feedbackValue
          });
          
          logger.info("Feedback stored successfully", {
            phoneNumber,
            messageId,
            feedback: feedbackValue
          });
        } catch (error) {
          logger.error("Failed to store feedback", {
            phoneNumber,
            messageId,
            error
          });
        }
      }
    }

    // If it's feedback, send thank you message (don't process with OpenAI)
    if (isFeedbackReply) {
      tracker.addEvent("Sending feedback acknowledgment");
      const responseText = "Thank you! Happy to help";
      
      const result = await this.sendMessage(phoneNumber, responseText, tracker);
      
      if (result.success) {
        logger.info("Feedback acknowledgment sent successfully", { phoneNumber });
      } else {
        logger.error("Failed to send feedback acknowledgment", { 
          phoneNumber, 
          error: result.error 
        });
      }

      return tracker.getResult();
    }

    // If not feedback, process normally with OpenAI (or handle other quick replies)
    tracker.addEvent("Processing as regular quick reply");
    const responseText = "Thank you for your response!";
    
    const result = await this.sendMessage(phoneNumber, responseText, tracker);
    
    if (result.success) {
      logger.info("Quick reply response sent successfully", { phoneNumber });
    } else {
      logger.error("Failed to send quick reply response", { phoneNumber, error: result.error });
    }

    return tracker.getResult();
  }

  /**
   * Parse feedback value from callback payload
   * Maps common positive/negative responses to 'yes' or 'no'
   */
  private parseFeedbackValue(callbackPayload: string | undefined): 'yes' | 'no' {
    if (!callbackPayload) return 'yes'; // Default to positive
    
    const payload = callbackPayload.toLowerCase().trim();
    
    // Positive feedback indicators
    const positivePatterns = [
      'yes', 'y', 'excellent', 'good', 'great', 'awesome', 
      'perfect', 'helpful', 'thanks', 'thank you'
    ];
    
    // Negative feedback indicators
    const negativePatterns = [
      'no', 'n', 'bad', 'poor', 'not helpful', 'unhelpful'
    ];
    
    if (positivePatterns.some(pattern => payload.includes(pattern))) {
      return 'yes';
    }
    
    if (negativePatterns.some(pattern => payload.includes(pattern))) {
      return 'no';
    }
    
    // Default to positive if unclear
    return 'yes';
  }
}

