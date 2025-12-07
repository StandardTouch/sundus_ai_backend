/**
 * Message Formatting Utilities
 * Utilities for formatting messages before sending
 */

/**
 * Format product information for WhatsApp message
 */
export function formatProductMessage(product: {
  name: string;
  price: string;
  regular_price?: string;
  sale_price?: string;
  discount_percentage?: string;
  stock_status: string;
  product_url?: string;
}): string {
  let message = `*${product.name}*\n\n`;
  
  // Price information
  if (product.sale_price && product.on_sale) {
    message += `💰 Price: ${product.sale_price} SAR`;
    if (product.regular_price) {
      message += ` (Was: ${product.regular_price} SAR)`;
    }
    if (product.discount_percentage) {
      message += `\n🎉 Discount: ${product.discount_percentage} OFF`;
    }
  } else {
    message += `💰 Price: ${product.price} SAR`;
  }
  
  // Stock status
  message += `\n📦 Stock: ${product.stock_status === "instock" ? "In Stock" : "Out of Stock"}`;
  
  // Product link
  if (product.product_url) {
    message += `\n\n🔗 View Product: ${product.product_url}`;
  }
  
  return message;
}

/**
 * Format order information for WhatsApp message
 */
export function formatOrderMessage(order: {
  order_id: string;
  order_status: string;
  total: string;
  order_placed_date: string;
  items: Array<{ item_name: string; quantity: number }>;
}): string {
  let message = `📦 *Order ${order.order_id}*\n\n`;
  
  // Status
  const statusMap: Record<string, string> = {
    "wc-completed": "✅ Completed",
    "wc-processing": "⏳ Processing",
    "wc-pending": "⏸️ Pending",
    "wc-on-hold": "⏸️ On Hold",
    "wc-cancelled": "❌ Cancelled",
    "wc-refunded": "↩️ Refunded",
    "wc-failed": "❌ Failed",
  };
  
  message += `Status: ${statusMap[order.order_status] || order.order_status}\n`;
  message += `Total: ${order.total} SAR\n`;
  message += `Placed: ${new Date(order.order_placed_date).toLocaleDateString()}\n\n`;
  
  // Items
  message += `Items:\n`;
  order.items.forEach((item, index) => {
    message += `${index + 1}. ${item.item_name} (Qty: ${item.quantity})\n`;
  });
  
  return message;
}

/**
 * Format multiple products as a list
 */
export function formatProductList(products: Array<{
  product_id: number;
  name: string;
  price: string;
  product_url?: string;
}>): string {
  if (products.length === 0) {
    return "No products found. Please try different search terms.";
  }
  
  let message = `I found ${products.length} product${products.length > 1 ? "s" : ""}:\n\n`;
  
  products.slice(0, 5).forEach((product, index) => {
    message += `${index + 1}. *${product.name}*\n`;
    message += `   💰 ${product.price} SAR\n`;
    if (product.product_url) {
      message += `   🔗 ${product.product_url}\n`;
    }
    message += `\n`;
  });
  
  if (products.length > 5) {
    message += `... and ${products.length - 5} more products.`;
  }
  
  return message;
}

