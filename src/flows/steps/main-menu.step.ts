/**
 * Main Menu Step
 * Presents the 4 main options via an interactive WhatsApp List Menu:
 * 1. 📦 Track My Orders
 * 2. ⌚ Browse Watches
 * 3. 📍 Store Locations
 * 4. 👨‍💼 Customer Support / Agent
 */

import { AISensyService } from "../../services/aisensy.service.js";
import { flowSessionService } from "../flow-session.service.js";
import { orderTrackingStep } from "./order-tracking.step.js";
import { browseWatchesStep } from "./browse-watches.step.js";
import { locationsStep } from "./locations.step.js";
import { supportStep } from "./support.step.js";
import { logger } from "../../utils/logger.js";
import type { FlowAction, FlowStepResult, SupportedLanguage } from "../flow.types.js";

export class MainMenuStep {
  private aisensyService: AISensyService;

  constructor() {
    this.aisensyService = new AISensyService();
  }

  /**
   * Send the Main Menu to the user in their chosen language
   */
  async sendMenu(phoneNumber: string, language: SupportedLanguage = "en"): Promise<FlowStepResult> {
    const isAr = language === "ar";

    const bodyText = isAr
      ? "كيف يمكننا مساعدتك اليوم؟ يسعدنا ويشرفنا خدمتك.\nيرجى الضغط على الزر أدناه لاختيار الخدمة المطلوبة:"
      : "How can we assist you today? We're glad to help.\nPlease tap the button below to choose an option:";

    const buttonTitle = isAr ? "عرض الخيارات 📋" : "View Options 📋";
    const sectionTitle = isAr ? "الخدمات الرئيسية" : "Main Services";

    const rows = isAr
      ? [
          {
            id: "menu_track_order",
            title: "📦 تتبع طلباتي",
            description: "متابعة حالة الشحن وموعد التوصيل",
          },
          {
            id: "menu_browse_catalog",
            title: "⌚ تصفح الساعات",
            description: "استعراض أفضل الماركات والموديلات",
          },
          {
            id: "menu_store_locations",
            title: "📍 فروعنا ومعارضنا",
            description: "مواقع المعارض وأوقات العمل",
          },
          {
            id: "menu_support",
            title: "👨‍💼 خدمة العملاء",
            description: "التحدث مع أحد ممثلي الخدمة",
          },
        ]
      : [
          {
            id: "menu_track_order",
            title: "📦 Track My Orders",
            description: "Check status & delivery updates",
          },
          {
            id: "menu_browse_catalog",
            title: "⌚ Browse Watches",
            description: "Explore top brands & bestsellers",
          },
          {
            id: "menu_store_locations",
            title: "📍 Store Locations",
            description: "Find nearest store & opening hours",
          },
          {
            id: "menu_support",
            title: "👨‍💼 Customer Support",
            description: "Speak to a human representative",
          },
        ];

    try {
      logger.info("[Flow:MainMenuStep] Sending Main Menu", { phoneNumber, language });

      const result = await this.aisensyService.sendListMenu(
        phoneNumber,
        bodyText,
        buttonTitle,
        [{ title: sectionTitle, rows }]
      );

      if (!result.success) {
        logger.error("[Flow:MainMenuStep] Failed to send main menu", { error: result.error, phoneNumber });
        return {
          success: false,
          handled: true,
          messageSent: false,
          error: result.error,
        };
      }

      await flowSessionService.updateStep(phoneNumber, "MAIN_MENU");

      return {
        success: true,
        handled: true,
        messageSent: true,
        nextStep: "MAIN_MENU",
      };
    } catch (error: any) {
      logger.error("[Flow:MainMenuStep] Error sending main menu", { error: error.message, phoneNumber });
      return {
        success: false,
        handled: true,
        messageSent: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle user selection from the Main Menu
   */
  async handleResponse(phoneNumber: string, action: FlowAction, language: SupportedLanguage = "en"): Promise<FlowStepResult> {
    const payload = (action.payload || "").toLowerCase().trim();
    const rawText = (action.rawText || "").toLowerCase().trim();

    logger.info("[Flow:MainMenuStep] Handling selection", { phoneNumber, payload, rawText, language });

    // 0. Return to Main Menu
    if (payload === "menu_main" || rawText === "menu" || rawText === "main menu" || rawText === "0") {
      return this.sendMenu(phoneNumber, language);
    }

    // 1. Order Tracking
    if (payload === "menu_track_order" || rawText.includes("track") || rawText.includes("تتبع")) {
      return orderTrackingStep.sendOrderTracking(phoneNumber, language);
    }

    // 2. Browse Catalog
    if (payload === "menu_browse_catalog" || rawText.includes("browse") || rawText.includes("ساعات") || rawText.includes("تصفح")) {
      return browseWatchesStep.sendBrandList(phoneNumber, language);
    }

    // 3. Store Locations
    if (payload === "menu_store_locations" || rawText.includes("location") || rawText.includes("فروع") || rawText.includes("موقع")) {
      return locationsStep.sendLocations(phoneNumber, language);
    }

    // 4. Customer Support
    if (payload === "menu_support" || rawText.includes("support") || rawText.includes("agent") || rawText.includes("خدمة") || rawText.includes("عملاء")) {
      return supportStep.sendSupport(phoneNumber, language);
    }

    // If user typed a free-text question while at the main menu, let AI Assistant answer!
    if (action.type === "TEXT_INPUT") {
      logger.info("[Flow:MainMenuStep] Free-text message received while at main menu - passing to AI Assistant", {
        phoneNumber,
        rawText,
      });
      return {
        success: true,
        handled: false,
      };
    }

    // Unrecognized button selection: re-send main menu
    logger.info("[Flow:MainMenuStep] Unrecognized option, re-sending menu", { phoneNumber, payload });
    return this.sendMenu(phoneNumber, language);
  }
}

export const mainMenuStep = new MainMenuStep();
