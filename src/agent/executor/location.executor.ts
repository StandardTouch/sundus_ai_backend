/**
 * Location Executor
 * Executes the send_location tool.
 *
 * NOTE:
 * - The actual WhatsApp template sending is handled in the TEXT handler after tool execution,
 *   because template selection depends on the user's message language.
 */

import { logger } from "../../utils/logger.js";
import { computeTodayHours, getSaudiNow, parseLocationCoords } from "../../locations/utils/location-geo.util.js";

export interface LocationToolResult {
  success: boolean;
  result: string | null;
  error?: string;
}

function mapsUrl(loc: any): string {
  return `https://www.google.com/maps?q=${loc.location_latitude},${loc.location_longitude}`;
}

export async function executeLocationTool(toolCall: any): Promise<LocationToolResult> {
  const toolName = toolCall.function.name;
  const args = JSON.parse(toolCall.function.arguments);

  try {
    if (toolName !== "send_location") {
      return {
        success: false,
        result: null,
        error: `Unknown location tool: ${toolName}`,
      };
    }

    const query = typeof args.query === "string" ? args.query.trim() : "";
    const user_lat = Number(args.user_lat);
    const user_lng = Number(args.user_lng);
    const hasCoords = Number.isFinite(user_lat) && Number.isFinite(user_lng);

    logger.info("Executing location search", { query, hasCoords });

    const now = getSaudiNow();

    let locations: any[] = [];
    let mode: "nearest" | "search" = "search";

    if (hasCoords) {
      mode = "nearest";
      const nearest = await locationService.getLocationsNearest(user_lat, user_lng, {
        isActive: true,
        ...(query ? { search: query } : {}),
      });
      locations = nearest.data || [];
    } else if (query) {
      // Get all matches (not limited to 5) so we can send all branches.
      const all = await (locationService as any).getLocations(1, 1000, { isActive: true, search: query });
      locations = all.data || [];
    } else {
      return {
        success: false,
        result: null,
        error: "Missing required arguments: provide query or user_lat/user_lng",
      };
    }

    if (!locations || locations.length === 0) {
      const payload = {
        tool_status: "NO_RESULTS",
        mode,
        ...(query ? { query } : {}),
        ...(hasCoords ? { user_location: { lat: user_lat, lng: user_lng } } : {}),
        timezone: "Asia/Riyadh",
        now_iso: now.toISOString(),
        count: 0,
        locations: [],
        messages: {
          en: query
            ? `I'm sorry, we don't currently have a branch in "${query}".`
            : "I'm sorry, I couldn't find nearby branches right now.",
          ar: query
            ? `عذراً، لا يوجد لدينا فرع حالياً في "${query}".`
            : "عذراً، لا يمكنني العثور على فروع قريبة حالياً.",
        },
      };
      return { success: true, result: JSON.stringify(payload) };
    }

    const enriched = locations.map((loc: any) => {
      const coords = parseLocationCoords(loc) || undefined;
      const today = computeTodayHours(loc.timings, now);
      return {
        _id: loc._id,
        location_id: loc.location_id,
        title_en: loc.location_title,
        title_ar: loc.location_title_ara,
        address_en: loc.location_address,
        address_ar: loc.location_address_ara,
        country: loc.country,
        state: loc.state,
        city: loc.city,
        store_manager_name: loc.store_manager_name,
        store_manager_phone: loc.store_manager_phone,
        store_contact_phone: loc.store_contact_phone,
        coords,
        google_maps_url: mapsUrl(loc),
        ...(typeof loc.distance_km === "number" ? { distance_km: loc.distance_km } : {}),
        today,
        timings: loc.timings || [],
        isActive: loc.isActive,
      };
    });

    const payload = {
      tool_status: "SUCCESS",
      mode,
      ...(query ? { query } : {}),
      ...(hasCoords ? { user_location: { lat: user_lat, lng: user_lng } } : {}),
      timezone: "Asia/Riyadh",
      now_iso: now.toISOString(),
      count: enriched.length,
      locations: enriched,
      instruction:
        "Use ONLY this JSON. When user asks timings/open now, use `today`. Always include both `store_contact_phone` and `store_manager_phone` when user asks for contact.",
    };

    return {
      success: true,
      result: JSON.stringify(payload),
      locations: enriched,
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

