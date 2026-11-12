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

    // 1. Comprehensive payload extraction from all WhatsApp & AiSensy interactive structures
    const explicitPayload = (
      messageContent.interactive?.list_reply?.id ||
      messageContent.interactive?.button_reply?.id ||
      messageContent.list_reply?.id ||
      messageContent.button_reply?.id ||
      message?.interactive?.list_reply?.id ||
      message?.interactive?.button_reply?.id ||
      message?.list_reply?.id ||
      message?.button_reply?.id ||
      messageContent.callbackPayload ||
      messageContent.payload ||
      message.payload ||
      messageContent.id ||
      ""
    ).trim();

    // 2. Comprehensive text & title extraction
    const rawText = (
      messageContent.interactive?.list_reply?.title ||
      messageContent.interactive?.button_reply?.title ||
      messageContent.list_reply?.title ||
      messageContent.button_reply?.title ||
      messageContent.text ||
      messageContent.title ||
      message.text ||
      message.title ||
      ""
    ).trim();

    // 3. Fallback / Normalized payload detection from text if payload is not explicit
    let resolvedPayload = explicitPayload;
    const lowerText = rawText.toLowerCase();

    if (!resolvedPayload) {
      if (
        lowerText.includes("track") ||
        lowerText.includes("order") ||
        lowerText.includes("تتبع") ||
        lowerText.includes("طلبات")
      ) {
        resolvedPayload = "menu_track_order";
      } else if (
        lowerText.includes("browse") ||
        lowerText.includes("watch") ||
        lowerText.includes("catalog") ||
        lowerText.includes("ساعات") ||
        lowerText.includes("تصفح")
      ) {
        resolvedPayload = "menu_browse_catalog";
      } else if (
        lowerText.includes("location") ||
        lowerText.includes("store") ||
        lowerText.includes("branch") ||
        lowerText.includes("فروع") ||
        lowerText.includes("معارض")
      ) {
        resolvedPayload = "menu_store_locations";
      } else if (
        lowerText.includes("support") ||
        lowerText.includes("agent") ||
        lowerText.includes("customer") ||
        lowerText.includes("خدمة") ||
        lowerText.includes("عملاء")
      ) {
        resolvedPayload = "menu_support";
      } else if (
        lowerText.includes("main menu") ||
        lowerText === "menu" ||
        lowerText === "0" ||
        lowerText.includes("القائمة")
      ) {
        resolvedPayload = "menu_main";
      } else {
        resolvedPayload = rawText;
      }
    }

    const isButtonClick =
      messageType === "QUICK_REPLY" ||
      messageType === "BUTTON" ||
      messageType === "BUTTON_REPLY" ||
      messageType === "INTERACTIVE" ||
      messageType === "LIST_REPLY" ||
      Boolean(explicitPayload);

    const action: FlowAction = {
      type: isButtonClick ? "BUTTON_CLICK" : "TEXT_INPUT",
      payload: resolvedPayload,
      rawText,
    };

    logger.info("[FlowRouter] Incoming message routed to guided flow", {
      phoneNumber,
      messageType,
      actionType: action.type,
      payload: action.payload,
      rawText: action.rawText,
      explicitPayload,
    });

    const session = await flowSessionService.getSession(phoneNumber);

    // 4. Greetings handling ("hi", "hello", "hey", "start", "مرحبا", "سلام", "اهلا", etc.)
    const isGreetingWord =
      lowerText === "hi" ||
      lowerText === "hello" ||
      lowerText === "hey" ||
      lowerText === "start" ||
      lowerText === "مرحبا" ||
      lowerText === "اهلا" ||
      lowerText === "أهلا" ||
      lowerText === "سلام" ||
      lowerText === "السلام عليكم";

    if (isGreetingWord) {
      if (!session || !session.language) {
        logger.info("[FlowRouter] Greeting from new user - sending language prompt", { phoneNumber });
        return languageStep.sendPrompt(phoneNumber);
      } else {
        logger.info("[FlowRouter] Greeting from existing user - sending main menu", { phoneNumber, language: session.language });
        return mainMenuStep.sendMenu(phoneNumber, session.language);
      }
    }

    // 5. Explicit command to change language or restart
    const normalizedText = lowerText;
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

    // 6. If a language button was tapped (e.g. lang_en or lang_ar)
    if (
      action.payload === "lang_en" ||
      action.payload === "lang_ar" ||
      session?.currentStep === "LANGUAGE_SELECTION"
    ) {
      return languageStep.handleResponse(phoneNumber, action);
    }

    // 7. If user has no session or no language chosen yet, send the language greeting prompt!
    if (!session || !session.language) {
      logger.info("[FlowRouter] New user or no language set - prompting language greeting", { phoneNumber });
      return languageStep.sendPrompt(phoneNumber);
    }

    const currentLang = session.language;

    // 8. Global Return to Main Menu command or button
    if (
      action.payload === "menu_main" ||
      normalizedText === "menu" ||
      normalizedText === "main menu" ||
      normalizedText === "قائمة" ||
      normalizedText === "القائمة" ||
      normalizedText === "0"
    ) {
      logger.info("[FlowRouter] User requested main menu", { phoneNumber });
      return mainMenuStep.sendMenu(phoneNumber, currentLang);
    }

    // 9. Direct Menu Actions
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

    // 10. Brand Selection in Browse Watches
    if (
      action.payload.startsWith("brand_") ||
      session.currentStep === "BROWSE_CATALOG"
    ) {
      if (action.payload.startsWith("brand_")) {
        return browseWatchesStep.handleBrandSelection(phoneNumber, action.payload, currentLang);
      }
    }

    // 11. If user is in MAIN_MENU state, check numeric/word choices (1, 2, 3, 4)
    if (session.currentStep === "MAIN_MENU") {
      const menuResult = await mainMenuStep.handleResponse(phoneNumber, action, currentLang);
      if (menuResult.handled) {
        return menuResult;
      }
    }

    // 12. Unhandled Free-Text Fallback -> Pass to AI Assistant (TextMessageHandler)
    if (action.type === "TEXT_INPUT" && !isButtonClick) {
      logger.info("[FlowRouter] Free-text message received - passing to AI Assistant (TextMessageHandler)", {
        phoneNumber,
        rawText: action.rawText,
        language: currentLang,
      });

      return {
        success: true,
        handled: false,
      };
    }

    // 13. Default button fallback: show Main Menu
    logger.info("[FlowRouter] Showing main menu to user", { phoneNumber, language: currentLang });
    return mainMenuStep.sendMenu(phoneNumber, currentLang);
  }
}

export const flowRouter = new FlowRouter();
