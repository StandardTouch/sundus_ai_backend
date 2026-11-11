/**
 * Flow Router
 * Central dispatcher for the guided WhatsApp flow.
 * Intercepts incoming messages and directs them through rule-based steps.
 */

import { flowSessionService } from "./flow-session.service.js";
import { languageStep } from "./steps/language.step.js";
import { mainMenuStep } from "./steps/main-menu.step.js";
import { browseWatchesStep } from "./steps/browse-watches.step.js";
import { locationsStep } from "./steps/locations.step.js";
import { orderTrackingStep } from "./steps/order-tracking.step.js";
import { supportStep } from "./steps/support.step.js";
import { logger } from "../utils/logger.js";
import type { FlowAction, FlowStepResult } from "./flow.types.js";

export class FlowRouter {
  /**
   * Process an incoming WhatsApp message payload from AI Sensy
   */
  async handleIncoming(phoneNumber: string, message: any): Promise<FlowStepResult> {
    const messageType = (message?.message_type || message?.type || "").toUpperCase();
    const messageContent = message?.message_content || {};

    // Extract payload and text
    const rawText = (messageContent.text || message.text || "").trim();
    const callbackPayload = (
      messageContent.callbackPayload ||
      messageContent.payload ||
      message.payload ||
      rawText
    ).trim();

    const isButtonClick =
      messageType === "QUICK_REPLY" ||
      messageType === "BUTTON" ||
      messageType === "BUTTON_REPLY" ||
      messageType === "INTERACTIVE" ||
      messageType === "LIST_REPLY";

    const action: FlowAction = {
      type: isButtonClick ? "BUTTON_CLICK" : "TEXT_INPUT",
      payload: callbackPayload,
      rawText,
    };

    logger.info("[FlowRouter] Incoming message routed to guided flow", {
      phoneNumber,
      messageType,
      actionType: action.type,
      payload: action.payload,
      rawText: action.rawText,
    });

    const session = await flowSessionService.getSession(phoneNumber);

    // 1. Explicit command to change language or restart
    const normalizedText = rawText.toLowerCase();
    if (
      normalizedText === "language" ||
      normalizedText === "lang" ||
      normalizedText === "لغة" ||
      normalizedText === "اللغة" ||
      normalizedText === "restart" ||
      normalizedText === "reset"
    ) {
      logger.info("[FlowRouter] User requested language reset", { phoneNumber });
      return languageStep.sendPrompt(phoneNumber);
    }

    // 2. If a language button was tapped (e.g. lang_en or lang_ar)
    if (
      action.payload === "lang_en" ||
      action.payload === "lang_ar" ||
      session?.currentStep === "LANGUAGE_SELECTION"
    ) {
      return languageStep.handleResponse(phoneNumber, action);
    }

    // 3. If user has no session or no language chosen yet, send the language greeting prompt!
    if (!session || !session.language) {
      logger.info("[FlowRouter] New user or no language set - prompting language greeting", { phoneNumber });
      return languageStep.sendPrompt(phoneNumber);
    }

    const currentLang = session.language;

    // 4. Global Return to Main Menu command or button
    if (
      action.payload === "menu_main" ||
      normalizedText === "menu" ||
      normalizedText === "main menu" ||
      normalizedText === "قائمة" ||
      normalizedText === "القائمة" ||
      normalizedText === "start" ||
      normalizedText === "0"
    ) {
      logger.info("[FlowRouter] User requested main menu", { phoneNumber });
      return mainMenuStep.sendMenu(phoneNumber, currentLang);
    }

    // 5. Brand Selection in Browse Watches
    if (
      action.payload.startsWith("brand_") ||
      session.currentStep === "BROWSE_CATALOG"
    ) {
      // If user clicked another menu item from browse step
      if (action.payload === "menu_browse_catalog") {
        return browseWatchesStep.sendBrandList(phoneNumber, currentLang);
      }
      if (action.payload.startsWith("brand_")) {
        return browseWatchesStep.handleBrandSelection(phoneNumber, action.payload, currentLang);
      }
    }

    // 6. Direct Menu Actions
    if (action.payload === "menu_track_order") {
      return orderTrackingStep.sendOrderTracking(phoneNumber, currentLang);
    }

    if (action.payload === "menu_browse_catalog") {
      return browseWatchesStep.sendBrandList(phoneNumber, currentLang);
    }

    if (action.payload === "menu_store_locations") {
      return locationsStep.sendLocations(phoneNumber, currentLang);
    }

    if (action.payload === "menu_support") {
      return supportStep.sendSupport(phoneNumber, currentLang);
    }

    // 7. If user is in MAIN_MENU state, check if it's a numeric option (1, 2, 3, 4)
    if (session.currentStep === "MAIN_MENU") {
      const menuResult = await mainMenuStep.handleResponse(phoneNumber, action, currentLang);
      if (menuResult.handled) {
        return menuResult;
      }
    }

    // 8. Unhandled Free-Text Fallback -> Pass to AI Assistant (TextMessageHandler)
    // If the user types any question, product query, or policy question, Sundus AI answers intelligently like before!
    if (action.type === "TEXT_INPUT" && !isButtonClick) {
      logger.info("[FlowRouter] Free-text message received - passing to AI Assistant (TextMessageHandler)", {
        phoneNumber,
        rawText: action.rawText,
        language: currentLang,
      });

      return {
        success: true,
        handled: false, // Handled: false allows WebhookHandlerService to invoke TextMessageHandler (OpenAI)
      };
    }

    // 9. Default button fallback: show Main Menu
    logger.info("[FlowRouter] Showing main menu to user", { phoneNumber, language: currentLang });
    return mainMenuStep.sendMenu(phoneNumber, currentLang);
  }
}

export const flowRouter = new FlowRouter();
