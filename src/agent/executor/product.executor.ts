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

        // First, get all available brands to check if query contains a brand name
        const allBrands = await productService.listBrands();
        const brandNames = allBrands.map(b => b.name.toLowerCase());
        
        // Extract potential brand names from query (case-insensitive matching)
        const queryLower = query.toLowerCase().trim();
        const queryWords = queryLower.split(/\s+/);
        
        // Try to match brand names - check if query contains a brand name or starts with one
        let detectedBrand: string | null = null;
        let matchedBrandName: string | null = null; // Original brand name (for logging)
        
        // First, try exact match or contains match
        for (const brand of allBrands) {
          const brandLower = brand.name.toLowerCase();
          // Check if query contains the full brand name
          if (queryLower.includes(brandLower)) {
            detectedBrand = brandLower;
            matchedBrandName = brand.name;
            break;
          }
          // Check if brand name contains the first word(s) of the query (for "Tommy Hilfiger" matching "Tommy")
          if (queryWords.length > 0 && brandLower.includes(queryWords[0])) {
            // Make sure it's a reasonable match (not too short)
            if (queryWords[0].length >= 3 && brandLower.startsWith(queryWords[0])) {
              detectedBrand = brandLower;
              matchedBrandName = brand.name;
              break;
            }
          }
        }
        
        logger.info("Product search - brand detection", {
          query,
          detectedBrand,
          matchedBrandName,
          allBrandsCount: brandNames.length
        });

        // Search products with the original query
        const products = await productService.searchProducts(query, 10); // Get more results for filtering
        
        // Filter products by brand if a brand was detected in the query
        let filteredProducts = products;
        if (detectedBrand && products.length > 0) {
          filteredProducts = products.filter(product => {
            const productBrands = product.brands.map(b => b.name.toLowerCase());
            // Strict matching: product must have the exact detected brand
            return productBrands.some(brand => brand === detectedBrand);
          });
          
          logger.info("Product search - brand filtering", {
            query,
            detectedBrand,
            matchedBrandName,
            originalCount: products.length,
            filteredCount: filteredProducts.length,
            filteredBrands: filteredProducts.map(p => p.brands.map(b => b.name))
          });
          
          // If filtering resulted in no products, log a warning
          if (filteredProducts.length === 0 && products.length > 0) {
            logger.warn("Brand filtering removed all products - brand may not exist in results", {
              query,
              detectedBrand,
              matchedBrandName,
              originalProductsBrands: products.map(p => p.brands.map(b => b.name))
            });
          }
        }
        
        // Detect if user is asking for a single product
        // Reuse queryLower from above (already defined at line 47)
        const singleProductKeywords = [
          'a watch', 'one watch', 'single watch', 'one product', 'a product',
          'most affordable', 'cheapest', 'best price', 'lowest price',
          'most affordable watch', 'cheapest watch', 'best watch', 'one option',
          'show me one', 'give me one', 'send me one', 'just one'
        ];
        const isSingleProductRequest = singleProductKeywords.some(keyword => 
          queryLower.includes(keyword)
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
              const priceA = parseFloat(a.product_details.price.replace(/[^0-9.]/g, '')) || 0;
              const priceB = parseFloat(b.product_details.price.replace(/[^0-9.]/g, '')) || 0;
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
            result: `I couldn't find products matching "${query}". However, here are some similar products you might be interested in:\n\n${formatted}`,
            should_send_feedback: true // Similar products found - task completed
          };
          }

          // If still no results, suggest browsing brands
          const brands = await productService.listBrands();
          if (brands.length > 0) {
            const brandList = brands.slice(0, 5).map((b, i) => `${i + 1}. ${b.name}`).join("\n");
          return {
            success: true,
            result: `I couldn't find products matching "${query}". We don't have that specific product in our catalog.\n\nYou might want to browse our available brands:\n${brandList}\n\nOr try searching with different keywords.`,
            should_send_feedback: true // Cannot help - task complete (no products found)
          };
          }

          return {
            success: true,
            result: `I couldn't find products matching "${query}". We don't have that specific product in our catalog. Please try searching with different keywords or ask me about our available brands.`,
            should_send_feedback: true // Cannot help - task complete (no products found)
          };
        }

        // Format response based on single vs multiple products
        let briefSummary: string;
        if (isSingleProduct && finalProducts.length === 1) {
          // Single product - mention it's the most affordable option
          briefSummary = `I found a ${finalProducts[0].product_details.name} for you! I'll send you the details of the most affordable option shortly.`;
        } else {
          // Multiple products
          const productCount = finalProducts.length;
          briefSummary = `Found ${productCount} product${productCount > 1 ? "s" : ""} matching your search. Product images with full details (name, SKU, price, and purchase links) will be sent separately.`;
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
          // Try to find similar products by searching for related terms
          // First, try to get related products if we had the original product
          // Since we don't have it, suggest browsing or searching
          const brands = await productService.listBrands();
          if (brands.length > 0) {
            const brandList = brands.slice(0, 5).map((b, i) => `${i + 1}. ${b.name}`).join("\n");
            return {
              success: true,
              result: `I couldn't find a product with ID ${product_id}. We don't have that specific product in our catalog.\n\nYou might want to:\n- Browse our available brands:\n${brandList}\n- Search for products using keywords\n- Ask me about specific product categories`,
              should_send_feedback: true // Cannot help - task complete (product not found)
            };
          }

          return {
            success: true,
            result: `I couldn't find a product with ID ${product_id}. We don't have that specific product in our catalog. Please try searching for products using keywords or ask me about our available brands.`,
            should_send_feedback: true // Cannot help - task complete (product not found)
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
          isSingleProduct: true,
          should_send_feedback: true // Product found - task completed
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

