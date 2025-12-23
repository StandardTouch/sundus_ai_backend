/**
 * Tool Registry
 * Exports all available tools for the AI agent
 */

import { productTools } from "./product.tools.js";
import { trackOrderTool, getOrderDetailsTool } from "./order.tools.js";
import { faqTools } from "./faq.tools.js";

/**
 * All available tools
 * Add new tool arrays here as they are implemented
 */
export const allTools = [
  ...productTools,
  trackOrderTool,
  getOrderDetailsTool,
  ...faqTools,
];

/**
 * Get tools by category
 */
export const getToolsByCategory = {
  products: productTools,
  orders: [trackOrderTool, getOrderDetailsTool],
  faqs: faqTools,
};

