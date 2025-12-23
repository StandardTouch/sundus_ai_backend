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
import { supportSettingsService } from "../../support-settings.service.js";
import { detectLanguage } from "../../../utils/language.util.js";

/**
 * Feedback template names
 */
const FEEDBACK_TEMPLATES = {
  english: "message_feedback_english",
  arabic: "message_feedback_arabic"
};

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
    let repliedToMessage: any = null;
    let templateName: string | undefined = undefined;
    let feedbackValue: 'yes' | 'no' = 'yes'; // Default to positive

    if (repliedToMessageId) {
      // Check if the replied-to message is the feedback template
      repliedToMessage = await conversationMessageRepository.findByMessageId(repliedToMessageId);
      
      templateName = repliedToMessage?.metadata?.template_name;
      const isFeedbackTemplate = repliedToMessage?.metadata?.is_feedback_template === true;
      
      if (repliedToMessage && isFeedbackTemplate && 
          (templateName === FEEDBACK_TEMPLATES.english || templateName === FEEDBACK_TEMPLATES.arabic)) {
        isFeedbackReply = true;
        tracker.addEvent("Confirmed feedback template reply");
        
        // Determine feedback value from callback payload
        // Handles both English and Arabic responses
        feedbackValue = this.parseFeedbackValue(callbackPayload, templateName);
        
        // Store feedback
        tracker.addEvent("Storing feedback");
        try {
          // Get the AI response message ID that was being rated
          // The repliedToMessageId is the template message, we need to find the AI response before it
          const recentMessages = await conversationMessageRepository.getRecentMessages(phoneNumber, 10);
          const aiResponseMessage = recentMessages
            .filter(msg => 
              msg.role === 'assistant' && 
              !msg.metadata?.is_feedback_template &&
              msg.timestamp < repliedToMessage.timestamp
            )
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
          
          const templateLanguage = repliedToMessage.metadata?.language || 
            (templateName === FEEDBACK_TEMPLATES.arabic ? 'ar' : 'en');
          
          const feedbackData: any = {
            phone_number: phoneNumber,
            message_id: messageId,
            feedback: feedbackValue,
            template_name: templateName,
            language: templateLanguage as 'en' | 'ar'
          };
          
          if (aiResponseMessage?.message_id) {
            feedbackData.original_message_id = aiResponseMessage.message_id;
          }
          
          // Link feedback to conversation
          if (aiResponseMessage?.conversation_id) {
            feedbackData.conversation_id = aiResponseMessage.conversation_id;
          }
          
          await feedbackRepository.create(feedbackData);
          
          // Update accuracy score in the original message metadata
          if (aiResponseMessage) {
            const accuracyScore = feedbackValue === 'yes' ? 1.0 : 0.0; // 1.0 = helpful, 0.0 = not helpful
            await conversationMessageRepository.updateMessageMetadata(
              aiResponseMessage.message_id,
              {
                was_helpful: feedbackValue === 'yes',
                accuracy_score: accuracyScore
              }
            );
          }
          
          logger.info("Feedback stored successfully", {
            phoneNumber,
            messageId,
            feedback: feedbackValue,
            template: templateName,
            language: templateLanguage,
            originalMessageId: aiResponseMessage?.message_id
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

    // If it's feedback, send appropriate response (don't process with OpenAI)
    if (isFeedbackReply) {
      tracker.addEvent("Sending feedback response");
      
      // Get the template language to send appropriate response
      const templateLanguage = repliedToMessage?.metadata?.language || 
        (templateName === FEEDBACK_TEMPLATES.arabic ? 'ar' : 'en');
      
      // If user selected "Talk to Human" (feedbackValue === 'no'), send support phone number
      // Otherwise, send thank you message
      if (feedbackValue === 'no') {
        tracker.addEvent("User requested to talk to human - sending support phone number");
        try {
          const supportPhoneNumber = await supportSettingsService.getSupportPhoneNumber();
          
          const supportMessage = templateLanguage === 'ar'
            ? `فريق الدعم لدينا متاح لمساعدتك.\n\nيرجى الاتصال بنا على ${supportPhoneNumber} للتحدث مع أحد ممثلي الدعم.`
            : `Our support team is available to assist you.\n\nPlease call us at ${supportPhoneNumber} to speak with a representative.`;
          
          const supportResult = await this.sendMessage(phoneNumber, supportMessage, tracker);
          
          if (supportResult.success) {
            logger.info("Support phone number message sent", {
              userPhoneNumber: phoneNumber,
              supportPhoneNumber,
              language: templateLanguage
            });
          } else {
            logger.error("Failed to send support phone number message", {
              userPhoneNumber: phoneNumber,
              error: supportResult.error
            });
          }
        } catch (error: any) {
          logger.error("Error sending support phone number message", {
            error: error.message,
            userPhoneNumber: phoneNumber
          });
          // Fallback to thank you message if support message fails
          const responseText = templateLanguage === 'ar' 
            ? "شكراً لك! سعيد بمساعدتك"
            : "Thank you! Happy to help";
          await this.sendMessage(phoneNumber, responseText, tracker);
        }
      } else {
        // Positive feedback - send thank you message
        const responseText = templateLanguage === 'ar' 
          ? "شكراً لك! سعيد بمساعدتك"
          : "Thank you! Happy to help";
        
        const result = await this.sendMessage(phoneNumber, responseText, tracker);
        
        if (result.success) {
          logger.info("Feedback acknowledgment sent successfully", { 
            phoneNumber,
            language: templateLanguage
          });
        } else {
          logger.error("Failed to send feedback acknowledgment", { 
            phoneNumber, 
            error: result.error 
          });
        }
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
   * Handles both English and Arabic responses
   */
  private parseFeedbackValue(callbackPayload: string | undefined, templateName?: string): 'yes' | 'no' {
    if (!callbackPayload) return 'yes'; // Default to positive
    
    const payload = callbackPayload.trim();
    const isArabicTemplate = templateName === FEEDBACK_TEMPLATES.arabic;
    
    if (isArabicTemplate) {
      // Arabic feedback options: "نعم" (Yes) or "التحدث إلى موظف" (Talk to employee/human)
      // "نعم" = positive feedback (yes)
      // "التحدث إلى موظف" = negative feedback (no - wants to talk to human)
      if (payload.includes('نعم')) {
        return 'yes';
      }
      if (payload.includes('التحدث') || payload.includes('موظف')) {
        return 'no';
      }
    } else {
      // English feedback options: "Yes" or "Talk To Human"
      const lowerPayload = payload.toLowerCase();
      
      // Positive feedback indicators
      const positivePatterns = [
        'yes', 'y', 'excellent', 'good', 'great', 'awesome', 
        'perfect', 'helpful', 'thanks', 'thank you'
      ];
      
      // Negative feedback indicators (including "Talk To Human")
      const negativePatterns = [
        'no', 'n', 'bad', 'poor', 'not helpful', 'unhelpful',
        'talk to human', 'talk to', 'human', 'agent', 'representative'
      ];
      
      if (positivePatterns.some(pattern => lowerPayload.includes(pattern))) {
        return 'yes';
      }
      
      if (negativePatterns.some(pattern => lowerPayload.includes(pattern))) {
        return 'no';
      }
    }
    
    // Default to positive if unclear
    return 'yes';
  }
}

