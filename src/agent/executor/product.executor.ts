/**
 * Product Tool Executor
 * Executes product-related tools when called by AI
 */

import { productService } from "../../services/product.service.js";
import { logger } from "../../utils/logger.js";
import type { Product } from "../../api/alhomaidhi/product.api.js";

/**
 * Product tool result with metadata
 */
export interface ProductToolResult {
  success: boolean;
  result: any;
  error?: string;
  products?: Product[]; // Store product data for image sending
  isSingleProduct?: boolean; // True if single product, false if multiple
  should_send_feedback?: boolean; // Flag indicating if feedback should be sent
}

/**
 * Execute product tool
 */
export async function executeProductTool(
  toolName: string,
  args: any,
  userMessage?: string, // User's original message for context (to detect "show me only 1" etc.)
  userLanguage: "ar" | "en" = "en"
): Promise<ProductToolResult> {
  try {
    logger.info("Executing product tool", { toolName, args, userLanguage });

    switch (toolName) {
      case "search_products": {
        const { query } = args;
        if (!query || typeof query !== "string") {
          return {
            success: false,
            result: null,
            error: "Query parameter is required and must be a string"
          };
        }

        // First, get all available brands
        const allBrands = await productService.listBrands();
        
        // Use AI to extract and understand the brand from the query
        // This handles spelling mistakes, variations, and context understanding
        const { extractBrandFromQuery } = await import("../../utils/brand-extractor.util.js");
        const brandExtraction = await extractBrandFromQuery(query, allBrands);
        
        // Use AI to extract price range from the query
        // Handles phrases like "under 500", "between 300 and 800", etc.
        const { extractPriceRangeFromQuery } = await import("../../utils/price-extractor.util.js");
        const priceRange = await extractPriceRangeFromQuery(query);
        
        let detectedBrand: string | null = null;
        let matchedBrandName: string | null = null;
        let brandId: number | undefined = undefined;
        
        if (brandExtraction) {
          brandId = brandExtraction.brandId;
          detectedBrand = brandExtraction.brandName.toLowerCase();
          matchedBrandName = brandExtraction.brandName;
          
          logger.info("Brand extracted using AI", {
            originalQuery: brandExtraction.originalQuery,
            brandId,
            detectedBrand,
            matchedBrandName
          });
        } else {
          logger.info("No brand detected in query", { query });
        }

        if (priceRange) {
          logger.info("Price range extracted using AI", {
            query,
            minPrice: priceRange.minPrice,
            maxPrice: priceRange.maxPrice
          });
        }

        // Search products - use brand_filter, min_price, and max_price API parameters if detected
        // This uses the API's native filtering instead of filtering results after
        const products = await productService.searchProducts(
          query, 
          10, // Get more results
          brandId, // Use brand_filter parameter in API call (filters at API level)
          priceRange?.minPrice, // Use min_price parameter if price range detected
          priceRange?.maxPrice // Use max_price parameter if price range detected
        );
        
        // If brand was detected but no products found, the brand might not have products
        if (brandId && products.length === 0) {
          logger.warn("Brand filter returned no products", {
            query,
            brandId,
            matchedBrandName
          });
          
          const msg = userLanguage === "ar"
            ? `للأسف، لا تتوفر لدينا ساعات من ماركة ${matchedBrandName} في الوقت الحالي. هل ترغب في الاطلاع على ساعات من ماركات أخرى؟`
            : `Unfortunately, we don't have ${matchedBrandName} watches available at the moment. Would you like to see watches from other brands?`;

          return {
            success: true,
            result: msg,
            should_send_feedback: true // Cannot help - task complete (brand not available)
          };
        }
        
        // No need for additional filtering - API already filtered by brand if brandId was provided
        let filteredProducts = products;
        
        // Detect if user is asking for a single product
        // Check both the query and the user's original message (user might say "show me only 1" but query is just "BOSS")
        const queryLower = query.toLowerCase();
        const userMessageLower = userMessage?.toLowerCase() || '';
        const singleProductKeywords = [
          'a watch', 'one watch', 'single watch', 'one product', 'a product',
          'most affordable', 'cheapest', 'best price', 'lowest price',
          'most affordable watch', 'cheapest watch', 'best watch', 'one option',
          'show me one', 'give me one', 'send me one', 'just one',
          'only 1', 'only one', 'show me only 1', 'show me only one',
          'just 1', 'just show 1', 'just show one', 'show 1', 'show one',
          'i want only 1', 'i want only one', 'give me only 1', 'give me only one',
          'ساعة واحدة', 'ساعه واحده', 'واحدة فقط', 'واحده فقط', 'عرض 1', 'فقط 1', 'أرخص', 'ارخص'
        ];
        const isSingleProductRequest = singleProductKeywords.some(keyword => 
          queryLower.includes(keyword) || userMessageLower.includes(keyword)
        );
        
        logger.info("Product search - single product detection", {
          query,
          isSingleProductRequest,
          productsFound: filteredProducts.length
        });
        
        // If user asks for a single product, return only the cheapest/most affordable one
        let finalProducts = filteredProducts;
        let isSingleProduct = false;
        
        if (isSingleProductRequest && filteredProducts.length > 0) {
          // Sort by price (cheapest first) and take only the first one
          finalProducts = filteredProducts
            .sort((a, b) => {
              const priceA = parseFloat((a.product_details?.price || '0').replace(/[^0-9.]/g, '')) || 0;
              const priceB = parseFloat((b.product_details?.price || '0').replace(/[^0-9.]/g, '')) || 0;
              return priceA - priceB;
            })
            .slice(0, 1);
          isSingleProduct = true;
          
          logger.info("Product search - returning single product (most affordable)", {
            query,
            selectedProduct: finalProducts[0]?.product_details?.name,
            price: finalProducts[0]?.product_details?.price
          });
        } else {
          // Limit to 5 products for multiple product requests
          finalProducts = filteredProducts.slice(0, 5);
        }
        
        // If no products found after filtering, try to find similar products
        if (finalProducts.length === 0) {
          // Try searching for similar terms (e.g., if searching for "Nike watch", try "watch" or "Nike")
          const searchTerms = query.toLowerCase().split(/\s+/);
          let similarProducts: any[] = [];
          
          // Try broader search with individual terms
          for (const term of searchTerms) {
            if (term.length > 2) { // Only search terms longer than 2 characters
              const broaderResults = await productService.searchProducts(term, 3, undefined, undefined, undefined);
              similarProducts = [...similarProducts, ...broaderResults];
            }
          }
          
          // Remove duplicates based on product_id
          const uniqueSimilar = similarProducts.filter((product, index, self) =>
            index === self.findIndex(p => p.product_details.product_id === product.product_details.product_id)
          ).slice(0, 5);

          if (uniqueSimilar.length > 0) {
            const msg = userLanguage === "ar"
              ? `لم نتمكن من العثور على منتجات تطابق "${query}". ولكن إليك بعض المنتجات المشابهة التي قد تهمك:`
              : `I couldn't find products matching "${query}". However, here are some similar products you might be interested in:`;
            // Return similar products with product data so templates can be sent
            return {
              success: true,
              result: msg,
              products: uniqueSimilar,
              isSingleProduct: false, // Multiple similar products
              should_send_feedback: true // Similar products found - task completed
            };
          }

          // If still no results, suggest browsing brands
          const brands = await productService.listBrands();
          if (brands.length > 0) {
            const brandList = brands.slice(0, 5).map((b, i) => `${i + 1}. ${b.name}`).join("\n");
            const msg = userLanguage === "ar"
              ? `لم نتمكن من العثور على منتجات تطابق "${query}". لا يتوفر هذا المنتج في كتالوجنا.\n\nقد ترغب في تصفح الماركات المتاحة لدينا:\n${brandList}\n\nأو حاول البحث باستخدام كلمات رئيسية أخرى.`
              : `I couldn't find products matching "${query}". We don't have that specific product in our catalog.\n\nYou might want to browse our available brands:\n${brandList}\n\nOr try searching with different keywords.`;
            return {
              success: true,
              result: msg,
              should_send_feedback: true // Cannot help - task complete (no products found)
            };
          }

          const msg = userLanguage === "ar"
            ? `لم نتمكن من العثور على منتجات تطابق "${query}". لا يتوفر هذا المنتج في كتالوجنا. يرجى المحاولة باستخدام كلمات بحث أخرى أو سؤالنا عن الماركات المتوفرة.`
            : `I couldn't find products matching "${query}". We don't have that specific product in our catalog. Please try searching with different keywords or ask me about our available brands.`;
          return {
            success: true,
            result: msg,
            should_send_feedback: true // Cannot help - task complete (no products found)
          };
        }

        // Format response based on single vs multiple products
        let briefSummary: string;
        if (isSingleProduct && finalProducts.length === 1) {
          // Single product - mention it's the most affordable option
          const productName = finalProducts[0]?.product_details?.name || (userLanguage === "ar" ? "منتج" : "product");
          briefSummary = userLanguage === "ar"
            ? `عثرت على ${productName} من أجلك! سأرسل لك تفاصيل الخيار الأنسب سعراً قريباً.`
            : `I found a ${productName} for you! I'll send you the details of the most affordable option shortly.`;
        } else {
          // Multiple products
          const productCount = finalProducts.length;
          briefSummary = userLanguage === "ar"
            ? `تم العثور على ${productCount} من المنتجات المطابقة لبحثك. سيتم إرسال صور المنتجات مع التفاصيل الكاملة (الاسم، السعر، ورابط الشراء) بشكل منفصل.`
            : `Found ${productCount} product${productCount > 1 ? "s" : ""} matching your search. Product images with full details (name, SKU, price, and purchase links) will be sent separately.`;
        }

        return {
          success: true,
          result: briefSummary,
          products: finalProducts,
          isSingleProduct: isSingleProduct, // Set based on user request
          should_send_feedback: true // Products found - task completed
        };
      }

      case "get_product_details": {
        const { product_id } = args;
        if (!product_id || typeof product_id !== "number") {
          return {
            success: false,
            result: null,
            error: "product_id parameter is required and must be a number"
          };
        }

        const product = await productService.getProductDetails(product_id);
        
        if (!product) {
          const brands = await productService.listBrands();
          if (brands.length > 0) {
            const brandList = brands.slice(0, 5).map((b, i) => `${i + 1}. ${b.name}`).join("\n");
            const msg = userLanguage === "ar"
              ? `لم نتمكن من العثور على منتج بالرقم ${product_id}. هذا المنتج غير متوفر في كتالوجنا.\n\nقد ترغب في:\n- تصفح الماركات المتاحة لدينا:\n${brandList}\n- البحث عن المنتجات باستخدام الكلمات الرئيسية`
              : `I couldn't find a product with ID ${product_id}. We don't have that specific product in our catalog.\n\nYou might want to:\n- Browse our available brands:\n${brandList}\n- Search for products using keywords\n- Ask me about specific product categories`;
            return {
              success: true,
              result: msg,
              should_send_feedback: true // Cannot help - task complete (product not found)
            };
          }

          const msg = userLanguage === "ar"
            ? `لم نتمكن من العثور على منتج بالرقم ${product_id}. هذا المنتج غير متوفر في كتالوجنا. يرجى محاولة البحث باستخدام الكلمات الرئيسية.`
            : `I couldn't find a product with ID ${product_id}. We don't have that specific product in our catalog. Please try searching for products using keywords or ask me about our available brands.`;
          return {
            success: true,
            result: msg,
            should_send_feedback: true // Cannot help - task complete (product not found)
          };
        }

        // If product found, also check for related products
        let result = productService.formatProductForAI(product, userLanguage);
        
        // Add related products if available
        if (product.related_product_ids && product.related_product_ids.length > 0) {
          const relatedProducts = await Promise.all(
            product.related_product_ids.slice(0, 3).map(id => 
              productService.getProductDetails(id).catch(() => null)
            )
          );
          
          const validRelated = relatedProducts.filter(p => p !== null) as any[];
          if (validRelated.length > 0) {
            result += userLanguage === "ar" ? "\n\nمنتجات مشابهة قد تعجبك:\n" : "\n\nSimilar products you might like:\n";
            validRelated.forEach((p, i) => {
              const details = p.product_details;
              const relatedUrl = `https://alhomaidhigroup.com/product/${details.slug}`;
              const priceLabel = userLanguage === "ar" ? "السعر:" : "Price:";
              result += `${i + 1}. *${details.name}*\n   ${priceLabel} ${details.price} SAR\n   🛒 ${relatedUrl}\n`;
            });
          }
        }

        return {
          success: true,
          result: result,
          products: [product], // Single product
          isSingleProduct: true,
          should_send_feedback: true // Product found - task completed
        };
      }

      case "list_brands": {
        const brands = await productService.listBrands();
        
        if (brands.length === 0) {
          const msg = userLanguage === "ar" ? "لا تتوفر ماركات حالياً." : "No brands available at the moment.";
          return {
            success: true,
            result: msg
          };
        }

        const formatted = brands
          .map((brand, index) => `${index + 1}. ${brand.name}`)
          .join("\n");

        const msg = userLanguage === "ar"
          ? `تتوفر لدينا الماركات التالية (${brands.length}):\n\n${formatted}\n\nيمكنك البحث عن منتجات أي من هذه الماركات عن طريق ذكر اسم الماركة.`
          : `We have ${brands.length} brand${brands.length > 1 ? "s" : ""} available:\n\n${formatted}\n\nYou can search for products from any of these brands by mentioning the brand name.`;

        return {
          success: true,
          result: msg
        };
      }

      default:
        return {
          success: false,
          result: null,
          error: `Unknown product tool: ${toolName}`
        };
    }
  } catch (error: any) {
    logger.error("Product executor error", { 
      error: error?.message || error?.toString() || String(error),
      errorStack: error?.stack,
      errorType: error?.constructor?.name,
      errorStringified: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      toolName, 
      args 
    });
    return {
      success: false,
      result: null,
      error: error?.message || error?.toString() || "Failed to execute product tool"
    };
  }
}

