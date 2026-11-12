/**
 * Terminal Flow Trigger Script
 * Easily trigger any bot option from your terminal using simple keywords or numbers.
 *
 * Usage:
 *   npm run trigger <word>
 *   npx tsx scripts/trigger.ts <word>
 *
 * Examples:
 *   npx tsx scripts/trigger.ts orders      -> Triggers Track My Orders
 *   npx tsx scripts/trigger.ts browse      -> Triggers Browse Watches (Brand List)
 *   npx tsx scripts/trigger.ts coach       -> Triggers Coach Watches
 *   npx tsx scripts/trigger.ts tommy       -> Triggers Tommy Hilfiger Watches
 *   npx tsx scripts/trigger.ts stores      -> Triggers Store Locations
 *   npx tsx scripts/trigger.ts support     -> Triggers Customer Support
 *   npx tsx scripts/trigger.ts menu        -> Returns to Main Menu
 *   npx tsx scripts/trigger.ts english     -> Selects English
 *   npx tsx scripts/trigger.ts arabic      -> Selects Arabic
 *   npx tsx scripts/trigger.ts hi          -> Starts conversation / Greeting
 *
 * Or run with no arguments for interactive menu:
 *   npx tsx scripts/trigger.ts
 */

import dotenv from "dotenv";
dotenv.config();

import readline from "readline";
import { flowRouter } from "../src/flows/flow.router.js";
import { webhookHandlerService } from "../src/services/webhook.handler.service.js";
import { connectRedis, closeRedis } from "../src/config/redis.config.js";
import { connectDatabase, closeDatabase } from "../src/config/database.js";

const DEFAULT_PHONE = process.env.TEST_PHONE_NUMBER || "917204708561";

// Map simple words to flow actions
const ACTION_MAP: Record<string, { payload: string; text: string; type: string }> = {
  // Main Menu
  "menu": { payload: "menu_main", text: "Main Menu", type: "QUICK_REPLY" },
  "0": { payload: "menu_main", text: "Main Menu", type: "QUICK_REPLY" },
  "main": { payload: "menu_main", text: "Main Menu", type: "QUICK_REPLY" },

  // Orders
  "orders": { payload: "menu_track_order", text: "Track My Orders", type: "LIST_REPLY" },
  "order": { payload: "menu_track_order", text: "Track My Orders", type: "LIST_REPLY" },
  "track": { payload: "menu_track_order", text: "Track My Orders", type: "LIST_REPLY" },
  "1": { payload: "menu_track_order", text: "Track My Orders", type: "LIST_REPLY" },

  // Browse Watches
  "browse": { payload: "menu_browse_catalog", text: "Browse Watches", type: "LIST_REPLY" },
  "watches": { payload: "menu_browse_catalog", text: "Browse Watches", type: "LIST_REPLY" },
  "watch": { payload: "menu_browse_catalog", text: "Browse Watches", type: "LIST_REPLY" },
  "brands": { payload: "menu_browse_catalog", text: "Browse Watches", type: "LIST_REPLY" },
  "2": { payload: "menu_browse_catalog", text: "Browse Watches", type: "LIST_REPLY" },

  // Store Locations
  "stores": { payload: "menu_store_locations", text: "Store Locations", type: "LIST_REPLY" },
  "store": { payload: "menu_store_locations", text: "Store Locations", type: "LIST_REPLY" },
  "locations": { payload: "menu_store_locations", text: "Store Locations", type: "LIST_REPLY" },
  "location": { payload: "menu_store_locations", text: "Store Locations", type: "LIST_REPLY" },
  "3": { payload: "menu_store_locations", text: "Store Locations", type: "LIST_REPLY" },

  // Customer Support
  "support": { payload: "menu_support", text: "Customer Support", type: "LIST_REPLY" },
  "agent": { payload: "menu_support", text: "Customer Support", type: "LIST_REPLY" },
  "help": { payload: "menu_support", text: "Customer Support", type: "LIST_REPLY" },
  "4": { payload: "menu_support", text: "Customer Support", type: "LIST_REPLY" },

  // Languages
  "english": { payload: "lang_en", text: "English", type: "QUICK_REPLY" },
  "en": { payload: "lang_en", text: "English", type: "QUICK_REPLY" },
  "arabic": { payload: "lang_ar", text: "العربية", type: "QUICK_REPLY" },
  "ar": { payload: "lang_ar", text: "العربية", type: "QUICK_REPLY" },

  // Greeting
  "hi": { payload: "hi", text: "Hi", type: "TEXT" },
  "hello": { payload: "hello", text: "Hello", type: "TEXT" },
  "restart": { payload: "restart", text: "restart", type: "TEXT" },
};

