/**
 * Flow Types for Guided / Amazon-style WhatsApp Bot
 */

export type FlowStepId =
  | "LANGUAGE_SELECTION"
  | "MAIN_MENU"
  | "ORDER_TRACKING"
  | "BROWSE_CATALOG"
  | "FAQS"
  | "HUMAN_SUPPORT";

export type SupportedLanguage = "en" | "ar";

export interface UserFlowSession {
  phoneNumber: string;
  currentStep: FlowStepId;
  language?: SupportedLanguage;
  lastActive: number;
  data?: Record<string, any>;
}

export interface FlowAction {
  type: "BUTTON_CLICK" | "TEXT_INPUT";
  payload: string;
  rawText?: string;
}

export interface FlowStepResult {
  success: boolean;
  nextStep?: FlowStepId;
  messageSent?: boolean;
  handled: boolean;
  error?: string;
}

