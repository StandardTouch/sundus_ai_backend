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
}

/**
 * Execute product tool
 */
export async function executeProductTool(
  toolName: string,
  args: any
): Promise<ProductToolResult> {
  try {
    logger.info("Executing product tool", { toolName, args });

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

        const products = await productService.searchProducts(query, 5);
        
        // If no products found, try to find similar products
        if (products.length === 0) {
          // Try searching for similar terms (e.g., if searching for "Nike watch", try "watch" or "Nike")
          const searchTerms = query.toLowerCase().split(/\s+/);
          let similarProducts: any[] = [];
          
          // Try broader search with individual terms
          for (const term of searchTerms) {
            if (term.length > 2) { // Only search terms longer than 2 characters
              const broaderResults = await productService.searchProducts(term, 3);
              similarProducts = [...similarProducts, ...broaderResults];
            }
          }
          
          // Remove duplicates based on product_id
          const uniqueSimilar = similarProducts.filter((product, index, self) =>
            index === self.findIndex(p => p.product_details.product_id === product.product_details.product_id)
          ).slice(0, 5);

          if (uniqueSimilar.length > 0) {
            const formatted = productService.formatProductsForAI(uniqueSimilar, 5);
            return {
              success: true,
              result: `I couldn't find products matching "${query}". However, here are some similar products you might be interested in:\n\n${formatted}`
            };
          }

          // If still no results, suggest browsing brands
          const brands = await productService.listBrands();
          if (brands.length > 0) {
            const brandList = brands.slice(0, 5).map((b, i) => `${i + 1}. ${b.name}`).join("\n");
            return {
              success: true,
              result: `I couldn't find products matching "${query}". We don't have that specific product in our catalog.\n\nYou might want to browse our available brands:\n${brandList}\n\nOr try searching with different keywords.`
            };
          }

          return {
            success: true,
            result: `I couldn't find products matching "${query}". We don't have that specific product in our catalog. Please try searching with different keywords or ask me about our available brands.`
          };
        }

        // For multiple products, just return a brief summary - images will be sent separately with full details
        const productCount = products.length;
        const briefSummary = `Found ${productCount} product${productCount > 1 ? "s" : ""} matching your search. Product images with full details (name, SKU, price, and purchase links) will be sent separately.`;

        return {
          success: true,
          result: briefSummary,
          products: products,
          isSingleProduct: false // Multiple products
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
          // Try to find similar products by searching for related terms
          // First, try to get related products if we had the original product
          // Since we don't have it, suggest browsing or searching
          const brands = await productService.listBrands();
          if (brands.length > 0) {
            const brandList = brands.slice(0, 5).map((b, i) => `${i + 1}. ${b.name}`).join("\n");
            return {
              success: true,
              result: `I couldn't find a product with ID ${product_id}. We don't have that specific product in our catalog.\n\nYou might want to:\n- Browse our available brands:\n${brandList}\n- Search for products using keywords\n- Ask me about specific product categories`
            };
          }

          return {
            success: true,
            result: `I couldn't find a product with ID ${product_id}. We don't have that specific product in our catalog. Please try searching for products using keywords or ask me about our available brands.`
          };
        }

        // If product found, also check for related products
        let result = productService.formatProductForAI(product);
        
        // Add related products if available
        if (product.related_product_ids && product.related_product_ids.length > 0) {
          const relatedProducts = await Promise.all(
            product.related_product_ids.slice(0, 3).map(id => 
              productService.getProductDetails(id).catch(() => null)
            )
          );
          
          const validRelated = relatedProducts.filter(p => p !== null) as any[];
          if (validRelated.length > 0) {
            result += "\n\nSimilar products you might like:\n";
            validRelated.forEach((p, i) => {
              const details = p.product_details;
              const relatedUrl = `https://alhomaidhigroup.com/product/${details.slug}`;
              result += `${i + 1}. *${details.name}*\n   Price: ${details.price} SAR\n   🛒 ${relatedUrl}\n`;
            });
          }
        }

        return {
          success: true,
          result: result,
          products: [product], // Single product
          isSingleProduct: true
        };
      }

      case "list_brands": {
        const brands = await productService.listBrands();
        
        if (brands.length === 0) {
          return {
            success: true,
            result: "No brands available at the moment."
          };
        }

        const formatted = brands
          .map((brand, index) => `${index + 1}. ${brand.name}`)
          .join("\n");

        return {
          success: true,
          result: `We have ${brands.length} brand${brands.length > 1 ? "s" : ""} available:\n\n${formatted}\n\nYou can search for products from any of these brands by mentioning the brand name.`
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
    logger.error("Product executor error", { error, toolName, args });
    return {
      success: false,
      result: null,
      error: error.message || "Failed to execute product tool"
    };
  }
}

