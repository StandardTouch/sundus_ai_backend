#!/usr/bin/env tsx

/**
 * Initialize Tool Settings Script
 * 
 * Usage:
 *   Direct: ./scripts/init-tool-settings.ts
 *   Or:     npx tsx scripts/init-tool-settings.ts
 * 
 * Creates tool settings entries for all available tools in the database.
 * All tools are enabled by default.
 */

import dotenv from "dotenv";
import { connectDatabase, closeDatabase } from "../src/config/database.js";
import { toolSettingsRepository } from "../src/repositories/tool-settings.repository.js";
import { allTools } from "../src/agent/tools/index.js";
import { logger } from "../src/utils/logger.js";

dotenv.config();

/**
 * Tool metadata mapping
 */
const TOOL_METADATA: Record<string, { category: string; displayName: string; description: string }> = {
  search_products: {
    category: "products",
    displayName: "Search Products",
    description: "Search for products by SKU, brand name, or keywords. Use this when user wants to find products, search for items, browse catalog, ask about specific brands, or wants product recommendations."
  },
  get_product_details: {
    category: "products",
    displayName: "Get Product Details",
    description: "Get detailed information about a specific product including images, price, description, and specifications. Use this when user asks about a specific product, wants full product information, or clicks on a product from search results."
  },
  list_brands: {
    category: "products",
    displayName: "List Brands",
    description: "Get list of all available brands in the catalog. Use this when user asks 'what brands do you have?', wants to see all brands, or asks about brand options."
  },
  track_order: {
    category: "orders",
    displayName: "Track Order",
    description: "Get the LATEST/MOST RECENT order for a user. Use this when user asks 'track my order', 'where is my order', 'show my order', or wants to see their order status WITHOUT mentioning a specific order number."
  },
  get_order_details: {
    category: "orders",
    displayName: "Get Order Details",
    description: "Get detailed information about a SPECIFIC order by order number. Use this ONLY when the user explicitly mentions a specific order number in their message."
  },
  search_faqs: {
    category: "faqs",
    displayName: "Search FAQs",
    description: "Search the FAQ database for answers to common questions about policies, procedures, shipping, returns, payment, orders, products, and general information."
  }
};

async function initToolSettings() {
  try {
    logger.info("Starting tool settings initialization...");

    // Connect to database
    await connectDatabase();
    logger.info("Connected to database");

    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    // Process each tool
    for (const tool of allTools) {
      const toolName = tool.function.name;
      const metadata = TOOL_METADATA[toolName] || {
        category: "general",
        displayName: toolName.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        description: tool.function.description || `Tool: ${toolName}`
      };

      // Check if setting already exists
      const existing = await toolSettingsRepository.findByToolName(toolName);
      
      if (existing) {
        logger.info("Tool setting already exists", {
          toolName,
          is_enabled: existing.is_enabled
        });
        skippedCount++;
        continue;
      }

      // Create setting
      await toolSettingsRepository.create({
        tool_name: toolName,
        category: metadata.category,
        display_name: metadata.displayName,
        description: metadata.description,
        is_enabled: true // Default to enabled
      });

      logger.info("Tool setting created", { toolName, category: metadata.category });
      createdCount++;
    }

    console.log("\n✅ Tool settings initialization completed!");
    console.log("\n📊 Summary:");
    console.log(`   Created: ${createdCount} tool settings`);
    console.log(`   Skipped: ${skippedCount} (already exist)`);
    console.log(`   Total Tools: ${allTools.length}`);
    console.log(`\n💡 Use the API endpoints to manage tools:`);
    console.log(`   GET  /api/settings/tools - Get all tools with status`);
    console.log(`   PUT  /api/settings/tools/:toolName/toggle - Toggle tool`);
    console.log(`   PUT  /api/settings/tools/:toolName - Update tool settings\n`);

    // Close database connection
    await closeDatabase();
    process.exit(0);
  } catch (error: any) {
    logger.error("Error initializing tool settings", { error: error.message });
    console.error("\n❌ Error initializing tool settings:");
    console.error(error);
    await closeDatabase();
    process.exit(1);
  }
}

// Run the script
initToolSettings();

