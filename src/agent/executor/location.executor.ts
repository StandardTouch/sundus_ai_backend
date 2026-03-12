/**
 * Location Executor
 * Executes the search_locations tool.
 *
 * NOTE:
 * - The actual WhatsApp template sending is handled in the TEXT handler after tool execution,
 *   because template selection depends on the user's message language.
 */

import { locationService } from "../../locations/services/location.service.js";
import { logger } from "../../utils/logger.js";

export interface LocationToolResult {
  success: boolean;
  result: string | null;
  locations?: any[];
  error?: string;
}

export async function executeLocationTool(toolCall: any): Promise<LocationToolResult> {
  const toolName = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments);

  try {
    if (toolName !== "search_locations") {
      return {
        success: false,
        result: null,
        error: `Unknown location tool: ${toolName}`,
      };
    }

    const query = args.query;
    logger.info("Executing location search", { query });

    const searchResult = await locationService.getLocations(1, 5, { search: query });

    if (!searchResult.status || searchResult.count === 0) {
      // Fetch all active locations so we can show the user where we do have stores
      const allLocations = await locationService.getLocations(1, 100, {});
      
      let availableInfo = "";
      if (allLocations.status && allLocations.data.length > 0) {
         availableInfo = allLocations.data.map((loc: any) => 
           `• ${loc.location_title || loc.location_title_ara || 'Branch'} (${loc.city || 'Saudi Arabia'})`
         ).join("\n");
      }

      const enMessage = `I'm sorry, we don't currently have a branch in "${query}".\n\n📍 *Our available locations are:*\n${availableInfo || "Please visit our website for the full list."}\n\nHow else can I help you?`;
      const arMessage = `عذراً، لا يوجد لدينا فرع حالياً في "${query}".\n\n📍 *فروعنا المتاحة هي:*\n${availableInfo || "يرجى زيارة موقعنا لمعرفة القائمة الكاملة."}\n\nكيف يمكنني مساعدتك برأيك؟`;

      return {
        success: true,
        result: `[TOOL_STATUS: NO_RESULTS]\n\nEN: ${enMessage}\n\nAR: ${arMessage}\n\n[INSTRUCTION: Select the language that matches the user's message and deliver it exactly as written above. DO NOT add any fake addresses.]`,
      };
    }

    // Format the results for the AI
    const locationInfo = searchResult.data.map((loc: any) => {
      const titleEn = loc.location_title || "";
      const titleAr = loc.location_title_ara || "";
      const addrEn = loc.location_address || "";
      const addrAr = loc.location_address_ara || "";
      const city = loc.city || "";
      
      const mapsUrl = `https://www.google.com/maps?q=${loc.location_latitude},${loc.location_longitude}`;
      
      return `📍 *${titleEn}${titleAr ? ' / ' + titleAr : ''}*\n` +
             `🏠 ${addrEn}${addrAr ? '\n🏠 ' + addrAr : ''}\n` +
             `🏙️ City: ${city}\n` +
             `🔗 Google Maps: ${mapsUrl}`;
    }).join("\n\n---\n\n");

    return {
      success: true,
      result: `[TOOL_STATUS: SUCCESS] Found ${searchResult.count} location(s) for "${query}". Use ONLY this data:\n\n${locationInfo}\n\n[INSTRUCTION: Deliver these details professionally. Include the Google Maps link.]`,
      locations: searchResult.data,
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

