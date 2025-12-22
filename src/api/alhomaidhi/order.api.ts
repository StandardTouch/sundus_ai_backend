/**
 * Alhomaidhi Order API Client
 * Low-level HTTP client for order-related endpoints
 */

import axios, { type AxiosInstance } from "axios";
import { alhomaidhiConfig, validateAlhomaidhiConfig } from "../../config/alhomaidhi.config.js";
import { logger } from "../../utils/logger.js";

/**
 * Order API response types
 */
export interface OrderDetails {
  order_id: string; // Format: "#6956"
  order_placed_date: string; // ISO timestamp
  order_date_modified: string; // ISO timestamp
  order_status: string; // WooCommerce status
  total: string;
  total_tax: string;
  discount_total: string;
  discount_tax: string;
  cart_tax: string;
}

export interface BillingDetails {
  first_name: string;
  last_name: string;
  company: string;
  address_1: string;
  address_2: string;
  city: string;
  state: string;
  postcode: string;
  email: string;
  phone: string;
}

export interface PaymentDetails {
  payment_method: string;
  payment_method_title: string;
  date_paid: string; // ISO timestamp
  pay_latter_link: string;
}

export interface OrderItem {
  item_name: string;
  product_id: number;
  quantity: number;
  subtotal: string;
  subtotal_tax: string;
  total: string;
  total_tax: string;
  sku: string;
  image: string;
}

export interface Order {
  order_details: OrderDetails;
  billing_details: BillingDetails;
  payment_details: PaymentDetails;
  items: OrderItem[];
}

export interface OrderListResponse {
  status: string; // "APP00" for success, "APP003" for no orders
  message: Order[] | string; // Array of orders OR error message string
}

/**
 * Alhomaidhi Order API Client
 */
export class AlhomaidhiOrderAPI {
  private client: AxiosInstance;

  constructor() {
    validateAlhomaidhiConfig();
    this.client = axios.create({
      baseURL: alhomaidhiConfig.baseUrl,
      timeout: alhomaidhiConfig.timeout,
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "Authorization": alhomaidhiConfig.orderApiKey, // Use order API key
      },
    });
  }

  /**
   * List orders by phone number
   * 
   * @param phoneNumber - User's phone number (e.g., "6361375923")
   * @param options - Optional query parameters
   * @returns Array of orders for that phone number
   */
  async listOrders(
    phoneNumber: string,
    options?: {
      sort_by?: "asc" | "desc";
      page?: string;
      per_page?: string;
    }
  ): Promise<OrderListResponse> {
    try {
      // Remove + prefix if present
      let cleanPhoneNumber = phoneNumber.replace(/^\+/, "");
      
      // Remove country code prefixes (API expects phone number without country code)
      // Common country codes: 966 (Saudi Arabia), 91 (India), 1 (US/Canada)
      // Only remove if the number is longer than expected (has country code)
      if (cleanPhoneNumber.startsWith("966") && cleanPhoneNumber.length > 10) {
        cleanPhoneNumber = cleanPhoneNumber.substring(3); // Remove 966
      } else if (cleanPhoneNumber.startsWith("91") && cleanPhoneNumber.length > 10) {
        cleanPhoneNumber = cleanPhoneNumber.substring(2); // Remove 91
      } else if (cleanPhoneNumber.startsWith("1") && cleanPhoneNumber.length > 10) {
        cleanPhoneNumber = cleanPhoneNumber.substring(1); // Remove 1
      }
      
      logger.info("Phone number cleaned for order API", {
        original: phoneNumber,
        cleaned: cleanPhoneNumber
      });
      
      const params: any = {
        search: cleanPhoneNumber,
        sort_by: options?.sort_by || "asc",
        page: options?.page !== undefined ? options.page : "",
        per_page: options?.per_page !== undefined ? options.per_page : "null",
      };

      const response = await this.client.get<OrderListResponse>("/list_orders_temp", {
        params,
        headers: {
          "phone_number": cleanPhoneNumber, // Required header
          "Cookie": `pll_language=${alhomaidhiConfig.defaultLanguage}`,
        },
      });

      // Handle "no orders" response (status APP003 with string message)
      if (response.data.status === "APP003" && typeof response.data.message === "string") {
        logger.info("No orders found for phone number", {
          phoneNumber: cleanPhoneNumber,
          status: response.data.status,
          message: response.data.message
        });
        // Return empty array in message field for consistency
        return {
          status: response.data.status,
          message: []
        };
      }

      // Handle "user not found" response (status APP002 with string message)
      if (response.data.status === "APP002" && typeof response.data.message === "string") {
        logger.info("User not found for phone number", {
          phoneNumber: cleanPhoneNumber,
          status: response.data.status,
          message: response.data.message
        });
        // Return empty array in message field for consistency
        return {
          status: response.data.status,
          message: []
        };
      }

      logger.info("Alhomaidhi order list retrieved", {
        phoneNumber: cleanPhoneNumber,
        orderCount: Array.isArray(response.data.message) ? response.data.message.length : 0,
        status: response.data.status
      });

      return response.data;
    } catch (error: any) {
      logger.error("Alhomaidhi order list error", { 
        error: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        fullURL: `${error.config?.baseURL}${error.config?.url}`,
        params: error.config?.params,
        phoneNumber 
      });
      
      // Preserve error information for better error handling upstream
      const enhancedError: any = new Error(`Order list failed: ${error.response?.data?.message || error.message || 'Unknown error'}`);
      enhancedError.originalError = error;
      enhancedError.status = error.response?.status || error.status;
      enhancedError.isServiceUnavailable = 
        enhancedError.status === 404 ||
        enhancedError.status === 500 ||
        error.code === "ECONNREFUSED" ||
        error.code === "ENOTFOUND" ||
        error.message?.includes("timeout");
      throw enhancedError;
    }
  }

  /**
   * Get order by ID
   * Searches orders by phone number and filters by order_id
   * 
   * @param orderId - Order ID (e.g., "6317" or "#6317")
   * @param phoneNumber - User's phone number
   * @returns Order details if found, null otherwise
   */
  async getOrderById(
    orderId: string,
    phoneNumber: string
  ): Promise<Order | null> {
    try {
      // Remove # prefix if present
      const cleanOrderId = orderId.replace(/^#/, "");
      
      // Get all orders for this phone number (listOrders will clean the phone number)
      const ordersResponse = await this.listOrders(phoneNumber);
      
      if (!ordersResponse.message || ordersResponse.message.length === 0) {
        logger.info("No orders found for phone number", { phoneNumber });
        return null;
      }

      // Find order matching the order_id
      const order = ordersResponse.message.find(o => {
        const orderIdFromResponse = o.order_details.order_id.replace(/^#/, "");
        return orderIdFromResponse === cleanOrderId;
      });

      if (!order) {
        logger.info("Order not found", { orderId: cleanOrderId, phoneNumber });
        return null;
      }

      logger.info("Alhomaidhi order retrieved by ID", {
        orderId: cleanOrderId,
        phoneNumber,
        status: order.order_details.order_status
      });

      return order;
    } catch (error: any) {
      logger.error("Alhomaidhi get order by ID error", { error, orderId, phoneNumber });
      throw new Error(`Get order failed: ${error.response?.data?.message || error.message}`);
    }
  }
}

export const alhomaidhiOrderAPI = new AlhomaidhiOrderAPI();