async function executeAction(word: string, phoneNumber: string = DEFAULT_PHONE) {
  const normalized = word.toLowerCase().trim();

  let actionConfig = ACTION_MAP[normalized];

  const KNOWN_BRANDS = [
    "coach", "balmain", "calvin", "boss", "lacoste", "fossil", "armani",
    "ferrari", "aston", "eliesab", "cavalli", "pierre", "cardin", "tommy"
  ];

  if (!actionConfig) {
    const isBrandKeyword = KNOWN_BRANDS.some((b) => normalized.includes(b)) || (!word.includes(" ") && word.length < 15);
    if (isBrandKeyword) {
      actionConfig = {
        payload: `brand_${normalized}`,
        text: word,
        type: "LIST_REPLY",
      };
    } else {
      // Free-form text question (e.g. "what is your warranty?", "do you have silver watches?")
      actionConfig = {
        payload: word,
        text: word,
        type: "TEXT",
      };
    }
  }

  console.log("\n--------------------------------------------------");
  console.log(`🚀 Executing: "${word}" -> payload: "${actionConfig.payload}" (type: ${actionConfig.type})`);
  console.log(`📱 Target Phone: ${phoneNumber}`);
  console.log("--------------------------------------------------");

  const webhookPayload = {
    id: `trigger_${Date.now()}`,
    created_at: new Date().toISOString(),
    topic: "message",
    project_id: "sundus_ai",
    delivery_attempt: "1",
    data: {
      message: {
        id: `msg_${Date.now()}`,
        phone_number: phoneNumber,
        message_type: actionConfig.type,
        message_content: {
          callbackPayload: actionConfig.payload,
          text: actionConfig.text,
        },
      },
    },
  };

  const result = await webhookHandlerService.processWebhook(webhookPayload as any);
  console.log("\n✅ Result Total Time:", result?.totalTime ? `${result.totalTime}ms` : "OK");
  console.log("--------------------------------------------------\n");
}

function promptInteractive(): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`
╔══════════════════════════════════════════════════╗
║        🤖 Sundus AI - Flow Terminal Trigger      ║
╠══════════════════════════════════════════════════╣
║ [1] orders   - Track My Orders                ║
║ [2] browse   - Browse Watches (Brand List)    ║
║ [3] stores   - Store Locations (5 Showrooms)  ║
║ [4] support  - Customer Support / Agent       ║
║ [0] menu     - Return to Main Menu            ║
║ [en] english - English Language               ║
║ [ar] arabic  - Arabic Language                ║
║                                                  ║
║ Or type any brand directly: tommy, coach, etc.   ║
╚══════════════════════════════════════════════════╝
`);

  return new Promise((resolve) => {
    rl.question("👉 Choose an option or type a word: ", (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  await connectRedis();
  await connectDatabase();

  const args = process.argv.slice(2);
  let word = args[0];

  if (!word) {
    word = await promptInteractive();
  }

  if (word && word.trim()) {
    await executeAction(word.trim());
  } else {
    console.log("No option entered. Exiting.");
  }

  await closeRedis();
  await closeDatabase();
  process.exit(0);
}

main().catch((err) => {
  console.error("Execution failed:", err);
  process.exit(1);
});

