/**
 * MongoDB Database Configuration
 * Handles database connection and initialization
 */

import { MongoClient, Db, ObjectId } from "mongodb";
import { logger } from "../utils/logger.js";

let client: MongoClient | null = null;
let db: Db | null = null;

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/sundus_ai";
const DB_NAME = process.env.MONGODB_DB_NAME || "sundus_ai";

/**
 * Connect to MongoDB
 */
export async function connectDatabase(): Promise<void> {
  try {
    if (client && db) {
      logger.info("Database already connected");
      return;
    }

    logger.info("Connecting to MongoDB...", { uri: MONGODB_URI.replace(/\/\/.*@/, "//***:***@") });

    client = new MongoClient(MONGODB_URI);
    await client.connect();

    db = client.db(DB_NAME);

    // Test connection
    await db.admin().ping();

    logger.info("MongoDB connected successfully", { database: DB_NAME });

    // Create indexes
    await createIndexes();
  } catch (error) {
    logger.error("MongoDB connection error", { error });
    throw error;
  }
}

/**
 * Get database instance
 */
export function getDatabase(): Db {
  if (!db) {
    throw new Error("Database not connected. Call connectDatabase() first.");
  }
  return db;
}

/**
 * Close database connection
 */
export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    db = null;
    logger.info("MongoDB connection closed");
  }
}

/**
 * Create database indexes
 */
async function createIndexes(): Promise<void> {
  if (!db) return;

  try {
    // Users collection indexes
    const usersCollection = db.collection("users");
    await usersCollection.createIndex({ username: 1 }, { unique: true });
    await usersCollection.createIndex({ email: 1 }, { unique: true });
    await usersCollection.createIndex({ role: 1 });
    await usersCollection.createIndex({ is_active: 1 });

    // User sessions collection indexes
    const userSessionsCollection = db.collection("user_sessions");
    await userSessionsCollection.createIndex({ phone_number: 1 }, { unique: true });
    await userSessionsCollection.createIndex({ status: 1 });

    // Conversation messages collection indexes
    const conversationMessagesCollection = db.collection("conversation_messages");
    await conversationMessagesCollection.createIndex({ phone_number: 1, timestamp: -1 });
    await conversationMessagesCollection.createIndex({ message_id: 1 });
    await conversationMessagesCollection.createIndex({ conversation_id: 1 }); // For conversation tracking
    await conversationMessagesCollection.createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000 }); // 90 days TTL
    await conversationMessagesCollection.createIndex({ conversation_id: 1, timestamp: -1 }); // Compound for conversation queries
    // Analytics indexes
    await conversationMessagesCollection.createIndex({ role: 1, timestamp: -1 }); // For filtering user/assistant messages
    await conversationMessagesCollection.createIndex({ timestamp: -1, role: 1 }); // For time-based analytics with role filter
    await conversationMessagesCollection.createIndex({ "metadata.response_time_ms": 1 }); // For response time analytics

    // Feedback collection indexes
    const feedbackCollection = db.collection("feedback");
    await feedbackCollection.createIndex({ phone_number: 1 });
    await feedbackCollection.createIndex({ message_id: 1 });
    await feedbackCollection.createIndex({ conversation_id: 1 }); // Link to conversations
    await feedbackCollection.createIndex({ created_at: -1 });
    await feedbackCollection.createIndex({ is_positive: 1 }); // For analytics queries
    await feedbackCollection.createIndex({ response_type: 1 }); // For analytics queries
    await feedbackCollection.createIndex({ language: 1 }); // For language-based analytics
    await feedbackCollection.createIndex({ created_at: -1, is_positive: 1 }); // Compound index for time-based analytics
    await feedbackCollection.createIndex({ conversation_id: 1, created_at: -1 }); // For conversation-based analytics

    // FAQs collection indexes
    const faqsCollection = db.collection("faqs");
    await faqsCollection.createIndex({ vector_id: 1 });
    await faqsCollection.createIndex({ status: 1 });
    await faqsCollection.createIndex({ is_active: 1 });
    await faqsCollection.createIndex({ category: 1 });
    await faqsCollection.createIndex({ source: 1 });
    await faqsCollection.createIndex({ is_active: 1, status: 1 }); // Compound index for active FAQs
    await faqsCollection.createIndex({ usage_count: -1 }); // For popular FAQs
    // Analytics indexes
    await faqsCollection.createIndex({ last_used_at: -1 }); // For FAQ usage trends
    await faqsCollection.createIndex({ category: 1, usage_count: -1 }); // For category analytics
    await faqsCollection.createIndex({ is_active: 1, status: 1, usage_count: -1 }); // Compound for top FAQs

    // Support settings collection indexes
    const supportSettingsCollection = db.collection("support_settings");
    await supportSettingsCollection.createIndex({ key: 1 }, { unique: true });

    // Tool settings collection indexes
    const toolSettingsCollection = db.collection("tool_settings");
    await toolSettingsCollection.createIndex({ tool_name: 1 }, { unique: true });
    await toolSettingsCollection.createIndex({ category: 1 });
    await toolSettingsCollection.createIndex({ is_enabled: 1 });

    // Password reset OTPs collection indexes
    const passwordResetOTPsCollection = db.collection("password_reset_otps");
    await passwordResetOTPsCollection.createIndex({ email: 1, is_used: 1, is_expired: 1 });
    await passwordResetOTPsCollection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL index
    await passwordResetOTPsCollection.createIndex({ created_at: 1 });

    // Password reset tokens collection indexes
    const passwordResetTokensCollection = db.collection("password_reset_tokens");
    await passwordResetTokensCollection.createIndex({ token_lookup: 1 }, { unique: true });
    await passwordResetTokensCollection.createIndex({ email: 1, is_used: 1, is_expired: 1 });
    await passwordResetTokensCollection.createIndex({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL index
    await passwordResetTokensCollection.createIndex({ created_at: 1 });

    logger.info("Database indexes created successfully");
  } catch (error) {
    logger.error("Error creating indexes", { error });
    // Don't throw - indexes might already exist
  }
}

/**
 * Helper to convert string ID to ObjectId
 */
export function toObjectId(id: string): ObjectId {
  try {
    return new ObjectId(id);
  } catch (error) {
    throw new Error(`Invalid ObjectId: ${id}`);
  }
}

/**
 * Helper to convert ObjectId to string
 */
export function fromObjectId(id: ObjectId | string): string {
  return id.toString();
}

