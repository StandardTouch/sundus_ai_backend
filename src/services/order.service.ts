/**
 * Order Service
 * Business logic for order operations
 */

import { alhomaidhiOrderAPI } from "../api/alhomaidhi/order.api.js";
import type { Order, OrderItem, AramexDetail } from "../api/alhomaidhi/order.api.js";
import { logger } from "../utils/logger.js";

/**
 * Order Service
 */
export class OrderService {
  private api: typeof alhomaidhiOrderAPI;

  constructor() {
    this.api = alhomaidhiOrderAPI;
  }

  /**
   * List all orders for a phone number
   */
  async listOrders(phoneNumber: string): Promise<Order[]> {
    try {
      const response = await this.api.listOrders(phoneNumber, {
        sort_by: "desc", // Most recent first
        page: "", // Empty string for all orders
        per_page: "null", // Get all orders
      });

      console.log("Alhomaidhi order list response", response);

      if (response.status === "APP001" || response.status === "APP002") {
        logger.info("Phone number not registered in AlHomaidhi system", { phoneNumber, status: response.status });
        const error = new Error("NUMBER_NOT_REGISTERED");
        (error as any).isNotRegistered = true;
        throw error;
      }

      // Handle "no orders" response (APP003) - this is a valid response, not an error
      if (response.status === "APP003") {
        logger.info("No orders found for phone number", { phoneNumber });
        return [];
      }

      // Check for other error statuses
      if (response.status !== "APP00") {
        throw new Error(`Order API returned status: ${response.status}`);
      }

      // Ensure message is an array (should be after handling APP003)
      return Array.isArray(response.message) ? response.message : [];
    } catch (error: any) {
      logger.error("Order service listOrders error", { error, phoneNumber });
      // Preserve error information for better error handling
      const errorWithStatus = error as any;
      // Check both the error object and nested originalError
      const errorStatus = errorWithStatus.status || errorWithStatus.originalError?.status || errorWithStatus.response?.status;
      const errorCode = errorWithStatus.code || errorWithStatus.originalError?.code;
      const errorMessage = errorWithStatus.message || errorWithStatus.originalError?.message || String(errorWithStatus);
      
      errorWithStatus.isServiceUnavailable = 
        errorStatus === 404 ||
        errorStatus === 500 ||
        errorCode === "ECONNREFUSED" ||
        errorCode === "ENOTFOUND" ||
        errorCode === "ETIMEDOUT" ||
        errorMessage.includes("timeout") ||
        errorMessage.includes("404") ||
        errorMessage.includes("500") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("ENOTFOUND");
      
      // Preserve status for executor
      errorWithStatus.status = errorStatus;
      errorWithStatus.code = errorCode;
      
      throw errorWithStatus;
    }
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string, phoneNumber: string): Promise<Order | null> {
    try {
      return await this.api.getOrderById(orderId, phoneNumber);
    } catch (error) {
      logger.error("Order service getOrderById error", { error, orderId, phoneNumber });
      throw error;
    }
  }

