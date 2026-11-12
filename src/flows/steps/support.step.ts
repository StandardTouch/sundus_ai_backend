/**
 * Customer Support Step
 * Provides toll-free support hotline, operating hours, email,
 * and an interactive button to return to the Main Menu.
 */

import { AISensyService } from "../../services/aisensy.service.js";
import { flowSessionService } from "../flow-session.service.js";
import { supportSettingsService } from "../../services/support-settings.service.js";
import { logger } from "../../utils/logger.js";
import type { FlowStepResult, SupportedLanguage } from "../flow.types.js";

export class SupportStep {
  private aisensyService: AISensyService;

  constructor() {
    this.aisensyService = new AISensyService();
  }

  /**
   * Send Customer Support details and options
   */
  async sendSupport(phoneNumber: string, language: SupportedLanguage = "en"): Promise<FlowStepResult> {
    const isAr = language === "ar";

    try {
      const supportPhone = await supportSettingsService.getSupportPhoneNumber();

      const supportText = isAr
        ? `*خدمة عملاء الحميضي للساعات*\n\n` +
          `يسعد فريق خدمة العملاء تقديم المساعدة بخصوص المنتجات، الطلبات، وخدمات الضمان.\n\n` +
          `*الرقم الموحد:* ${supportPhone}\n` +
          `*ساعات العمل:* من السبت إلى الخميس (9:00 ص - 10:00 م)\n` +
          `*البريد الإلكتروني:* support@alhomaidhigroup.com\n` +
          `*الموقع الإلكتروني:* https://alhomaidhigroup.com`
        : `*AlHomaidhi Customer Support*\n\n` +
          `Our customer care team is available to assist with inquiries, orders, and warranty services.\n\n` +
          `*Toll-Free Hotline:* ${supportPhone}\n` +
          `*Operating Hours:* Saturday - Thursday (9:00 AM - 10:00 PM)\n` +
          `*Email:* support@alhomaidhigroup.com\n` +
          `*Website:* https://alhomaidhigroup.com`;

      const buttons = [
        {
          text: isAr ? "القائمة الرئيسية" : "Main Menu",
          payload: "menu_main",
        },
      ];

      await this.aisensyService.sendQuickReplyMessage(phoneNumber, supportText, buttons);
      await flowSessionService.updateStep(phoneNumber, "HUMAN_SUPPORT");

      return {
        success: true,
        handled: true,
        messageSent: true,
        nextStep: "HUMAN_SUPPORT",
      };
    } catch (error: any) {
      logger.error("[Flow:SupportStep] Error sending support details", { error: error.message, phoneNumber });

      const fallbackText = isAr
        ? "الرقم الموحد لخدمة العملاء: 920009339"
        : "Customer support hotline: 920009339";

      await this.aisensyService.sendQuickReplyMessage(phoneNumber, fallbackText, [
        { text: isAr ? "القائمة الرئيسية" : "Main Menu", payload: "menu_main" },
      ]);

      return {
        success: false,
        handled: true,
        messageSent: true,
        nextStep: "HUMAN_SUPPORT",
        error: error.message,
      };
    }
  }
}

export const supportStep = new SupportStep();
