/**
 * Order Tracking Step
 * Provides order tracking information and the app redirect link (dummy link for now),
 * with an interactive button to return to the Main Menu.
 */

import { AISensyService } from "../../services/aisensy.service.js";
import { flowSessionService } from "../flow-session.service.js";
import { logger } from "../../utils/logger.js";
import type { FlowStepResult, SupportedLanguage } from "../flow.types.js";

export class OrderTrackingStep {
  private aisensyService: AISensyService;

  constructor() {
    this.aisensyService = new AISensyService();
  }

  /**
   * Send Order Tracking link and app redirection
   */
  async sendOrderTracking(phoneNumber: string, language: SupportedLanguage = "en"): Promise<FlowStepResult> {
    const isAr = language === "ar";

    // Dummy redirect URL for the app (can be easily updated in env or here)
    const appTrackingUrl =
      process.env.APP_TRACKING_URL || `https://app.alhomaidhigroup.com/track-orders?phone=${phoneNumber}`;

    const messageText = isAr
      ? `📦 *تتبع الطلبات والشحنات:*\n\n` +
      `لمتابعة حالة طلبك، عرض تفاصيل الشحن، وتتبع مسار التوصيل المباشر، يرجى فتح الرابط عبر التطبيق:\n\n` +
      `📲 *رابط تتبع الطلب في التطبيق:*\n${appTrackingUrl}\n\n` +
      `_(في حال احتجت لأي مساعدة بخصوص طلبك، يمكنك التواصل مباشرة مع خدمة العملاء)._`
      : `📦 *Order Tracking & Shipments:*\n\n` +
      `To track your active orders, check courier status, and view live delivery details, please open the link below in our app:\n\n` +
      `📲 *Track in Mobile App:*\n${appTrackingUrl}\n\n` +
      `_(If you need assistance with your order, feel free to contact our customer support)._`;

    const buttons = [
      {
        text: isAr ? "👨‍💼 خدمة العملاء" : "👨‍💼 Support",
        payload: "menu_support",
      },
      {
        text: isAr ? "🏠 القائمة الرئيسية" : "🏠 Main Menu",
        payload: "menu_main",
      },
    ];

    try {
      logger.info("[Flow:OrderTrackingStep] Sending order tracking info", { phoneNumber, language });

      await this.aisensyService.sendQuickReplyMessage(phoneNumber, messageText, buttons);
      await flowSessionService.updateStep(phoneNumber, "ORDER_TRACKING");

      return {
        success: true,
        handled: true,
        messageSent: true,
        nextStep: "ORDER_TRACKING",
      };
    } catch (error: any) {
      logger.error("[Flow:OrderTrackingStep] Error sending order tracking", { error: error.message, phoneNumber });
      return {
        success: false,
        handled: true,
        messageSent: false,
        error: error.message,
      };
    }
  }
}

export const orderTrackingStep = new OrderTrackingStep();

