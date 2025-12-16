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
   */
  async searchProducts(query: string, limit: number = 5): Promise<Product[]> {
    try {
      const response: ProductListResponse = await this.api.searchProducts(query, {
        per_page: limit
      });

      if (response.status !== "APP00") {
        logger.warn("Product search returned non-success status", { status: response.status, query });
        return [];
      }

      return response.message || [];
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

      return response.message || null;
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
   */
  formatProductForAI(product: Product): string {
    const details = product.product_details;
    const brandNames = product.brands.map(b => b.name).join(", ");
    const imageCount = product.images.length;
    const productUrl = `https://alhomaidhigroup.com/product/${details.slug}`;

    let formatted = `Product: ${details.name}\n`;
    formatted += `SKU: ${details.sku}\n`;
    
    if (brandNames) {
      formatted += `Brand(s): ${brandNames}\n`;
    }

    formatted += `Price: ${details.price} SAR\n`;
    
    if (details.on_sale && details.sale_price) {
      formatted += `Original Price: ${details.regular_price} SAR\n`;
      formatted += `Sale Price: ${details.sale_price} SAR\n`;
      if (details.discount_percentage) {
        formatted += `Discount: ${details.discount_percentage}\n`;
      }
    }

    formatted += `Stock: ${details.stock_status === "instock" ? "In Stock" : "Out of Stock"}\n`;
    
    if (details.stock_quantity > 0) {
      formatted += `Available Quantity: ${details.stock_quantity}\n`;
    }

    if (details.short_description) {
      formatted += `\nDescription: ${details.short_description}\n`;
    }

    formatted += `\n🛒 Purchase Link:\n${productUrl}\n`;
    
    if (imageCount > 0) {
      formatted += `\n(${imageCount} image${imageCount > 1 ? "s" : ""} available)`;
    }

    return formatted;
  }

  /**
   * Format multiple products for AI response
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

      return `${index + 1}. ${details.name} (SKU: ${details.sku})${brandNames ? ` - ${brandNames}` : ""}\n   Price: ${details.price} SAR\n   🛒 Purchase: ${productUrl}`;
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

