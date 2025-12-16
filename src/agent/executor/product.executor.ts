/**
 * Product Tool Executor
 * Executes product-related tools when called by AI
 */

import { productService } from "../../services/product.service.js";
import { logger } from "../../utils/logger.js";

/**
 * Execute product tool
 */
export async function executeProductTool(
  toolName: string,
  args: any
): Promise<{ success: boolean; result: any; error?: string }> {
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
        const formatted = productService.formatProductsForAI(products, 5);

        return {
          success: true,
          result: formatted
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
          return {
            success: false,
            result: null,
            error: `Product with ID ${product_id} not found`
          };
        }

        const formatted = productService.formatProductForAI(product);

        return {
          success: true,
          result: formatted
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
          result: `Available brands:\n${formatted}`
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