  /**
   * Format order status for display
   */
  formatOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
      "wc-completed": "Completed",
      "wc-processing": "Processing",
      "wc-pending": "Pending",
      "wc-on-hold": "On Hold",
      "wc-cancelled": "Cancelled",
      "wc-refunded": "Refunded",
      "wc-failed": "Failed",
    };

    return statusMap[status] || status;
  }

  /**
   * Format order status for Arabic
   */
  formatOrderStatusArabic(status: string): string {
    const statusMap: Record<string, string> = {
      "wc-completed": "مكتمل",
      "wc-processing": "قيد المعالجة",
      "wc-pending": "قيد الانتظار",
      "wc-on-hold": "معلق",
      "wc-cancelled": "ملغي",
      "wc-refunded": "مسترد",
      "wc-failed": "فشل",
    };

    return statusMap[status] || status;
  }

  /**
   * Format order description from items
   * Example: "Gucci watches with 2 other items"
   */
  formatOrderDescription(order: Order): string {
    const items = order.items || [];
    
    if (items.length === 0) {
      return "Empty order";
    }

    if (items.length === 1) {
      return items[0].item_name;
    }

    // First item name + "with X other items"
    const firstItem = items[0].item_name;
    const otherCount = items.length - 1;
    
    return `${firstItem} with ${otherCount} other item${otherCount > 1 ? "s" : ""}`;
  }

  /**
   * Format order description for Arabic
   */
  formatOrderDescriptionArabic(order: Order): string {
    const items = order.items || [];
    
    if (items.length === 0) {
      return "طلب فارغ";
    }

    if (items.length === 1) {
      return items[0].item_name;
    }

    // First item name + "مع X عناصر أخرى"
    const firstItem = items[0].item_name;
    const otherCount = items.length - 1;
    
    return `${firstItem} مع ${otherCount} عنصر${otherCount > 1 ? "ات" : ""} آخر${otherCount > 1 ? "ة" : ""}`;
  }

  /**
   * Get customer name from order
   */
  getCustomerName(order: Order): string {
    const billing = order.billing_details;
    const firstName = billing.first_name || "";
    const lastName = billing.last_name || "";
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`.trim();
    }
    
    return firstName || lastName || "Customer";
  }

  /**
   * Format order for AI response
   */
  formatOrderForAI(order: Order, language: "ar" | "en" = "en"): string {
    const orderId = order.order_details.order_id;
    const status = language === "ar"
      ? this.formatOrderStatusArabic(order.order_details.order_status)
      : this.formatOrderStatus(order.order_details.order_status);
    const total = order.order_details.total;
    const items = order.items || [];
    const itemCount = items.length;

    if (language === "ar") {
      let formatted = `*الطلب رقم ${orderId}*\n\n`;
      formatted += `الحالة: ${status}\n`;
      formatted += `الإجمالي: ${total} ريال\n`;
      formatted += `عدد العناصر: ${itemCount}\n`;
      
      if (items.length > 0) {
        formatted += `\nالعناصر:\n`;
        items.forEach((item, index) => {
          formatted += `${index + 1}. ${item.item_name} (الكمية: ${item.quantity})\n`;
        });
      }

      if (this.isAramexOrder(order)) {
        const trackingNumber = this.getPrimaryTrackingNumber(order);
        if (trackingNumber) {
          formatted += `\nرقم التتبع: ${trackingNumber}\n`;
          formatted += `شركة الشحن: أرامكس\n`;
        }
      }

      return formatted;
    }

    let formatted = `*Order ${orderId}*\n\n`;
    formatted += `Status: ${status}\n`;
    formatted += `Total: ${total} SAR\n`;
    formatted += `Items: ${itemCount} item${itemCount > 1 ? "s" : ""}\n`;
    
    if (items.length > 0) {
      formatted += `\nItems:\n`;
      items.forEach((item, index) => {
        formatted += `${index + 1}. ${item.item_name} (Qty: ${item.quantity})\n`;
      });
    }

    // Add Aramex tracking information if available
    if (this.isAramexOrder(order)) {
      const trackingNumber = this.getPrimaryTrackingNumber(order);
      if (trackingNumber) {
        formatted += `\nTracking Number: ${trackingNumber}\n`;
        formatted += `Shipping: Aramex\n`;
      }
    }

    return formatted;
  }

  /**
   * Format multiple orders for AI response
   */
  formatOrdersForAI(orders: Order[], language: "ar" | "en" = "en"): string {
    if (orders.length === 0) {
      return language === "ar" ? "ليس لديك أي طلبات حتى الآن." : "You don't have any orders yet.";
    }

    if (language === "ar") {
      let formatted = `لديك ${orders.length} طلبات:\n\n`;
      orders.forEach((order, index) => {
        const orderId = order.order_details.order_id;
        const status = this.formatOrderStatusArabic(order.order_details.order_status);
        formatted += `${index + 1}. الطلب رقم ${orderId} - ${status}\n`;
      });
      return formatted;
    }

    let formatted = `You have ${orders.length} order${orders.length > 1 ? "s" : ""}:\n\n`;
    
    orders.forEach((order, index) => {
      const orderId = order.order_details.order_id;
      const status = this.formatOrderStatus(order.order_details.order_status);
      formatted += `${index + 1}. Order ${orderId} - ${status}\n`;
    });

    return formatted;
  }

  /**
   * Check if order is an Aramex order
   */
  isAramexOrder(order: Order): boolean {
    return order.order_details.is_aramex_order === true;
  }

  /**
   * Get Aramex details for an order
   * Returns empty array if not an Aramex order
   */
  getAramexDetails(order: Order): AramexDetail[] {
    if (!this.isAramexOrder(order)) {
      return [];
    }
    return order.order_details.aramex_details || [];
  }

  /**
   * Get primary tracking number from Aramex details
   * Returns null if not an Aramex order or no tracking number
   */
  getPrimaryTrackingNumber(order: Order): string | null {
    const aramexDetails = this.getAramexDetails(order);
    if (aramexDetails.length === 0) {
      return null;
    }
    // Return the first tracking number (primary one)
    return aramexDetails[0]?.tracking_num || null;
  }

  /**
   * Get all tracking numbers from Aramex details
   */
  getAllTrackingNumbers(order: Order): string[] {
    const aramexDetails = this.getAramexDetails(order);
    if (aramexDetails.length === 0) {
      return [];
    }
    // Return all tracking numbers from the first aramex detail
    return aramexDetails[0]?.all_trk_nos || [];
  }

  /**
   * Get shipping label URL from Aramex details
   */
  getShippingLabelUrl(order: Order): string | null {
    const aramexDetails = this.getAramexDetails(order);
    if (aramexDetails.length === 0) {
      return null;
    }
    return aramexDetails[0]?.label || null;
  }
}

export const orderService = new OrderService();

