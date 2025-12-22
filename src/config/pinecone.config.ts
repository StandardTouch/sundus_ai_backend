/**
 * Pinecone Configuration
 * Configuration for Pinecone vector database client
 */

import dotenv from "dotenv";

dotenv.config();

/**
 * Pinecone API configuration
 */
export const pineconeConfig = {
  /**
   * Pinecone API Key
   * Get from: https://app.pinecone.io/
   */
  apiKey: process.env.PINECONE_API_KEY || "",

  /**
   * Pinecone Index Name
   * The name of the index to use for FAQs
   */
  indexName: process.env.PINECONE_INDEX_NAME || "sundus-faqs",

  /**
   * Pinecone Namespace
   * Namespace for FAQ data isolation
   * Using a default namespace, can be configured per-tenant if needed
   */
  defaultNamespace: process.env.PINECONE_NAMESPACE || "faqs",

  /**
   * Similarity threshold for FAQ search
   * Only return FAQs with similarity score above this threshold
   */
  similarityThreshold: parseFloat(
    process.env.PINECONE_SIMILARITY_THRESHOLD || "0.75"
  ),

  /**
   * Default top K results to return from search
   */
  defaultTopK: parseInt(process.env.PINECONE_DEFAULT_TOP_K || "5", 10),
};

/**
 * Validate Pinecone configuration
 */
export function validatePineconeConfig(): void {
  if (!pineconeConfig.apiKey) {
    throw new Error("PINECONE_API_KEY is required");
  }
  if (!pineconeConfig.indexName) {
    throw new Error("PINECONE_INDEX_NAME is required");
  }
}

