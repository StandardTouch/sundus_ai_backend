/**
 * Location Message Handler
 * Handles LOCATION type messages (user shares pin).
 *
 * Behavior:
 * - Uses user lat/lng to find ALL active locations sorted by nearest.
 * - Includes today's hours (Saudi time) and both contact numbers.
 * - Sends results in chunks to avoid WhatsApp length limits.
 */

import { BaseMessageHandler } from "./base-message.handler.js";
import { TimingTracker } from "../../../utils/timing.util.js";
import type { ProcessingResult } from "../../../utils/timing.util.js";
import { logger } from "../../../utils/logger.js";
import { locationService } from "../../../locations/services/location.service.js";
import { detectLanguage } from "../../../utils/language.util.js";
import { conversationService } from "../../conversation.service.js";

function formatToday(today: any, lang: "ar" | "en"): string {
  if (!today || today.today_status === "UNKNOWN") {
    return lang === "ar" ? "⏰ ساعات العمل اليوم: غير متوفر" : "⏰ Today's hours: N/A";
  }
  if (today.today_status === "CLOSED" || today.open_now === false && today.today_shifts?.length === 0) {
    return lang === "ar" ? `⏰ ساعات العمل اليوم (${today.today_day}): مغلق` : `⏰ Today's hours (${today.today_day}): Closed`;
  }
  const shifts = (today.today_shifts || [])
    .map((s: any) => `${s.open}-${s.close}`)
    .join(", ");
  const openNow = today.open_now === true;
  if (lang === "ar") {
    return `⏰ ساعات العمل اليوم (${today.today_day}): ${shifts || "غير متوفر"}${openNow ? " (مفتوح الآن)" : ""}`;
  }
  return `⏰ Today's hours (${today.today_day}): ${shifts || "N/A"}${openNow ? " (Open now)" : ""}`;
}

function chunkByCount<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export class LocationMessageHandler extends BaseMessageHandler {
  async handle(phoneNumber: string, message: any, tracker: TimingTracker): Promise<ProcessingResult> {
    tracker.addEvent("LOCATION message handler started");

    const lat = Number(message?.message_content?.latitude);
    const lng = Number(message?.message_content?.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      const fallback = "Thanks! I couldn't read the location coordinates. Please try sending your location again.";
      await this.sendMessage(phoneNumber, fallback, tracker);
      return tracker.getResult();
    }

    // Store as a user message so conversation context remains consistent
    const messageId = message.id || message.messageId || `location_${Date.now()}`;
    await conversationService.storeUserMessage(
      phoneNumber,
      String(messageId),
      `[User shared location pin: lat=${lat}, lng=${lng}]`
    ).catch(() => {
      // Don't fail the handler if storage fails
    });

    const recent = await conversationService.getRecentMessages(phoneNumber, 1).catch(() => []);
    const lastUserText = recent.find((m: any) => m.role === "user")?.content || "";
    const lang = (detectLanguage(lastUserText) === "ar" ? "ar" : "en") as "ar" | "en";

    tracker.addEvent("Searching nearest locations");
    const result = await locationService.getLocationsNearest(lat, lng, { isActive: true });

    if (!result.status || result.count === 0 || result.data.length === 0) {
      const msgEn = "Sorry, I couldn't find any active branches right now.";
      const msgAr = "عذرًا، لا يمكنني العثور على أي فروع نشطة حاليًا.";
      await this.sendMessage(phoneNumber, lang === "ar" ? msgAr : msgEn, tracker);
      return tracker.getResult();
    }

    const header =
      lang === "ar"
        ? `📍 هذه هي فروعنا مرتبة من الأقرب إلى الأبعد:\n(تم الترتيب بناءً على موقعك)`
        : `📍 Here are our branches sorted from nearest to farthest:\n(based on your shared location)`;

    await this.sendMessage(phoneNumber, header, tracker);

    // Send all locations, chunked
    const chunks = chunkByCount(result.data, 3);
    for (const group of chunks) {
      const body = group
        .map((loc: any) => {
          const title = lang === "ar" ? loc.location_title_ara || loc.location_title : loc.location_title || loc.location_title_ara;
          const addr = lang === "ar" ? loc.location_address_ara || loc.location_address : loc.location_address || loc.location_address_ara;
          const city = loc.city || "";
          const mapsUrl = `https://www.google.com/maps?q=${loc.location_latitude},${loc.location_longitude}`;
          const km = Number.isFinite(loc.distance_km) ? loc.distance_km.toFixed(1) : "";

          const phones =
            lang === "ar"
              ? `📞 هاتف الفرع: ${loc.store_contact_phone || "غير متوفر"}\n👤 مدير الفرع: ${loc.store_manager_name || "غير متوفر"} (${loc.store_manager_phone || "غير متوفر"})`
              : `📞 Branch: ${loc.store_contact_phone || "N/A"}\n👤 Manager: ${loc.store_manager_name || "N/A"} (${loc.store_manager_phone || "N/A"})`;

          return [
            `📍 *${title}*${km ? (lang === "ar" ? `\n📏 ${km} كم` : `\n📏 ${km} km`) : ""}`,
            city ? (lang === "ar" ? `🏙️ المدينة: ${city}` : `🏙️ City: ${city}`) : "",
            addr ? `🏠 ${addr}` : "",
            formatToday(loc.today, lang),
            phones,
            `🔗 Google Maps: ${mapsUrl}`,
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n\n---\n\n");

      logger.info("Sending nearest locations chunk", { phoneNumber, count: group.length });
      await this.sendMessage(phoneNumber, body, tracker);
    }

    return tracker.getResult();
  }
}

