#!/usr/bin/env tsx

/**
 * Re-sync All FAQs to Pinecone Script
 * 
 * Usage:
 *   Direct: ./scripts/re-sync-all-faqs.ts
 *   Or:     npx tsx scripts/re-sync-all-faqs.ts
 * 
 * This script:
 * 1. Finds and deletes orphaned FAQs from Pinecone (not in MongoDB)
 * 2. Re-syncs all active FAQs from MongoDB to Pinecone
 * 
 * Useful when:
 * - Changing databases
 * - Rebuilding Pinecone index
 * - Fixing sync issues
 * - Cleaning up orphaned records
 * 
 * Only active FAQs (is_active: true, status: 'active') are synced.
 * FAQs in Pinecone that don't exist in MongoDB are automatically deleted.
 */

import dotenv from "dotenv";
import { connectDatabase, closeDatabase } from "../src/config/database.js";
import { faqRepository } from "../src/repositories/faq.repository.js";
import { faqService } from "../src/services/faq.service.js";
import { pineconeService } from "../src/services/pinecone.service.js";
import { logger } from "../src/utils/logger.js";

dotenv.config();

async function reSyncAllFAQs() {
  try {
    logger.info("Starting FAQ re-sync to Pinecone...");

    // Connect to database
    await connectDatabase();
    logger.info("Connected to database");

    // Step 1: Find and delete orphaned FAQs from Pinecone
    console.log("\n🔍 Step 1: Checking for orphaned FAQs in Pinecone...");
    logger.info("Listing all FAQ IDs from Pinecone...");
    
    let pineconeIds: string[] = [];
    try {
      pineconeIds = await pineconeService.listAllFAQIds();
      console.log(`   Found ${pineconeIds.length} FAQ(s) in Pinecone`);
    } catch (error: any) {
      logger.warn("Could not list Pinecone IDs (may be empty or error)", {
        error: error.message
      });
      console.log("   ⚠️  Could not list Pinecone IDs (continuing anyway)");
    }

    // Fetch all active FAQs from MongoDB
    logger.info("Fetching all active FAQs from MongoDB...");
    const allFAQs = await faqRepository.findActive();
    
    // Get MongoDB FAQ IDs
    const mongoIds = new Set(allFAQs.map(faq => faq._id).filter(Boolean));
    
    // Find orphaned IDs (in Pinecone but not in MongoDB)
    const orphanedIds = pineconeIds.filter(id => !mongoIds.has(id));
    
    if (orphanedIds.length > 0) {
      console.log(`\n🗑️  Found ${orphanedIds.length} orphaned FAQ(s) in Pinecone (not in MongoDB)`);
      console.log("   Deleting orphaned FAQs...");
      
      try {
        // Delete in batches to avoid rate limits
        const batchSize = 100;
        for (let i = 0; i < orphanedIds.length; i += batchSize) {
          const batch = orphanedIds.slice(i, i + batchSize);
          await pineconeService.deleteFAQs(batch);
          console.log(`   ✅ Deleted batch ${Math.floor(i / batchSize) + 1} (${batch.length} FAQ(s))`);
        }
        
        logger.info("Deleted orphaned FAQs from Pinecone", {
          deletedCount: orphanedIds.length
        });
        console.log(`   ✅ Successfully deleted ${orphanedIds.length} orphaned FAQ(s)\n`);
      } catch (error: any) {
        logger.error("Error deleting orphaned FAQs", {
          error: error.message,
          orphanedCount: orphanedIds.length
        });
        console.log(`   ⚠️  Error deleting orphaned FAQs: ${error.message}`);
        console.log("   Continuing with sync anyway...\n");
      }
    } else {
      console.log("   ✅ No orphaned FAQs found (Pinecone is clean)\n");
    }
    
    if (allFAQs.length === 0) {
      console.log("\n⚠️  No active FAQs found in database.");
      console.log("   Make sure you have FAQs with is_active: true and status: 'active'");
      if (orphanedIds.length > 0) {
        console.log(`   Note: ${orphanedIds.length} orphaned FAQ(s) were deleted from Pinecone.\n`);
      } else {
        console.log();
      }
      await closeDatabase();
      process.exit(0);
    }

    // Step 2: Sync all FAQs from MongoDB to Pinecone
    console.log("📋 Step 2: Syncing FAQs from MongoDB to Pinecone...");
    console.log(`   Found ${allFAQs.length} active FAQ(s) to sync`);
    console.log("   Starting sync process...\n");

    let successCount = 0;
    let errorCount = 0;
    const errors: Array<{ faqId: string; question: string; error: string }> = [];

    // Sync each FAQ
    for (let i = 0; i < allFAQs.length; i++) {
      const faq = allFAQs[i];
      if (!faq) continue; // Skip if undefined (shouldn't happen, but TypeScript safety)
      
      const progress = `[${i + 1}/${allFAQs.length}]`;

      try {
        logger.info(`Syncing FAQ ${progress}`, {
          faqId: faq._id,
          question: faq.question.substring(0, 50) + "..."
        });

        await faqService.syncFAQToPinecone(faq);
        successCount++;

        console.log(`✅ ${progress} Synced: ${faq.question.substring(0, 60)}${faq.question.length > 60 ? "..." : ""}`);
      } catch (error: any) {
        errorCount++;
        const errorMsg = error.message || "Unknown error";
        errors.push({
          faqId: faq._id || "unknown",
          question: faq.question.substring(0, 50),
          error: errorMsg
        });

        logger.error(`Failed to sync FAQ ${progress}`, {
          faqId: faq._id,
          error: errorMsg
        });

        console.log(`❌ ${progress} Failed: ${faq.question.substring(0, 60)}${faq.question.length > 60 ? "..." : ""}`);
        console.log(`   Error: ${errorMsg}`);
      }

      // Small delay to avoid rate limiting
      if (i < allFAQs.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 Re-sync Summary:");
    console.log("=".repeat(60));
    if (orphanedIds.length > 0) {
      console.log(`   🗑️  Orphaned FAQs deleted: ${orphanedIds.length}`);
    }
    console.log(`   📋 Total FAQs in MongoDB: ${allFAQs.length}`);
    console.log(`   ✅ Successfully synced: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);

    if (errors.length > 0) {
      console.log("\n⚠️  Errors encountered:");
      errors.forEach((err, idx) => {
        console.log(`\n   ${idx + 1}. FAQ ID: ${err.faqId}`);
        console.log(`      Question: ${err.question}...`);
        console.log(`      Error: ${err.error}`);
      });
    }

    if (successCount === allFAQs.length) {
      console.log("\n✅ All FAQs successfully synced to Pinecone!");
    } else if (successCount > 0) {
      console.log(`\n⚠️  ${successCount} FAQ(s) synced, but ${errorCount} failed.`);
      console.log("   Review errors above and retry failed FAQs if needed.");
    } else {
      console.log("\n❌ All FAQ syncs failed. Please check your configuration:");
      console.log("   - MongoDB connection");
      console.log("   - Pinecone API key and index name");
      console.log("   - Network connectivity");
    }

    console.log("\n💡 Note: Pinecone indexing takes 5-10 seconds per batch.");
    console.log("   FAQs may not be immediately searchable after sync.\n");

    // Close database connection
    await closeDatabase();
    process.exit(errorCount > 0 ? 1 : 0);
  } catch (error: any) {
    logger.error("Error during FAQ re-sync", {
      error: error.message,
      stack: error.stack
    });
    console.error("\n❌ Fatal error during FAQ re-sync:");
    console.error(error);
    await closeDatabase();
    process.exit(1);
  }
}

// Run the script
reSyncAllFAQs();

