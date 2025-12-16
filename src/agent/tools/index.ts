/**
 * Tool Registry
 * Exports all available tools for the AI agent
 */

import { productTools } from "./product.tools.js";

/**
 * All available tools
 * Add new tool arrays here as they are implemented
 */
export const allTools = [
  ...productTools,
  // Add order tools here when implemented
  // Add FAQ tools here when implemented
];

/**
 * Get tools by category
 */
export const getToolsByCategory = {
  products: productTools,
  // orders: orderTools, // When implemented
  // faqs: faqTools, // When implemented
};

