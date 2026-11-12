/**
 * Browse Watches Step
 * Fetches brands from the Alhomaidhi API, displays clean brand names in an Interactive List Menu,
 * and fetches the selected brand's watches with prices, images, and links.
 * Attaches the Main Menu & Other Brands navigation buttons directly to the LAST watch!
 */

import { AISensyService } from "../../services/aisensy.service.js";
import { alhomaidhiProductAPI } from "../../api/alhomaidhi/product.api.js";
import { flowSessionService } from "../flow-session.service.js";
import { logger } from "../../utils/logger.js";
import type { FlowStepResult, SupportedLanguage } from "../flow.types.js";

/**
 * Helper to split bilingual brand name (e.g. "Coach Watches / ساعات كوتش")
 */
function getCleanBrandName(fullName: string, language: SupportedLanguage): string {
  const parts = fullName.split("/");
  if (parts.length > 1) {
    if (language === "ar") {
      return parts[1].trim();
    }
    return parts[0].trim();
  }
  return fullName.trim();
}

/**
 * Helper to extract search keyword for the API (e.g. "Coach Watches / ساعات كوتش" -> "Coach")
 */
function getSearchKeyword(fullName: string): string {
  const englishPart = fullName.split("/")[0].trim();
  const cleaned = englishPart
    .replace(/Watches in Saudi Arabia/i, "")
    .replace(/Fashion Watches/i, "")
    .replace(/Watches/i, "")
    .trim();
  return cleaned || englishPart;
}

export class BrowseWatchesStep {
  private aisensyService: AISensyService;

  constructor() {
    this.aisensyService = new AISensyService();
  }

  /**
   * Fetch brands from the Alhomaidhi API and send an interactive list menu
   */
  async sendBrandList(phoneNumber: string, language: SupportedLanguage = "en"): Promise<FlowStepResult> {
    const isAr = language === "ar";

    try {
      logger.info("[Flow:BrowseWatchesStep] Fetching brands from API", { phoneNumber, language });

      const brandResponse = await alhomaidhiProductAPI.listBrands();
      const allBrands = (brandResponse.message || []).filter((b) => b.name && b.name.toLowerCase() !== "others");

      // Take top 9 brands (WhatsApp list allows max 10 rows total, reserve 1 for Main Menu)
      const topBrands = allBrands.slice(0, 9);

      const brandRows = topBrands.map((b) => {
        const cleanName = getCleanBrandName(b.name, language);
        return {
          id: `brand_${b.id}`,
          title: cleanName.substring(0, 24),
          description: isAr
            ? `استعراض ساعات ${cleanName}`.substring(0, 72)
            : `Explore ${cleanName} watches`.substring(0, 72),
        };
      });

      // Add "Back to Main Menu" as the 10th option
      brandRows.push({
        id: "menu_main",
        title: isAr ? "القائمة الرئيسية" : "Main Menu",
        description: isAr ? "العودة للخيارات السابقة" : "Return to previous options",
      });

      const bodyText = isAr
        ? "يرجى اختيار الماركة المطلوبة لعرض التشكيلات المتاحة:"
        : "Please select a brand below to explore available watch collections:";

      const buttonTitle = isAr ? "اختيار الماركة" : "Select Brand";
      const sectionTitle = isAr ? "الماركات المتاحة" : "Available Brands";

      await this.aisensyService.sendListMenu(phoneNumber, bodyText, buttonTitle, [
        {
          title: sectionTitle,
          rows: brandRows,
        },
      ]);

      await flowSessionService.updateStep(phoneNumber, "BROWSE_CATALOG");

      return {
        success: true,
        handled: true,
        messageSent: true,
        nextStep: "BROWSE_CATALOG",
      };
    } catch (error: any) {
      logger.error("[Flow:BrowseWatchesStep] Error fetching brands", { error: error.message, phoneNumber });

      const errorText = isAr
        ? "تعذر تحميل الماركات حالياً، يرجى المحاولة مرة أخرى لاحقاً."
        : "Unable to load brands at the moment. Please try again in a few moments.";

      await this.aisensyService.sendQuickReplyMessage(phoneNumber, errorText, [
        { text: isAr ? "القائمة الرئيسية" : "Main Menu", payload: "menu_main" },
      ]);

      return {
        success: false,
        handled: true,
        messageSent: true,
        nextStep: "BROWSE_CATALOG",
        error: error.message,
      };
    }
  }

