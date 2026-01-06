/**
 * Product Service
 * Business logic for product operations
 */

import { AlhomaidhiProductAPI } from "../api/alhomaidhi/product.api.js";
import { logger } from "../utils/logger.js";
import type { Product, ProductListResponse, ProductDetailResponse, BrandResponse } from "../api/alhomaidhi/product.api.js";

/**
 * Product Service
 * Handles product search, details, and brand listing
 */
export class ProductService {
  private api: AlhomaidhiProductAPI;

  constructor() {
    this.api = new AlhomaidhiProductAPI();
  }

  /**
   * Search products by query
   * @param query - Search query
   * @param limit - Maximum number of products to return
   * @param brandId - Optional brand ID to filter by brand
   * @param minPrice - Optional minimum price filter
   * @param maxPrice - Optional maximum price filter
   */
  async searchProducts(
    query: string, 
    limit: number = 5, 
    brandId?: number,
    minPrice?: number,
    maxPrice?: number
  ): Promise<Product[]> {
    try {
      const response: ProductListResponse = await this.api.searchProducts(query, {
        per_page: limit,
        ...(brandId && { brand_filter: brandId }),
        ...(minPrice !== undefined && { min_price: minPrice }),
        ...(maxPrice !== undefined && { max_price: maxPrice })
      });

      if (response.status !== "APP00") {
        logger.warn("Product search returned non-success status", { status: response.status, query });
        return [];
      }

      const products = response.message || [];
      
      // Log image data for debugging
      products.forEach((product, index) => {
        logger.info("Product images from API", {
          query,
          productIndex: index,
          productId: product.product_details?.product_id,
          productName: product.product_details?.name,
          imageCount: product.images?.length || 0,
          firstImageSrc: product.images?.[0]?.src,
          hasImages: !!(product.images && product.images.length > 0)
        });
      });

      return products;
    } catch (error) {
      logger.error("Product service searchProducts error", { error, query });
      throw error;
    }
  }

  /**
   * Get product details by ID
   */
  async getProductDetails(productId: number): Promise<Product | null> {
    try {
      const response: ProductDetailResponse = await this.api.getProductDetails(productId);

      if (response.status !== "APP00") {
        logger.warn("Get product details returned non-success status", { status: response.status, productId });
        return null;
      }

      const product = response.message || null;
      
      // Log image data for debugging
      if (product) {
        logger.info("Product images from API (single product)", {
          productId,
          productName: product.product_details?.name,
          imageCount: product.images?.length || 0,
          firstImageSrc: product.images?.[0]?.src,
          hasImages: !!(product.images && product.images.length > 0),
          allImageSrcs: product.images?.map(img => img.src) || []
        });
      }

      return product;
    } catch (error) {
      logger.error("Product service getProductDetails error", { error, productId });
      throw error;
    }
  }

  /**
   * List all brands
   */
  async listBrands(): Promise<Array<{ id: number; name: string; img: string }>> {
    try {
      const response: BrandResponse = await this.api.listBrands();

      if (response.status !== "APP00") {
        logger.warn("List brands returned non-success status", { status: response.status });
        return [];
      }

      return response.message || [];
    } catch (error) {
      logger.error("Product service listBrands error", { error });
      throw error;
    }
  }

  /**
   * Format product for AI response
   * WhatsApp-friendly formatting (no markdown links)
   */
  formatProductForAI(product: Product): string {
    const details = product.product_details;
    const brandNames = product.brands.map(b => b.name).join(", ");
    const imageCount = product.images.length;
    const productUrl = `https://alhomaidhigroup.com/product/${details.slug}`;

    // WhatsApp-friendly format: use * for bold, plain URLs
    let formatted = `*${details.name}*\n\n`;
    formatted += `SKU: ${details.sku}\n`;
    
    if (brandNames) {
      formatted += `Brand: ${brandNames}\n`;
    }

    formatted += `Price: ${details.price} SAR\n`;
    
    if (details.on_sale && details.sale_price) {
      formatted += `Original Price: ${details.regular_price} SAR\n`;
      formatted += `Sale Price: *${details.sale_price} SAR*\n`;
      if (details.discount_percentage) {
        formatted += `Discount: ${details.discount_percentage}\n`;
      }
    }

    formatted += `Stock: ${details.stock_status === "instock" ? "✅ In Stock" : "❌ Out of Stock"}\n`;
    
    if (details.stock_quantity > 0) {
      formatted += `Available Quantity: ${details.stock_quantity}\n`;
    }

    if (details.short_description) {
      formatted += `\n${details.short_description}\n`;
    }

    formatted += `\n🛒 Purchase: ${productUrl}`;
    
    if (imageCount > 0) {
      formatted += `\n\n(${imageCount} image${imageCount > 1 ? "s" : ""} available)`;
    }

    return formatted;
  }

  /**
   * Format multiple products for AI response
   * WhatsApp-friendly formatting (no markdown links)
   */
  formatProductsForAI(products: Product[], maxProducts: number = 5): string {
    if (!products || products.length === 0) {
      return "No products found matching your search.";
    }

    const displayProducts = products.slice(0, maxProducts);
    const formattedProducts = displayProducts.map((product, index) => {
      const details = product.product_details;
      const brandNames = product.brands.map(b => b.name).join(", ");
      const productUrl = `https://alhomaidhigroup.com/product/${details.slug}`;

      // WhatsApp-friendly format: plain text with emojis, no markdown
      let productText = `${index + 1}. *${details.name}*\n`;
      productText += `   SKU: ${details.sku}\n`;
      if (brandNames) {
        productText += `   Brand: ${brandNames}\n`;
      }
      productText += `   Price: ${details.price} SAR\n`;
      productText += `   🛒 ${productUrl}`;
      
      return productText;
    });

    let result = `Found ${products.length} product${products.length > 1 ? "s" : ""}:\n\n`;
    result += formattedProducts.join("\n\n");

    if (products.length > maxProducts) {
      result += `\n\n... and ${products.length - maxProducts} more product${products.length - maxProducts > 1 ? "s" : ""}.`;
    }

    return result;
  }
}

export const productService = new ProductService();

