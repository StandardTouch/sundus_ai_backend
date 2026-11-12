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
      ? `*تتبع الطلبات والشحنات*\n\n` +
        `لمتابعة حالة الطلب وتفاصيل الشحن ومسار التوصيل، يرجى زيارة بوابة التتبع عبر الرابط التالي:\n\n` +
        `*رابط التتبع:*\n${appTrackingUrl}\n\n` +
        `يسعد فريق خدمة العملاء تقديم المساعدة في حال وجود أي استفسار بخصوص طلبكم.`
      : `*Order Tracking & Delivery Updates*\n\n` +
        `To view your order status, courier shipment details, and delivery updates, please access our tracking portal:\n\n` +
        `*Direct Link:*\n${appTrackingUrl}\n\n` +
        `Our customer support team is available if you need any assistance regarding your order.`;

    const buttons = [
      {
        text: isAr ? "خدمة العملاء" : "Customer Support",
        payload: "menu_support",
      },
      {
        text: isAr ? "القائمة الرئيسية" : "Main Menu",
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
      logger.error("[Flow:OrderTrackingStep] Error sending order tracking info", { error: error.message, phoneNumber });

      const fallbackText = isAr
        ? `بوابة تتبع الطلبات:\n${appTrackingUrl}`
        : `Order tracking portal:\n${appTrackingUrl}`;

      await this.aisensyService.sendQuickReplyMessage(phoneNumber, fallbackText, [
        { text: isAr ? "القائمة الرئيسية" : "Main Menu", payload: "menu_main" },
      ]);

      return {
        success: false,
        handled: true,
        messageSent: true,
        nextStep: "ORDER_TRACKING",
        error: error.message,
      };
    }
  }
}

export const orderTrackingStep = new OrderTrackingStep();
