/**
 * Tool Registry
 * Exports all available tools for the AI agent
 */

import { productTools } from "./product.tools.js";
import { trackOrderTool, getOrderDetailsTool } from "./order.tools.js";
import { faqTools } from "./faq.tools.js";
import { toolSettingsService } from "../../services/tool-settings.service.js";
import type OpenAI from "openai";

/**
 * All available tools (unfiltered)
 * Add new tool arrays here as they are implemented
 */
export const allTools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  ...productTools,
  trackOrderTool,
  getOrderDetailsTool,
  ...faqTools,
];

/**
 * Get enabled tools (filtered by database settings)
 * Use this when calling OpenAI - it respects admin enable/disable settings
 */
export async function getEnabledTools(): Promise<OpenAI.Chat.Completions.ChatCompletionTool[]> {
  return await toolSettingsService.getEnabledTools();
}

/**
 * Get tools by category
 */
export const getToolsByCategory = {
  products: productTools,
  orders: [trackOrderTool, getOrderDetailsTool],
  faqs: faqTools,
};

