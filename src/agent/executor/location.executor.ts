/**
 * Location Executor
 * Executes the send_location tool.
 *
 * NOTE:
 * - The actual WhatsApp template sending is handled in the TEXT handler after tool execution,
 *   because template selection depends on the user's message language.
 */

import { logger } from "../../utils/logger.js";

export interface LocationToolResult {
  success: boolean;
  result: string | null;
  error?: string;
}

export async function executeLocationTool(toolName: string): Promise<LocationToolResult> {
  try {
    if (toolName !== "send_location") {
      return {
        success: false,
        result: null,
        error: `Unknown location tool: ${toolName}`,
      };
    }

    // No dynamic data to fetch — template will be sent by the handler.
    return {
      success: true,
      result: "Location template will be sent to the user.",
    };
  } catch (error: any) {
    logger.error("Location tool execution error", { error, toolName });
    return {
      success: false,
      result: null,
      error: error?.message || "Location tool execution failed",
    };
  }
}

