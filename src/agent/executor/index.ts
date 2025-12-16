/**
 * Tool Executor Router
 * Routes tool calls to appropriate executors
 */

import { executeProductTool } from "./product.executor.js";
import { logger } from "../../utils/logger.js";
import type OpenAI from "openai";

/**
 * Execute tool call
 */
export async function executeTool(
  toolCall: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
): Promise<{
  tool_call_id: string;
  role: "tool";
  name: string;
  content: string;
}> {
  const { id, function: func } = toolCall;
  const { name, arguments: argsStr } = func;

  let args: any;
  try {
    args = JSON.parse(argsStr);
  } catch (error) {
    logger.error("Failed to parse tool arguments", { error, argsStr });
    return {
      tool_call_id: id,
      role: "tool",
      name,
      content: JSON.stringify({ error: "Invalid tool arguments" })
    };
  }

  logger.info("Executing tool", { toolName: name, args });

  // Route to appropriate executor based on tool name prefix
  let result: { success: boolean; result: any; error?: string };

  if (name.startsWith("search_products") || name.startsWith("get_product_details") || name.startsWith("list_brands")) {
    result = await executeProductTool(name, args);
  } else {
    // Add other tool executors here as they are implemented
    result = {
      success: false,
      result: null,
      error: `Tool executor not implemented for: ${name}`
    };
  }

  // Format result for OpenAI
  const content = result.success
    ? result.result
    : JSON.stringify({ error: result.error || "Tool execution failed" });

  return {
    tool_call_id: id,
    role: "tool",
    name,
    content: typeof content === "string" ? content : JSON.stringify(content)
  };
}

