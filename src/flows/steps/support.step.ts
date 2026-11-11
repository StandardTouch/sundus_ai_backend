/**
 * Customer Support Step
 * Provides contact hotline, hours of operation, and a return button to the Main Menu.
 */

import { AISensyService } from "../../services/aisensy.service.js";
import { supportSettingsService } from "../../services/support-settings.service.js";
import { flowSessionService } from "../flow-session.service.js";
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
        ? `👨‍💼 *خدمة عملاء مجموعة الحميضي للساعات:*\n\n` +
        `يسعدنا ويشرفنا خدمتك والإجابة على كافة استفساراتك.\n\n` +
        `📞 *الرقم الموحد المجاني:* ${supportPhone}\n` +
        `⏰ *ساعات العمل:* من السبت إلى الخميس (9:00 ص - 10:00 م)\n` +
        `💬 *البريد الإلكتروني:* support@alhomaidhigroup.com\n` +
        `🌐 *الموقع الإلكتروني:* https://alhomaidhigroup.com\n\n` +
        `_سيقوم أحد ممثلي الخدمة بالتواصل معك ومساعدتك في أقرب وقت._`
        : `👨‍💼 *AlHomaidhi Customer Care:*\n\n` +
        `We're here to help you with watch inquiries, orders, and warranty services.\n\n` +
        `📞 *Toll-Free Hotline:* ${supportPhone}\n` +
        `⏰ *Operating Hours:* Saturday - Thursday (9:00 AM - 10:00 PM)\n` +
        `💬 *Email:* support@alhomaidhigroup.com\n` +
        `🌐 *Website:* https://alhomaidhigroup.com\n\n` +
        `_A customer care representative will be happy to assist you._`;

      const buttons = [
        {
          text: isAr ? "🏠 القائمة الرئيسية" : "🏠 Main Menu",
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
        ? "📞 يمكنك الاتصال بنا مباشرة على الرقم الموحد: 920009339"
        : "📞 You can reach our support hotline directly at: 920009339";

      await this.aisensyService.sendQuickReplyMessage(phoneNumber, fallbackText, [
        { text: isAr ? "🏠 القائمة الرئيسية" : "🏠 Main Menu", payload: "menu_main" },
      ]);

      return {
        success: false,
        handled: true,
        messageSent: true,
        error: error.message,
      };
    }
  }
}

export const supportStep = new SupportStep();

