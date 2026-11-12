/**
 * Language Selection Step
 * Welcomes the user and presents bilingual English / Arabic interactive buttons.
 */

import { AISensyService } from "../../services/aisensy.service.js";
import { flowSessionService } from "../flow-session.service.js";
import { mainMenuStep } from "./main-menu.step.js";
import { logger } from "../../utils/logger.js";
import type { FlowAction, FlowStepResult, SupportedLanguage } from "../flow.types.js";

export class LanguageStep {
  private aisensyService: AISensyService;

  constructor() {
    this.aisensyService = new AISensyService();
  }

  /**
   * Send the greeting and language selection buttons
   */
  async sendPrompt(phoneNumber: string): Promise<FlowStepResult> {
    const greetingText =
      `مرحباً بكم في الحميضي للساعات.\n` +
      `يرجى اختيار لغتكم المفضلة للمتابعة:\n\n` +
      `Welcome to AlHomaidhi Watches.\n` +
      `Please select your preferred language to continue:`;

    const buttons = [
      { text: "English", payload: "lang_en" },
      { text: "العربية", payload: "lang_ar" },
    ];

    try {
      logger.info("[Flow:LanguageStep] Sending greeting and language selection buttons", { phoneNumber });
      const result = await this.aisensyService.sendQuickReplyMessage(phoneNumber, greetingText, buttons);

      if (!result.success) {
        logger.error("[Flow:LanguageStep] Failed to send language prompt", { error: result.error, phoneNumber });
        return {
          success: false,
          handled: true,
          messageSent: false,
          error: result.error,
        };
      }

      await flowSessionService.updateStep(phoneNumber, "LANGUAGE_SELECTION");

      return {
        success: true,
        handled: true,
        messageSent: true,
        nextStep: "LANGUAGE_SELECTION",
      };
    } catch (error: any) {
      logger.error("[Flow:LanguageStep] Error sending language prompt", { error: error.message, phoneNumber });
      return {
        success: false,
        handled: true,
        messageSent: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle user response (button click or text)
   */
  async handleResponse(phoneNumber: string, action: FlowAction): Promise<FlowStepResult> {
    const payload = (action.payload || "").toLowerCase().trim();
    const rawText = (action.rawText || "").toLowerCase().trim();

    let selectedLanguage: SupportedLanguage | null = null;

    // Check for English selection
    if (
      payload === "lang_en" ||
      rawText === "english" ||
      rawText === "en" ||
      rawText === "1" ||
      rawText.includes("english")
    ) {
      selectedLanguage = "en";
    }

    // Check for Arabic selection
    if (
      payload === "lang_ar" ||
      rawText === "arabic" ||
      rawText === "ar" ||
      rawText === "2" ||
      rawText.includes("عربي") ||
      rawText.includes("العربية")
    ) {
      selectedLanguage = "ar";
    }

    if (!selectedLanguage) {
      logger.warn("[Flow:LanguageStep] Unrecognized language choice, re-prompting", { phoneNumber, payload, rawText });
      return this.sendPrompt(phoneNumber);
    }

    logger.info("[Flow:LanguageStep] Language selected", { phoneNumber, language: selectedLanguage });

    // Update user session in Redis
    await flowSessionService.updateLanguage(phoneNumber, selectedLanguage, "MAIN_MENU");

    // Immediately route to Main Menu in the chosen language
    return mainMenuStep.sendMenu(phoneNumber, selectedLanguage);
  }
}

export const languageStep = new LanguageStep();