  /**
   * Handle user selection of a brand and fetch its products
   */
  async handleBrandSelection(
    phoneNumber: string,
    payload: string,
    language: SupportedLanguage = "en"
  ): Promise<FlowStepResult> {
    const isAr = language === "ar";

    try {
      // 1. Fetch available brands to resolve exact brand ID and name
      const brandResponse = await alhomaidhiProductAPI.listBrands();
      const allBrands = brandResponse.message || [];

      let matchedBrand: { id: number; name: string } | undefined;

      if (payload.startsWith("brand_")) {
        const idStr = payload.replace("brand_", "");
        const parsedId = parseInt(idStr, 10);

        if (!isNaN(parsedId)) {
          matchedBrand = allBrands.find((b) => b.id === parsedId);
        } else {
          const keyword = idStr.toLowerCase().replace(/_/g, " ");
          matchedBrand = allBrands.find((b) => b.name.toLowerCase().includes(keyword));
        }
      } else {
        const keyword = payload.toLowerCase().trim();
        matchedBrand = allBrands.find((b) => b.name.toLowerCase().includes(keyword));
      }

      const brandId = matchedBrand?.id;
      const brandFullName = matchedBrand?.name || payload.replace(/^brand_/i, "").replace(/_/g, " ");
      const searchKeyword = matchedBrand ? getSearchKeyword(matchedBrand.name) : brandFullName;
      const displayBrandName = matchedBrand ? getCleanBrandName(matchedBrand.name, language) : brandFullName;

      logger.info("[Flow:BrowseWatchesStep] Resolved brand details", {
        phoneNumber,
        payload,
        brandId,
        searchKeyword,
        displayBrandName,
      });

      // 2. Search products
      const productResponse = await alhomaidhiProductAPI.searchProducts(searchKeyword, {
        brand_filter: brandId,
        per_page: 3,
      });

      const products = productResponse.message || [];

      if (!Array.isArray(products) || products.length === 0) {
        const notFoundText = isAr
          ? `عذراً، لم نتمكن من العثور على ساعات متوفرة حالياً لماركة ${displayBrandName}.`
          : `Sorry, we could not find available watches for ${displayBrandName} right now.`;

        await this.aisensyService.sendQuickReplyMessage(phoneNumber, notFoundText, [
          { text: isAr ? "ماركات أخرى" : "Other Brands", payload: "menu_browse_catalog" },
          { text: isAr ? "القائمة الرئيسية" : "Main Menu", payload: "menu_main" },
        ]);

        return { success: true, handled: true, messageSent: true };
      }

      // 3. Introductory message
      const introText = isAr
        ? `التشكيلات المتوفرة من *${displayBrandName}*:`
        : `Available watches from *${displayBrandName}*:`;

      await this.aisensyService.sendTextMessage(phoneNumber, introText);

      // 4. Send watches sequentially, attaching buttons directly to the LAST watch
      const displayProducts = products.slice(0, 3);
      const totalToDisplay = displayProducts.length;

      const navButtons = [
        { text: isAr ? "ماركات أخرى" : "Other Brands", payload: "menu_browse_catalog" },
        { text: isAr ? "القائمة الرئيسية" : "Main Menu", payload: "menu_main" },
      ];

      for (let i = 0; i < totalToDisplay; i++) {
        const item = displayProducts[i];
        const isLastItem = i === totalToDisplay - 1;

        const details = item?.product_details || (item as any) || {};
        const name = details.name || (item as any)?.name || "Watch";
        const price =
          details.sale_price ||
          details.price ||
          details.regular_price ||
          (item as any)?.price ||
          "N/A";
        const slug = details.slug || (item as any)?.slug || "";
        const imageUrl =
          item?.images?.[0]?.src ||
          (item as any)?.image_url ||
          (item as any)?.img ||
          (item as any)?.image;

        const productUrl = slug
          ? `https://alhomaidhigroup.com/product/${slug}`
          : `https://alhomaidhigroup.com`;

        const caption =
          `*${name}*\n` +
          `${isAr ? "السعر:" : "Price:"} ${price} SAR\n` +
          `${isAr ? "تفاصيل المنتج:" : "Product Details:"} ${productUrl}`;

        const validImage =
          imageUrl && typeof imageUrl === "string" && (imageUrl.startsWith("http://") || imageUrl.startsWith("https://"))
            ? imageUrl
            : undefined;

        if (isLastItem) {
          // Attach navigation buttons directly to the last watch
          logger.info("[Flow:BrowseWatchesStep] Sending last watch with navigation buttons attached", {
            phoneNumber,
            isLastItem,
            hasImage: !!validImage,
          });

          if (validImage) {
            try {
              const res = await this.aisensyService.sendQuickReplyMessage(phoneNumber, caption, navButtons, validImage);
              if (!res.success) {
                throw new Error(res.error || "Interactive image failed");
              }
            } catch {
              // Fallback: send image with caption, pause for delivery, then send navigation buttons
              await this.aisensyService.sendImageMessage(phoneNumber, validImage, caption);
              await new Promise((resolve) => setTimeout(resolve, 1500));
              const navPrompt = isAr
                ? "يمكنكم استعراض ماركات أخرى أو العودة للقائمة الرئيسية:"
                : "You may browse other brands or return to the main menu:";
              await this.aisensyService.sendQuickReplyMessage(phoneNumber, navPrompt, navButtons);
            }
          } else {
            await this.aisensyService.sendQuickReplyMessage(phoneNumber, caption, navButtons);
          }
        } else {
          // Regular watch card before the last one
          if (validImage) {
            try {
              await this.aisensyService.sendImageMessage(phoneNumber, validImage, caption);
            } catch {
              await this.aisensyService.sendTextMessage(phoneNumber, caption);
            }
          } else {
            await this.aisensyService.sendTextMessage(phoneNumber, caption);
          }

          // Delay 1200ms to guarantee strict sequential delivery on WhatsApp
          await new Promise((resolve) => setTimeout(resolve, 1200));
        }
      }

      return {
        success: true,
        handled: true,
        messageSent: true,
        nextStep: "BROWSE_CATALOG",
      };
    } catch (error: any) {
      logger.error("[Flow:BrowseWatchesStep] Error fetching products", { error: error.message, payload });

      const fallbackText = isAr
        ? "حدث خطأ أثناء تحميل الساعات، يرجى المحاولة مرة أخرى."
        : "An error occurred while loading watches. Please try again.";

      await this.aisensyService.sendQuickReplyMessage(phoneNumber, fallbackText, [
        { text: isAr ? "ماركات أخرى" : "Other Brands", payload: "menu_browse_catalog" },
        { text: isAr ? "القائمة الرئيسية" : "Main Menu", payload: "menu_main" },
      ]);

      return {
        success: false,
        handled: true,
        messageSent: true,
        nextStep: "BROWSE_CATALOG",
        error: error.message,
      };
    }
  }
}

export const browseWatchesStep = new BrowseWatchesStep();
