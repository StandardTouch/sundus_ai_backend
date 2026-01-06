/**
 * Alhomaidhi Product API Client
 * Low-level HTTP client for product-related endpoints
 */

import axios, { type AxiosInstance } from "axios";
import { alhomaidhiConfig, validateAlhomaidhiConfig } from "../../config/alhomaidhi.config.js";
import { logger } from "../../utils/logger.js";

/**
 * Product API response types
 */
export interface ProductDetails {
  product_id: number;
  name: string;
  slug: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price?: string;
  discount_percentage?: string;
  on_sale: boolean;
  stock_status: string;
  stock_quantity: number;
  description: string;
  short_description: string;
  lang: string;
}

export interface ProductImage {
  id: number;
  name: string;
  src: string;
  alt: string;
}

export interface Brand {
  id: number;
  name: string;
  slug: string;
}

export interface Product {
  product_details: ProductDetails;
  images: ProductImage[];
  brands: Brand[];
  related_product_ids: number[];
}

export interface ProductListResponse {
  status: string;
  message: Product[];
  tot_count?: number;
}

export interface ProductDetailResponse {
  status: string;
  message: Product;
}

export interface BrandResponse {
  status: string;
  message: Array<{
    id: number;
    name: string;
    img: string;
  }>;
}

/**
 * Alhomaidhi Product API Client
 */
export class AlhomaidhiProductAPI {
  private client: AxiosInstance;

  constructor() {
    validateAlhomaidhiConfig();
    
    this.client = axios.create({
      baseURL: alhomaidhiConfig.baseUrl,
      timeout: alhomaidhiConfig.timeout,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": alhomaidhiConfig.apiKey,
        "user_id": alhomaidhiConfig.defaultUserId,
        "Cookie": `pll_language=${alhomaidhiConfig.defaultLanguage}`,
      },
    });
  }

  /**
   * Search products
   */
  async searchProducts(query: string, options?: {
    sort_by?: string;
    page?: number;
    per_page?: number;
    brand_filter?: number; // Brand ID for filtering products by brand
    min_price?: number; // Minimum price filter
    max_price?: number; // Maximum price filter
  }): Promise<ProductListResponse> {
    try {
      const params: any = {
        search: query,
      };

      if (options?.sort_by) {
        params.sort_by = options.sort_by;
      }
      if (options?.page) {
        params.page = options.page;
      }
      if (options?.per_page) {
        params.per_page = options.per_page;
      }
      if (options?.brand_filter) {
        params.brand_filter = options.brand_filter;
      }
      if (options?.min_price !== undefined) {
        params.min_price = options.min_price;
      }
      if (options?.max_price !== undefined) {
        params.max_price = options.max_price;
      }

      // Add explicit timeout wrapper to enforce timeout
      const response = await Promise.race([
        this.client.get<ProductListResponse>("/list_products", { params }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Alhomaidhi API timeout")), alhomaidhiConfig.timeout)
        )
      ]);

      logger.info("Alhomaidhi product search successful", {
        query,
        resultCount: response.data.message?.length || 0,
        status: response.data.status
      });

      return response.data;
    } catch (error: any) {
      logger.error("Alhomaidhi product search error", { error, query });
      throw new Error(`Product search failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get product details by ID
   */
  async getProductDetails(productId: number): Promise<ProductDetailResponse> {
    try {
      // Add explicit timeout wrapper to enforce timeout
      const response = await Promise.race([
        this.client.get<ProductDetailResponse>("/retrieve_product", {
          params: { product_id: productId }
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Alhomaidhi API timeout")), alhomaidhiConfig.timeout)
        )
      ]);

      logger.info("Alhomaidhi product details retrieved", {
        productId,
        status: response.data.status
      });

      return response.data;
    } catch (error: any) {
      logger.error("Alhomaidhi product details error", { error, productId });
      throw new Error(`Get product details failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * List all brands
   */
  async listBrands(): Promise<BrandResponse> {
    try {
      const response = await this.client.get<BrandResponse>("/retrieve_brands");

      logger.info("Alhomaidhi brands retrieved", {
        brandCount: response.data.message?.length || 0,
        status: response.data.status
      });

      return response.data;
    } catch (error: any) {
      logger.error("Alhomaidhi brands error", { error });
      throw new Error(`List brands failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

