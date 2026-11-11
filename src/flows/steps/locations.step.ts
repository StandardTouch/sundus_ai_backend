/**
 * Store Locations Step
 * Fetches 5 store locations (cached in Redis for high speed), provides Google Maps links,
 * gives a link to explore other stores across Saudi Arabia, and includes a button to go back to the Main Menu.
 */

import { AISensyService } from "../../services/aisensy.service.js";
import { locationRepository } from "../../repositories/location.repository.js";
import { cacheService } from "../../services/cache.service.js";
import { flowSessionService } from "../flow-session.service.js";
import { logger } from "../../utils/logger.js";
import type { FlowStepResult, SupportedLanguage } from "../flow.types.js";

const LOCATIONS_CACHE_KEY = "flow:featured_locations";
const LOCATIONS_CACHE_TTL = 86400; // 24 hours

export class LocationsStep {
  private aisensyService: AISensyService;

  constructor() {
    this.aisensyService = new AISensyService();
  }

  /**
   * Fetch 5 locations and send detailed store information with links
   */
  async sendLocations(phoneNumber: string, language: SupportedLanguage = "en"): Promise<FlowStepResult> {
    const isAr = language === "ar";

    try {
      // 1. Check Redis Cache first for instant response
      let locations = await cacheService.get<any[]>(LOCATIONS_CACHE_KEY);

      if (!locations || locations.length === 0) {
        logger.info("[Flow:LocationsStep] Cache miss - fetching from database", { phoneNumber });
        const { locations: dbLocations } = await locationRepository.findAll(0, 5, { isActive: true });
        locations = dbLocations || [];

        if (locations.length > 0) {
          await cacheService.set(LOCATIONS_CACHE_KEY, locations, LOCATIONS_CACHE_TTL);
        }
      } else {
        logger.info("[Flow:LocationsStep] Retrieved featured locations from Redis cache", {
          phoneNumber,
          count: locations.length,
        });
      }

      let locationText = "";

      if (locations && locations.length > 0) {
        const header = isAr
          ? "📍 *أبرز فروع ومعارض الحميضي للساعات:*\n\n"
          : "📍 *Featured AlHomaidhi Watch Showrooms:*\n\n";

        const locationList = locations
          .map((loc: any, idx: number) => {
            const title = isAr ? loc.location_title_ara || loc.location_title : loc.location_title;
            const address = isAr ? loc.location_address_ara || loc.location_address : loc.location_address;
            const phone = loc.store_contact_phone || loc.store_manager_phone || "920009339";
            const mapLink =
              loc.location_latitude && loc.location_longitude
                ? `https://maps.google.com/?q=${loc.location_latitude},${loc.location_longitude}`
                : undefined;

            return (
              `*${idx + 1}. ${title}*\n` +
              `🏢 ${isAr ? "العنوان:" : "Address:"} ${address || (isAr ? "المملكة العربية السعودية" : "Saudi Arabia")}\n` +
              `📞 ${isAr ? "الهاتف:" : "Phone:"} ${phone}` +
              (mapLink ? `\n🗺️ ${isAr ? "الموقع على الخريطة:" : "Google Maps:"} ${mapLink}` : "")
            );
          })
          .join("\n\n");

        const footer = isAr
          ? `\n\n🌐 *هل تبحث عن فروع أخرى؟*\n` +
            `يمكنك استعراض مواقع جميع فروعنا ومعارضنا في أنحاء المملكة عبر الرابط:\n` +
            `https://alhomaidhigroup.com/our-branches`
          : `\n\n🌐 *Looking for more branches?*\n` +
            `Find all 50+ stores and service centers across Saudi Arabia here:\n` +
            `https://alhomaidhigroup.com/our-branches`;

        locationText = header + locationList + footer;
      } else {
        // Fallback store information if no locations in DB
        locationText = isAr
          ? `📍 *فروع ومعارض الحميضي للساعات:*\n\n` +
            `1. *معرض الرياض الرئيسي* - طريق الملك فهد، العليا\n` +
            `2. *معرض جدة* - التحلية، طريق الأمير محمد بن عبدالعزيز\n` +
            `3. *معرض الدمام* - طريق الخليج، الشاطئ الغربي\n\n` +
            `🌐 *لاستعراض كافة الفروع وأوقات العمل:*\n` +
            `https://alhomaidhigroup.com/our-branches`
          : `📍 *AlHomaidhi Watch Showrooms:*\n\n` +
            `1. *Riyadh Flagship* - King Fahd Rd, Al Olaya\n` +
            `2. *Jeddah Showroom* - Tahlia St, Prince Mohammed Bin Abdulaziz Rd\n` +
            `3. *Dammam Branch* - Gulf Rd, West Shatee\n\n` +
            `🌐 *To view all branches and opening hours:*\n` +
            `https://alhomaidhigroup.com/our-branches`;
      }

      // 1. Send the detailed store locations as a text message (WhatsApp text limit: 4096 chars)
      const textResult = await this.aisensyService.sendTextMessage(phoneNumber, locationText);
      logger.info("[Flow:LocationsStep] Store locations text message sent", {
        phoneNumber,
        success: textResult.success,
        error: textResult.error,
      });

      // Brief delay to ensure text message arrives before the button
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 2. Send the Main Menu button as a compact interactive message (<1024 chars)
      const promptText = isAr
        ? "للمزيد من الخيارات يمكنك العودة إلى القائمة الرئيسية في أي وقت:"
        : "You can return to the main menu at any time:";

      const buttons = [
        {
          text: isAr ? "🏠 القائمة الرئيسية" : "🏠 Main Menu",
          payload: "menu_main",
        },
      ];

      const btnResult = await this.aisensyService.sendQuickReplyMessage(phoneNumber, promptText, buttons);
      logger.info("[Flow:LocationsStep] Store locations navigation button sent", {
        phoneNumber,
        success: btnResult.success,
        error: btnResult.error,
      });

      await flowSessionService.updateStep(phoneNumber, "STORE_LOCATIONS" as any);

      return {
        success: true,
        handled: true,
        messageSent: true,
        nextStep: "STORE_LOCATIONS" as any,
      };
    } catch (error: any) {
      logger.error("[Flow:LocationsStep] Error fetching locations", { error: error.message, phoneNumber });

      const fallbackText = isAr
        ? "يمكنك زيارة موقعنا لمعرفة أقرب فرع إليك:\nhttps://alhomaidhigroup.com/our-branches"
        : "You can visit our store locator to find your nearest showroom:\nhttps://alhomaidhigroup.com/our-branches";

      await this.aisensyService.sendQuickReplyMessage(phoneNumber, fallbackText, [
        { text: isAr ? "🏠 القائمة الرئيسية" : "🏠 Main Menu", payload: "menu_main" },
      ]);

      return {
        success: false,
        handled: true,
        messageSent: true,
        error: error.message,
      };
    }
  }
}

export const locationsStep = new LocationsStep();
